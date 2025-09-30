import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./voice-stage-visualizer.css";

// Import new design assets (same as NewVoiceStageVisualizer)
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
  const sizeMapping = {
    small: "w-20 h-20", 
    medium: "w-40 h-40", 
    large: "w-60 h-60", 
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

// New Idle Stage Component using new designs
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

// New Listening Stage Component using new designs
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

// Processing Stage Component using new designs (idle stage with pulsing animation)
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

// New Responding Stage Component using new designs
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

const MicrophoneButton: React.FC<{ size: string; onClick?: () => void }> = ({ size, onClick }) => (
  <button 
    className={`voice-stage microphone-stage ${size}`}
    onClick={onClick}
    aria-label="Start/Stop Recording"
  >
    <svg viewBox="0 0 113 104" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="micGradient" x1="32.5" y1="23" x2="120" y2="174.554">
          <stop stopColor="#FF612B"/>
          <stop offset="1" stopColor="#C04C24"/>
        </linearGradient>
        <filter id="micShadow">
          <feDropShadow dx="0" dy="0" stdDeviation="8.5" floodColor="#FFAA76"/>
        </filter>
      </defs>
      
      <rect 
        x="19" 
        y="19" 
        width="75" 
        height="75" 
        rx="37.5" 
        fill="url(#micGradient)"
        stroke="#F2F5F1" 
        strokeWidth="3"
        filter="url(#micShadow)"
      />
      
      {/* Microphone icon */}
      <path 
        d="M56.5 61C58.99 61 61 58.99 61 56.5V47.5C61 45.01 58.99 43 56.5 43C54.01 43 52 45.01 52 47.5V56.5C52 58.99 54.01 61 56.5 61ZM55 47.5C55 46.675 55.675 46 56.5 46C57.325 46 58 46.675 58 47.5V56.5C58 57.325 57.325 58 56.5 58C55.675 58 55 57.325 55 56.5V47.5ZM65.365 56.5C64.63 56.5 64.015 57.04 63.895 57.775C63.28 61.3 60.205 64 56.5 64C52.795 64 49.72 61.3 49.105 57.775C48.985 57.04 48.37 56.5 47.635 56.5C46.72 56.5 46 57.31 46.135 58.21C46.87 62.71 50.47 66.235 55 66.88V70C55 70.825 55.675 71.5 56.5 71.5C57.325 71.5 58 70.825 58 70V66.88C62.53 66.235 66.13 62.71 66.865 58.21C67.015 57.31 66.28 56.5 65.365 56.5Z" 
        fill="#FAF8F2"
      />
    </svg>
  </button>
);

// Main VoiceStageVisualizer component
const VoiceStageVisualizer: React.FC<VoiceStageVisualizerProps> = ({
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
        return <MicrophoneButton size={size} onClick={onClick} />;
      default:
        return <IdleStage size={size} />;
    }
  };

  return (
    <div className={`voice-stage-visualizer ${className}`}>
      {renderStage()}
    </div>
  );
};

export default VoiceStageVisualizer;
