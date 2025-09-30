/**
 * Stage Test Controls - Development Only Component
 * Provides manual controls to test all voice stage transitions
 * Only renders in development mode (NODE_ENV=development)
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import type { VoiceStage } from '@/components/ui/voice-stage-visualizer';

interface StageTestControlsProps {
  currentStage: VoiceStage;
  onStageChange: (stage: VoiceStage) => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  isSpeaking: boolean;
  onToggleSpeaking: () => void;
  isProcessing: boolean;
  onToggleProcessing: () => void;
}

const StageTestControls: React.FC<StageTestControlsProps> = ({
  currentStage,
  onStageChange,
  isRecording,
  onToggleRecording,
  isSpeaking,
  onToggleSpeaking,
  isProcessing,
  onToggleProcessing,
}) => {
  const stages: { stage: VoiceStage; label: string; description: string }[] = [
    { stage: 'idle', label: 'Idle', description: 'Static halo + Optum O' },
    { stage: 'listening', label: 'Listening', description: 'Rotating halos + Optum O' },
    { stage: 'responding', label: 'Responding', description: 'Static halo + Optum O + Sound Wave' },
  ];

  return (
    <div className="fixed top-4 left-4 z-50 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-sm">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-gray-700 mb-1">🔧 DEV CONTROLS</h3>
        <p className="text-xs text-gray-500">Test voice stage transitions</p>
      </div>
      
      {/* Current Stage Display */}
      <div className="mb-3 p-2 bg-gray-50 rounded">
        <div className="text-xs text-gray-600">Current Stage:</div>
        <div className="font-semibold text-sm capitalize text-blue-600">
          {currentStage}
        </div>
      </div>

      {/* Manual Stage Controls */}
      <div className="space-y-2 mb-4">
        <div className="text-xs font-medium text-gray-600 mb-1">Manual Stage Selection:</div>
        {stages.map(({ stage, label, description }) => (
          <button
            key={stage}
            onClick={() => onStageChange(stage)}
            className={`w-full text-left p-2 rounded text-xs transition-colors ${
              currentStage === stage
                ? 'bg-blue-100 border border-blue-300 text-blue-700'
                : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <div className="font-medium">{label}</div>
            <div className="text-gray-500 text-xs">{description}</div>
          </button>
        ))}
      </div>

      {/* State Toggles */}
      <div className="space-y-2 mb-4">
        <div className="text-xs font-medium text-gray-600 mb-1">State Controls:</div>
        
        <label className="flex items-center text-xs">
          <input
            type="checkbox"
            checked={isRecording}
            onChange={onToggleRecording}
            className="mr-2"
          />
          <span className={isRecording ? 'text-red-600 font-medium' : ''}>
            Recording {isRecording ? '(ON)' : '(OFF)'}
          </span>
        </label>

        <label className="flex items-center text-xs">
          <input
            type="checkbox"
            checked={isSpeaking}
            onChange={onToggleSpeaking}
            className="mr-2"
          />
          <span className={isSpeaking ? 'text-orange-600 font-medium' : ''}>
            AI Speaking {isSpeaking ? '(ON)' : '(OFF)'}
          </span>
        </label>

        <label className="flex items-center text-xs">
          <input
            type="checkbox"
            checked={isProcessing}
            onChange={onToggleProcessing}
            className="mr-2"
          />
          <span className={isProcessing ? 'text-yellow-600 font-medium' : ''}>
            Processing {isProcessing ? '(ON)' : '(OFF)'}
          </span>
        </label>
      </div>

      {/* Quick Actions */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-600 mb-1">Quick Actions:</div>
        <div className="grid grid-cols-2 gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onStageChange('listening');
              onToggleRecording();
            }}
            className="text-xs py-1 h-auto"
          >
            Start Listen
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onStageChange('responding');
              onToggleSpeaking();
            }}
            className="text-xs py-1 h-auto"
          >
            Start Response
          </Button>
        </div>
      </div>

      {/* Environment indicator */}
      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-400">
          NODE_ENV: {process.env.NODE_ENV}
        </div>
      </div>
    </div>
  );
};

export default StageTestControls;