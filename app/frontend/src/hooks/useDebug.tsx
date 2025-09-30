import { useState, useEffect, useRef, useCallback } from "react";
import useWebSocket from "react-use-websocket";
import { DebugEvent, DebugEventMessage, DebugStats } from "@/types";

type UseDebugProps = {
    onDebugEvent?: (event: DebugEvent) => void;
    onDebugEventsCleared?: () => void;
};

export default function useDebug({ onDebugEvent, onDebugEventsCleared }: UseDebugProps = {}) {
    const [events, setEvents] = useState<DebugEvent[]>([]);
    const [stats, setStats] = useState<DebugStats | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const eventsRef = useRef<DebugEvent[]>([]);

    // WebSocket connection to debug endpoint
    const { sendJsonMessage } = useWebSocket("/debug/ws", {
        onOpen: () => {
            setIsConnected(true);
            setError(null);
            console.log("Debug WebSocket connected");
        },
        onClose: () => {
            setIsConnected(false);
            console.log("Debug WebSocket disconnected");
        },
        onError: event => {
            console.error("Debug WebSocket error:", event);
            setError("WebSocket connection error");
            setIsConnected(false);
        },
        onMessage: event => {
            try {
                const message = JSON.parse(event.data);

                if (message.type === "debug_event") {
                    const debugMessage = message as DebugEventMessage;
                    const newEvent = debugMessage.event;

                    // Add to events list
                    setEvents(prev => {
                        const updated = [...prev, newEvent];
                        eventsRef.current = updated;
                        return updated.slice(-1000); // Keep only last 1000 events
                    });

                    onDebugEvent?.(newEvent);
                } else if (message.type === "debug_events_cleared") {
                    setEvents([]);
                    eventsRef.current = [];
                    onDebugEventsCleared?.();
                }
            } catch (e) {
                console.error("Error parsing debug message:", e);
            }
        },
        shouldReconnect: () => true,
        reconnectAttempts: 10,
        reconnectInterval: 3000
    });

    // Fetch debug stats
    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch("/debug/stats");
            if (response.ok) {
                const statsData = await response.json();
                setStats(statsData);
            }
        } catch (e) {
            console.error("Error fetching debug stats:", e);
        }
    }, []);

    // Fetch historical events
    const fetchEvents = useCallback(async (filters?: { event_types?: string[]; session_id?: string; limit?: number }) => {
        try {
            const params = new URLSearchParams();
            if (filters?.event_types?.length) {
                params.append("event_types", filters.event_types.join(","));
            }
            if (filters?.session_id) {
                params.append("session_id", filters.session_id);
            }
            if (filters?.limit) {
                params.append("limit", filters.limit.toString());
            }

            const response = await fetch(`/debug/events?${params}`);
            if (response.ok) {
                const data = await response.json();
                setEvents(data.events);
                eventsRef.current = data.events;
                return data.events;
            }
        } catch (e) {
            console.error("Error fetching debug events:", e);
            setError("Failed to fetch events");
        }
        return [];
    }, []);

    // Clear events
    const clearEvents = useCallback(async () => {
        try {
            const response = await fetch("/debug/clear", { method: "POST" });
            if (response.ok) {
                setEvents([]);
                eventsRef.current = [];
                await fetchStats(); // Refresh stats after clearing
            }
        } catch (e) {
            console.error("Error clearing debug events:", e);
            setError("Failed to clear events");
        }
    }, [fetchStats]);

    // Filter events - Updated to use current events state
    const filterEvents = useCallback(
        (
            filters: {
                eventTypes?: string[];
                searchText?: string;
                dateRange?: { start: Date; end: Date };
            },
            eventsToFilter?: DebugEvent[]
        ) => {
            // Use provided events or fall back to current events state
            let filtered = eventsToFilter || events;

            if (filters.eventTypes?.length) {
                filtered = filtered.filter(event => filters.eventTypes!.includes(event.event_type));
            }

            if (filters.searchText) {
                const searchLower = filters.searchText.toLowerCase();
                filtered = filtered.filter(
                    event =>
                        event.message.toLowerCase().includes(searchLower) ||
                        JSON.stringify(event.data || {})
                            .toLowerCase()
                            .includes(searchLower)
                );
            }

            if (filters.dateRange) {
                filtered = filtered.filter(event => {
                    const eventDate = new Date(event.timestamp);
                    return eventDate >= filters.dateRange!.start && eventDate <= filters.dateRange!.end;
                });
            }

            return filtered;
        },
        [events]
    );

    // Export events to JSON - Updated to use current events state
    const exportEvents = useCallback(
        (filteredEvents?: DebugEvent[]) => {
            const eventsToExport = filteredEvents || events;
            const dataStr = JSON.stringify(eventsToExport, null, 2);
            const dataBlob = new Blob([dataStr], { type: "application/json" });

            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `debug-events-${new Date().toISOString().split("T")[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        },
        [events]
    );

    // Get event counts by type - Updated to use current events state
    const getEventCounts = useCallback(
        (filteredEvents?: DebugEvent[]) => {
            const eventsToCount = filteredEvents || events;
            const counts: Record<string, number> = {};

            eventsToCount.forEach(event => {
                counts[event.event_type] = (counts[event.event_type] || 0) + 1;
            });

            return counts;
        },
        [events]
    );

    // Ping WebSocket to keep connection alive
    useEffect(() => {
        if (isConnected) {
            const pingInterval = setInterval(() => {
                sendJsonMessage({ type: "ping" });
            }, 30000); // Ping every 30 seconds

            return () => clearInterval(pingInterval);
        }
    }, [isConnected, sendJsonMessage]);

    // Fetch initial data
    useEffect(() => {
        fetchStats();
        fetchEvents({ limit: 100 }); // Get last 100 events on load
    }, [fetchStats, fetchEvents]);

    return {
        events,
        stats,
        isConnected,
        error,
        fetchEvents,
        fetchStats,
        clearEvents,
        filterEvents,
        exportEvents,
        getEventCounts,
        // Real-time data
        latestEvent: events[events.length - 1] || null,
        totalEvents: events.length
    };
}
