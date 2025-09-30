import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, MessageSquare, Search, Volume2, Clock, User, Bot, Server } from "lucide-react";
import { DebugEvent, DebugEventType } from "@/types";

type ConversationFlowProps = {
    events: DebugEvent[];
};

type ConversationStep = {
    id: string;
    type: "user_input" | "processing" | "search" | "ai_response" | "audio_output" | "error";
    timestamp: Date;
    title: string;
    description: string;
    duration?: number;
    data?: any;
    events: DebugEvent[];
    sources?: Array<{
        chunk_id: string;
        title: string;
        content: string;
    }>;
};

type Conversation = {
    id: string;
    startTime: Date;
    endTime?: Date;
    userQuery?: string;
    aiResponse?: string;
    steps: ConversationStep[];
    totalDuration?: number;
    success: boolean;
    sourceDocuments: Array<{
        chunk_id: string;
        title: string;
        content: string;
    }>;
};

const STEP_ICONS = {
    user_input: User,
    processing: Server,
    search: Search,
    ai_response: Bot,
    audio_output: Volume2,
    error: MessageSquare
};

const STEP_COLORS = {
    user_input: "bg-blue-500",
    processing: "bg-purple-500",
    search: "bg-orange-500",
    ai_response: "bg-green-500",
    audio_output: "bg-indigo-500",
    error: "bg-red-500"
};

export default function ConversationFlow({ events }: ConversationFlowProps) {
    const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());
    const [selectedStep, setSelectedStep] = useState<ConversationStep | null>(null);

    // Create stable function for processing events
    const createConversationSteps = useMemo(() => {
        return (events: DebugEvent[]): ConversationStep[] => {
            try {
                const steps: ConversationStep[] = [];
                let currentStep: Partial<ConversationStep> | null = null;

                events.forEach(event => {
                    try {
                        const eventTime = new Date(event.timestamp);

                        switch (event.event_type as DebugEventType) {
                            case "user_question":
                                steps.push({
                                    id: event.id,
                                    type: "user_input",
                                    timestamp: eventTime,
                                    title: "🎤 User Question",
                                    description: event.data?.question || event.message || "User question",
                                    events: [event],
                                    data: event.data
                                });
                                break;

                            case "search_query_start":
                            case "azure_search_call":
                                if (!currentStep || currentStep.type !== "search") {
                                    currentStep = {
                                        id: event.id,
                                        type: "search",
                                        timestamp: eventTime,
                                        title: "🔍 Knowledge Base Search",
                                        description: `Searching: "${event.data?.search_query || event.data?.query || "knowledge base"}"`,
                                        events: [event],
                                        data: event.data
                                    };
                                } else {
                                    currentStep.events?.push(event);
                                }
                                break;

                            case "search_query_complete":
                                if (currentStep && currentStep.type === "search") {
                                    currentStep.events?.push(event);
                                    currentStep.duration = event.duration_ms;
                                    const resultsCount = event.data?.results_count || 0;
                                    currentStep.description += ` → Found ${resultsCount} results`;
                                    steps.push(currentStep as ConversationStep);
                                    currentStep = null;
                                }
                                break;

                            case "grounding_sources":
                                steps.push({
                                    id: event.id,
                                    type: "search",
                                    timestamp: eventTime,
                                    title: "📄 Source Retrieval",
                                    description: `Retrieved ${event.data?.retrieved_sources?.length || 0} source documents`,
                                    events: [event],
                                    data: event.data,
                                    sources: event.data?.retrieved_sources
                                });
                                break;

                            case "openai_api_call":
                            case "ai_response_start":
                                if (!currentStep || currentStep.type !== "ai_response") {
                                    currentStep = {
                                        id: event.id,
                                        type: "ai_response",
                                        timestamp: eventTime,
                                        title: "🤖 AI Processing",
                                        description: "Generating response with GPT-4o...",
                                        events: [event],
                                        data: event.data
                                    };
                                } else {
                                    currentStep.events?.push(event);
                                }
                                break;

                            case "ai_response_complete":
                                if (currentStep && currentStep.type === "ai_response") {
                                    currentStep.events?.push(event);
                                    currentStep.duration = event.duration_ms;
                                    const response = event.data?.response || "";
                                    currentStep.description = `Generated response: "${response.substring(0, 100)}${response.length > 100 ? "..." : ""}"`;
                                    steps.push(currentStep as ConversationStep);
                                    currentStep = null;
                                } else {
                                    steps.push({
                                        id: event.id,
                                        type: "ai_response",
                                        timestamp: eventTime,
                                        title: "🤖 AI Response",
                                        description:
                                            (event.data?.response?.substring(0, 100) || "Response generated") +
                                            (event.data?.response?.length > 100 ? "..." : ""),
                                        events: [event],
                                        data: event.data,
                                        duration: event.duration_ms
                                    });
                                }
                                break;

                            case "realtime_api_received":
                                if (event.message?.includes("audio") || event.data?.message_type === "audio") {
                                    steps.push({
                                        id: event.id,
                                        type: "audio_output",
                                        timestamp: eventTime,
                                        title: "🔊 Audio Response",
                                        description: "Converting response to speech...",
                                        events: [event],
                                        data: event.data
                                    });
                                } else {
                                    steps.push({
                                        id: event.id,
                                        type: "processing",
                                        timestamp: eventTime,
                                        title: "⚡ Real-time Processing",
                                        description: event.message || "Processing...",
                                        events: [event],
                                        data: event.data
                                    });
                                }
                                break;

                            case "error":
                                steps.push({
                                    id: event.id,
                                    type: "error",
                                    timestamp: eventTime,
                                    title: "❌ Error",
                                    description: event.message || "An error occurred",
                                    events: [event],
                                    data: event.data
                                });
                                break;

                            default:
                                // Handle other events as processing steps
                                if (["websocket_connect", "websocket_disconnect", "tool_call_start", "tool_call_complete"].includes(event.event_type)) {
                                    steps.push({
                                        id: event.id,
                                        type: "processing",
                                        timestamp: eventTime,
                                        title: "⚙️ System Event",
                                        description: event.message || "System event",
                                        events: [event],
                                        data: event.data
                                    });
                                }
                                break;
                        }
                    } catch (eventError) {
                        console.error("Error processing individual event:", eventError, event);
                    }
                });

                // Close any open steps
                if (currentStep) {
                    steps.push(currentStep as ConversationStep);
                }

                return steps;
            } catch (error) {
                console.error("Error creating conversation steps:", error);
                return [];
            }
        };
    }, []);

    // Group events into conversations by correlation_id or session_id
    const conversations = useMemo(() => {
        try {
            if (!events || events.length === 0) return [];

            const conversationMap = new Map<string, Conversation>();

            // Group events by correlation_id, session_id, or time proximity
            events.forEach(event => {
                try {
                    const groupId = event.correlation_id || event.session_id || "default";

                    if (!conversationMap.has(groupId)) {
                        conversationMap.set(groupId, {
                            id: groupId,
                            startTime: new Date(event.timestamp),
                            endTime: new Date(event.timestamp),
                            steps: [],
                            success: true,
                            sourceDocuments: []
                        });
                    }

                    const conversation = conversationMap.get(groupId)!;
                    const eventTime = new Date(event.timestamp);

                    // Update conversation timeframe
                    if (eventTime < conversation.startTime) {
                        conversation.startTime = eventTime;
                    }
                    if (!conversation.endTime || eventTime > conversation.endTime) {
                        conversation.endTime = eventTime;
                    }

                    // Extract user query
                    if (event.event_type === "user_question" && event.data?.question) {
                        conversation.userQuery = event.data.question;
                    }

                    // Extract AI response
                    if (event.event_type === "ai_response_complete" && event.data?.response) {
                        conversation.aiResponse = event.data.response;
                    }

                    // Extract source documents
                    if (event.event_type === "grounding_sources" && event.data?.retrieved_sources) {
                        conversation.sourceDocuments = event.data.retrieved_sources;
                    }

                    // Mark as failed if there's an error
                    if (event.event_type === "error") {
                        conversation.success = false;
                    }
                } catch (eventError) {
                    console.error("Error processing event in conversation grouping:", eventError, event);
                }
            });

            // Convert to conversations and create steps
            return Array.from(conversationMap.values())
                .map(conv => {
                    try {
                        const conversationEvents = events
                            .filter(
                                e =>
                                    (e.correlation_id && e.correlation_id === conv.id) ||
                                    (e.session_id && e.session_id === conv.id) ||
                                    (conv.id === "default" && !e.correlation_id && !e.session_id)
                            )
                            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                        conv.steps = createConversationSteps(conversationEvents);

                        if (conv.endTime && conv.startTime) {
                            conv.totalDuration = conv.endTime.getTime() - conv.startTime.getTime();
                        }

                        return conv;
                    } catch (convError) {
                        console.error("Error processing conversation:", convError, conv);
                        return conv;
                    }
                })
                .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
        } catch (error) {
            console.error("Error creating conversations:", error);
            return [];
        }
    }, [events, createConversationSteps]);

    const toggleConversation = (conversationId: string) => {
        const newExpanded = new Set(expandedConversations);
        if (newExpanded.has(conversationId)) {
            newExpanded.delete(conversationId);
        } else {
            newExpanded.add(conversationId);
        }
        setExpandedConversations(newExpanded);
    };

    const formatDuration = (duration?: number) => {
        if (!duration) return null;
        if (duration < 1000) return `${duration}ms`;
        return `${(duration / 1000).toFixed(2)}s`;
    };

    const formatTimestamp = (timestamp: Date) => {
        return timestamp.toLocaleTimeString("en-US", {
            timeZone: "America/Chicago",
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }) + " CST";
    };

    return (
        <div className="flex h-full flex-col bg-gray-50">
            <div className="border-b bg-white p-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                    <MessageSquare className="h-5 w-5" />
                    Conversation Flows
                </h3>
                <p className="mt-1 text-sm text-gray-600">End-to-end conversation sequences with timing and source attribution</p>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Conversations list */}
                <div className="flex-1 overflow-y-auto p-4">
                    {conversations.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">No conversations yet. Start asking questions to see the flow!</div>
                    ) : (
                        <div className="space-y-4">
                            {conversations.map(conversation => (
                                <div
                                    key={conversation.id}
                                    className={`rounded-lg border bg-white shadow-sm ${!conversation.success ? "border-red-200" : "border-gray-200"}`}
                                >
                                    {/* Conversation header */}
                                    <div
                                        onClick={() => toggleConversation(conversation.id)}
                                        className="flex cursor-pointer items-center justify-between p-4 hover:bg-gray-50"
                                    >
                                        <div className="flex items-center gap-3">
                                            {expandedConversations.has(conversation.id) ? (
                                                <ChevronDown className="h-4 w-4 text-gray-500" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 text-gray-500" />
                                            )}
                                            <div>
                                                <div className="font-medium text-gray-800">
                                                    {conversation.userQuery || `Conversation ${conversation.id.substring(0, 8)}`}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {formatTimestamp(conversation.startTime)}
                                                    {conversation.totalDuration && (
                                                        <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs">
                                                            <Clock className="mr-1 inline h-3 w-3" />
                                                            {formatDuration(conversation.totalDuration)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!conversation.success && <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">Error</span>}
                                            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">{conversation.steps.length} steps</span>
                                        </div>
                                    </div>

                                    {/* Conversation flow */}
                                    {expandedConversations.has(conversation.id) && (
                                        <div className="border-t p-4">
                                            {/* Sequence diagram */}
                                            <div className="space-y-4">
                                                {conversation.steps.map((step, index) => {
                                                    const StepIcon = STEP_ICONS[step.type];
                                                    const isLast = index === conversation.steps.length - 1;

                                                    return (
                                                        <div key={step.id} className="flex items-start gap-4">
                                                            {/* Timeline */}
                                                            <div className="flex flex-col items-center">
                                                                <div
                                                                    className={`h-8 w-8 rounded-full ${STEP_COLORS[step.type]} flex flex-shrink-0 items-center justify-center text-white`}
                                                                >
                                                                    <StepIcon className="h-4 w-4" />
                                                                </div>
                                                                {!isLast && <div className="mt-2 w-0.5 flex-1 bg-gray-300" style={{ minHeight: "24px" }} />}
                                                            </div>

                                                            {/* Step content */}
                                                            <div
                                                                className="min-w-0 flex-1 cursor-pointer rounded border border-gray-200 p-3 pb-4 hover:bg-gray-50"
                                                                onClick={() => setSelectedStep(step)}
                                                            >
                                                                <div className="mb-1 flex items-center justify-between">
                                                                    <h4 className="font-medium text-gray-800">{step.title}</h4>
                                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                        <span>{formatTimestamp(step.timestamp)}</span>
                                                                        {step.duration && (
                                                                            <span className="rounded bg-yellow-100 px-2 py-0.5 text-yellow-700">
                                                                                {formatDuration(step.duration)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <p className="mb-2 text-sm text-gray-600">{step.description}</p>

                                                                {/* Show source documents if available */}
                                                                {step.sources && step.sources.length > 0 && (
                                                                    <div className="mt-2 space-y-1">
                                                                        <p className="text-xs font-medium text-gray-700">Source Documents:</p>
                                                                        {step.sources.map((source, idx) => (
                                                                            <div key={idx} className="rounded border border-blue-200 bg-blue-50 p-2 text-xs">
                                                                                <span className="font-medium text-blue-800">{source.title}</span>
                                                                                <span className="ml-2 text-blue-600">
                                                                                    ({source.chunk_id.substring(0, 8)}...)
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Conversation summary */}
                                            {conversation.sourceDocuments.length > 0 && (
                                                <div className="mt-4 border-t pt-4">
                                                    <h5 className="mb-2 font-medium text-gray-700">📚 Knowledge Sources Used:</h5>
                                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                                        {conversation.sourceDocuments.map((doc, idx) => (
                                                            <div key={idx} className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm">
                                                                <div className="font-medium text-emerald-800">{doc.title}</div>
                                                                <div className="mt-1 text-xs text-emerald-600">ID: {doc.chunk_id.substring(0, 16)}...</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Step details sidebar */}
                {selectedStep && (
                    <div className="flex w-1/3 flex-col overflow-hidden border-l bg-white">
                        <div className="flex items-center justify-between border-b bg-gray-50 p-4">
                            <h4 className="font-semibold text-gray-800">Step Details</h4>
                            <button onClick={() => setSelectedStep(null)} className="text-gray-500 hover:text-gray-700">
                                ×
                            </button>
                        </div>
                        <div className="flex-1 space-y-4 overflow-y-auto p-4">
                            <div>
                                <h5 className="mb-2 font-medium text-gray-700">Step Info</h5>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="font-medium">Type:</span> {selectedStep.type}
                                    </div>
                                    <div>
                                        <span className="font-medium">Time:</span> {selectedStep.timestamp.toLocaleString("en-US", { timeZone: "America/Chicago", timeZoneName: "short" })}
                                    </div>
                                    {selectedStep.duration && (
                                        <div>
                                            <span className="font-medium">Duration:</span> {formatDuration(selectedStep.duration)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h5 className="mb-2 font-medium text-gray-700">Description</h5>
                                <p className="text-sm text-gray-600">{selectedStep.description}</p>
                            </div>

                            {selectedStep.events.length > 0 && (
                                <div>
                                    <h5 className="mb-2 font-medium text-gray-700">Debug Events ({selectedStep.events.length})</h5>
                                    <div className="space-y-2">
                                        {selectedStep.events.map((event, idx) => (
                                            <div key={idx} className="rounded bg-gray-50 p-2 text-xs">
                                                <div className="font-medium">{event.event_type}</div>
                                                <div className="mt-1 text-gray-600">{event.message}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedStep.data && Object.keys(selectedStep.data).length > 0 && (
                                <div>
                                    <h5 className="mb-2 font-medium text-gray-700">Data</h5>
                                    <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-gray-100 p-3 text-xs">
                                        {JSON.stringify(selectedStep.data, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
