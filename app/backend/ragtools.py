import re
from typing import Any

from azure.core.credentials import AzureKeyCredential
from azure.identity import DefaultAzureCredential
from azure.search.documents.aio import SearchClient
from azure.search.documents.models import VectorizableTextQuery

from rtmt import RTMiddleTier, Tool, ToolResult, ToolResultDirection
from debug_logger import (
    debug_logger, 
    DebugEventType, 
    log_search_start, 
    log_search_complete,
    log_error_event
)

_search_tool_schema = {
    "type": "function",
    "name": "search",
    "description": "Search the knowledge base. The knowledge base is in English, translate to and from English if " + \
                   "needed. Results are formatted as a source name first in square brackets, followed by the text " + \
                   "content, and a line with '-----' at the end of each result.",
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query"
            }
        },
        "required": ["query"],
        "additionalProperties": False
    }
}

_grounding_tool_schema = {
    "type": "function",
    "name": "report_grounding",
    "description": "Report use of a source from the knowledge base as part of an answer (effectively, cite the source). Sources " + \
                   "appear in square brackets before each knowledge base passage. Always use this tool to cite sources when responding " + \
                   "with information from the knowledge base.",
    "parameters": {
        "type": "object",
        "properties": {
            "sources": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "List of source names from last statement actually used, do not include the ones not used to formulate a response"
            }
        },
        "required": ["sources"],
        "additionalProperties": False
    }
}

async def _search_tool(
    search_client: SearchClient, 
    semantic_configuration: str | None,
    identifier_field: str,
    content_field: str,
    embedding_field: str,
    use_vector_query: bool,
    args: Any) -> ToolResult:
    
    query = args['query']
    print(f"Searching for '{query}' in the knowledge base.")
    
    # Start debug event
    search_event = await log_search_start(query)
    
    try:
        # Log Azure Search API call
        await debug_logger.log_event(
            DebugEventType.AZURE_SEARCH_CALL,
            f"Calling Azure Search API for query: '{query}'",
            {
                "query": query,
                "use_vector_query": use_vector_query,
                "semantic_configuration": semantic_configuration,
                "top": 5
            }
        )
        
        # Hybrid query using Azure AI Search with (optional) Semantic Ranker
        vector_queries = []
        if use_vector_query:
            vector_queries.append(VectorizableTextQuery(text=query, k_nearest_neighbors=50, fields=embedding_field))
        
        search_results = await search_client.search(
            search_text=query, 
            query_type="semantic" if semantic_configuration else "simple",
            semantic_configuration_name=semantic_configuration,
            top=5,
            vector_queries=vector_queries,
            select=", ".join([identifier_field, content_field])
        )
        
        results = []
        result = ""
        async for r in search_results:
            result_data = {
                "id": r[identifier_field],
                "content": r[content_field][:200] + "..." if len(r[content_field]) > 200 else r[content_field]
            }
            results.append(result_data)
            result += f"[{r[identifier_field]}]: {r[content_field]}\n-----\n"
        
        # Complete debug event
        await log_search_complete(search_event, len(results), results)
        
        # If no results found, return explicit message instead of empty string
        if len(results) == 0:
            return ToolResult("No documents found in the knowledge base for this query.", ToolResultDirection.TO_SERVER)
        
        return ToolResult(result, ToolResultDirection.TO_SERVER)
        
    except Exception as e:
        await log_error_event(f"Error during search: {query}", e)
        # Re-raise the exception
        raise

KEY_PATTERN = re.compile(r'^[a-zA-Z0-9_=\-]+$')

# TODO: move from sending all chunks used for grounding eagerly to only sending links to 
# the original content in storage, it'll be more efficient overall
async def _report_grounding_tool(search_client: SearchClient, identifier_field: str, title_field: str, content_field: str, args: Any) -> None:
    sources = [s for s in args["sources"] if KEY_PATTERN.match(s)]
    list = " OR ".join(sources)
    print(f"Grounding source: {list}")
    
    # Log grounding sources
    await debug_logger.log_event(
        DebugEventType.GROUNDING_SOURCES,
        f"Retrieving grounding sources: {sources}",
        {
            "source_ids": sources,
            "search_query": list
        }
    )
    
    try:
        # Use filter instead of search since chunk_id is filterable but not searchable in the current index
        # This is the correct approach for key fields that serve as unique identifiers
        
        # Build filter expression for multiple chunk IDs using OR conditions
        filter_conditions = [f"{identifier_field} eq '{source}'" for source in sources]
        filter_expression = " or ".join(filter_conditions)
        
        search_results = await search_client.search(
            search_text="*",  # Search all documents
            filter=filter_expression,  # Filter by chunk_id values with OR conditions
            select=[identifier_field, title_field, content_field, "source_file"], 
            top=len(sources)
        )
        
        # Note: The previous search approach would only work if chunk_id was configured as searchable
        # with a keyword tokenizer, but in the current index it's only filterable

        docs = []
        async for r in search_results:
            doc = {
                "chunk_id": r[identifier_field], 
                "title": r[title_field], 
                "chunk": r[content_field], 
                "source_file": r.get("source_file", r[title_field])
            }
            docs.append(doc)
            print(f"📄 Retrieved document: chunk_id={doc['chunk_id']}, title='{doc['title']}', source_file='{doc['source_file']}', content_length={len(doc['chunk'])}")
        
        print(f"\n🎯 GROUNDING SUMMARY:")
        print(f"   Total documents retrieved: {len(docs)}")
        
        # Group by source_file to see the distribution
        source_file_counts = {}
        for doc in docs:
            source_file = doc['source_file']
            source_file_counts[source_file] = source_file_counts.get(source_file, 0) + 1
        
        print(f"   Unique source files: {len(source_file_counts)}")
        for source_file, count in source_file_counts.items():
            print(f"     - {source_file}: {count} chunk(s)")
        
        print(f"\n📤 Sending to frontend: {len(docs)} documents")
        
        # Log successful grounding retrieval
        await debug_logger.log_event(
            DebugEventType.GROUNDING_SOURCES,
            f"Successfully retrieved {len(docs)} grounding sources from {len(source_file_counts)} unique files",
            {
                "retrieved_sources": [{
                    "chunk_id": doc["chunk_id"], 
                    "title": doc["title"],
                    "source_file": doc["source_file"],
                    "content_preview": doc["chunk"][:100] + "..." if len(doc["chunk"]) > 100 else doc["chunk"]
                } for doc in docs],
                "source_file_distribution": source_file_counts
            }
        )
        
        return ToolResult({"sources": docs}, ToolResultDirection.TO_CLIENT)
        
    except Exception as e:
        await log_error_event(f"Error retrieving grounding sources: {sources}", e)
        raise

def attach_rag_tools(rtmt: RTMiddleTier,
    credentials: AzureKeyCredential | DefaultAzureCredential,
    search_endpoint: str, search_index: str,
    semantic_configuration: str | None,
    identifier_field: str,
    content_field: str,
    embedding_field: str,
    title_field: str,
    use_vector_query: bool
    ) -> None:
    if not isinstance(credentials, AzureKeyCredential):
        credentials.get_token("https://search.azure.com/.default") # warm this up before we start getting requests
    search_client = SearchClient(search_endpoint, search_index, credentials, user_agent="RTMiddleTier")

    rtmt.tools["search"] = Tool(schema=_search_tool_schema, target=lambda args: _search_tool(search_client, semantic_configuration, identifier_field, content_field, embedding_field, use_vector_query, args))
    rtmt.tools["report_grounding"] = Tool(schema=_grounding_tool_schema, target=lambda args: _report_grounding_tool(search_client, identifier_field, title_field, content_field, args))
