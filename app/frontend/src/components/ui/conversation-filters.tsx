import { useState, useMemo } from "react";
import { Filter, Clock, AlertCircle, Search, Layers, Activity, X, RotateCcw } from "lucide-react";
import { DebugEvent } from "@/types";

type ConversationFiltersProps = {
    events: DebugEvent[];
    onFiltersChange: (filters: ConversationFilters) => void;
    currentFilters: ConversationFilters;
};

export type ConversationFilters = {
    services: string[];
    timeRange: {
        start?: Date;
        end?: Date;
    };
    status: "all" | "success" | "error" | "in_progress";
    duration: {
        min?: number;
        max?: number;
    };
    searchText: string;
    sortBy: "timestamp" | "duration" | "steps" | "services";
    sortOrder: "asc" | "desc";
    groupBy: "none" | "service" | "time" | "status";
};

export const DEFAULT_FILTERS: ConversationFilters = {
    services: [],
    timeRange: {},
    status: "all",
    duration: {},
    searchText: "",
    sortBy: "timestamp",
    sortOrder: "desc",
    groupBy: "none"
};

export default function ConversationFilters({ events, onFiltersChange, currentFilters }: ConversationFiltersProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Extract available services from events
    const availableServices = useMemo(() => {
        const services = new Set<string>();
        events.forEach(event => {
            switch (event.event_type) {
                case "openai_api_call":
                    if (event.data?.deployment?.includes("realtime")) {
                        services.add("gpt-4o-realtime");
                    } else {
                        services.add("gpt-4o");
                    }
                    break;
                case "azure_search_call":
                    services.add("azure-search");
                    break;
                case "realtime_api_received":
                    if (event.data?.message_type === "input_audio_transcription") {
                        services.add("whisper-1");
                    } else {
                        services.add("gpt-4o-realtime");
                    }
                    break;
                case "grounding_sources":
                    services.add("azure-search");
                    break;
                case "websocket_connect":
                case "websocket_disconnect":
                    services.add("websocket");
                    break;
                default:
                    if (event.data?.embedding || event.message?.includes("embedding")) {
                        services.add("text-embedding-3-large");
                    }
                    break;
            }
        });
        return Array.from(services).sort();
    }, [events]);

    const updateFilters = (updates: Partial<ConversationFilters>) => {
        onFiltersChange({ ...currentFilters, ...updates });
    };

    const clearFilters = () => {
        onFiltersChange(DEFAULT_FILTERS);
    };

    const toggleService = (service: string) => {
        const newServices = currentFilters.services.includes(service)
            ? currentFilters.services.filter(s => s !== service)
            : [...currentFilters.services, service];
        updateFilters({ services: newServices });
    };

    const hasActiveFilters = useMemo(() => {
        return (
            currentFilters.services.length > 0 ||
            currentFilters.searchText.length > 0 ||
            currentFilters.status !== "all" ||
            currentFilters.duration.min !== undefined ||
            currentFilters.duration.max !== undefined ||
            currentFilters.timeRange.start !== undefined ||
            currentFilters.groupBy !== "none"
        );
    }, [currentFilters]);

    return (
        <div className="border-b bg-gray-50">
            {/* Filter Header */}
            <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                    >
                        <Filter className="h-4 w-4" />
                        Filters & Grouping
                        {isExpanded ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                    </button>

                    {hasActiveFilters && (
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                            {currentFilters.services.length +
                                (currentFilters.searchText ? 1 : 0) +
                                (currentFilters.status !== "all" ? 1 : 0) +
                                (currentFilters.duration.min ? 1 : 0) +
                                (currentFilters.groupBy !== "none" ? 1 : 0)}{" "}
                            active
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Quick Sort */}
                    <select
                        value={`${currentFilters.sortBy}-${currentFilters.sortOrder}`}
                        onChange={e => {
                            const [sortBy, sortOrder] = e.target.value.split("-") as [any, "asc" | "desc"];
                            updateFilters({ sortBy, sortOrder });
                        }}
                        className="rounded border border-gray-300 px-2 py-1 text-xs"
                    >
                        <option value="timestamp-desc">Latest First</option>
                        <option value="timestamp-asc">Oldest First</option>
                        <option value="duration-desc">Longest Duration</option>
                        <option value="duration-asc">Shortest Duration</option>
                        <option value="steps-desc">Most Steps</option>
                        <option value="services-desc">Most Services</option>
                    </select>

                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                            <RotateCcw className="h-3 w-3" />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Expanded Filter Controls */}
            {isExpanded && (
                <div className="space-y-4 border-t p-4">
                    {/* Search and Status */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Search */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Search Conversations</label>
                            <input
                                type="text"
                                placeholder="Search by user query, response, or content..."
                                value={currentFilters.searchText}
                                onChange={e => updateFilters({ searchText: e.target.value })}
                                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                            <select
                                value={currentFilters.status}
                                onChange={e => updateFilters({ status: e.target.value as any })}
                                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Conversations</option>
                                <option value="success">Successful Only</option>
                                <option value="error">With Errors</option>
                                <option value="in_progress">In Progress</option>
                            </select>
                        </div>
                    </div>

                    {/* Services Filter */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Services Used</label>
                        <div className="flex flex-wrap gap-2">
                            {availableServices.map(service => {
                                const isSelected = currentFilters.services.includes(service);
                                return (
                                    <button
                                        key={service}
                                        onClick={() => toggleService(service)}
                                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                            isSelected ? "border-blue-300 bg-blue-100 text-blue-800" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                        }`}
                                    >
                                        <Layers className="mr-1 inline h-3 w-3" />
                                        {service}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Quick Filters */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Quick Filters</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() =>
                                    updateFilters({
                                        status: "error",
                                        services: [],
                                        searchText: ""
                                    })
                                }
                                className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1.5 text-xs text-red-700 hover:bg-red-200"
                            >
                                <AlertCircle className="h-3 w-3" />
                                Show Errors Only
                            </button>

                            <button
                                onClick={() =>
                                    updateFilters({
                                        services: ["gpt-4o-realtime"],
                                        status: "all"
                                    })
                                }
                                className="flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1.5 text-xs text-purple-700 hover:bg-purple-200"
                            >
                                <Activity className="h-3 w-3" />
                                Real-time Only
                            </button>

                            <button
                                onClick={() =>
                                    updateFilters({
                                        duration: { min: 1000 }, // Over 1 second
                                        status: "all"
                                    })
                                }
                                className="flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1.5 text-xs text-yellow-700 hover:bg-yellow-200"
                            >
                                <Clock className="h-3 w-3" />
                                Slow Responses
                            </button>

                            <button
                                onClick={() =>
                                    updateFilters({
                                        services: ["azure-search"],
                                        status: "all"
                                    })
                                }
                                className="flex items-center gap-1 rounded-full bg-cyan-100 px-3 py-1.5 text-xs text-cyan-700 hover:bg-cyan-200"
                            >
                                <Search className="h-3 w-3" />
                                With Search
                            </button>
                        </div>
                    </div>

                    {/* Active Filters Summary */}
                    {hasActiveFilters && (
                        <div className="border-t pt-3">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">Active Filters:</span>
                                <button onClick={clearFilters} className="text-xs text-blue-600 underline hover:text-blue-700">
                                    Clear All
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {currentFilters.services.map(service => (
                                    <span key={service} className="flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
                                        {service}
                                        <button onClick={() => toggleService(service)} className="rounded hover:bg-blue-200">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}

                                {currentFilters.searchText && (
                                    <span className="flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                                        Search: "{currentFilters.searchText}"
                                        <button onClick={() => updateFilters({ searchText: "" })} className="rounded hover:bg-green-200">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}

                                {currentFilters.status !== "all" && (
                                    <span className="flex items-center gap-1 rounded bg-orange-100 px-2 py-1 text-xs text-orange-700">
                                        Status: {currentFilters.status}
                                        <button onClick={() => updateFilters({ status: "all" })} className="rounded hover:bg-orange-200">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
