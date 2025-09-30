/**
 * Development Wrapper - Development Only Component
 * Wraps the main app with development controls when NODE_ENV=development
 * Automatically excluded from production builds
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { VoiceStage } from '@/components/ui/voice-stage-visualizer';
import StageTestControls from './StageTestControls';
import { generateMockAudioData } from './MockDataGenerator';

interface DevelopmentWrapperProps {
  children: (props: {
    // Override app state for development testing
    currentStage: VoiceStage;
    isRecording: boolean;
    isSpeaking: boolean;
    isProcessing: boolean;
    audioData: Float32Array;
  }) => React.ReactNode;
}

const DevelopmentWrapper: React.FC<DevelopmentWrapperProps> = ({ children }) => {
  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    // In production, render children with default props
    return (
      <>
        {children({
          currentStage: 'idle',
          isRecording: false,
          isSpeaking: false,
          isProcessing: false,
          audioData: new Float32Array(128),
        })}
      </>
    );
  }

  // Development state management
  const [currentStage, setCurrentStage] = useState<VoiceStage>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioData, setAudioData] = useState<Float32Array>(new Float32Array(128));

  // Generate mock audio data continuously when in responding state
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentStage === 'responding' && isSpeaking) {
      interval = setInterval(() => {
        setAudioData(generateMockAudioData());
      }, 100); // Update every 100ms for smooth animation
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentStage, isSpeaking]);

  // Auto-determine stage based on state (similar to real app logic)
  const determineStage = useCallback((): VoiceStage => {
    if (!isRecording) return 'idle';
    if (isSpeaking) return 'responding';
    if (isProcessing) return 'processing';
    return 'listening';
  }, [isRecording, isSpeaking, isProcessing]);

  // Update stage when state changes (unless manually overridden)
  const [manualStageOverride, setManualStageOverride] = useState(false);
  
  useEffect(() => {
    if (!manualStageOverride) {
      const autoStage = determineStage();
      if (autoStage !== currentStage) {
        setCurrentStage(autoStage);
      }
    }
  }, [isRecording, isSpeaking, isProcessing, manualStageOverride, currentStage, determineStage]);

  // Handle manual stage changes
  const handleStageChange = (stage: VoiceStage) => {
    setCurrentStage(stage);
    setManualStageOverride(true);
    
    // Update related state to match the stage
    switch (stage) {
      case 'idle':
        setIsRecording(false);
        setIsSpeaking(false);
        setIsProcessing(false);
        break;
      case 'listening':
        setIsRecording(true);
        setIsSpeaking(false);
        setIsProcessing(false);
        break;
      case 'responding':
        setIsRecording(true);
        setIsSpeaking(true);
        setIsProcessing(false);
        break;
      case 'processing':
        setIsRecording(true);
        setIsSpeaking(false);
        setIsProcessing(true);
        break;
    }
    
    // Clear manual override after a delay to allow automatic stage management
    setTimeout(() => setManualStageOverride(false), 2000);
  };

  // Toggle functions for individual state controls
  const handleToggleRecording = () => {
    setIsRecording(prev => !prev);
    setManualStageOverride(false);
  };

  const handleToggleSpeaking = () => {
    setIsSpeaking(prev => !prev);
    setManualStageOverride(false);
  };

  const handleToggleProcessing = () => {
    setIsProcessing(prev => !prev);
    setManualStageOverride(false);
  };

  return (
    <>
      {/* Development Controls Overlay */}
      <StageTestControls
        currentStage={currentStage}
        onStageChange={handleStageChange}
        isRecording={isRecording}
        onToggleRecording={handleToggleRecording}
        isSpeaking={isSpeaking}
        onToggleSpeaking={handleToggleSpeaking}
        isProcessing={isProcessing}
        onToggleProcessing={handleToggleProcessing}
      />

      {/* Render main app with development state */}
      {children({
        currentStage,
        isRecording,
        isSpeaking,
        isProcessing,
        audioData,
      })}

      {/* Development Info */}
      <div className="fixed bottom-4 left-4 z-40 bg-black bg-opacity-75 text-white px-3 py-2 rounded text-xs">
        <div>🛠️ Development Mode</div>
        <div>Stage: <span className="font-mono text-yellow-300">{currentStage}</span></div>
        <div>Audio Data: <span className="font-mono text-green-300">{audioData.length} samples</span></div>
      </div>
    </>
  );
};

export default DevelopmentWrapper;