import { useMemo } from "react";
import { Brain, Database, Mic, Search, MessageSquare, Zap, Server, Network, CheckCircle, AlertCircle, Clock, ArrowRight, ArrowDown, Volume2 } from "lucide-react";
import { DebugEvent } from "@/types";

type ServiceInfo = {
    id: string;
    name: string;
    type: "ai_model" | "search" | "embedding" | "audio" | "infrastructure" | "storage";
    icon: React.ComponentType<any>;
    color: string;
    status: "active" | "idle" | "error";
    description: string;
    model?: string;
    endpoint?: string;
    deployment?: string;
    version?: string;
    lastActivity?: Date;
    totalCalls?: number;
    avgDuration?: number;
    errorCount?: number;
};

type ServiceTrackerProps = {
    events: DebugEvent[];
    conversationId?: string;
};

const SERVICE_DEFINITIONS: Record<string, Omit<ServiceInfo, "id" | "status" | "lastActivity" | "totalCalls" | "avgDuration" | "errorCount">> = {
    "gpt-4o": {
        name: "GPT-4o",
        type: "ai_model",
        icon: Brain,
        color: "bg-green-500",
        description: "Primary conversational AI model",
        model: "gpt-4o"
    },
    "gpt-4o-realtime": {
        name: "GPT-4o Realtime",
        type: "ai_model",
        icon: Zap,
        color: "bg-purple-500",
        description: "Real-time audio conversation model",
        model: "gpt-4o-realtime-preview"
    },
    "whisper-1": {
        name: "Whisper",
        type: "ai_model",
        icon: Mic,
        color: "bg-blue-500",
        description: "Speech-to-text transcription",
        model: "whisper-1"
    },
    "text-embedding-3-large": {
        name: "Text Embedding",
        type: "embedding",
        icon: Network,
        color: "bg-orange-500",
        description: "Vector embedding generation",
        model: "text-embedding-3-large"
    },
    "azure-search": {
        name: "Azure AI Search",
        type: "search",
        icon: Search,
        color: "bg-cyan-500",
        description: "Knowledge base search and retrieval"
    },
    "azure-blob": {
        name: "Azure Blob Storage",
        type: "storage",
        icon: Database,
        color: "bg-gray-500",
        description: "Document storage and management"
    },
    websocket: {
        name: "WebSocket Server",
        type: "infrastructure",
        icon: Server,
        color: "bg-indigo-500",
        description: "Real-time communication layer"
    }
};

export default function ServiceTracker({ events }: ServiceTrackerProps) {
    const serviceMetrics = useMemo(() => {
        const services = new Map<string, ServiceInfo>();

        // Initialize services from events
        events.forEach(event => {
            let serviceKey: string | null = null;
            let serviceData: Partial<ServiceInfo> = {};

            switch (event.event_type) {
                case "openai_api_call":
                    if (event.data?.deployment?.includes("realtime")) {
                        serviceKey = "gpt-4o-realtime";
                        serviceData = {
                            deployment: event.data.deployment,
                            endpoint: event.data.endpoint
                        };
                    } else {
                        serviceKey = "gpt-4o";
                        serviceData = {
                            deployment: event.data?.deployment,
                            endpoint: event.data?.endpoint
                        };
                    }
                    break;

                case "azure_search_call":
                    serviceKey = "azure-search";
                    serviceData = {
                        endpoint: event.data?.endpoint
                    };
                    break;

                case "realtime_api_received":
                    if (event.data?.message_type === "input_audio_transcription" || event.message?.includes("transcription")) {
                        serviceKey = "whisper-1";
                    } else {
                        serviceKey = "gpt-4o-realtime";
                    }
                    break;

                case "grounding_sources":
                    serviceKey = "azure-search";
                    break;

                case "websocket_connect":
                case "websocket_disconnect":
                    serviceKey = "websocket";
                    break;

                default:
                    // Check for embedding-related events in data
                    if (event.data?.embedding || event.message?.includes("embedding")) {
                        serviceKey = "text-embedding-3-large";
                    }
                    break;
            }

            if (serviceKey && SERVICE_DEFINITIONS[serviceKey]) {
                const definition = SERVICE_DEFINITIONS[serviceKey];
                const existing = services.get(serviceKey);
                const eventTime = new Date(event.timestamp);

                const service: ServiceInfo = {
                    id: serviceKey,
                    ...definition,
                    ...serviceData,
                    status: event.event_type === "error" ? "error" : "active",
                    lastActivity: !existing?.lastActivity || eventTime > existing.lastActivity ? eventTime : existing.lastActivity,
                    totalCalls: (existing?.totalCalls || 0) + 1,
                    avgDuration: event.duration_ms
                        ? ((existing?.avgDuration || 0) * (existing?.totalCalls || 0) + event.duration_ms) / ((existing?.totalCalls || 0) + 1)
                        : existing?.avgDuration,
                    errorCount: (existing?.errorCount || 0) + (event.event_type === "error" ? 1 : 0)
                };

                services.set(serviceKey, service);
            }
        });

        return Array.from(services.values()).sort((a, b) => {
            // Sort by type first, then by last activity
            if (a.type !== b.type) {
                const typeOrder = ["ai_model", "embedding", "search", "storage", "infrastructure"];
                return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
            }
            return (b.lastActivity?.getTime() || 0) - (a.lastActivity?.getTime() || 0);
        });
    }, [events]);

    const formatDuration = (duration?: number) => {
        if (!duration) return null;
        if (duration < 1000) return `${Math.round(duration)}ms`;
        return `${(duration / 1000).toFixed(2)}s`;
    };

    const getServiceStatusColor = (service: ServiceInfo) => {
        if (service.status === "error") return "border-red-300 bg-red-50";
        if (service.status === "active") return "border-green-300 bg-green-50";
        return "border-gray-300 bg-gray-50";
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-800">Service Architecture</h4>
                <span className="text-xs text-gray-500">{serviceMetrics.length} services active</span>
            </div>

            {/* Service Grid */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {serviceMetrics.map(service => {
                    const IconComponent = service.icon;

                    return (
                        <div key={service.id} className={`rounded-lg border p-3 ${getServiceStatusColor(service)} transition-shadow hover:shadow-sm`}>
                            <div className="mb-2 flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`rounded-full p-1.5 ${service.color} text-white`}>
                                        <IconComponent className="h-3 w-3" />
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-medium text-gray-800">{service.name}</h5>
                                        <p className="text-xs text-gray-600">{service.description}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    {service.status === "active" && <CheckCircle className="h-3 w-3 text-green-500" />}
                                    {service.status === "error" && <AlertCircle className="h-3 w-3 text-red-500" />}
                                </div>
                            </div>

                            <div className="space-y-1 text-xs">
                                {service.model && (
                                    <div>
                                        <span className="text-gray-500">Model:</span> <span className="font-mono">{service.model}</span>
                                    </div>
                                )}
                                {service.deployment && (
                                    <div>
                                        <span className="text-gray-500">Deployment:</span> <span className="font-mono">{service.deployment}</span>
                                    </div>
                                )}
                                {service.totalCalls && (
                                    <div>
                                        <span className="text-gray-500">Calls:</span> {service.totalCalls}
                                    </div>
                                )}
                                {service.avgDuration && (
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3 text-gray-400" />
                                        <span className="text-gray-500">Avg:</span> {formatDuration(service.avgDuration)}
                                    </div>
                                )}
                                {service.errorCount! > 0 && (
                                    <div className="text-red-600">
                                        <span className="text-gray-500">Errors:</span> {service.errorCount}
                                    </div>
                                )}
                                {service.lastActivity && <div className="text-gray-500">Last: {service.lastActivity.toLocaleTimeString("en-US", { timeZone: "America/Chicago" })} CST</div>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Enhanced RAG Service Flow Diagram */}
            <div className="mt-6">
                <h5 className="mb-3 font-medium text-gray-800">Service Flow</h5>
                {/* Flow Type Indicator */}
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        {serviceMetrics.find(s => s.id === "azure-search") ? (
                            <div className="flex items-center space-x-2">
                                <div className="h-3 w-3 rounded-full bg-cyan-500"></div>
                                <span className="text-sm font-medium text-gray-700">RAG Pipeline</span>
                                <span className="rounded bg-cyan-100 px-2 py-1 text-xs text-cyan-700">Knowledge-Enhanced</span>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                <span className="text-sm font-medium text-gray-700">Direct AI Pipeline</span>
                                <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">General Knowledge</span>
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-gray-500">
                        {serviceMetrics.find(s => s.id === "azure-search") 
                            ? "Using knowledge base + AI reasoning" 
                            : "Using AI general knowledge only"
                        }
                    </div>
                </div>
                <div className="rounded-lg bg-gradient-to-br from-gray-50 to-blue-50 p-6">
                    <div className="space-y-4">
                        {/* Step 1: Audio Input Processing */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
                                    <Mic className="h-4 w-4" />
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-800">1. Audio Input</span>
                                    <p className="text-xs text-gray-600">User speaks question</p>
                                </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            {serviceMetrics.find(s => s.id === "whisper-1") ? (
                                <div className="flex items-center space-x-3">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${serviceMetrics.find(s => s.id === "whisper-1")?.color} text-white shadow-sm`}>
                                        <Mic className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-gray-800">Speech-to-Text</span>
                                        <p className="text-xs text-gray-600">Whisper transcription</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-3 opacity-50">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-white">
                                        <Mic className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">Text Input</span>
                                        <p className="text-xs text-gray-500">Direct text query</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Vertical connector */}
                        <div className="flex justify-center">
                            <ArrowDown className="h-4 w-4 text-gray-400" />
                        </div>

                        {/* Step 2: Text Embedding - Only show if RAG is used */}
                        {serviceMetrics.find(s => s.id === "azure-search") && (
                            <>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm">
                                            <Network className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-gray-800">2. Text Embedding</span>
                                            <p className="text-xs text-gray-600">Convert text to vectors</p>
                                        </div>
                                    </div>
                                    {serviceMetrics.find(s => s.id === "text-embedding-3-large") ? (
                                        <div className="rounded-full bg-green-100 px-2 py-1">
                                            <span className="text-xs font-medium text-green-700">Active</span>
                                        </div>
                                    ) : (
                                        <div className="rounded-full bg-yellow-100 px-2 py-1">
                                            <span className="text-xs text-yellow-700">Required but not detected</span>
                                        </div>
                                    )}
                                </div>

                                {/* Vertical connector */}
                                <div className="flex justify-center">
                                    <ArrowDown className="h-4 w-4 text-gray-400" />
                                </div>
                            </>
                        )}

                        {/* Step 3: Knowledge Base Search - Only for RAG */}
                        {serviceMetrics.find(s => s.id === "azure-search") && (
                            <>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${serviceMetrics.find(s => s.id === "azure-search")?.color} text-white shadow-sm`}>
                                            <Search className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-gray-800">3. Vector Search</span>
                                            <p className="text-xs text-gray-600">Find relevant documents</p>
                                        </div>
                                    </div>
                                    <div className="rounded-full bg-cyan-100 px-2 py-1">
                                        <span className="text-xs font-medium text-cyan-700">
                                            {serviceMetrics.find(s => s.id === "azure-search")?.totalCalls || 0} calls
                                        </span>
                                    </div>
                                </div>

                                {/* Vertical connector */}
                                <div className="flex justify-center">
                                    <ArrowDown className="h-4 w-4 text-gray-400" />
                                </div>
                            </>
                        )}

                        {/* AI Processing - Dynamic based on RAG vs Direct */}
                        <div className="rounded-lg bg-white border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                    {(serviceMetrics.find(s => s.id === "gpt-4o") || serviceMetrics.find(s => s.id === "gpt-4o-realtime")) ? (
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                            serviceMetrics.find(s => s.id === "gpt-4o-realtime") ? "bg-purple-500" : "bg-green-500"
                                        } text-white shadow-sm`}>
                                            {serviceMetrics.find(s => s.id === "gpt-4o-realtime") ? (
                                                <Zap className="h-4 w-4" />
                                            ) : (
                                                <Brain className="h-4 w-4" />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
                                            <Brain className="h-4 w-4" />
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-sm font-medium text-gray-800">
                                            {serviceMetrics.find(s => s.id === "azure-search") ? 
                                                `${serviceMetrics.find(s => s.id === "azure-search") ? '3' : '2'}. AI Processing` : 
                                                '2. AI Processing'
                                            }
                                        </span>
                                        <p className="text-xs text-gray-600">
                                            {serviceMetrics.find(s => s.id === "azure-search") ? 
                                                "Knowledge-enhanced response" : 
                                                "Direct AI response from general knowledge"
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-medium text-gray-700">
                                        {serviceMetrics.find(s => s.id === "gpt-4o-realtime") ? "GPT-4o Realtime" : "GPT-4o"}
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {serviceMetrics.find(s => s.id === "azure-search") ? "RAG Mode" : "Direct Mode"}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Dynamic Context Integration Visualization */}
                            {serviceMetrics.find(s => s.id === "azure-search") ? (
                                /* RAG Mode: Query + Context */
                                <div className="flex items-center space-x-2 text-xs text-gray-600">
                                    <div className="flex items-center space-x-1">
                                        <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                                        <span>User Query</span>
                                    </div>
                                    <span>+</span>
                                    <div className="flex items-center space-x-1">
                                        <div className="h-2 w-2 rounded-full bg-cyan-400"></div>
                                        <span>Retrieved Context</span>
                                    </div>
                                    <ArrowRight className="h-3 w-3" />
                                    <div className="flex items-center space-x-1">
                                        <div className="h-2 w-2 rounded-full bg-green-400"></div>
                                        <span>Enhanced Response</span>
                                    </div>
                                </div>
                            ) : (
                                /* Direct Mode: Query Only */
                                <div className="flex items-center space-x-2 text-xs text-gray-600">
                                    <div className="flex items-center space-x-1">
                                        <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                                        <span>User Query</span>
                                    </div>
                                    <ArrowRight className="h-3 w-3" />
                                    <div className="flex items-center space-x-1">
                                        <div className="h-2 w-2 rounded-full bg-green-400"></div>
                                        <span>AI Response</span>
                                    </div>
                                    <div className="ml-2 rounded bg-green-100 px-2 py-1">
                                        <span className="text-green-700">General Knowledge</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Vertical connector */}
                        <div className="flex justify-center">
                            <ArrowDown className="h-4 w-4 text-gray-400" />
                        </div>

                        {/* Response Output - Dynamic numbering */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                {serviceMetrics.find(s => s.id === "gpt-4o-realtime") ? (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-white shadow-sm">
                                        <Volume2 className="h-4 w-4" />
                                    </div>
                                ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-white shadow-sm">
                                        <MessageSquare className="h-4 w-4" />
                                    </div>
                                )}
                                <div>
                                    <span className="text-sm font-medium text-gray-800">
                                        {serviceMetrics.find(s => s.id === "azure-search") ? 
                                            "4. Response Delivery" : 
                                            "3. Response Delivery"
                                        }
                                    </span>
                                    <p className="text-xs text-gray-600">
                                        {serviceMetrics.find(s => s.id === "gpt-4o-realtime") ? "Real-time audio response" : "Text response"}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                {serviceMetrics.find(s => s.id === "websocket") && (
                                    <div className="flex items-center space-x-2">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                                            <Server className="h-3 w-3" />
                                        </div>
                                        <span className="text-xs text-gray-600">WebSocket</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Flow Summary */}
                        <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
                            <h6 className="text-sm font-medium text-blue-800 mb-1">RAG Pipeline Summary</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center space-x-2">
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    <span className="text-gray-700">Audio Processing: {serviceMetrics.find(s => s.id === "whisper-1") ? "Active" : "Text Input"}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {serviceMetrics.find(s => s.id === "text-embedding-3-large") ? (
                                        <CheckCircle className="h-3 w-3 text-green-500" />
                                    ) : (
                                        <AlertCircle className="h-3 w-3 text-yellow-500" />
                                    )}
                                    <span className="text-gray-700">Text Embedding: {serviceMetrics.find(s => s.id === "text-embedding-3-large") ? "Active" : "Not Detected"}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    <span className="text-gray-700">Knowledge Search: {serviceMetrics.find(s => s.id === "azure-search") ? "Active" : "Disabled"}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    <span className="text-gray-700">AI Model: {serviceMetrics.find(s => s.id === "gpt-4o-realtime") ? "Realtime" : "Standard"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Summary */}
            <div className="mt-4 rounded-lg bg-blue-50 p-3">
                <h6 className="mb-2 text-sm font-medium text-blue-800">Performance Summary</h6>
                <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                    <div>
                        <span className="text-blue-600">Total Services:</span>
                        <span className="ml-1 font-medium">{serviceMetrics.length}</span>
                    </div>
                    <div>
                        <span className="text-blue-600">Active:</span>
                        <span className="ml-1 font-medium">{serviceMetrics.filter(s => s.status === "active").length}</span>
                    </div>
                    <div>
                        <span className="text-blue-600">Errors:</span>
                        <span className="ml-1 font-medium">{serviceMetrics.reduce((sum, s) => sum + (s.errorCount || 0), 0)}</span>
                    </div>
                    <div>
                        <span className="text-blue-600">Total Calls:</span>
                        <span className="ml-1 font-medium">{serviceMetrics.reduce((sum, s) => sum + (s.totalCalls || 0), 0)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
