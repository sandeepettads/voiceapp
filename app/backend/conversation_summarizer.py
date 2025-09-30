import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import openai
from azure.identity import DefaultAzureCredential
from azure.core.credentials import AzureKeyCredential

logger = logging.getLogger("voicerag.summarizer")

class ConversationSummarizer:
    """AI-powered conversation summarizer using GPT-4o for debug insights"""
    
    def __init__(self, 
                 openai_endpoint: str,
                 openai_api_key: str,
                 deployment_name: str = "gpt-4o"):
        self.openai_endpoint = openai_endpoint
        self.openai_api_key = openai_api_key  
        self.deployment_name = deployment_name
        
        # Initialize OpenAI client
        self.openai_client = openai.AzureOpenAI(
            azure_endpoint=openai_endpoint,
            api_key=openai_api_key,
            api_version="2024-02-15-preview"
        )

    async def summarize_conversation(self, 
                                   conversation_id: str,
                                   events: List[Dict[str, Any]],
                                   analysis_type: str = "comprehensive") -> Dict[str, Any]:
        """
        Generate an AI-powered summary of a conversation flow
        
        Args:
            conversation_id: Unique identifier for the conversation
            events: List of debug events from the conversation
            analysis_type: Type of analysis ('comprehensive', 'performance', 'errors')
            
        Returns:
            Dictionary containing the summary and insights
        """
        try:
            # Create the analysis prompt
            system_prompt = self._create_system_prompt(analysis_type)
            user_prompt = self._create_user_prompt(conversation_id, events)
            
            # Generate summary using GPT-4o
            response = self.openai_client.chat.completions.create(
                model=self.deployment_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=1500,
                response_format={"type": "json_object"}
            )
            
            # Parse the response
            summary_json = json.loads(response.choices[0].message.content)
            
            # Add metadata
            summary_json["conversation_id"] = conversation_id
            summary_json["analysis_type"] = analysis_type
            summary_json["generated_at"] = datetime.now().isoformat()
            summary_json["event_count"] = len(events)
            
            logger.info(f"Generated summary for conversation {conversation_id}")
            return summary_json
            
        except Exception as e:
            logger.error(f"Error generating conversation summary: {e}")
            return {
                "error": str(e),
                "summary": "Failed to generate summary",
                "key_insights": [],
                "performance_analysis": {},
                "recommendations": []
            }

    def _create_system_prompt(self, analysis_type: str) -> str:
        """Create system prompt based on analysis type"""
        
        base_prompt = """You are an expert AI assistant specialized in analyzing RAG (Retrieval-Augmented Generation) conversation flows and debugging information. 

Your task is to analyze debug events from a voice-enabled RAG application and provide insightful summaries that help developers understand:
- User interaction patterns
- System performance bottlenecks  
- Knowledge retrieval effectiveness
- AI response quality
- Error patterns and root causes

You have deep expertise in:
- Real-time AI systems (OpenAI GPT-4o Realtime API)
- Azure Search and knowledge retrieval
- Voice processing and audio streaming
- WebSocket communications
- Performance optimization"""

        if analysis_type == "comprehensive":
            return base_prompt + """

Provide a comprehensive analysis including:
1. Summary of the user's intent and the system's response
2. Key insights about the conversation flow
3. Performance metrics and bottlenecks
4. Knowledge source effectiveness
5. Recommendations for improvement

Return your analysis as JSON with these fields:
- "summary": A concise 2-3 sentence summary of what happened
- "key_insights": Array of 3-5 key observations
- "performance_analysis": Object with timing analysis
- "knowledge_effectiveness": Analysis of how well sources answered the query
- "recommendations": Array of 2-4 actionable recommendations
- "error_summary": Summary of any errors (null if none)"""

        elif analysis_type == "performance":
            return base_prompt + """

Focus on performance analysis including:
1. Timing breakdown of major components
2. Bottleneck identification  
3. Optimization opportunities
4. Resource utilization patterns

Return analysis as JSON with fields:
- "summary": Performance summary
- "timing_breakdown": Object with component timings
- "bottlenecks": Array of identified performance issues
- "optimization_suggestions": Array of specific improvements"""

        elif analysis_type == "errors":
            return base_prompt + """

Focus on error analysis including:
1. Error categorization and patterns
2. Root cause analysis
3. Impact assessment
4. Prevention strategies

Return analysis as JSON with fields:
- "summary": Error summary  
- "error_patterns": Array of error types found
- "root_causes": Array of underlying causes
- "prevention_strategies": Array of preventive measures"""

        return base_prompt

    def _create_user_prompt(self, conversation_id: str, events: List[Dict[str, Any]]) -> str:
        """Create user prompt with conversation data"""
        
        # Extract key information
        user_query = self._extract_user_query(events)
        conversation_timeline = self._create_timeline(events)
        performance_data = self._extract_performance_data(events)
        error_events = self._extract_errors(events)
        source_documents = self._extract_source_documents(events)
        
        prompt = f"""Analyze this RAG conversation flow:

CONVERSATION ID: {conversation_id}

USER QUERY: {user_query}

CONVERSATION TIMELINE:
{conversation_timeline}

PERFORMANCE DATA:
{json.dumps(performance_data, indent=2)}

SOURCE DOCUMENTS USED:
{json.dumps(source_documents, indent=2)}

ERROR EVENTS:
{json.dumps(error_events, indent=2)}

Please provide a comprehensive analysis focusing on the user experience, system performance, and areas for improvement."""

        return prompt

    def _extract_user_query(self, events: List[Dict[str, Any]]) -> str:
        """Extract the user's question from events"""
        for event in events:
            if event.get("type") == "user_question":
                return event.get("data", {}).get("question") or event.get("message", "Unknown query")
        return "No user query found"

    def _create_timeline(self, events: List[Dict[str, Any]]) -> str:
        """Create a human-readable timeline of events"""
        timeline = []
        
        for i, event in enumerate(events):
            timestamp = event.get("timestamp", "")
            event_type = event.get("type", "unknown")
            message = event.get("message", "")
            duration = event.get("duration")
            
            # Format timestamp
            try:
                dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                time_str = dt.strftime("%H:%M:%S.%f")[:-3]  # Include milliseconds
            except:
                time_str = timestamp
            
            # Create timeline entry
            entry = f"{i+1:2d}. {time_str} | {event_type:20s} | {message}"
            if duration:
                entry += f" ({duration}ms)"
                
            timeline.append(entry)
        
        return "\n".join(timeline)

    def _extract_performance_data(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract performance metrics from events"""
        performance = {
            "total_events": len(events),
            "search_duration": None,
            "ai_processing_duration": None,
            "total_duration": None,
            "event_counts": {}
        }
        
        # Count event types
        for event in events:
            event_type = event.get("type", "unknown")
            performance["event_counts"][event_type] = performance["event_counts"].get(event_type, 0) + 1
        
        # Extract specific durations
        for event in events:
            event_type = event.get("type")
            duration = event.get("duration")
            
            if event_type == "search_query_complete" and duration:
                performance["search_duration"] = duration
            elif event_type == "ai_response_complete" and duration:
                performance["ai_processing_duration"] = duration
        
        # Calculate total duration
        if events:
            try:
                start_time = datetime.fromisoformat(events[0]["timestamp"].replace("Z", "+00:00"))
                end_time = datetime.fromisoformat(events[-1]["timestamp"].replace("Z", "+00:00"))
                performance["total_duration"] = int((end_time - start_time).total_seconds() * 1000)
            except:
                pass
        
        return performance

    def _extract_errors(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract error events"""
        errors = []
        for event in events:
            if event.get("type") == "error":
                errors.append({
                    "timestamp": event.get("timestamp"),
                    "message": event.get("message"),
                    "data": event.get("data", {})
                })
        return errors

    def _extract_source_documents(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract information about source documents used"""
        sources = []
        for event in events:
            if event.get("type") == "grounding_sources":
                data = event.get("data", {})
                retrieved_sources = data.get("retrieved_sources", [])
                for source in retrieved_sources:
                    sources.append({
                        "chunk_id": source.get("chunk_id"),
                        "title": source.get("title"),
                        "content_preview": source.get("content", "")[:100] + "..." if len(source.get("content", "")) > 100 else source.get("content", "")
                    })
        return sources

# Example usage and API endpoint integration
async def create_conversation_summary_endpoint(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    API endpoint handler for conversation summarization
    
    Expected request_data:
    {
        "conversation_id": "string",
        "events": [array of debug events],
        "analysis_type": "comprehensive" | "performance" | "errors"
    }
    """
    try:
        # Extract parameters
        conversation_id = request_data.get("conversation_id")
        events = request_data.get("events", [])
        analysis_type = request_data.get("analysis_type", "comprehensive")
        
        # Validate inputs
        if not conversation_id or not events:
            return {
                "error": "Missing required parameters: conversation_id and events",
                "success": False
            }
        
        # Initialize summarizer (you'll need to provide these from your config)
        summarizer = ConversationSummarizer(
            openai_endpoint="https://llm-grounding-service.openai.azure.com/",
            openai_api_key="your-api-key-here",  # Get from environment/config
            deployment_name="gpt-4o"
        )
        
        # Generate summary
        summary = await summarizer.summarize_conversation(
            conversation_id=conversation_id,
            events=events,
            analysis_type=analysis_type
        )
        
        return {
            "success": True,
            "summary": summary
        }
        
    except Exception as e:
        logger.error(f"Error in conversation summary endpoint: {e}")
        return {
            "success": False,
            "error": str(e)
        }
