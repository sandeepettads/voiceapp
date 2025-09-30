# Debug Feature Documentation

## Overview

The debug feature provides comprehensive real-time monitoring and logging of all events happening in your voice-based RAG application. This includes user questions, search queries, API calls, responses, and errors.

## Features

### 🔧 Settings Gear Icon
- Located in the top-right corner of the main application
- Click to open the Debug Console
- Always visible for easy access during testing

### 📊 Debug Console
A comprehensive debugging interface that shows:

#### Real-time Event Timeline
- **User Questions**: When users ask questions via voice
- **Search Queries**: Azure Search API calls with queries and results
- **OpenAI API Calls**: Connections to OpenAI Realtime API
- **Tool Calls**: RAG tool executions (search, grounding)
- **AI Responses**: AI-generated responses and completions
- **WebSocket Events**: Connection/disconnection events
- **Errors**: Any errors that occur during processing

#### Event Details
- **Timestamp**: Precise timing (HH:MM:SS.mmm format)
- **Event Type**: Categorized event types with color coding
- **Duration**: Performance timing for operations
- **Session ID**: Track events across user sessions
- **Correlation ID**: Link related events together
- **Full Data**: Complete JSON payload for each event

#### Filtering & Search
- **Event Type Filters**: Filter by specific event types
- **Text Search**: Search through event messages and data
- **Date Range**: Filter events by time period
- **Auto-scroll**: Automatically scroll to latest events

#### Export & Management
- **Export to JSON**: Download debug logs for analysis
- **Clear Logs**: Reset the debug log
- **Real-time Stats**: Live connection and event statistics

## Event Types

| Event Type | Color | Description |
|------------|-------|-------------|
| `user_question` | Blue | User voice input transcriptions |
| `search_query_start` | Orange | Beginning of Azure Search queries |
| `search_query_complete` | Green | Completed search with results |
| `azure_search_call` | Teal | Direct Azure Search API calls |
| `grounding_sources` | Pink | Retrieval of grounding sources |
| `openai_api_call` | Cyan | OpenAI Realtime API connections |
| `ai_response_start` | Indigo | AI begins responding |
| `ai_response_complete` | Blue | AI completes response |
| `websocket_connect` | Gray | Client WebSocket connections |
| `websocket_disconnect` | Gray | Client WebSocket disconnections |
| `error` | Red | Any errors or exceptions |

## How to Use

### 1. Start Your Application
```bash
# Backend
cd app/backend
python app.py

# Frontend (if separate)
cd app/frontend  
npm run dev
```

### 2. Open Debug Console
- Click the ⚙️ gear icon in the top-right corner of the web app
- The Debug Console will open in a modal overlay

### 3. Monitor Events
- Start a voice conversation
- Watch real-time events appear in the timeline
- Click on events to see detailed information
- Use filters to focus on specific event types

### 4. Verify RAG Behavior
Ask test questions and verify the sequence:
1. **User Question** → User asks "What are Northwind benefits?"
2. **Search Query Start** → System starts searching knowledge base
3. **Azure Search Call** → API call to Azure Search service
4. **Search Results** → Results returned from search
5. **Grounding Sources** → Relevant documents retrieved
6. **AI Response** → AI generates answer based on search results

### 5. Debugging Common Issues

#### No Search Results
- Look for `search_query_start` without `search_query_complete`
- Check `azure_search_call` for API errors
- Verify search query terms in event data

#### General Knowledge vs RAG
- Ensure `search_query_start` events occur for each question
- Verify `grounding_sources` are retrieved
- Check if responses cite document sources

#### Performance Issues
- Monitor duration times in event details
- Look for slow `azure_search_call` events
- Check for timeout errors

## Backend Debug Endpoints

### WebSocket Debug Stream
```
ws://localhost:8765/debug/ws
```
Real-time debug event stream

### REST API Endpoints
```bash
# Get debug events
GET /debug/events?event_types=search_query_start,error&limit=100

# Get debug statistics  
GET /debug/stats

# Clear all debug events
POST /debug/clear
```

## Example Debug Flow

Here's what a typical conversation looks like in the debug console:

```
14:23:15.123 [websocket_connect] Client WebSocket connected
14:23:15.234 [openai_api_call] Connecting to OpenAI Realtime API  
14:23:16.456 [user_question] User asked: 'What are Northwind benefits?'
14:23:16.567 [search_query_start] Searching knowledge base for: 'Northwind benefits' - Started
14:23:16.578 [azure_search_call] Calling Azure Search API for query: 'Northwind benefits'
14:23:16.789 [search_query_complete] Found 5 results (212ms)
14:23:16.890 [grounding_sources] Retrieving grounding sources: ['chunk_123', 'chunk_456']
14:23:16.991 [grounding_sources] Successfully retrieved 2 grounding sources  
14:23:17.234 [ai_response_start] AI responding: 'Northwind offers comprehensive health benefits...'
14:23:19.456 [ai_response_complete] AI response completed
```

## Development Notes

### Adding New Event Types
1. Add to `DebugEventType` enum in `types.ts`
2. Add to backend `DebugEventType` enum in `debug_logger.py`  
3. Add color and icon in `debug-panel.tsx`
4. Log events using `debug_logger.log_event()`

### Custom Event Data
Events can include any JSON-serializable data:
```python
await debug_logger.log_event(
    DebugEventType.CUSTOM_EVENT,
    "Custom event occurred",
    {
        "custom_field": "value",
        "nested": {"data": "structure"},
        "metrics": {"duration": 123, "count": 5}
    },
    session_id=session_id
)
```

## Troubleshooting

### Debug Console Won't Open
- Check browser console for JavaScript errors
- Verify React components are building correctly
- Ensure WebSocket connection is working

### No Debug Events Appearing
- Verify backend debug logging is enabled
- Check WebSocket connection status in console
- Ensure debug_logger is imported and used in backend

### Missing Search Events
- Confirm ragtools.py imports debug_logger
- Verify debug events are being logged in search functions
- Check for errors in search tool execution

This debug feature makes it easy to understand exactly how your voice RAG application processes questions and retrieves information from your knowledge base!
