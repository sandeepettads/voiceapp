import { useState, useCallback } from "react";
import { DebugEvent } from "@/types";

type ConversationSummary = {
    id: string;
    userQuery: string;
    summary: string;
    keyInsights: string[];
    performance: {
        totalDuration: number;
        searchDuration?: number;
        aiProcessingDuration?: number;
    };
    sourceDocuments: Array<{
        title: string;
        relevance: "high" | "medium" | "low";
    }>;
    success: boolean;
    errorSummary?: string;
};

export default function useConversationSummarizer() {
    const [summaries, setSummaries] = useState<Map<string, ConversationSummary>>(new Map());
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateSummary = useCallback(async (conversationId: string, events: DebugEvent[]): Promise<ConversationSummary | null> => {
        setIsGenerating(true);
        setError(null);

        try {
            // Create a structured conversation context for GPT-4o
            const conversationContext = createConversationContext(events);

            // Call your backend API to generate summary using GPT-4o
            const response = await fetch("/api/debug/summarize-conversation", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    conversation_id: conversationId,
                    events: conversationContext,
                    analysis_type: "comprehensive"
                })
            });

            if (!response.ok) {
                throw new Error("Failed to generate conversation summary");
            }

            const summaryData = await response.json();
            const summary: ConversationSummary = {
                id: conversationId,
                userQuery: extractUserQuery(events),
                summary: summaryData.summary,
                keyInsights: summaryData.key_insights || [],
                performance: calculatePerformanceMetrics(events),
                sourceDocuments: extractSourceDocuments(events),
                success: !events.some(e => e.event_type === "error"),
                errorSummary: summaryData.error_summary
            };

            // Cache the summary
            setSummaries(prev => new Map(prev).set(conversationId, summary));

            return summary;
        } catch (err) {
            console.error("Error generating conversation summary:", err);
            setError(err instanceof Error ? err.message : "Unknown error");
            return null;
        } finally {
            setIsGenerating(false);
        }
    }, []);

    const createConversationContext = (events: DebugEvent[]) => {
        return events.map(event => ({
            timestamp: event.timestamp,
            type: event.event_type,
            message: event.message,
            duration: event.duration_ms,
            data: sanitizeEventData(event.data)
        }));
    };

    const sanitizeEventData = (data: any) => {
        if (!data) return null;

        // Remove sensitive information and keep only relevant debugging data
        const sanitized = { ...data };

        // Remove potential API keys or sensitive strings
        Object.keys(sanitized).forEach(key => {
            if (typeof sanitized[key] === "string") {
                if (sanitized[key].length > 1000) {
                    sanitized[key] = sanitized[key].substring(0, 1000) + "... [truncated]";
                }
            }
        });

        return sanitized;
    };

    const extractUserQuery = (events: DebugEvent[]): string => {
        const userQuestionEvent = events.find(e => e.event_type === "user_question");
        return userQuestionEvent?.data?.question || userQuestionEvent?.message || "Unknown query";
    };

    const calculatePerformanceMetrics = (events: DebugEvent[]) => {
        const startTime = new Date(events[0]?.timestamp).getTime();
        const endTime = new Date(events[events.length - 1]?.timestamp).getTime();

        const searchEvent = events.find(e => e.event_type === "search_query_complete");
        const aiEvent = events.find(e => e.event_type === "ai_response_complete");

        return {
            totalDuration: endTime - startTime,
            searchDuration: searchEvent?.duration_ms,
            aiProcessingDuration: aiEvent?.duration_ms
        };
    };

    const extractSourceDocuments = (events: DebugEvent[]) => {
        const groundingEvent = events.find(e => e.event_type === "grounding_sources");
        const sources = groundingEvent?.data?.retrieved_sources || [];

        return sources.map((source: any) => ({
            title: source.title || "Unknown Document",
            relevance: "high" as const // Could be enhanced with actual relevance scoring
        }));
    };

    const getSummary = (conversationId: string): ConversationSummary | null => {
        return summaries.get(conversationId) || null;
    };

    const clearSummaries = () => {
        setSummaries(new Map());
    };

    return {
        generateSummary,
        getSummary,
        clearSummaries,
        isGenerating,
        error,
        hasSummaries: summaries.size > 0
    };
}
