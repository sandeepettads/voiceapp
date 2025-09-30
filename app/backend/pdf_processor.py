#!/usr/bin/env python3
"""
PDF Processing Utility for Knowledge Base Upload
Handles single PDF file processing and upload to Azure Search without affecting existing documents
"""

import json
import os
import hashlib
import time
import logging
from typing import List, Dict, Any, Optional, BinaryIO
from pathlib import Path

# Document processing imports
import PyPDF2
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents import IndexDocumentsBatch

logger = logging.getLogger(__name__)

class PDFProcessor:
    def __init__(self):
        """Initialize the PDF processor with Azure Search configuration"""
        self.load_config()
        self.setup_clients()
    
    def load_config(self):
        """Load configuration from environment variables"""
        # Load search configuration from .env or environment
        self.endpoint = os.environ.get('AZURE_SEARCH_ENDPOINT')
        self.key = os.environ.get('AZURE_SEARCH_API_KEY') or os.environ.get('AZURE_SEARCH_KEY')
        self.index_name = os.environ.get('AZURE_SEARCH_INDEX', 'gptkbindex')
        
        if not self.endpoint:
            raise ValueError("AZURE_SEARCH_ENDPOINT not found in environment")
        if not self.key:
            raise ValueError("AZURE_SEARCH_API_KEY not found in environment")
        
        logger.info(f"PDF Processor initialized for index: {self.index_name}")
    
    def setup_clients(self):
        """Setup Azure Search clients"""
        credential = AzureKeyCredential(self.key)
        self.search_client = SearchClient(self.endpoint, self.index_name, credential)
        self.index_client = SearchIndexClient(self.endpoint, credential)
    
    def extract_text_from_pdf(self, pdf_file: BinaryIO, filename: str) -> str:
        """Extract text from PDF file object"""
        try:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting text from {filename}: {e}")
            raise
    
    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 100) -> List[str]:
        """Split text into overlapping chunks"""
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            
            # Try to break at sentence boundary
            if end < len(text):
                # Look for sentence endings within the last 200 characters
                sentence_end = text.rfind('.', start, end)
                if sentence_end > start + chunk_size - 200:
                    end = sentence_end + 1
                else:
                    # Look for word boundary
                    space_pos = text.rfind(' ', start, end)
                    if space_pos > start + chunk_size - 100:
                        end = space_pos
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = end - overlap
            if start >= len(text):
                break
        
        return chunks
    
    def generate_chunk_id(self, content: str, filename: str, chunk_index: int) -> str:
        """Generate a unique ID for a chunk based on content, filename, and index"""
        # Include filename and timestamp to ensure uniqueness
        timestamp = str(int(time.time() * 1000))
        unique_string = f"{filename}_{chunk_index}_{content[:100]}_{timestamp}"
        return hashlib.md5(unique_string.encode('utf-8')).hexdigest()
    
    def process_pdf_file(self, pdf_file: BinaryIO, filename: str) -> List[Dict[str, Any]]:
        """Process a PDF file and return documents ready for Azure Search"""
        logger.info(f"Processing PDF file: {filename}")
        
        # Extract text from PDF
        text = self.extract_text_from_pdf(pdf_file, filename)
        
        if not text:
            raise ValueError(f"No text could be extracted from {filename}")
        
        # Split into chunks
        chunks = self.chunk_text(text)
        logger.info(f"Created {len(chunks)} chunks from {filename}")
        
        # Create documents for Azure Search
        documents = []
        for i, chunk in enumerate(chunks):
            chunk_id = self.generate_chunk_id(chunk, filename, i)
            doc = {
                'chunk_id': chunk_id,
                'chunk': chunk,
                'title': Path(filename).stem.replace('_', ' ').replace('-', ' ').title(),
                'source_file': filename,
                'chunk_index': i
            }
            documents.append(doc)
        
        return documents
    
    def upload_documents_to_azure(self, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Upload documents to Azure Search without affecting existing documents"""
        if not documents:
            raise ValueError("No documents to upload")
        
        logger.info(f"Uploading {len(documents)} documents to Azure Search index: {self.index_name}")
        
        try:
            # Upload all documents in a single batch (Azure Search supports up to 1000)
            batch = IndexDocumentsBatch()
            batch.add_upload_actions(documents)
            
            result = self.search_client.index_documents(batch)
            
            # Check results
            successful_uploads = 0
            failed_uploads = 0
            errors = []
            
            for r in result:
                if r.succeeded:
                    successful_uploads += 1
                else:
                    failed_uploads += 1
                    errors.append(f"Document {r.key}: {r.error_message}")
            
            upload_result = {
                'total_chunks': len(documents),
                'successful_uploads': successful_uploads,
                'failed_uploads': failed_uploads,
                'errors': errors
            }
            
            logger.info(f"Upload completed: {successful_uploads} successful, {failed_uploads} failed")
            
            return upload_result
            
        except Exception as e:
            logger.error(f"Error uploading documents: {e}")
            raise
    
    def verify_upload(self, expected_chunks: int, source_filename: str) -> Dict[str, Any]:
        """Verify that the uploaded documents are searchable"""
        try:
            # Wait a moment for indexing to complete
            time.sleep(2)
            
            # Search for documents from this source file
            results = self.search_client.search(
                f"source_file:{source_filename}",
                include_total_count=True
            )
            
            found_docs = results.get_count()
            verification_result = {
                'expected_chunks': expected_chunks,
                'found_in_index': found_docs,
                'verification_successful': found_docs == expected_chunks
            }
            
            logger.info(f"Verification: Expected {expected_chunks}, found {found_docs} documents")
            
            return verification_result
            
        except Exception as e:
            logger.error(f"Error during verification: {e}")
            return {
                'expected_chunks': expected_chunks,
                'found_in_index': 0,
                'verification_successful': False,
                'error': str(e)
            }

    async def process_and_upload_pdf(self, pdf_file: BinaryIO, filename: str) -> Dict[str, Any]:
        """Main method to process and upload a PDF file"""
        try:
            logger.info(f"Starting PDF processing for: {filename}")
            
            # Step 1: Process PDF into chunks
            documents = self.process_pdf_file(pdf_file, filename)
            
            # Step 2: Upload to Azure Search
            upload_result = self.upload_documents_to_azure(documents)
            
            # Step 3: Verify upload
            verification_result = self.verify_upload(len(documents), filename)
            
            # Combine results
            result = {
                'filename': filename,
                'processing_successful': True,
                'documents_created': len(documents),
                'upload_result': upload_result,
                'verification_result': verification_result,
                'message': f"Successfully processed and uploaded {filename} with {len(documents)} chunks"
            }
            
            logger.info(f"PDF processing completed successfully for: {filename}")
            return result
            
        except Exception as e:
            error_message = f"Failed to process PDF {filename}: {str(e)}"
            logger.error(error_message)
            return {
                'filename': filename,
                'processing_successful': False,
                'error': error_message,
                'message': error_message
            }
