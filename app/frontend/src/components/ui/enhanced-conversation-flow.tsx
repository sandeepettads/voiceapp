import { useState, useMemo } from "react";
import {
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    MessageSquare,
    Search,
    Volume2,
    Clock,
    User,
    Bot,
    Server,
    Filter,
    Play,
    Pause,
    Layers,
    ArrowDown,
    Activity
} from "lucide-react";
import { DebugEvent, DebugEventType } from "@/types";
import ServiceTracker from "./service-tracker";
import ConversationFilters, { ConversationFilters as FilterType, DEFAULT_FILTERS } from "./conversation-filters-fixed";

type EnhancedConversationFlowProps = {
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
    services: string[]; // Services involved in this step
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
    servicesUsed: string[];
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

export default function EnhancedConversationFlow({ events }: EnhancedConversationFlowProps) {
    const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());
    const [selectedStep, setSelectedStep] = useState<ConversationStep | null>(null);
    const [navigationMode, setNavigationMode] = useState<'timeline' | 'sequence' | 'services'>('sequence');
    const [autoPlay, setAutoPlay] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [filterByService, setFilterByService] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed');
    const [advancedFilters, setAdvancedFilters] = useState<FilterType>(DEFAULT_FILTERS);

    // Function definitions first to avoid initialization errors
    const extractServicesFromEvent = (event: DebugEvent): string[] => {
        const services: string[] = [];
        
        switch (event.event_type) {
            case 'openai_api_call':
                if (event.data?.deployment?.includes('realtime')) {
                    services.push('gpt-4o-realtime');
                } else {
                    services.push('gpt-4o');
                }
                break;
            case 'azure_search_call':
                services.push('azure-search');
                break;
            case 'realtime_api_received':
                if (event.data?.message_type === 'input_audio_transcription') {
                    services.push('whisper-1');
                } else {
                    services.push('gpt-4o-realtime');
                }
                break;
            case 'grounding_sources':
                services.push('azure-search');
                break;
            case 'websocket_connect':
            case 'websocket_disconnect':
                services.push('websocket');
                break;
            default:
                if (event.data?.embedding || event.message?.includes('embedding')) {
                    services.push('text-embedding-3-large');
                }
                break;
        }
        
        return services;
    };

    const createEnhancedConversationSteps = (events: DebugEvent[]): ConversationStep[] => {
        const steps: ConversationStep[] = [];
        let currentStep: Partial<ConversationStep> | null = null;

        events.forEach((event) => {
            const eventTime = new Date(event.timestamp);
            const services = extractServicesFromEvent(event);

            switch (event.event_type as DebugEventType) {
                case 'user_question':
                    steps.push({
                        id: event.id,
                        type: 'user_input',
                        timestamp: eventTime,
                        title: '🎤 User Question',
                        description: event.data?.question || event.message || 'User question',
                        events: [event],
                        data: event.data,
                        services: ['whisper-1'], // Transcription service
                    });
                    break;
                    
                case 'search_query_start':
                case 'azure_search_call':
                    if (!currentStep || currentStep.type !== 'search') {
                        currentStep = {
                            id: event.id,
                            type: 'search',
                            timestamp: eventTime,
                            title: '🔍 Knowledge Base Search',
                            description: `Searching: "${event.data?.search_query || event.data?.query || 'knowledge base'}"`,
                            events: [event],
                            data: event.data,
                            services: ['azure-search', 'text-embedding-3-large'],
                        };
                    } else {
                        currentStep.events?.push(event);
                        currentStep.services = [...new Set([...(currentStep.services || []), ...services])];
                    }
                    break;
                    
                case 'search_query_complete':
                    if (currentStep && currentStep.type === 'search') {
                        currentStep.events?.push(event);
                        currentStep.duration = event.duration_ms;
                        const resultsCount = event.data?.results_count || 0;
                        currentStep.description += ` → Found ${resultsCount} results`;
                        steps.push(currentStep as ConversationStep);
                        currentStep = null;
                    }
                    break;
                    
                case 'grounding_sources':
                    steps.push({
                        id: event.id,
                        type: 'search',
                        timestamp: eventTime,
                        title: '📄 Source Retrieval',
                        description: `Retrieved ${event.data?.retrieved_sources?.length || 0} source documents`,
                        events: [event],
                        data: event.data,
                        sources: event.data?.retrieved_sources,
                        services: ['azure-search'],
                    });
                    break;
                    
                case 'openai_api_call':
                case 'ai_response_start':
                    if (!currentStep || currentStep.type !== 'ai_response') {
                        const isRealtime = event.data?.deployment?.includes('realtime') || 
                                          event.event_type === 'realtime_api_received';
                        currentStep = {
                            id: event.id,
                            type: 'ai_response',
                            timestamp: eventTime,
                            title: isRealtime ? '🚀 Real-time AI Processing' : '🤖 AI Processing',
                            description: isRealtime 
                                ? 'Generating real-time response with GPT-4o Realtime...'
                                : 'Generating response with GPT-4o...',
                            events: [event],
                            data: event.data,
                            services: isRealtime ? ['gpt-4o-realtime'] : ['gpt-4o'],
                        };
                    } else {
                        currentStep.events?.push(event);
                        currentStep.services = [...new Set([...(currentStep.services || []), ...services])];
                    }
                    break;
                    
                case 'ai_response_complete':
                    if (currentStep && currentStep.type === 'ai_response') {
                        currentStep.events?.push(event);
                        currentStep.duration = event.duration_ms;
                        const response = event.data?.response || '';
                        currentStep.description = `Generated response: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`;
                        steps.push(currentStep as ConversationStep);
                        currentStep = null;
                    } else {
                        steps.push({
                            id: event.id,
                            type: 'ai_response',
                            timestamp: eventTime,
                            title: '🤖 AI Response',
                            description: (event.data?.response?.substring(0, 100) || 'Response generated') + (event.data?.response?.length > 100 ? '...' : ''),
                            events: [event],
                            data: event.data,
                            duration: event.duration_ms,
                            services: services,
                        });
                    }
                    break;
                    
                case 'realtime_api_received':
                    if (event.message?.includes('audio') || event.data?.message_type === 'audio') {
                        steps.push({
                            id: event.id,
                            type: 'audio_output',
                            timestamp: eventTime,
                            title: '🔊 Audio Response',
                            description: 'Converting response to speech...',
                            events: [event],
                            data: event.data,
                            services: ['gpt-4o-realtime'],
                        });
                    } else {
                        steps.push({
                            id: event.id,
                            type: 'processing',
                            timestamp: eventTime,
                            title: '⚡ Real-time Processing',
                            description: event.message || 'Processing...',
                            events: [event],
                            data: event.data,
                            services: services,
                        });
                    }
                    break;
                    
                case 'error':
                    steps.push({
                        id: event.id,
                        type: 'error',
                        timestamp: eventTime,
                        title: '❌ Error',
                        description: event.message || 'An error occurred',
                        events: [event],
                        data: event.data,
                        services: services,
                    });
                    break;
                    
                default:
                    if (['websocket_connect', 'websocket_disconnect', 'tool_call_start', 'tool_call_complete'].includes(event.event_type)) {
                        steps.push({
                            id: event.id,
                            type: 'processing',
                            timestamp: eventTime,
                            title: '⚙️ System Event',
                            description: event.message || 'System event',
                            events: [event],
                            data: event.data,
                            services: services,
                        });
                    }
                    break;
            }
        });

        // Close any open steps
        if (currentStep) {
            steps.push(currentStep as ConversationStep);
        }

        return steps;
    };

    // Enhanced conversation processing with service tracking
    const conversations = useMemo(() => {
        if (!events || events.length === 0) return [];

        const conversationMap = new Map<string, Conversation>();

        events.forEach(event => {
            const groupId = event.correlation_id || event.session_id || "default";

            if (!conversationMap.has(groupId)) {
                conversationMap.set(groupId, {
                    id: groupId,
                    startTime: new Date(event.timestamp),
                    endTime: new Date(event.timestamp),
                    steps: [],
                    success: true,
                    sourceDocuments: [],
                    servicesUsed: []
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

            // Track services used
            const services = extractServicesFromEvent(event);
            services.forEach(service => {
                if (!conversation.servicesUsed.includes(service)) {
                    conversation.servicesUsed.push(service);
                }
            });

            // Mark as failed if there's an error
            if (event.event_type === "error") {
                conversation.success = false;
            }
        });

        // Convert to conversations and create enhanced steps
        return Array.from(conversationMap.values())
            .map(conv => {
                const conversationEvents = events
                    .filter(
                        e =>
                            (e.correlation_id && e.correlation_id === conv.id) ||
                            (e.session_id && e.session_id === conv.id) ||
                            (conv.id === "default" && !e.correlation_id && !e.session_id)
                    )
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                conv.steps = createEnhancedConversationSteps(conversationEvents);

                if (conv.endTime && conv.startTime) {
                    conv.totalDuration = conv.endTime.getTime() - conv.startTime.getTime();
                }

                return conv;
            })
            .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    }, [events]);

    // Advanced filtering and sorting of conversations
    const filteredConversations = useMemo(() => {
        let filtered = [...conversations];

        // Apply advanced filters
        if (advancedFilters.services.length > 0) {
            filtered = filtered.filter(conv => advancedFilters.services.some(service => conv.servicesUsed.includes(service)));
        }

        // Apply search text filter
        if (advancedFilters.searchText.trim()) {
            const searchLower = advancedFilters.searchText.toLowerCase();
            filtered = filtered.filter(
                conv =>
                    conv.userQuery?.toLowerCase().includes(searchLower) ||
                    conv.aiResponse?.toLowerCase().includes(searchLower) ||
                    conv.steps.some(step => step.title.toLowerCase().includes(searchLower) || step.description.toLowerCase().includes(searchLower))
            );
        }

        // Apply status filter
        if (advancedFilters.status !== "all") {
            switch (advancedFilters.status) {
                case "success":
                    filtered = filtered.filter(conv => conv.success);
                    break;
                case "error":
                    filtered = filtered.filter(conv => !conv.success);
                    break;
                case "in_progress":
                    // For now, consider conversations without end time as in progress
                    filtered = filtered.filter(conv => !conv.endTime);
                    break;
            }
        }

        // Apply duration filters
        if (advancedFilters.duration.min || advancedFilters.duration.max) {
            filtered = filtered.filter(conv => {
                const duration = conv.totalDuration || 0;
                const min = advancedFilters.duration.min || 0;
                const max = advancedFilters.duration.max || Infinity;
                return duration >= min && duration <= max;
            });
        }

        // Apply time range filter
        if (advancedFilters.timeRange.start || advancedFilters.timeRange.end) {
            filtered = filtered.filter(conv => {
                const startTime = conv.startTime.getTime();
                const rangeStart = advancedFilters.timeRange.start?.getTime() || 0;
                const rangeEnd = advancedFilters.timeRange.end?.getTime() || Date.now();
                return startTime >= rangeStart && startTime <= rangeEnd;
            });
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0;

            switch (advancedFilters.sortBy) {
                case "timestamp":
                    comparison = a.startTime.getTime() - b.startTime.getTime();
                    break;
                case "duration":
                    comparison = (a.totalDuration || 0) - (b.totalDuration || 0);
                    break;
                case "steps":
                    comparison = a.steps.length - b.steps.length;
                    break;
                case "services":
                    comparison = a.servicesUsed.length - b.servicesUsed.length;
                    break;
                default:
                    comparison = a.startTime.getTime() - b.startTime.getTime();
            }

            return advancedFilters.sortOrder === "desc" ? -comparison : comparison;
        });

        // Legacy service filter for backwards compatibility
        if (filterByService && !advancedFilters.services.includes(filterByService)) {
            filtered = filtered.filter(conv => conv.servicesUsed.includes(filterByService));
        }

        return filtered;
    }, [conversations, advancedFilters, filterByService]);

    // Get all unique services across conversations
    const allServices = useMemo(() => {
        const services = new Set<string>();
        conversations.forEach(conv => {
            conv.servicesUsed.forEach(service => services.add(service));
        });
        return Array.from(services).sort();
    }, [conversations]);

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

    const navigateStep = (direction: "prev" | "next") => {
        const allSteps = filteredConversations.flatMap(conv => conv.steps);
        if (direction === "next" && currentStepIndex < allSteps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
            setSelectedStep(allSteps[currentStepIndex + 1]);
        } else if (direction === "prev" && currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
            setSelectedStep(allSteps[currentStepIndex - 1]);
        }
    };

    return (
        <div className="flex h-full flex-col bg-gray-50">
            {/* Enhanced Header with Navigation Controls */}
            <div className="border-b bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                            <Activity className="h-5 w-5" />
                            Enhanced Conversation Flows
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">Complete service visualization with enhanced navigation</p>
                    </div>

                    {/* View Mode Controls */}
                    <div className="flex items-center gap-2">
                        <div className="flex rounded-lg bg-gray-200 p-1">
                            <button
                                onClick={() => setNavigationMode("sequence")}
                                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                    navigationMode === "sequence" ? "bg-white text-gray-800 shadow-sm" : "text-gray-600 hover:text-gray-800"
                                }`}
                            >
                                Sequence
                            </button>
                            <button
                                onClick={() => setNavigationMode("timeline")}
                                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                    navigationMode === "timeline" ? "bg-white text-gray-800 shadow-sm" : "text-gray-600 hover:text-gray-800"
                                }`}
                            >
                                Timeline
                            </button>
                            <button
                                onClick={() => setNavigationMode("services")}
                                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                    navigationMode === "services" ? "bg-white text-gray-800 shadow-sm" : "text-gray-600 hover:text-gray-800"
                                }`}
                            >
                                Services
                            </button>
                        </div>

                        <div className="flex rounded-lg bg-gray-200 p-1">
                            <button
                                onClick={() => setViewMode("detailed")}
                                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                    viewMode === "detailed" ? "bg-white text-gray-800 shadow-sm" : "text-gray-600 hover:text-gray-800"
                                }`}
                            >
                                Detailed
                            </button>
                            <button
                                onClick={() => setViewMode("compact")}
                                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                    viewMode === "compact" ? "bg-white text-gray-800 shadow-sm" : "text-gray-600 hover:text-gray-800"
                                }`}
                            >
                                Compact
                            </button>
                        </div>
                    </div>
                </div>

                {/* ConversationFilters integration */}
                {navigationMode !== "services" && <ConversationFilters events={events} currentFilters={advancedFilters} onFiltersChange={setAdvancedFilters} />}

                {/* Service Filter and Navigation */}
                <div className="mt-4 flex flex-wrap items-center gap-4">
                    {/* Service Filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <select
                            value={filterByService || ""}
                            onChange={e => setFilterByService(e.target.value || null)}
                            className="rounded border border-gray-300 px-2 py-1 text-sm"
                        >
                            <option value="">All Services</option>
                            {allServices.map(service => (
                                <option key={service} value={service}>
                                    {service}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Step Navigation */}
                    {selectedStep && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigateStep("prev")}
                                disabled={currentStepIndex === 0}
                                className="rounded bg-gray-200 p-1 hover:bg-gray-300 disabled:opacity-50"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-sm text-gray-600">
                                Step {currentStepIndex + 1} of {filteredConversations.flatMap(c => c.steps).length}
                            </span>
                            <button
                                onClick={() => navigateStep("next")}
                                disabled={currentStepIndex === filteredConversations.flatMap(c => c.steps).length - 1}
                                className="rounded bg-gray-200 p-1 hover:bg-gray-300 disabled:opacity-50"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* Auto-play Control */}
                    <button
                        onClick={() => setAutoPlay(!autoPlay)}
                        className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm ${
                            autoPlay ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                        }`}
                    >
                        {autoPlay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {autoPlay ? "Pause" : "Play"}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto">
                    {navigationMode === "services" ? (
                        <div className="p-4">
                            <ServiceTracker events={events} />
                        </div>
                    ) : (
                        <div className="p-4">
                            {filteredConversations.length === 0 ? (
                                <div className="py-8 text-center text-gray-500">
                                    {filterByService
                                        ? `No conversations found using ${filterByService}`
                                        : "No conversations yet. Start asking questions to see the flow!"}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredConversations.map(conversation => (
                                        <div
                                            key={conversation.id}
                                            className={`rounded-lg border bg-white shadow-sm ${!conversation.success ? "border-red-200" : "border-gray-200"}`}
                                        >
                                            {/* Enhanced Conversation Header */}
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
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-800">
                                                            {conversation.userQuery || `Conversation ${conversation.id.substring(0, 8)}`}
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                                            <span>{formatTimestamp(conversation.startTime)}</span>
                                                            {conversation.totalDuration && (
                                                                <span className="flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs">
                                                                    <Clock className="h-3 w-3" />
                                                                    {formatDuration(conversation.totalDuration)}
                                                                </span>
                                                            )}
                                                            {/* Services Used */}
                                                            <div className="flex items-center gap-1">
                                                                <Layers className="h-3 w-3 text-gray-400" />
                                                                <span className="text-xs">{conversation.servicesUsed.length} services</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {!conversation.success && (
                                                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">Error</span>
                                                    )}
                                                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                                                        {conversation.steps.length} steps
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Enhanced Conversation Flow */}
                                            {expandedConversations.has(conversation.id) && (
                                                <div className="border-t">
                                                    {/* Services Used in This Conversation */}
                                                    <div className="border-b bg-gray-50 p-4">
                                                        <h5 className="mb-2 text-sm font-medium text-gray-700">Services Used:</h5>
                                                        <div className="flex flex-wrap gap-2">
                                                            {conversation.servicesUsed.map(service => (
                                                                <span
                                                                    key={service}
                                                                    className="rounded border border-gray-300 bg-white px-2 py-1 font-mono text-xs"
                                                                >
                                                                    {service}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="p-4">
                                                        {navigationMode === "timeline" ? (
                                                            /* Timeline View */
                                                            <div className="space-y-2">
                                                                {conversation.steps.map((step, index) => {
                                                                    const StepIcon = STEP_ICONS[step.type];
                                                                    const isSelected = selectedStep?.id === step.id;

                                                                    return (
                                                                        <div
                                                                            key={step.id}
                                                                            className={`flex cursor-pointer items-center gap-3 rounded border p-3 transition-colors ${
                                                                                isSelected
                                                                                    ? "border-blue-300 bg-blue-50"
                                                                                    : "border-gray-200 bg-white hover:bg-gray-50"
                                                                            }`}
                                                                            onClick={() => {
                                                                                setSelectedStep(step);
                                                                                setCurrentStepIndex(filteredConversations.flatMap(c => c.steps).indexOf(step));
                                                                            }}
                                                                        >
                                                                            <div
                                                                                className={`h-6 w-6 rounded-full ${STEP_COLORS[step.type]} flex flex-shrink-0 items-center justify-center text-white`}
                                                                            >
                                                                                <StepIcon className="h-3 w-3" />
                                                                            </div>
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                                                                                    <span>{formatTimestamp(step.timestamp)}</span>
                                                                                    {step.duration && (
                                                                                        <span className="rounded bg-yellow-100 px-1 py-0.5 text-yellow-700">
                                                                                            {formatDuration(step.duration)}
                                                                                        </span>
                                                                                    )}
                                                                                    {/* Services for this step */}
                                                                                    <div className="flex gap-1">
                                                                                        {step.services.map(service => (
                                                                                            <span
                                                                                                key={service}
                                                                                                className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs text-gray-600"
                                                                                            >
                                                                                                {service}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-sm font-medium text-gray-800">{step.title}</div>
                                                                                {viewMode === "detailed" && (
                                                                                    <div className="mt-1 text-xs text-gray-600">{step.description}</div>
                                                                                )}
                                                                            </div>
                                                                            <div className="text-xs text-gray-400">#{index + 1}</div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            /* Sequence Diagram View */
                                                            <div className="space-y-4">
                                                                {conversation.steps.map((step, index) => {
                                                                    const StepIcon = STEP_ICONS[step.type];
                                                                    const isLast = index === conversation.steps.length - 1;
                                                                    const isSelected = selectedStep?.id === step.id;

                                                                    return (
                                                                        <div key={step.id} className="flex items-start gap-4">
                                                                            {/* Enhanced Timeline */}
                                                                            <div className="flex flex-col items-center">
                                                                                <div
                                                                                    className={`h-10 w-10 rounded-full ${STEP_COLORS[step.type]} flex flex-shrink-0 items-center justify-center text-white ${
                                                                                        isSelected ? "ring-2 ring-blue-400" : ""
                                                                                    }`}
                                                                                >
                                                                                    <StepIcon className="h-5 w-5" />
                                                                                </div>
                                                                                {!isLast && (
                                                                                    <div
                                                                                        className="mt-2 w-0.5 flex-1 bg-gray-300"
                                                                                        style={{ minHeight: "32px" }}
                                                                                    >
                                                                                        <ArrowDown className="mx-auto mt-2 h-3 w-3 text-gray-400" />
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {/* Enhanced Step Content */}
                                                                            <div
                                                                                className={`min-w-0 flex-1 cursor-pointer rounded border p-4 pb-4 transition-all ${
                                                                                    isSelected
                                                                                        ? "border-blue-300 bg-blue-50 shadow-sm"
                                                                                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                                                                                }`}
                                                                                onClick={() => {
                                                                                    setSelectedStep(step);
                                                                                    setCurrentStepIndex(
                                                                                        filteredConversations.flatMap(c => c.steps).indexOf(step)
                                                                                    );
                                                                                }}
                                                                            >
                                                                                <div className="mb-2 flex items-center justify-between">
                                                                                    <h4 className="flex items-center gap-2 font-medium text-gray-800">
                                                                                        {step.title}
                                                                                        <span className="text-xs text-gray-400">#{index + 1}</span>
                                                                                    </h4>
                                                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                                        <span>{formatTimestamp(step.timestamp)}</span>
                                                                                        {step.duration && (
                                                                                            <span className="flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5 text-yellow-700">
                                                                                                <Clock className="h-3 w-3" />
                                                                                                {formatDuration(step.duration)}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>

                                                                                <p className="mb-3 text-sm text-gray-600">{step.description}</p>

                                                                                {/* Services Used in This Step */}
                                                                                {step.services.length > 0 && (
                                                                                    <div className="mb-3">
                                                                                        <div className="mb-1 text-xs font-medium text-gray-700">Services:</div>
                                                                                        <div className="flex flex-wrap gap-1">
                                                                                            {step.services.map(service => (
                                                                                                <span
                                                                                                    key={service}
                                                                                                    className="rounded bg-blue-100 px-2 py-0.5 font-mono text-xs text-blue-700"
                                                                                                >
                                                                                                    {service}
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                                {/* Show source documents if available */}
                                                                                {step.sources && step.sources.length > 0 && (
                                                                                    <div className="mt-2 space-y-1">
                                                                                        <p className="text-xs font-medium text-gray-700">Source Documents:</p>
                                                                                        {step.sources.map((source, idx) => (
                                                                                            <div
                                                                                                key={idx}
                                                                                                className="rounded border border-blue-200 bg-blue-50 p-2 text-xs"
                                                                                            >
                                                                                                <span className="font-medium text-blue-800">
                                                                                                    {source.title}
                                                                                                </span>
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
                                                        )}

                                                        {/* Enhanced Conversation Summary */}
                                                        {conversation.sourceDocuments.length > 0 && (
                                                            <div className="mt-4 border-t pt-4">
                                                                <h5 className="mb-2 font-medium text-gray-700">📚 Knowledge Sources Used:</h5>
                                                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                                                    {conversation.sourceDocuments.map((doc, idx) => (
                                                                        <div key={idx} className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm">
                                                                            <div className="font-medium text-emerald-800">{doc.title}</div>
                                                                            <div className="mt-1 text-xs text-emerald-600">
                                                                                ID: {doc.chunk_id.substring(0, 16)}...
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Enhanced Step Details Sidebar */}
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

                            {/* Services Breakdown */}
                            {selectedStep.services.length > 0 && (
                                <div>
                                    <h5 className="mb-2 font-medium text-gray-700">Services Involved</h5>
                                    <div className="space-y-2">
                                        {selectedStep.services.map(service => (
                                            <div key={service} className="flex items-center gap-2 text-sm">
                                                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                                <span className="font-mono">{service}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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
                                                {event.duration_ms && <div className="mt-1 text-yellow-600">Duration: {formatDuration(event.duration_ms)}</div>}
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
