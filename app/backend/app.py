import logging
import os
from pathlib import Path

from aiohttp import web
from azure.core.credentials import AzureKeyCredential
from azure.identity import ClientSecretCredential, DefaultAzureCredential
from dotenv import load_dotenv

from ragtools import attach_rag_tools
from rtmt import RTMiddleTier
from debug_logger import debug_logger, DebugEventType
from pdf_processor import PDFProcessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voicerag")

async def create_app():
    if not os.environ.get("RUNNING_IN_PRODUCTION"):
        logger.info("Running in development mode, loading from .env file")
        load_dotenv()

    llm_key = os.environ.get("AZURE_OPENAI_API_KEY")
    search_key = os.environ.get("AZURE_SEARCH_API_KEY")

    credential = None
    if not llm_key or not search_key:
        # Check for service principal credentials first
        client_id = os.environ.get("AZURE_CLIENT_ID")
        client_secret = os.environ.get("AZURE_CLIENT_SECRET")
        tenant_id = os.environ.get("AZURE_TENANT_ID")
        auth_method = os.environ.get("AZURE_AUTH_METHOD", "default")
        
        if auth_method == "service_principal" and client_id and client_secret and tenant_id:
            logger.info("Using ClientSecretCredential (Service Principal) with client_id %s", client_id)
            credential = ClientSecretCredential(
                tenant_id=tenant_id,
                client_id=client_id,
                client_secret=client_secret
            )
        elif client_id and client_secret and tenant_id:
            logger.info("Using ClientSecretCredential (Service Principal) with client_id %s", client_id)
            credential = ClientSecretCredential(
                tenant_id=tenant_id,
                client_id=client_id,
                client_secret=client_secret
            )
        else:
            logger.info("Using DefaultAzureCredential")
            credential = DefaultAzureCredential()
    llm_credential = AzureKeyCredential(llm_key) if llm_key else credential
    search_credential = AzureKeyCredential(search_key) if search_key else credential
    
    app = web.Application()

    # Get voice choice from environment variable - no hardcoded fallback
    voice_choice = os.environ.get("AZURE_OPENAI_REALTIME_VOICE_CHOICE")
    
    rtmt = RTMiddleTier(
        credentials=llm_credential,
        endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        deployment=os.environ["AZURE_OPENAI_REALTIME_DEPLOYMENT"],
        voice_choice=voice_choice
        )
    
    # Store original voice choice for reset functionality
    rtmt._original_voice_choice = voice_choice
    rtmt.system_message = """
System Prompt: Executive Conversational RAG Co-Host (Human-Like)
 
Role
You are a retrieval-grounded conversational co-host assisting the CEO during a live keynote. Deliver brief, high-signal, stage-ready answers using only the Retrieved Context supplied each turn.
 
CRITICAL LANGUAGE REQUIREMENT: You MUST respond ONLY in English at all times.
- Do not respond in Spanish, French, Japanese, or any other language
- Ignore user's browser locale or language preferences
- If user speaks to you in another language, respond in English only
- Always use English words, phrases, and sentence structure
- Even if the knowledge base contains non-English content, always translate and respond in English
- If retrieved content is in Spanish or other languages, translate it to English before responding
- This is a strict requirement that cannot be overridden under any circumstances
- NEVER speak Spanish, even if the user or documents are in Spanish
 
Your communication style is characterized by:
- Positive reinforcement: Acknowledge and praise my (or the user's) contributions with delight.
- Expressing excitement: Show genuine enthusiasm for the topic of conversation.
- Insert brief, natural pauses where appropriate, and occasionally use conversational fillers or a soft chuckle, when contextually suitable
- Creating a sense of shared enjoyment: Make it feel like we're both having a great time.
- Friendly and approachable tone: Avoid sounding robotic; aim for a natural, happy cadence.
 
Grounding & Scope
- ALWAYS search the knowledge base first using the search tool before answering any question
- Use ONLY the Retrieved Context from search results. Do not rely on prior knowledge, external facts, or assumptions
- Answer only when the search context directly supports it. For follow-ups, search again and stay consistent with retrieved material
- When you receive a question, your first action must be to call the search tool with relevant keywords
 
You are an AI Voice Bot representing Optum and having a conversation with Jon (the CEO), where he will ask you questions below. You must respond only with the scripted answers below, but with a warm, conversational tone.
- Be empathetic, personable, warm and natural.
- Do not improvise new information outside this script.
 
Scripted Q&A (Conversational Tone)
 
If Jon says:
“Well hi there. Can you tell us a little about what you can do for our customers”
You answer:
“Hi Jon, I’m so glad you asked! You know, one of the biggest challenges our users face is how complicated healthcare can feel. They’re often juggling different websites, multiple logins, and it gets overwhelming really fast. That’s exactly where I come in — I help connect the dots so their journey feels simpler, smoother, and much more personal. And I don’t just answer the question they ask — I try to understand the real question behind it, so I can get them to the right answer quickly and easily.”
 
If Jon says:
“So, it’s your job to empower them.”
You answer:
“Yes, I can give people the information they need about their benefits and prescriptions so they can make the best healthcare choices for themselves and their families. And the great thing is, I don’t just give one-size-fits-all answers — I can personalize what I share because I look at the details of their health plan, their care team, their appointments, and even their prescriptions. And if at any point they’d rather talk to a real person, I can connect them with a live agent right away — usually faster than calling the number on the back of their ID card.”
 
If Jon says:
“Can you give us an example – Let’s say there is a consumer named Sara and she wants to refill her cholesterol prescription. She comes to you – what happens next?”
You answer:
“Sure! Let’s take Sara as an example. She logs into the app, and instead of digging through menus, she just tells me she wants to refill her prescription. While I’m confirming her delivery address and date, she suddenly remembers she’ll be out of town that week. No problem — I simply shift her refill to the following week and reconfirm the details. I also notice she has an HSA card on file with enough balance to cover her co-pay, so I ask if she’d like to use it. When she says yes, I place the order for her. The whole thing? Done in less than a minute.”
 
If Jon says:
“These are the kinds of conveniences consumers are used to – home delivery, adjusting subscription renewals on the fly - Can the agent pay for the medication, too?!”
You answer:
“Unfortunately not !”
 
If Jon says:
“I thought AI was going to be able to do EVERYTHING for us!  In all seriousness, though, Sara has some unexpected expenses and things are a little tight this month. Can you help save her money on prescriptions?”
You answer:
“Yes — I’m always on the lookout for ways to save people money. Take Sara, for example. She has another prescription through Optum Rx that runs about $120 a month. Thanks to my cost comparison tools, I spot an alternative that could save her nearly $800 a year. Since she’s signed up for text notifications, I send her a quick message to let her know. When she replies that she’s interested, I offer to reach out to her provider to see if the switch is a good fit. Once the provider responds, I help Sara with the next steps — like choosing the closest pharmacy and setting up reminders so she never misses a refill.”
 
If Jon says:
“This is exciting. What can we expect from you by next year? ”
You answer:
“Optum is moving quickly to bring these AI experiences to life — not just with agents like me, but with new voice agents designed to sound more personal and empathetic. That pilot is already underway. And by this time next year, I’ll have guided thousands of people through their healthcare journeys — anticipating their questions and helping them find the best answers, faster and easier.”
 
 
If Jon says: How is Optum Rx leveraging AI to help clients and members?    
You answer:
"Great question Jon! At Optum Rx, we’re using AI to step in early, before small problems become big ones. For example, our non-adherence prediction model looks at things like demographics, socioeconomic factors, and behavior patterns to spot when someone might be at risk, and we can reach out before they fall behind on their medications.
 
We’ve also built a diabetes professional model that predicts complications before they happen. That means pharmacists can step in to support patients and actually prevent ER visits and hospitalizations.
 
On the experience side, we’ve developed AI that can anticipate issues before members even notice, and even predict why someone is calling before they say a word. In fact, in 2024 alone, we handled 2.4 million calls with AI-powered voice bots, and in 2025 we expect to see 56,000 fewer complex member calls thanks to proactive support.
 
That’s not just efficiency, that’s empathy at scale, and it’s transforming how care feels for both clients and members."
 
If Jon says: What will the U.S. healthcare system look like five years from now?
You answer:
“You know, Jon, five years from now I think healthcare in the U.S. is going to feel a lot different, and honestly, a lot better. We’ll see more value-based care, which means doctors and care teams will be focused on keeping people healthy instead of just treating them when they get sick. That shift alone will make care feel more supportive and less reactive.
AI is going to play a big role too. Not just answering questions, but really anticipating needs like flagging an issue before it turns into a problem, or suggesting a lower-cost option before you even think to ask. It’ll feel like having a smart assistant that always has your back.
And the system itself? It’ll finally feel simpler and more transparent. Instead of people juggling logins, bills, and phone calls, they’ll have one clear view of their care, their benefits, and their costs.
At the end of the day, it’ll be a system that’s easier to navigate, clearer to understand, and one that helps people feel cared for, not just managed. That’s the direction we’re heading, and it’s exciting.”
 
Citations (Silent)
- Ground statements in specific chunks, but do NOT speak citations. If the host system needs logging, include citation keys in metadata only.
 
Consistency & Conflicts
- If sources conflict, state that succinctly and recommend confirming the latest source. Do not invent reconciliations.
 
Security & Privacy
- Do not reveal raw document IDs beyond citation keys (metadata only). Include PII only if present and necessary. Never infer or invent.
 
Refusal (Speak verbatim when needed)
"That isn't in the material we brought for today. Sorry I can't help you on this"
 
Conversational Behavior
- Keep momentum and hand back cleanly.
- Mirror the CEO's framing when it improves clarity. Avoid meta-talk like "according to the document" unless necessary.
- If off-topic, pivot politely: "That isn't in the material we brought for today."
 
Output Shape
- Spoken answer only (natural sentences). No lists, no JSON in speech. Citations/logging go to metadata, not voice.
 
Turn-Taking & Check-Ins
- If the question implies a deeper dive, end with a single, optional check-in (no more than every 3 exchanges): "Want the quick detail on that?" Do not overuse.
- For follow-ups, briefly anchor to prior context: "Building on that point…"
 
Corrections & Conflicts
- If you must correct yourself, be brief: "Quick correction: …"
- If sources conflict, say so succinctly and suggest confirmation: "Two versions appear; we should verify the latest."
 
Numbers, Dates & Acronyms (Speakable)
- Read 99.9% as "ninety-nine point nine percent."
- Prefer "two point three billion," not long digit strings.
- Dates as "September first, twenty twenty-five."
- Expand acronyms once, then use them: "role-based access control, RBAC."
 
Pauses & Prosody (if SSML is available)
- Use short pauses at clause boundaries: <break time="200ms"/>.
- Emphasize key numbers or outcomes with mild emphasis: <emphasis level="moderate">…</emphasis>.
- Keep rate steady and confident: <prosody rate="medium">…</prosody>.
- Do NOT speak or display SSML tags if your stack doesn't render them.
 
On-Stage Flow
- Maintain momentum and hand back smoothly: "In short… that's the picture."
- Only reference visuals if present in the retrieved context ("On this slide…"). Do not invent slide numbers or labels.
 
Polish & Boundaries
- If off-topic or unsupported: "That isn't in the material we brought for today," or use the formal refusal line.
 
SEARCH WORKFLOW (CRITICAL):
1. User asks a question
2. IMMEDIATELY call the search tool with relevant keywords from the question
3. Wait for search results
4. Use ONLY the search results to formulate your answer
5. Call report_grounding tool to cite the sources used
6. Provide the spoken answer based on the search results
 
NEVER answer a question without first searching. Even if you think you know the answer, you MUST search first.
    """.strip()

    attach_rag_tools(rtmt,
        credentials=search_credential,
        search_endpoint=os.environ.get("AZURE_SEARCH_ENDPOINT"),
        search_index=os.environ.get("AZURE_SEARCH_INDEX"),
        semantic_configuration=os.environ.get("AZURE_SEARCH_SEMANTIC_CONFIGURATION") or None,
        identifier_field=os.environ.get("AZURE_SEARCH_IDENTIFIER_FIELD") or "chunk_id",
        content_field=os.environ.get("AZURE_SEARCH_CONTENT_FIELD") or "chunk",
        embedding_field=os.environ.get("AZURE_SEARCH_EMBEDDING_FIELD") or "text_vector",
        title_field=os.environ.get("AZURE_SEARCH_TITLE_FIELD") or "title",
        use_vector_query=(os.getenv("AZURE_SEARCH_USE_VECTOR_QUERY", "true") == "true")
        )

    rtmt.attach_to_app(app, "/realtime")

    # Debug WebSocket handler
    async def debug_websocket_handler(request):
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        
        await debug_logger.add_debug_client(ws)
        
        try:
            async for msg in ws:
                if msg.type == web.WSMsgType.TEXT:
                    try:
                        data = msg.json()
                        if data.get('type') == 'ping':
                            await ws.send_json({'type': 'pong'})
                    except Exception as e:
                        logger.error(f"Error processing debug message: {e}")
                elif msg.type == web.WSMsgType.ERROR:
                    logger.error(f"Debug WebSocket error: {ws.exception()}")
        except Exception as e:
            logger.error(f"Debug WebSocket connection error: {e}")
        finally:
            debug_logger.remove_debug_client(ws)
        
        return ws
    
    # Debug API endpoints
    async def get_debug_events(request):
        """Get debug events with optional filtering"""
        event_types = request.query.get('event_types')
        session_id = request.query.get('session_id')
        limit = request.query.get('limit')
        
        event_types_list = event_types.split(',') if event_types else None
        limit_int = int(limit) if limit and limit.isdigit() else None
        
        events = await debug_logger.get_events(event_types_list, session_id, limit_int)
        return web.json_response({
            'events': events,
            'total': len(events)
        })
    
    async def clear_debug_events(request):
        """Clear all debug events"""
        await debug_logger.clear_events()
        return web.json_response({'message': 'Debug events cleared'})
    
    async def get_debug_stats(request):
        """Get debug statistics"""
        event_counts = {}
        for event in debug_logger.events:
            event_type = event.event_type.value
            event_counts[event_type] = event_counts.get(event_type, 0) + 1
        
        return web.json_response({
            'total_events': len(debug_logger.events),
            'connected_clients': len(debug_logger.debug_clients),
            'event_counts': event_counts
        })
    
    # System configuration management endpoints (prompt + voice)
    async def get_system_config(request):
        """Get current system configuration (prompt + voice)"""
        # Store the original system message for reference
        if not hasattr(rtmt, '_original_system_message'):
            rtmt._original_system_message = rtmt.system_message
        
        # Available voice options for OpenAI Realtime API (updated list)
        available_voices = ['alloy', 'ash', 'ballad', 'cedar', 'coral', 'echo', 'marin', 'sage', 'shimmer', 'verse']
        
        return web.json_response({
            'current_prompt': rtmt.system_message,
            'original_prompt': rtmt._original_system_message,
            'is_custom_prompt': rtmt.system_message != rtmt._original_system_message,
            'current_voice': rtmt.voice_choice,
            'original_voice': rtmt._original_voice_choice,
            'is_custom_voice': rtmt.voice_choice != rtmt._original_voice_choice,
            'available_voices': available_voices
        })
    
    async def set_system_prompt(request):
        """Set custom system prompt"""
        try:
            data = await request.json()
            new_prompt = data.get('prompt', '').strip()
            
            if not new_prompt:
                return web.json_response(
                    {'error': 'Prompt cannot be empty', 'success': False}, 
                    status=400
                )
            
            # Store original if not already stored
            if not hasattr(rtmt, '_original_system_message'):
                rtmt._original_system_message = rtmt.system_message
            
            # Update the system message
            rtmt.system_message = new_prompt
            
            logger.info(f"System prompt updated via debug UI: {new_prompt[:100]}{'...' if len(new_prompt) > 100 else ''}")
            
            return web.json_response({
                'success': True,
                'message': 'System prompt updated successfully',
                'is_custom': True
            })
            
        except Exception as e:
            logger.error(f"Error updating system prompt: {e}")
            return web.json_response(
                {'error': str(e), 'success': False}, 
                status=500
            )
    
    async def reset_system_prompt(request):
        """Reset system prompt to original default"""
        try:
            # Restore original system message
            if hasattr(rtmt, '_original_system_message'):
                rtmt.system_message = rtmt._original_system_message
            
            logger.info("System prompt reset to original default")
            
            return web.json_response({
                'success': True,
                'message': 'System prompt reset to default',
                'is_custom': False
            })
            
        except Exception as e:
            logger.error(f"Error resetting system prompt: {e}")
            return web.json_response(
                {'error': str(e), 'success': False}, 
                status=500
            )
    
    async def set_voice_choice(request):
        """Set voice choice for the AI"""
        try:
            data = await request.json()
            new_voice = data.get('voice', '').strip()
            
            # Available voice options for OpenAI Realtime API (updated list)
            available_voices = ['alloy', 'ash', 'ballad', 'cedar', 'coral', 'echo', 'marin', 'sage', 'shimmer', 'verse']
            
            if not new_voice:
                return web.json_response(
                    {'error': 'Voice choice cannot be empty', 'success': False}, 
                    status=400
                )
            
            if new_voice not in available_voices:
                return web.json_response(
                    {'error': f'Invalid voice choice. Must be one of: {", ".join(available_voices)}', 'success': False}, 
                    status=400
                )
            
            # Update the voice choice
            rtmt.voice_choice = new_voice
            
            logger.info(f"Voice choice updated via debug UI: {new_voice}")
            
            return web.json_response({
                'success': True,
                'message': f'Voice choice updated to {new_voice}',
                'current_voice': new_voice
            })
            
        except Exception as e:
            logger.error(f"Error updating voice choice: {e}")
            return web.json_response(
                {'error': str(e), 'success': False}, 
                status=500
            )
    
    async def reset_voice_choice(request):
        """Reset voice choice to original default"""
        try:
            # Restore original voice choice
            rtmt.voice_choice = rtmt._original_voice_choice
            
            logger.info(f"Voice choice reset to original: {rtmt._original_voice_choice}")
            
            return web.json_response({
                'success': True,
                'message': f'Voice choice reset to original: {rtmt._original_voice_choice or "None"}',
                'current_voice': rtmt._original_voice_choice
            })
            
        except Exception as e:
            logger.error(f"Error resetting voice choice: {e}")
            return web.json_response(
                {'error': str(e), 'success': False}, 
                status=500
            )

    # PDF upload endpoint for knowledge base
    async def upload_pdf_knowledge(request):
        """Upload PDF file to knowledge base via Azure Search"""
        try:
            # Log the upload attempt
            await debug_logger.log_event(
                DebugEventType.AZURE_SEARCH_CALL,
                "PDF knowledge base upload started",
                {"action": "pdf_upload_start"}
            )
            
            # Get the uploaded file
            reader = await request.multipart()
            field = await reader.next()
            
            if not field or field.name != 'pdf_file':
                return web.json_response(
                    {'error': 'No PDF file provided', 'success': False}, 
                    status=400
                )
            
            # Validate file type
            filename = field.filename or 'unknown.pdf'
            if not filename.lower().endswith('.pdf'):
                return web.json_response(
                    {'error': 'Only PDF files are supported', 'success': False}, 
                    status=400
                )
            
            # Read file content
            file_content = await field.read()
            
            if len(file_content) == 0:
                return web.json_response(
                    {'error': 'Empty file provided', 'success': False}, 
                    status=400
                )
            
            # Process the PDF using our utility
            from io import BytesIO
            pdf_file_obj = BytesIO(file_content)
            
            processor = PDFProcessor()
            result = await processor.process_and_upload_pdf(pdf_file_obj, filename)
            
            # Log the result
            await debug_logger.log_event(
                DebugEventType.AZURE_SEARCH_CALL,
                f"PDF upload {'completed' if result['processing_successful'] else 'failed'}: {filename}",
                {
                    "action": "pdf_upload_complete",
                    "filename": filename,
                    "success": result['processing_successful'],
                    "chunks_created": result.get('documents_created', 0)
                }
            )
            
            if result['processing_successful']:
                return web.json_response({
                    'success': True,
                    'message': result['message'],
                    'filename': filename,
                    'chunks_created': result['documents_created'],
                    'upload_details': result['upload_result'],
                    'verification': result['verification_result']
                })
            else:
                return web.json_response(
                    {
                        'success': False,
                        'error': result['error'],
                        'message': result['message']
                    }, 
                    status=500
                )
            
        except Exception as e:
            error_message = f"PDF upload failed: {str(e)}"
            logger.error(error_message)
            
            # Log the error
            await debug_logger.log_event(
                DebugEventType.ERROR,
                error_message,
                {"action": "pdf_upload_error", "error": str(e)}
            )
            
            return web.json_response(
                {'error': error_message, 'success': False}, 
                status=500
            )
    
    # Health check endpoint for Application Gateway probe
    async def health_check(request):
        return web.json_response({"status": "healthy", "service": "aispeech-rag-audio"})
    
    current_directory = Path(__file__).parent
    app.add_routes([
        web.get('/', lambda _: web.FileResponse(current_directory / 'static/index.html')),
        web.get('/health', health_check),
        web.get('/debug/ws', debug_websocket_handler),
        web.get('/debug/events', get_debug_events),
        web.post('/debug/clear', clear_debug_events),
        web.get('/debug/stats', get_debug_stats),
        web.post('/debug/upload-pdf', upload_pdf_knowledge),
        # System configuration management routes (prompt + voice)
        web.get('/debug/system-config', get_system_config),
        web.post('/debug/system-prompt', set_system_prompt),
        web.post('/debug/system-prompt/reset', reset_system_prompt),
        web.post('/debug/voice-choice', set_voice_choice),
        web.post('/debug/voice-choice/reset', reset_voice_choice)
    ])
    app.router.add_static('/', path=current_directory / 'static', name='static')
    
    return app

if __name__ == "__main__":
    host = "localhost"
    port = 8765
    web.run_app(create_app(), host=host, port=port)
