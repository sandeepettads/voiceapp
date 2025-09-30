export type GroundingFile = {
    id: string;
    name: string;
    content: string;
};

export type HistoryItem = {
    id: string;
    transcript: string;
    groundingFiles: GroundingFile[];
};

export type SessionUpdateCommand = {
    type: "session.update";
    session: {
        turn_detection?: {
            type: "server_vad" | "none";
        };
        input_audio_transcription?: {
            model: "whisper-1";
        };
    };
};

export type InputAudioBufferAppendCommand = {
    type: "input_audio_buffer.append";
    audio: string;
};

export type InputAudioBufferClearCommand = {
    type: "input_audio_buffer.clear";
};

export type Message = {
    type: string;
};

export type ResponseAudioDelta = {
    type: "response.audio.delta";
    delta: string;
};

export type ResponseAudioTranscriptDelta = {
    type: "response.audio_transcript.delta";
    delta: string;
};

export type ResponseInputAudioTranscriptionCompleted = {
    type: "conversation.item.input_audio_transcription.completed";
    event_id: string;
    item_id: string;
    content_index: number;
    transcript: string;
};

export type ResponseDone = {
    type: "response.done";
    event_id: string;
    response: {
        id: string;
        output: { id: string; content?: { transcript: string; type: string }[] }[];
    };
};

export type ExtensionMiddleTierToolResponse = {
    type: "extension.middle_tier_tool.response";
    previous_item_id: string;
    tool_name: string;
    tool_result: string; // JSON string that needs to be parsed into ToolResult
};

export type ToolResult = {
    sources: { chunk_id: string; title: string; chunk: string; source_file?: string }[];
};

// Debug types
export type DebugEventType =
    | "user_question"
    | "realtime_api_received"
    | "search_query_start"
    | "search_query_complete"
    | "search_results"
    | "tool_call_start"
    | "tool_call_complete"
    | "ai_response_start"
    | "ai_response_complete"
    | "error"
    | "websocket_connect"
    | "websocket_disconnect"
    | "openai_api_call"
    | "azure_search_call"
    | "grounding_sources";

export type DebugEvent = {
    id: string;
    timestamp: string;
    event_type: DebugEventType;
    message: string;
    data?: Record<string, any>;
    session_id?: string;
    correlation_id?: string;
    duration_ms?: number;
};

export type DebugEventMessage = {
    type: "debug_event";
    event: DebugEvent;
};

export type DebugStats = {
    total_events: number;
    connected_clients: number;
    event_counts: Record<string, number>;
};
