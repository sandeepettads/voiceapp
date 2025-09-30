import asyncio
import json
import logging
import time
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Any, Dict, List, Optional, Set
from enum import Enum
import weakref

logger = logging.getLogger("voicerag.debug")

class DebugEventType(Enum):
    """Types of debug events that can be logged"""
    USER_QUESTION = "user_question"
    REALTIME_API_RECEIVED = "realtime_api_received"
    SEARCH_QUERY_START = "search_query_start"
    SEARCH_QUERY_COMPLETE = "search_query_complete"
    SEARCH_RESULTS = "search_results"
    TOOL_CALL_START = "tool_call_start"
    TOOL_CALL_COMPLETE = "tool_call_complete"
    AI_RESPONSE_START = "ai_response_start"
    AI_RESPONSE_COMPLETE = "ai_response_complete"
    ERROR = "error"
    WEBSOCKET_CONNECT = "websocket_connect"
    WEBSOCKET_DISCONNECT = "websocket_disconnect"
    OPENAI_API_CALL = "openai_api_call"
    AZURE_SEARCH_CALL = "azure_search_call"
    GROUNDING_SOURCES = "grounding_sources"

class DebugEvent:
    """Represents a single debug event"""
    def __init__(self, 
                 event_type: DebugEventType, 
                 message: str, 
                 data: Optional[Dict[str, Any]] = None,
                 session_id: Optional[str] = None,
                 correlation_id: Optional[str] = None):
        self.id = f"{int(time.time() * 1000)}_{id(self)}"
        self.timestamp = datetime.now(ZoneInfo("America/Chicago"))
        self.event_type = event_type
        self.message = message
        self.data = data or {}
        self.session_id = session_id
        self.correlation_id = correlation_id
        self.duration_ms = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat(),
            "event_type": self.event_type.value,
            "message": self.message,
            "data": self.data,
            "session_id": self.session_id,
            "correlation_id": self.correlation_id,
            "duration_ms": self.duration_ms
        }

class DebugLogger:
    """Central debug logger that captures all app events and broadcasts them to connected clients"""
    
    def __init__(self, max_events: int = 1000):
        self.max_events = max_events
        self.events: List[DebugEvent] = []
        self.debug_clients: Set[Any] = weakref.WeakSet()
        self._lock = asyncio.Lock()
        
    async def log_event(self, 
                       event_type: DebugEventType, 
                       message: str, 
                       data: Optional[Dict[str, Any]] = None,
                       session_id: Optional[str] = None,
                       correlation_id: Optional[str] = None) -> DebugEvent:
        """Log a debug event and broadcast it to connected debug clients"""
        event = DebugEvent(event_type, message, data, session_id, correlation_id)
        
        async with self._lock:
            self.events.append(event)
            
            # Keep only the most recent events
            if len(self.events) > self.max_events:
                self.events = self.events[-self.max_events:]
        
        # Broadcast to debug clients
        await self._broadcast_event(event)
        
        # Also log to standard logger
        logger.info(f"[{event.event_type.value}] {message} - Data: {json.dumps(data, default=str) if data else 'None'}")
        
        return event

    async def log_timed_event_start(self, 
                                  event_type: DebugEventType, 
                                  message: str,
                                  data: Optional[Dict[str, Any]] = None,
                                  session_id: Optional[str] = None,
                                  correlation_id: Optional[str] = None) -> DebugEvent:
        """Start a timed event (returns event that can be completed later)"""
        event = await self.log_event(event_type, f"{message} - Started", data, session_id, correlation_id)
        event._start_time = time.time()
        return event

    async def log_timed_event_end(self, event: DebugEvent, 
                                message_suffix: str = "Completed",
                                additional_data: Optional[Dict[str, Any]] = None):
        """End a timed event and log the completion"""
        if hasattr(event, '_start_time'):
            event.duration_ms = int((time.time() - event._start_time) * 1000)
        
        completion_data = event.data.copy()
        if additional_data:
            completion_data.update(additional_data)
        completion_data['duration_ms'] = event.duration_ms
        
        await self.log_event(
            event.event_type,
            f"{event.message.replace(' - Started', '')} - {message_suffix}",
            completion_data,
            event.session_id,
            event.correlation_id
        )

    async def log_error(self, 
                       message: str, 
                       error: Exception, 
                       session_id: Optional[str] = None,
                       correlation_id: Optional[str] = None):
        """Log an error event"""
        await self.log_event(
            DebugEventType.ERROR,
            message,
            {
                "error_type": type(error).__name__,
                "error_message": str(error),
                "stack_trace": str(error.__traceback__) if error.__traceback__ else None
            },
            session_id,
            correlation_id
        )

    async def add_debug_client(self, websocket):
        """Add a debug client to receive real-time events"""
        self.debug_clients.add(websocket)
        logger.info(f"Debug client connected. Total debug clients: {len(self.debug_clients)}")
        
        # Send recent events to new client
        async with self._lock:
            recent_events = self.events[-50:] if len(self.events) > 50 else self.events
            for event in recent_events:
                try:
                    await websocket.send_json({
                        "type": "debug_event",
                        "event": event.to_dict()
                    })
                except Exception as e:
                    logger.error(f"Failed to send recent events to debug client: {e}")
                    break

    def remove_debug_client(self, websocket):
        """Remove a debug client"""
        try:
            self.debug_clients.discard(websocket)
            logger.info(f"Debug client disconnected. Remaining debug clients: {len(self.debug_clients)}")
        except Exception as e:
            logger.error(f"Error removing debug client: {e}")

    async def _broadcast_event(self, event: DebugEvent):
        """Broadcast event to all connected debug clients"""
        if not self.debug_clients:
            return
            
        dead_clients = []
        for client in self.debug_clients:
            try:
                await client.send_json({
                    "type": "debug_event",
                    "event": event.to_dict()
                })
            except Exception as e:
                logger.warning(f"Failed to send debug event to client: {e}")
                dead_clients.append(client)
        
        # Clean up dead connections
        for client in dead_clients:
            self.debug_clients.discard(client)

    async def get_events(self, 
                        event_types: Optional[List[str]] = None,
                        session_id: Optional[str] = None,
                        limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get filtered events"""
        async with self._lock:
            filtered_events = self.events
            
            if event_types:
                filtered_events = [e for e in filtered_events if e.event_type.value in event_types]
            
            if session_id:
                filtered_events = [e for e in filtered_events if e.session_id == session_id]
            
            if limit:
                filtered_events = filtered_events[-limit:]
            
            return [event.to_dict() for event in filtered_events]

    async def clear_events(self):
        """Clear all stored events"""
        async with self._lock:
            self.events.clear()
        
        # Notify debug clients
        for client in self.debug_clients:
            try:
                await client.send_json({
                    "type": "debug_events_cleared"
                })
            except:
                pass

# Global debug logger instance
debug_logger = DebugLogger()

# Convenience functions
async def log_user_question(question: str, session_id: str = None, correlation_id: str = None):
    return await debug_logger.log_event(
        DebugEventType.USER_QUESTION, 
        f"User asked: '{question}'", 
        {"question": question},
        session_id,
        correlation_id
    )

async def log_search_start(query: str, session_id: str = None, correlation_id: str = None):
    return await debug_logger.log_timed_event_start(
        DebugEventType.SEARCH_QUERY_START,
        f"Searching knowledge base for: '{query}'",
        {"search_query": query},
        session_id,
        correlation_id
    )

async def log_search_complete(event: DebugEvent, results_count: int, results: List[Any]):
    await debug_logger.log_timed_event_end(
        event,
        f"Found {results_count} results",
        {"results_count": results_count, "results": results[:3] if results else []}  # Only first 3 for brevity
    )

async def log_ai_response(response: str, session_id: str = None, correlation_id: str = None):
    return await debug_logger.log_event(
        DebugEventType.AI_RESPONSE_COMPLETE,
        f"AI responded with: '{response[:100]}{'...' if len(response) > 100 else ''}'",
        {"response": response},
        session_id,
        correlation_id
    )

async def log_error_event(message: str, error: Exception, session_id: str = None, correlation_id: str = None):
    return await debug_logger.log_error(message, error, session_id, correlation_id)
