import asyncio
import json
import logging
import uuid
from enum import Enum
from typing import Any, Callable, Optional

import aiohttp
from aiohttp import web
from azure.core.credentials import AzureKeyCredential
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

from debug_logger import debug_logger, DebugEventType

logger = logging.getLogger("voicerag")

class ToolResultDirection(Enum):
    TO_SERVER = 1
    TO_CLIENT = 2

class ToolResult:
    text: str
    destination: ToolResultDirection

    def __init__(self, text: str, destination: ToolResultDirection):
        self.text = text
        self.destination = destination

    def to_text(self) -> str:
        if self.text is None:
            return ""
        return self.text if type(self.text) == str else json.dumps(self.text)

class Tool:
    target: Callable[..., ToolResult]
    schema: Any

    def __init__(self, target: Any, schema: Any):
        self.target = target
        self.schema = schema

class RTToolCall:
    tool_call_id: str
    previous_id: str

    def __init__(self, tool_call_id: str, previous_id: str):
        self.tool_call_id = tool_call_id
        self.previous_id = previous_id

class RTMiddleTier:
    endpoint: str
    deployment: str
    key: Optional[str] = None
    
    # Tools are server-side only for now, though the case could be made for client-side tools
    # in addition to server-side tools that are invisible to the client
    tools: dict[str, Tool] = {}

    # Server-enforced configuration, if set, these will override the client's configuration
    # Typically at least the model name and system message will be set by the server
    model: Optional[str] = None
    system_message: Optional[str] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    presence_penalty: Optional[float] = None
    frequency_penalty: Optional[float] = None
    max_tokens: Optional[int] = None
    disable_audio: Optional[bool] = None
    voice_choice: Optional[str] = None
    _original_voice_choice: Optional[str] = None  # Store original voice for reset functionality
    api_version: str = "2024-10-01-preview"
    _tools_pending = {}
    _token_provider = None

    def __init__(self, endpoint: str, deployment: str, credentials: AzureKeyCredential | DefaultAzureCredential, voice_choice: Optional[str] = None, temperature: Optional[float] = 0.8, top_p: Optional[float] = 0.9, presence_penalty: Optional[float] = 0.4, frequency_penalty: Optional[float] = 0.2):
        self.endpoint = endpoint
        self.deployment = deployment
        self.voice_choice = voice_choice
        self.temperature = temperature
        self.top_p = top_p
        self.presence_penalty = presence_penalty
        self.frequency_penalty = frequency_penalty
        if voice_choice is not None:
            logger.info("Realtime voice choice set to %s", voice_choice)
        if isinstance(credentials, AzureKeyCredential):
            self.key = credentials.key
        else:
            self._token_provider = get_bearer_token_provider(credentials, "https://cognitiveservices.azure.com/.default")
            self._token_provider() # Warm up during startup so we have a token cached when the first request arrives

    async def _process_message_to_client(self, msg: str, client_ws: web.WebSocketResponse, server_ws: web.WebSocketResponse) -> Optional[str]:
        message = json.loads(msg.data)
        updated_message = msg.data
        if message is not None:
            match message["type"]:
                case "session.created":
                    session = message["session"]
                    # Hide the instructions, tools and max tokens from clients, if we ever allow client-side 
                    # tools, this will need updating
                    session["instructions"] = ""
                    session["tools"] = []
                    session["voice"] = self.voice_choice
                    session["tool_choice"] = "none"
                    session["max_response_output_tokens"] = None
                    updated_message = json.dumps(message)

                case "response.output_item.added":
                    if "item" in message and message["item"]["type"] == "function_call":
                        updated_message = None

                case "conversation.item.created":
                    if "item" in message and message["item"]["type"] == "function_call":
                        item = message["item"]
                        if item["call_id"] not in self._tools_pending:
                            self._tools_pending[item["call_id"]] = RTToolCall(item["call_id"], message["previous_item_id"])
                        updated_message = None
                    elif "item" in message and message["item"]["type"] == "function_call_output":
                        updated_message = None

                case "response.function_call_arguments.delta":
                    updated_message = None
                
                case "response.function_call_arguments.done":
                    updated_message = None

                case "response.output_item.done":
                    if "item" in message and message["item"]["type"] == "function_call":
                        item = message["item"]
                        tool_call = self._tools_pending[message["item"]["call_id"]]
                        tool = self.tools[item["name"]]
                        args = item["arguments"]
                        result = await tool.target(json.loads(args))
                        await server_ws.send_json({
                            "type": "conversation.item.create",
                            "item": {
                                "type": "function_call_output",
                                "call_id": item["call_id"],
                                "output": result.to_text() if result.destination == ToolResultDirection.TO_SERVER else ""
                            }
                        })
                        if result.destination == ToolResultDirection.TO_CLIENT:
                            # TODO: this will break clients that don't know about this extra message, rewrite 
                            # this to be a regular text message with a special marker of some sort
                            await client_ws.send_json({
                                "type": "extension.middle_tier_tool_response",
                                "previous_item_id": tool_call.previous_id,
                                "tool_name": item["name"],
                                "tool_result": result.to_text()
                            })
                        updated_message = None

                case "response.done":
                    if len(self._tools_pending) > 0:
                        self._tools_pending.clear() # Any chance tool calls could be interleaved across different outstanding responses?
                        await server_ws.send_json({
                            "type": "response.create"
                        })
                    if "response" in message:
                        replace = False
                        for i, output in enumerate(reversed(message["response"]["output"])):
                            if output["type"] == "function_call":
                                message["response"]["output"].pop(i)
                                replace = True
                        if replace:
                            updated_message = json.dumps(message)                        

        return updated_message

    async def _process_message_to_server(self, msg: str, ws: web.WebSocketResponse) -> Optional[str]:
        message = json.loads(msg.data)
        updated_message = msg.data
        if message is not None:
            match message["type"]:
                case "session.update":
                    session = message["session"]
                    if self.system_message is not None:
                        session["instructions"] = self.system_message
                    if self.temperature is not None:
                        session["temperature"] = self.temperature
                    if self.top_p is not None:
                        session["top_p"] = self.top_p
                    if self.presence_penalty is not None:
                        session["presence_penalty"] = self.presence_penalty
                    if self.frequency_penalty is not None:
                        session["frequency_penalty"] = self.frequency_penalty
                    if self.max_tokens is not None:
                        session["max_response_output_tokens"] = self.max_tokens
                    if self.disable_audio is not None:
                        session["disable_audio"] = self.disable_audio
                    if self.voice_choice is not None:
                        session["voice"] = self.voice_choice
                    # Force English language for both input and output
                    session["input_audio_transcription"] = {
                        "model": "whisper-1",
                        "language": "en"
                    }
                    # Force English for output audio generation  
                    session["output_audio_format"] = "pcm16"
                    session["modalities"] = ["text", "audio"]
                    # Voice will be set by voice_choice parameter above
                    # No hardcoded fallback - use environment variable or UI override
                    session["turn_detection"] = {
                        "type": "server_vad",
                        "threshold": 0.5,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 800
                    }
                    session["tool_choice"] = "auto" if len(self.tools) > 0 else "none"
                    session["tools"] = [tool.schema for tool in self.tools.values()]
                    updated_message = json.dumps(message)

        return updated_message

    async def _forward_messages(self, ws: web.WebSocketResponse, session_id: str):
        # Log OpenAI API connection
        await debug_logger.log_event(
            DebugEventType.OPENAI_API_CALL,
            "Connecting to OpenAI Realtime API",
            {
                "endpoint": self.endpoint,
                "deployment": self.deployment,
                "api_version": self.api_version
            },
            session_id=session_id
        )
        
        async with aiohttp.ClientSession(base_url=self.endpoint) as session:
            params = { "api-version": self.api_version, "deployment": self.deployment}
            headers = {}
            if "x-ms-client-request-id" in ws.headers:
                headers["x-ms-client-request-id"] = ws.headers["x-ms-client-request-id"]
            if self.key is not None:
                headers = { "api-key": self.key }
            else:
                headers = { "Authorization": f"Bearer {self._token_provider()}" } # NOTE: no async version of token provider, maybe refresh token on a timer?
            
            try:
                async with session.ws_connect("/openai/realtime", headers=headers, params=params) as target_ws:
                    async def from_client_to_server():
                        async for msg in ws:
                            if msg.type == aiohttp.WSMsgType.TEXT:
                                try:
                                    message_data = json.loads(msg.data)
                                    
                                    # Log realtime API messages received from client
                                    await debug_logger.log_event(
                                        DebugEventType.REALTIME_API_RECEIVED,
                                        f"Received from client: {message_data.get('type', 'unknown')}",
                                        {
                                            "message_type": message_data.get('type'),
                                            "message_data": message_data
                                        },
                                        session_id=session_id
                                    )
                                    
                                    # Extract user questions from input_audio_transcription
                                    if message_data.get('type') == 'conversation.item.input_audio_transcription.completed':
                                        transcript = message_data.get('transcript', '')
                                        if transcript:
                                            await debug_logger.log_event(
                                                DebugEventType.USER_QUESTION,
                                                f"User asked: '{transcript}'",
                                                {"transcript": transcript},
                                                session_id=session_id
                                            )
                                    
                                except json.JSONDecodeError:
                                    pass  # Skip if not valid JSON
                                
                                new_msg = await self._process_message_to_server(msg, ws)
                                if new_msg is not None:
                                    await target_ws.send_str(new_msg)
                            else:
                                print("Error: unexpected message type:", msg.type)
                        
                        # Means it is gracefully closed by the client then time to close the target_ws
                        if target_ws:
                            print("Closing OpenAI's realtime socket connection.")
                            await target_ws.close()
                            
                    async def from_server_to_client():
                        async for msg in target_ws:
                            if msg.type == aiohttp.WSMsgType.TEXT:
                                try:
                                    message_data = json.loads(msg.data)
                                    
                                    # Log AI responses
                                    if message_data.get('type') == 'response.audio_transcript.delta':
                                        delta = message_data.get('delta', '')
                                        if delta.strip():
                                            await debug_logger.log_event(
                                                DebugEventType.AI_RESPONSE_START,
                                                f"AI responding: {delta[:100]}{'...' if len(delta) > 100 else ''}",
                                                {"delta": delta},
                                                session_id=session_id
                                            )
                                    elif message_data.get('type') == 'response.done':
                                        await debug_logger.log_event(
                                            DebugEventType.AI_RESPONSE_COMPLETE,
                                            "AI response completed",
                                            {"response_id": message_data.get('response', {}).get('id')},
                                            session_id=session_id
                                        )
                                        
                                except json.JSONDecodeError:
                                    pass  # Skip if not valid JSON
                                
                                new_msg = await self._process_message_to_client(msg, ws, target_ws)
                                if new_msg is not None:
                                    await ws.send_str(new_msg)
                            else:
                                print("Error: unexpected message type:", msg.type)

                    try:
                        await asyncio.gather(from_client_to_server(), from_server_to_client())
                    except ConnectionResetError:
                        # Ignore the errors resulting from the client disconnecting the socket
                        pass
                        
            except Exception as e:
                await debug_logger.log_error(
                    "Error connecting to OpenAI Realtime API",
                    e,
                    session_id=session_id
                )
                raise

    async def _websocket_handler(self, request: web.Request):
        session_id = str(uuid.uuid4())
        
        # Log WebSocket connection
        await debug_logger.log_event(
            DebugEventType.WEBSOCKET_CONNECT,
            "Client WebSocket connected",
            {
                "session_id": session_id,
                "remote_addr": request.remote,
                "user_agent": request.headers.get("User-Agent", "Unknown")
            },
            session_id=session_id
        )
        
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        
        try:
            await self._forward_messages(ws, session_id)
        except Exception as e:
            await debug_logger.log_error(
                "Error in WebSocket handler",
                e,
                session_id=session_id
            )
            raise
        finally:
            # Log WebSocket disconnection
            await debug_logger.log_event(
                DebugEventType.WEBSOCKET_DISCONNECT,
                "Client WebSocket disconnected",
                {"session_id": session_id},
                session_id=session_id
            )
        
        return ws
    
    def attach_to_app(self, app, path):
        app.router.add_get(path, self._websocket_handler)
