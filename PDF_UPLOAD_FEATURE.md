# PDF Upload Feature for Debug Panel

## Overview

A new PDF upload feature has been successfully added to your Debug panel that allows you to upload knowledge base documents directly to your Azure Search service (GPTKBINDEX) without affecting existing documents.

## Key Features

✅ **Drag & Drop Interface**: Simply drag PDF files onto the upload area  
✅ **Non-Destructive Uploads**: Adds new documents without affecting existing content  
✅ **Automatic Processing**: Extracts text, creates chunks, and uploads to Azure Search  
✅ **Real-time Progress**: Visual feedback during upload and processing  
✅ **Verification**: Confirms documents are successfully indexed  
✅ **Debug Integration**: All upload activities are logged in debug events  

## How to Use

### 1. Access the Feature
1. Open your application in a web browser
2. Click the Settings gear icon to open the Debug panel
3. Navigate to the **"Knowledge"** tab (new tab with Upload icon)

### 2. Upload a PDF
1. **Drag & Drop**: Drag a PDF file directly onto the upload area, OR
2. **Click to Select**: Click "Choose PDF File" button to browse and select a file
3. Watch the progress indicator as the file is processed
4. Review the upload results and verification status

### 3. Upload Results
- **Success**: Shows number of chunks created and verification status
- **Failure**: Displays error details and troubleshooting information
- **Details**: View comprehensive upload statistics and Azure Search integration info

## Technical Implementation

### Backend Components
- **`pdf_processor.py`**: Core PDF processing utility
- **Upload endpoint**: `POST /debug/upload-pdf` in `app.py`
- **Azure Search integration**: Direct upload to GPTKBINDEX without affecting existing documents

### Frontend Components  
- **`pdf-upload.tsx`**: React component with drag & drop interface
- **Debug panel integration**: New "Knowledge" tab in debug-panel.tsx
- **Real-time feedback**: Progress indicators and status messages

### Processing Pipeline
1. **File Validation**: Ensures only PDF files are accepted
2. **Text Extraction**: Uses PyPDF2 to extract text content
3. **Intelligent Chunking**: Splits text into 1000-character chunks with 100-character overlap
4. **Unique IDs**: Generates unique chunk identifiers to prevent conflicts
5. **Azure Upload**: Batch upload to Azure Search with error handling
6. **Verification**: Confirms successful indexing via search queries

## Configuration

The feature uses your existing Azure Search configuration:

```env
AZURE_SEARCH_ENDPOINT=https://your-search-service.search.windows.net
AZURE_SEARCH_API_KEY=your-api-key
AZURE_SEARCH_INDEX=gptkbindex
```

## Error Handling

- **Invalid file types**: Only PDF files are accepted
- **Empty files**: Validation prevents processing of empty files
- **Processing errors**: Detailed error messages for troubleshooting
- **Network issues**: Graceful handling of connection problems
- **Azure Search errors**: Specific error reporting for indexing failures

## Debug Integration

All PDF upload activities are logged as debug events:
- `pdf_upload_start`: When upload begins
- `pdf_upload_complete`: When upload finishes (success/failure)
- `pdf_upload_error`: Any processing errors

## Best Practices

### Supported PDF Types
- ✅ Text-based PDFs (searchable content)
- ✅ OCR-processed PDFs (text layer)
- ⚠️ Image-only PDFs (limited text extraction)
- ⚠️ Password-protected PDFs (not supported)

### File Size Recommendations
- **Optimal**: Under 10MB per file
- **Supported**: Up to 50MB (may take longer to process)
- **Large files**: Consider splitting into smaller documents

### Content Guidelines
- Ensure PDFs contain searchable text
- Avoid heavily formatted documents (tables, complex layouts)
- Business documents, policies, and knowledge articles work best

## Troubleshooting

### Common Issues

**"No text could be extracted"**
- PDF may be image-only or password-protected
- Try OCR processing the PDF first

**"Upload failed due to network error"**
- Check internet connection
- Verify Azure Search service is accessible
- Check firewall/proxy settings

**"Azure Search indexing errors"**
- Verify Azure Search credentials in .env file
- Ensure GPTKBINDEX exists and is accessible
- Check Azure Search service status

**"Verification failed"**
- Document was uploaded but indexing may take time
- Check Azure Search portal for indexing status
- Retry the verification after a few minutes

### Debug Information
Enable detailed logging by:
1. Check debug events in the "Events" tab
2. Look for `azure_search_call` events
3. Review error details in event data

## Security Considerations

- Files are processed server-side and not stored permanently
- Only PDF content is indexed, not the original files
- All uploads go through your existing Azure Search authentication
- Debug events contain metadata only, not document content

## Testing the Feature

To test the PDF upload feature:

1. **Start your application**:
   ```bash
   cd app/backend
   python app.py
   ```

2. **Open browser** to `http://localhost:8765`

3. **Access Debug Panel**:
   - Click the Settings/Debug button
   - Switch to the "Knowledge" tab

4. **Upload a test PDF**:
   - Use any PDF document with text content
   - Monitor the upload process and results

5. **Verify in Azure Search**:
   - Check your Azure Search index for new documents
   - Search for content from the uploaded PDF

## Future Enhancements

Potential improvements for future versions:
- Support for multiple file formats (Word, PowerPoint, etc.)
- Batch upload for multiple PDFs
- Document preview and editing capabilities
- Advanced chunking strategies
- Vector embeddings integration
- Duplicate detection and handling

---

🎉 **The PDF upload feature is now ready to use!** Start uploading documents to enhance your AI knowledge base through the intuitive Debug panel interface.
