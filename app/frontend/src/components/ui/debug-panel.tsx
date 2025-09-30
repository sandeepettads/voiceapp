import { useState, useMemo } from "react";
import { X, Settings, Search, Filter, Download, Trash2, Circle, Clock, Database, MessageSquare, AlertCircle, BarChart3, Upload, Wand2 } from "lucide-react";
import { Button } from "./button";
import useDebug from "@/hooks/useDebug";
import { DebugEvent, DebugEventType } from "@/types";
import EnhancedConversationFlow from "./enhanced-conversation-flow";
import ErrorBoundary from "./error-boundary";
import PDFUpload from "./pdf-upload";
import SystemPromptTab from "./system-prompt-tab";

type DebugPanelProps = {
    isOpen: boolean;
    onClose: () => void;
};

const EVENT_TYPE_COLORS: Record<DebugEventType, string> = {
    user_question: "bg-blue-500",
    realtime_api_received: "bg-purple-500",
    search_query_start: "bg-orange-500",
    search_query_complete: "bg-green-500",
    search_results: "bg-emerald-500",
    tool_call_start: "bg-yellow-500",
    tool_call_complete: "bg-lime-500",
    ai_response_start: "bg-indigo-500",
    ai_response_complete: "bg-blue-600",
    error: "bg-red-500",
    websocket_connect: "bg-gray-500",
    websocket_disconnect: "bg-gray-600",
    openai_api_call: "bg-cyan-500",
    azure_search_call: "bg-teal-500",
    grounding_sources: "bg-pink-500"
};

const EVENT_TYPE_ICONS: Record<DebugEventType, any> = {
    user_question: MessageSquare,
    realtime_api_received: Circle,
    search_query_start: Search,
    search_query_complete: Search,
    search_results: Database,
    tool_call_start: Settings,
    tool_call_complete: Settings,
    ai_response_start: MessageSquare,
    ai_response_complete: MessageSquare,
    error: AlertCircle,
    websocket_connect: Circle,
    websocket_disconnect: Circle,
    openai_api_call: MessageSquare,
    azure_search_call: Database,
    grounding_sources: Database
};

export default function DebugPanel({ isOpen, onClose }: DebugPanelProps) {
    const [activeTab, setActiveTab] = useState<"events" | "conversations" | "knowledge" | "system">("events");
    const [searchText, setSearchText] = useState("");
    const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<DebugEvent | null>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    const { events, stats, isConnected, error, clearEvents, filterEvents, exportEvents, getEventCounts } = useDebug({
        onDebugEvent: () => {
            if (autoScroll) {
                // Auto-scroll to bottom when new event arrives
                setTimeout(() => {
                    const container = document.getElementById("debug-events-container");
                    if (container) {
                        container.scrollTop = container.scrollHeight;
                    }
                }, 100);
            }
        }
    });

    // Filter events based on search and selected types
    const filteredEvents = useMemo(() => {
        return filterEvents({
            eventTypes: selectedEventTypes.length > 0 ? selectedEventTypes : undefined,
            searchText: searchText || undefined
        });
    }, [filterEvents, selectedEventTypes, searchText]);

    const eventCounts = useMemo(() => {
        return getEventCounts(filteredEvents);
    }, [getEventCounts, filteredEvents]);

    // Available event types from actual events
    const availableEventTypes = useMemo(() => {
        const types = new Set<string>();
        events.forEach(event => types.add(event.event_type));
        return Array.from(types).sort();
    }, [events]);

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const time = date.toLocaleTimeString("en-US", {
            timeZone: "America/Chicago",
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
        const ms = String(date.getMilliseconds()).padStart(3, "0");
        return `${time}.${ms} CST`;
    };

    const formatDuration = (duration?: number) => {
        if (!duration) return null;
        if (duration < 1000) return `${duration}ms`;
        return `${(duration / 1000).toFixed(2)}s`;
    };

    const handleEventTypeToggle = (eventType: string) => {
        setSelectedEventTypes(prev => (prev.includes(eventType) ? prev.filter(t => t !== eventType) : [...prev, eventType]));
    };

    const EventIcon = ({ eventType }: { eventType: DebugEventType }) => {
        const IconComponent = EVENT_TYPE_ICONS[eventType] || Circle;
        return <IconComponent className="h-4 w-4" />;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="flex h-5/6 w-full max-w-6xl flex-col rounded-lg bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between rounded-t-lg border-b bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                        <Settings className="h-5 w-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-800">Debug Console</h2>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Circle className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                            <span>{isConnected ? "Connected" : "Disconnected"}</span>
                            {stats && <span className="ml-4 rounded bg-gray-200 px-2 py-1 text-xs">{stats.total_events} events</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Tab Navigation */}
                        <div className="flex rounded-lg bg-gray-200 p-1">
                            <button
                                onClick={() => setActiveTab("events")}
                                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                    activeTab === "events" ? "bg-white text-gray-800 shadow-sm" : "text-gray-600 hover:text-gray-800"
                                }`}
                            >
                                <Database className="mr-1 inline h-4 w-4" />
                                Events
                            </button>
                            <button
                                onClick={() => setActiveTab("conversations")}
                                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                    activeTab === "conversations" ? "bg-white text-gray-800 shadow-sm" : "text-gray-600 hover:text-gray-800"
                                }`}
                            >
                                <BarChart3 className="mr-1 inline h-4 w-4" />
                                Flows
                            </button>
                            <button
                                onClick={() => setActiveTab("knowledge")}
                                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                    activeTab === "knowledge" ? "bg-white text-gray-800 shadow-sm" : "text-gray-600 hover:text-gray-800"
                                }`}
                            >
                                <Upload className="mr-1 inline h-4 w-4" />
                                Knowledge
                            </button>
                            <button
                                onClick={() => setActiveTab("system")}
                                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                    activeTab === "system" ? "bg-white text-gray-800 shadow-sm" : "text-gray-600 hover:text-gray-800"
                                }`}
                            >
                                <Wand2 className="mr-1 inline h-4 w-4" />
                                System
                            </button>
                        </div>
                        <Button onClick={onClose} variant="ghost" size="sm">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="border-b border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <AlertCircle className="mr-2 inline h-4 w-4" />
                        {error}
                    </div>
                )}

                {/* Controls - Only show for events tab */}
                {activeTab === "events" && (
                    <div className="space-y-3 border-b bg-gray-50 p-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="min-w-64 flex-1">
                                <input
                                    type="text"
                                    placeholder="Search events..."
                                    value={searchText}
                                    onChange={e => setSearchText(e.target.value)}
                                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <Button onClick={() => setShowFilters(!showFilters)} variant="outline" size="sm" className={showFilters ? "bg-blue-50" : ""}>
                                <Filter className="mr-1 h-4 w-4" />
                                Filters
                            </Button>
                            <Button onClick={() => exportEvents(filteredEvents)} variant="outline" size="sm">
                                <Download className="mr-1 h-4 w-4" />
                                Export
                            </Button>
                            <Button onClick={clearEvents} variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 className="mr-1 h-4 w-4" />
                                Clear
                            </Button>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="rounded" />
                                Auto-scroll
                            </label>
                        </div>

                        {/* Event Type Filters */}
                        {showFilters && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700">Event Types:</p>
                                <div className="flex flex-wrap gap-2">
                                    {availableEventTypes.map(eventType => {
                                        const count = eventCounts[eventType] || 0;
                                        const isSelected = selectedEventTypes.includes(eventType);
                                        return (
                                            <button
                                                key={eventType}
                                                onClick={() => handleEventTypeToggle(eventType)}
                                                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                                    isSelected
                                                        ? "border-blue-300 bg-blue-100 text-blue-800"
                                                        : "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                }`}
                                            >
                                                <span className={`mr-2 inline-block h-2 w-2 rounded-full ${EVENT_TYPE_COLORS[eventType as DebugEventType]}`} />
                                                {eventType} ({count})
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedEventTypes.length > 0 && (
                                    <button onClick={() => setSelectedEventTypes([])} className="text-xs text-blue-600 hover:underline">
                                        Clear all filters
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab Content */}
                <div className="flex flex-1 overflow-hidden">
                    {activeTab === "events" ? (
                        <>
                            {/* Events timeline */}
                            <div className="flex-1 overflow-hidden">
                                <div id="debug-events-container" className="h-full space-y-2 overflow-y-auto bg-gray-50 p-4">
                                    {filteredEvents.length === 0 ? (
                                        <div className="py-8 text-center text-gray-500">
                                            {events.length === 0 ? "No events yet" : "No events match your filters"}
                                        </div>
                                    ) : (
                                        filteredEvents.map(event => (
                                            <div
                                                key={event.id}
                                                onClick={() => setSelectedEvent(event)}
                                                className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                                                    selectedEvent?.id === event.id ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`rounded-full p-1.5 ${EVENT_TYPE_COLORS[event.event_type]} flex-shrink-0 text-white`}>
                                                        <EventIcon eventType={event.event_type} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="mb-1 flex items-center gap-2">
                                                            <span className="font-mono text-xs text-gray-500">{formatTimestamp(event.timestamp)}</span>
                                                            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{event.event_type}</span>
                                                            {event.duration_ms && (
                                                                <span className="flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                                                                    <Clock className="h-3 w-3" />
                                                                    {formatDuration(event.duration_ms)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="truncate text-sm text-gray-800">{event.message}</p>
                                                        {event.data && Object.keys(event.data).length > 0 && (
                                                            <p className="mt-1 truncate text-xs text-gray-500">Data: {Object.keys(event.data).join(", ")}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Event details sidebar */}
                            {selectedEvent && (
                                <div className="flex w-1/3 flex-col overflow-hidden border-l bg-white">
                                    <div className="relative border-b bg-gray-50 p-4">
                                        <h3 className="font-semibold text-gray-800">Event Details</h3>
                                        <button onClick={() => setSelectedEvent(null)} className="absolute right-2 top-2 text-gray-500 hover:text-gray-700">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="flex-1 space-y-4 overflow-y-auto p-4">
                                        <div>
                                            <h4 className="mb-2 text-sm font-medium text-gray-700">Basic Info</h4>
                                            <div className="space-y-2 text-sm">
                                                <div>
                                                    <span className="font-medium">ID:</span> {selectedEvent.id}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Timestamp:</span> {new Date(selectedEvent.timestamp).toLocaleString("en-US", { timeZone: "America/Chicago", timeZoneName: "short" })}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Type:</span> {selectedEvent.event_type}
                                                </div>
                                                {selectedEvent.duration_ms && (
                                                    <div>
                                                        <span className="font-medium">Duration:</span> {formatDuration(selectedEvent.duration_ms)}
                                                    </div>
                                                )}
                                                {selectedEvent.session_id && (
                                                    <div>
                                                        <span className="font-medium">Session:</span> {selectedEvent.session_id}
                                                    </div>
                                                )}
                                                {selectedEvent.correlation_id && (
                                                    <div>
                                                        <span className="font-medium">Correlation:</span> {selectedEvent.correlation_id}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="mb-2 text-sm font-medium text-gray-700">Message</h4>
                                            <p className="whitespace-pre-wrap text-sm text-gray-800">{selectedEvent.message}</p>
                                        </div>

                                        {selectedEvent.data && Object.keys(selectedEvent.data).length > 0 && (
                                            <div>
                                                <h4 className="mb-2 text-sm font-medium text-gray-700">Data</h4>
                                                <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-gray-100 p-3 text-xs">
                                                    {JSON.stringify(selectedEvent.data, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : activeTab === "knowledge" ? (
                        /* Knowledge Base Upload Tab */
                        <div className="flex-1 overflow-hidden">
                            <div className="h-full overflow-y-auto bg-gray-50 p-4">
                                <div className="mx-auto max-w-2xl">
                                    <div className="rounded-lg bg-white p-6 shadow-sm">
                                        <PDFUpload
                                            onUploadComplete={(result) => {
                                                // You can add any additional handling here
                                                console.log('PDF upload completed:', result);
                                            }}
                                        />
                                    </div>
                                    
                                    {/* Information panel */}
                                    <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
                                        <h4 className="text-sm font-medium text-blue-800 mb-2">Knowledge Base Information</h4>
                                        <div className="text-xs text-blue-700 space-y-1">
                                            <p>• Documents are uploaded to the <code className="bg-blue-100 px-1 rounded">GPTKBINDEX</code> Azure Search index</p>
                                            <p>• Existing documents in the knowledge base are not affected</p>
                                            <p>• PDFs are automatically processed into searchable chunks</p>
                                            <p>• Uploaded documents become immediately available for AI queries</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === "system" ? (
                        /* System Prompt Override Tab */
                        <SystemPromptTab />
                    ) : (
                        /* Enhanced Conversation Flow Tab */
                        <ErrorBoundary>
                            <EnhancedConversationFlow events={events || []} />
                        </ErrorBoundary>
                    )}
                </div>
            </div>
        </div>
    );
}
