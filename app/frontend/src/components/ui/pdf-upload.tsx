import { useState, useRef } from "react";
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, Database } from "lucide-react";
import { Button } from "./button";
import PasswordDialog from "./password-dialog";

type UploadStatus = "idle" | "uploading" | "success" | "error";

type UploadResult = {
    success: boolean;
    message: string;
    filename?: string;
    chunks_created?: number;
    upload_details?: {
        total_chunks: number;
        successful_uploads: number;
        failed_uploads: number;
        errors: string[];
    };
    verification?: {
        expected_chunks: number;
        found_in_index: number;
        verification_successful: boolean;
    };
    error?: string;
};

type PDFUploadProps = {
    onUploadComplete?: (result: UploadResult) => void;
};

export default function PDFUpload({ onUploadComplete }: PDFUploadProps) {
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle file selection - shows password dialog first
    const handleFileSelect = (file: File) => {
        if (file.type !== "application/pdf") {
            setUploadStatus("error");
            setUploadResult({
                success: false,
                message: "Please select a PDF file",
                error: "Invalid file type. Only PDF files are supported."
            });
            return;
        }

        // Store file and show password dialog
        setPendingFile(file);
        setShowPasswordDialog(true);
    };

    // Confirmed upload after password authentication
    const handleConfirmedUpload = () => {
        setShowPasswordDialog(false);
        if (pendingFile) {
            uploadPDF(pendingFile);
            setPendingFile(null);
        }
    };

    // Cancel upload and clear pending file
    const handleCancelUpload = () => {
        setShowPasswordDialog(false);
        setPendingFile(null);
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        // Show cancelled message
        setUploadStatus("error");
        setUploadResult({
            success: false,
            message: "Upload cancelled due to authentication failure",
            error: "File upload was cancelled for security reasons."
        });
    };

    const uploadPDF = async (file: File) => {
        setUploadStatus("uploading");
        setUploadResult(null);

        try {
            const formData = new FormData();
            formData.append("pdf_file", file);

            const response = await fetch("/debug/upload-pdf", {
                method: "POST",
                body: formData,
            });

            const result: UploadResult = await response.json();

            if (result.success) {
                setUploadStatus("success");
                setUploadResult(result);
                onUploadComplete?.(result);
            } else {
                setUploadStatus("error");
                setUploadResult(result);
            }
        } catch (error) {
            const errorResult: UploadResult = {
                success: false,
                message: "Upload failed due to network or server error",
                error: error instanceof Error ? error.message : "Unknown error"
            };
            setUploadStatus("error");
            setUploadResult(errorResult);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleChooseFile = () => {
        fileInputRef.current?.click();
    };

    const resetUpload = () => {
        setUploadStatus("idle");
        setUploadResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const getStatusIcon = () => {
        switch (uploadStatus) {
            case "uploading":
                return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
            case "success":
                return <CheckCircle className="h-5 w-5 text-green-600" />;
            case "error":
                return <AlertCircle className="h-5 w-5 text-red-600" />;
            default:
                return <Database className="h-5 w-5 text-gray-500" />;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <Upload className="h-4 w-4 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-800">Upload Knowledge Base</h3>
            </div>

            {/* Upload Area */}
            <div
                className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                    isDragActive
                        ? "border-blue-400 bg-blue-50"
                        : uploadStatus === "error"
                        ? "border-red-300 bg-red-50"
                        : uploadStatus === "success"
                        ? "border-green-300 bg-green-50"
                        : "border-gray-300 bg-gray-50 hover:border-gray-400"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileInputChange}
                    className="hidden"
                />

                <div className="flex flex-col items-center gap-3">
                    {getStatusIcon()}
                    
                    {uploadStatus === "idle" && (
                        <>
                            <div>
                                <p className="text-sm font-medium text-gray-800">
                                    Drop a PDF file here or click to select
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    The document will be added to your knowledge base without affecting existing content
                                </p>
                            </div>
                            <Button
                                onClick={handleChooseFile}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                disabled={uploadStatus !== "idle"}
                            >
                                <FileText className="h-4 w-4" />
                                Choose PDF File
                            </Button>
                        </>
                    )}

                    {uploadStatus === "uploading" && (
                        <div>
                            <p className="text-sm font-medium text-blue-800">
                                Processing PDF document...
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                                Extracting text, creating chunks, and uploading to Azure Search
                            </p>
                        </div>
                    )}

                    {uploadStatus === "success" && uploadResult && (
                        <div className="text-center">
                            <p className="text-sm font-medium text-green-800">
                                Upload successful!
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                                {uploadResult.chunks_created} chunks created from {uploadResult.filename}
                            </p>
                            {uploadResult.verification?.verification_successful && (
                                <p className="text-xs text-green-600">
                                    ✓ Verified in knowledge base
                                </p>
                            )}
                        </div>
                    )}

                    {uploadStatus === "error" && uploadResult && (
                        <div className="text-center">
                            <p className="text-sm font-medium text-red-800">
                                Upload failed
                            </p>
                            <p className="text-xs text-red-600 mt-1">
                                {uploadResult.error || uploadResult.message}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Results Details */}
            {uploadResult && (uploadStatus === "success" || uploadStatus === "error") && (
                <div className="rounded-lg border bg-white p-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Upload Details</h4>
                    <div className="space-y-2 text-xs text-gray-600">
                        <div>
                            <span className="font-medium">File:</span> {uploadResult.filename}
                        </div>
                        {uploadResult.chunks_created !== undefined && (
                            <div>
                                <span className="font-medium">Chunks Created:</span> {uploadResult.chunks_created}
                            </div>
                        )}
                        {uploadResult.upload_details && (
                            <div>
                                <span className="font-medium">Upload Status:</span>{" "}
                                {uploadResult.upload_details.successful_uploads}/{uploadResult.upload_details.total_chunks} successful
                                {uploadResult.upload_details.failed_uploads > 0 && (
                                    <span className="text-red-600">
                                        , {uploadResult.upload_details.failed_uploads} failed
                                    </span>
                                )}
                            </div>
                        )}
                        {uploadResult.verification && (
                            <div>
                                <span className="font-medium">Verification:</span>{" "}
                                {uploadResult.verification.verification_successful ? (
                                    <span className="text-green-600">✓ Verified in index</span>
                                ) : (
                                    <span className="text-red-600">⚠ Verification failed</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-3 flex gap-2">
                        <Button
                            onClick={resetUpload}
                            variant="outline"
                            size="sm"
                        >
                            Upload Another
                        </Button>
                        {uploadStatus === "error" && uploadResult.upload_details?.errors && uploadResult.upload_details.errors.length > 0 && (
                            <details className="mt-2">
                                <summary className="cursor-pointer text-xs text-red-600 hover:underline">
                                    View Error Details
                                </summary>
                                <div className="mt-2 max-h-20 overflow-y-auto rounded border bg-red-50 p-2 text-xs text-red-700">
                                    {uploadResult.upload_details.errors.map((error, index) => (
                                        <div key={index}>{error}</div>
                                    ))}
                                </div>
                            </details>
                        )}
                    </div>
                </div>
            )}

            {/* Password Dialog */}
            <PasswordDialog
                isOpen={showPasswordDialog}
                onConfirm={handleConfirmedUpload}
                onCancel={handleCancelUpload}
                title="Confirm Knowledge Base Upload"
                description={`Enter password to upload "${pendingFile?.name}" to the Azure Search knowledge base. Incorrect password will cancel the upload.`}
            />
        </div>
    );
}
