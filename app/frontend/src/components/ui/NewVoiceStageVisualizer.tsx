/**
 * New Voice Stage Visualizer
 * Implementation of the updated design with static-halo.svg, Optum O.svg, and other assets
 */

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./voice-stage-visualizer.css"; // Reusing existing CSS with new components

// Import new design assets
import StaticHaloUrl from "@/assets/static-halo.svg";
import OptumOUrl from "@/assets/Optum O.svg";
import ListeningHalo1Url from "@/assets/listening-halo-1.svg";
import ListeningHalo2Url from "@/assets/listening-halo-2.svg";
import SoundWaveAnimatedUrl from "@/assets/sound-wave-animated.svg";

// Types for voice stages
export type VoiceStage = "idle" | "listening" | "processing" | "responding" | "microphone";

interface VoiceStageVisualizerProps {
  stage: VoiceStage;
  audioData?: Float32Array | number[];
  className?: string;
  size?: "small" | "medium" | "large";
  onClick?: () => void;
}

// Shared Optum O component used across all stages
const OptumO: React.FC<{ size: string }> = ({ size }) => {
  // Calculate size based on the size prop to maintain ratio
  // Original SVG is 237px, parent is 365px (ratio ~0.65)
  const sizeMapping = {
    small: "w-20 h-20", // Approximately 65% of small container
    medium: "w-40 h-40", // Approximately 65% of medium container
    large: "w-60 h-60", // Approximately 65% of large container
  };

  const sizeClass = sizeMapping[size as keyof typeof sizeMapping] || sizeMapping.large;

  return (
    <div className={`optum-o absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${sizeClass}`}>
      <img
        src={OptumOUrl}
        alt="Optum O"
        className="w-full h-full object-contain"
      />
    </div>
  );
};

// New Idle Stage Component
const IdleStage: React.FC<{ size: string }> = ({ size }) => {
  return (
    <div className={`voice-stage idle-stage ${size} relative`}>
      {/* Outer Static Halo */}
      <img
        src={StaticHaloUrl}
        alt="Static Halo"
        className="w-full h-full object-contain"
      />
      
      {/* Inner Optum O */}
      <OptumO size={size} />
    </div>
  );
};

// New Listening Stage Component
const ListeningStage: React.FC<{ size: string }> = ({ size }) => {
  return (
    <div className={`voice-stage listening-stage ${size} relative`}>
      {/* Counter-rotating halos */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ 
          duration: 20, 
          repeat: Infinity, 
          ease: "linear" 
        }}
      >
        <img
          src={ListeningHalo1Url}
          alt="Listening Halo"
          className="w-full h-full object-contain"
        />
      </motion.div>
      
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: -360 }}
        transition={{ 
          duration: 25, 
          repeat: Infinity, 
          ease: "linear" 
        }}
      >
        <img
          src={ListeningHalo2Url}
          alt="Listening Halo"
          className="w-full h-full object-contain"
        />
      </motion.div>
      
      {/* Inner Optum O (static) */}
      <OptumO size={size} />
    </div>
  );
};

// Processing Stage Component (using idle stage as base with pulsing animation)
const ProcessingStage: React.FC<{ size: string }> = ({ size }) => {
  return (
    <div className={`voice-stage processing-stage ${size} relative`}>
      {/* Outer Static Halo with subtle pulsing */}
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      >
        <img
          src={StaticHaloUrl}
          alt="Static Halo"
          className="w-full h-full object-contain"
        />
      </motion.div>
      
      {/* Inner Optum O with opposite pulsing */}
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        animate={{ scale: [1, 0.95, 1] }}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      >
        <OptumO size={size} />
      </motion.div>
    </div>
  );
};

// New Responding Stage Component
const RespondingStage: React.FC<{ size: string; audioData?: Float32Array | number[] }> = ({ 
  size,
  audioData: _audioData // Prefix with underscore to indicate intentionally unused
}) => {
  // Sound wave is positioned at the center of Optum O
  return (
    <div className={`voice-stage responding-stage ${size} relative`}>
      {/* Outer Static Halo (same as idle) */}
      <img
        src={StaticHaloUrl}
        alt="Static Halo"
        className="w-full h-full object-contain"
      />
      
      {/* Inner Optum O */}
      <OptumO size={size} />
      
      {/* Sound Wave Animation at center of Optum O */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2/3 h-2/3 flex items-center justify-center">
        <img
          src={SoundWaveAnimatedUrl}
          alt="Sound Wave"
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
};

// Main VoiceStageVisualizer component
const NewVoiceStageVisualizer: React.FC<VoiceStageVisualizerProps> = ({
  stage,
  audioData,
  className = "",
  size = "large",
  onClick
}) => {
  const [currentStage, setCurrentStage] = useState<VoiceStage>(stage);

  // Handle stage transitions with smooth animations
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentStage(stage);
    }, 100);

    return () => clearTimeout(timer);
  }, [stage]);

  const renderStage = () => {
    switch (currentStage) {
      case "idle":
        return <IdleStage size={size} />;
      case "listening":
        return <ListeningStage size={size} />;
      case "processing":
        return <ProcessingStage size={size} />;
      case "responding":
        return <RespondingStage size={size} audioData={audioData} />;
      case "microphone":
        return <IdleStage size={size} />; // Use idle stage for microphone
      default:
        return <IdleStage size={size} />;
    }
  };

  return (
    <div className={`voice-stage-visualizer ${className}`} onClick={onClick}>
      {renderStage()}
    </div>
  );
};

export default NewVoiceStageVisualizer;