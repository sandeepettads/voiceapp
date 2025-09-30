import { useState, useEffect } from "react";
import { Mic, MicOff, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
// import { GroundingFiles } from "@/components/ui/grounding-files"; // Hidden but functionality preserved
import GroundingFileView from "@/components/ui/grounding-file-view";
import StatusMessage from "@/components/ui/status-message";
import DebugPanel from "@/components/ui/debug-panel";
import VoiceStageVisualizer, { VoiceStage } from "@/components/ui/voice-stage-visualizer";

// New design components
import NewVoiceStageVisualizer from "@/components/ui/NewVoiceStageVisualizer";
import DevelopmentWrapper from "@/components/dev/DevelopmentWrapper";

import useRealTime from "@/hooks/useRealtime";
import useAudioRecorder from "@/hooks/useAudioRecorder";
import useAudioPlayer from "@/hooks/useAudioPlayer";

import { GroundingFile, ToolResult } from "./types";


function App() {
    const [isRecording, setIsRecording] = useState(false);
    // @ts-ignore - groundingFiles is used for background functionality even though not displayed in UI
    const [groundingFiles, setGroundingFiles] = useState<GroundingFile[]>([]); // Hidden from UI but functionality preserved
    const [selectedFile, setSelectedFile] = useState<GroundingFile | null>(null);
    const [isDebugOpen, setIsDebugOpen] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [audioData, setAudioData] = useState<Float32Array>(new Float32Array(128));
    const [isAISpeaking, setIsAISpeaking] = useState(false); // Track if AI is actively in speaking mode
    const [isProcessing, setIsProcessing] = useState(false); // Track if AI is processing/thinking
    
    // Check if we're in development mode for wrapper usage
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Calculate current voice stage based on app state
    const getCurrentVoiceStage = (): VoiceStage => {
        if (!isRecording) return "idle";
        if (isSpeaking) return "responding";
        if (isProcessing) return "processing";
        return "listening";
    };
    
    const [currentStage, setCurrentStage] = useState<VoiceStage>("idle");
    
    // Update stage when app state changes
    useEffect(() => {
        const newStage = getCurrentVoiceStage();
        if (newStage !== currentStage) {
            setCurrentStage(newStage);
        }
    }, [isRecording, isSpeaking, isProcessing]);
    
    // Debug logging for state changes
    useEffect(() => {
        console.log("📋 State Change: isSpeaking =", isSpeaking, "at", new Date().toLocaleTimeString("en-US", { timeZone: "America/Chicago" }), "CST");
    }, [isSpeaking]);
    
    useEffect(() => {
        console.log("📋 State Change: isAISpeaking =", isAISpeaking, "at", new Date().toLocaleTimeString("en-US", { timeZone: "America/Chicago" }), "CST");
    }, [isAISpeaking]);
    

    const { startSession, addUserAudio, inputAudioBufferClear } = useRealTime({
        onWebSocketOpen: () => console.log("WebSocket connection opened"),
        onWebSocketClose: () => console.log("WebSocket connection closed"),
        onWebSocketError: event => console.error("WebSocket error:", event),
        onReceivedError: message => console.error("error", message),
        onReceivedResponseAudioDelta: message => {
            if (isRecording) {
                playAudio(message.delta);
                const now = Date.now();
                console.log("🎵 Audio delta received, AI is speaking at:", new Date(now).toLocaleTimeString("en-US", { timeZone: "America/Chicago" }), "CST");
                setIsSpeaking(true);
                setIsAISpeaking(true);
                setIsProcessing(false); // Clear processing state when AI starts speaking
                
                // Extract real audio data from the base64 delta for visualization
                try {
                    const binary = atob(message.delta);
                    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
                    const pcmData = new Int16Array(bytes.buffer);
                    
                    // Convert PCM data to frequency-like visualization data
                    const visualizationData = new Float32Array(128);
                    const chunkSize = Math.max(1, Math.floor(pcmData.length / 128));
                    
                    for (let i = 0; i < 128; i++) {
                        let sum = 0;
                        for (let j = 0; j < chunkSize && (i * chunkSize + j) < pcmData.length; j++) {
                            sum += Math.abs(pcmData[i * chunkSize + j]);
                        }
                        // Normalize and scale for visualization (0-100 range)
                        visualizationData[i] = Math.min(100, (sum / chunkSize / 32767) * 100);
                    }
                    
                    setAudioData(visualizationData);
                } catch (error) {
                    console.warn("Could not process audio data for visualization, using fallback", error);
                    // Fallback to enhanced mock data if real data processing fails
                    const mockAudioData = new Float32Array(128).map(() => Math.random() * 60 + 20);
                    setAudioData(mockAudioData);
                }
            }
        },
        onReceivedInputAudioBufferSpeechStarted: () => {
            console.log("🎤 User started speaking - stopping AI speech and resetting state");
            stopAudioPlayer();
            setIsSpeaking(false);
            setIsAISpeaking(false);
        },
        onReceivedResponseDone: message => {
            console.log("✅ Response done event received - AI has finished speaking", message);
            // DO NOT stop speaking state - keep animation active until user interrupts
            // Only mark that AI is no longer actively generating audio
            setIsAISpeaking(false);
            // Keep isSpeaking=true to maintain animation
            // Keep lastAudioTime to track when AI actually finished
        },
        onReceivedExtensionMiddleTierToolResponse: message => {
            // Set processing state when receiving tool responses
            setIsProcessing(true);
            
            const result: ToolResult = JSON.parse(message.tool_result);

            console.log('🔧 RAW Tool Result:', JSON.stringify(result, null, 2));
            console.log('📊 Total sources received:', result.sources.length);
            
            // Log each source for debugging
            result.sources.forEach((source, index) => {
                console.log(`📄 Source ${index + 1}:`, {
                    chunk_id: source.chunk_id,
                    title: source.title,
                    source_file: source.source_file,
                    chunk_preview: source.chunk?.substring(0, 100) + '...'
                });
            });

            // Group chunks by source file and combine content
            const sourceFileMap = new Map<string, GroundingFile>();
            
            result.sources.forEach((source, index) => {
                const sourceFileName = source.source_file || source.title + ".pdf";
                console.log(`🗂️  Processing source ${index + 1}: '${sourceFileName}' (from source_file: '${source.source_file}', title: '${source.title}')`);
                
                if (sourceFileMap.has(sourceFileName)) {
                    // Append content if we already have this source file
                    const existing = sourceFileMap.get(sourceFileName)!;
                    existing.content += "\n\n=== Additional Chunk ===\n\n" + source.chunk;
                    console.log(`   📎 Appending to existing file: ${sourceFileName}`);
                } else {
                    // Create new entry for this source file
                    sourceFileMap.set(sourceFileName, {
                        id: source.chunk_id, // Use first chunk_id as file id
                        name: sourceFileName,
                        content: source.chunk
                    });
                    console.log(`   📄 Creating new file entry: ${sourceFileName}`);
                }
            });

            const files: GroundingFile[] = Array.from(sourceFileMap.values());
            
            console.log('🔍 Final grounding files to display:', files.length);
            files.forEach((file, index) => {
                console.log(`   ${index + 1}. ${file.name} (ID: ${file.id}, Content: ${file.content.length} chars)`);
            });
            
            // Replace grounding files instead of appending to avoid duplicates
            setGroundingFiles(files);
        }
    });

    const { reset: resetAudioPlayer, play: playAudio, stop: stopAudioPlayer } = useAudioPlayer();
    
    // NO TIMEOUT - Speaking state only ends when user interrupts or conversation ends
    // This ensures fullscreen visualization persists throughout AI response
    
    // REMOVED ALL TIMEOUT LOGIC - Animation persists until user interruption only
    const { start: startAudioRecording, stop: stopAudioRecording } = useAudioRecorder({ onAudioRecorded: addUserAudio });

    const onToggleListening = async () => {
        if (!isRecording) {
            startSession();
            await startAudioRecording();
            resetAudioPlayer();

            setIsRecording(true);
        } else {
            await stopAudioRecording();
            stopAudioPlayer();
            inputAudioBufferClear();
            setIsSpeaking(false);
            setIsAISpeaking(false);
            setIsProcessing(false); // Clear processing state when stopping

            setIsRecording(false);
        }
    };


    // Main App UI Component
    const AppUI: React.FC<{
        currentStage?: VoiceStage;
        isRecording?: boolean;
        isSpeaking?: boolean;
        isProcessing?: boolean;
        audioData?: Float32Array;
    }> = ({ 
        currentStage: devCurrentStage, 
        isRecording: devIsRecording, 
        isSpeaking: devIsSpeaking,
        isProcessing: devIsProcessing,
        audioData: devAudioData 
    }) => {
        // Use dev state if available, otherwise use production state
        const displayStage = devCurrentStage ?? currentStage;
        const displayIsRecording = devIsRecording ?? isRecording;
        const displayIsSpeaking = devIsSpeaking ?? isSpeaking;
        const displayIsProcessing = devIsProcessing ?? isProcessing;
        const displayAudioData = devAudioData ?? audioData;
        
        return (
            <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900">
                {/* Debug Settings Gear Icon */}
                <div className="absolute right-4 top-4">
                    <Button
                        onClick={() => setIsDebugOpen(true)}
                        variant="ghost"
                        size="sm"
                        className="p-2 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-800"
                        aria-label="Open debug console"
                    >
                        <Settings className="h-5 w-5" />
                    </Button>
                </div>

                <main className="flex flex-grow flex-col items-center justify-center">
                    {/* Voice Stage Visualizer - Use new design in dev, old in production */}
                    <div className="mb-8">
                        {isDevelopment ? (
                            <NewVoiceStageVisualizer
                                stage={displayStage}
                                audioData={displayAudioData}
                                size="large"
                                className="cursor-pointer transition-transform hover:scale-105"
                            />
                        ) : (
                            <VoiceStageVisualizer 
                                stage={displayStage}
                                audioData={displayAudioData}
                                size="large"
                                className="cursor-pointer transition-transform hover:scale-105"
                            />
                        )}
                    </div>
                    
                    {/* Spacer to push controls further down */}
                    <div className="mb-16"></div>
                    
                    {/* Controls - Moved further down */}
                    <div className="mb-4 flex flex-col items-center justify-center">
                        <Button
                            onClick={onToggleListening}
                            className={`h-12 w-12 ${displayIsRecording ? "bg-red-600 hover:bg-red-700" : "bg-blue-800 hover:bg-blue-900"}`}
                            aria-label={displayIsRecording ? "Stop recording" : "Start speaking"}
                            disabled={displayIsSpeaking && !displayIsRecording} // Disable during AI response if not recording
                        >
                            {displayIsRecording ? (
                                <MicOff className="h-6 w-6" />
                            ) : (
                                <Mic className="h-6 w-6" />
                            )}
                        </Button>
                        <StatusMessage isRecording={displayIsRecording} />
                    </div>
                    
                    {/* Grounding Files - Hidden from UI but functionality preserved */}
                    {/* <GroundingFiles files={groundingFiles} onSelected={setSelectedFile} /> */}
                </main>

                <GroundingFileView groundingFile={selectedFile} onClosed={() => setSelectedFile(null)} />

                {/* Debug Panel */}
                <DebugPanel isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} />
            </div>
        );
    };

    // Return with development wrapper in dev mode, plain app in production
    if (isDevelopment) {
        return (
            <DevelopmentWrapper>
                {(devProps) => <AppUI {...devProps} />}
            </DevelopmentWrapper>
        );
    }

    return <AppUI />;
}

export default App;
