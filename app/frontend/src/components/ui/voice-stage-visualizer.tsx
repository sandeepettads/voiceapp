import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./voice-stage-visualizer.css";
import useBrowserCapabilities from "../../hooks/useBrowserCapabilities";

// SVG imports for progressive enhancement
import IdleVisualizationFullUrl from "../../assets/idle-visualization-2x-full.svg";
import IdleVisualizationSimpleUrl from "../../assets/idle-visualization-2x-simple.svg";

// Types for voice stages
export type VoiceStage = "idle" | "listening" | "processing" | "responding" | "microphone";

interface VoiceStageVisualizerProps {
  stage: VoiceStage;
  audioData?: Float32Array | number[];
  className?: string;
  size?: "small" | "medium" | "large";
  onClick?: () => void;
}

// Progressive Enhancement IdleStage component with browser capability detection
const IdleStage: React.FC<{ size: string }> = ({ size }) => {
  const { isModernBrowser } = useBrowserCapabilities();

  return (
    <div className={`voice-stage idle-stage ${size}`}>
      {isModernBrowser ? (
        <img 
          src={IdleVisualizationFullUrl} 
          alt="Idle visualization (enhanced)" 
          className="idle-visualization-svg"
        />
      ) : (
        <img 
          src={IdleVisualizationSimpleUrl} 
          alt="Idle visualization (compatible)" 
          className="idle-visualization-svg"
        />
      )}
    </div>
  );
};

// Animated Listening Frame Component
const AnimatedListeningFrame: React.FC<{ size: string }> = ({ size }) => {
  // Size mapping for responsive design
  const getSizeClasses = (size: string) => {
    switch (size) {
      case "small":
        return { container: "w-32 h-32", halo: "w-24 h-24", center: "w-8 h-8" };
      case "medium":
        return { container: "w-64 h-64", halo: "w-48 h-48", center: "w-16 h-16" };
      case "large":
      default:
        return { container: "w-96 h-96", halo: "w-72 h-72", center: "w-20 h-20" };
    }
  };

  const sizeClasses = getSizeClasses(size);

  return (
    <div className={`listening-stage-container relative ${sizeClasses.container} rounded-xl overflow-hidden flex items-center justify-center`}>
      {/* Background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100" />
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className={`${sizeClasses.halo} rounded-full border border-cyan-200/10`} />
      </div>

      {/* Halo Ring (Rotating) */}
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        animate={{ rotate: 360 }}
        transition={{
          duration: 4.1,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <div className={`${sizeClasses.halo} rounded-full border-[3px] border-transparent bg-gradient-to-r from-cyan-200 via-white via-orange-500 via-yellow-200 to-blue-300 p-[3px]`}>
          <div className="w-full h-full rounded-full bg-transparent" />
        </div>
      </motion.div>

      {/* The O Layer (Pulsating) */}
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{
          duration: 4.4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Outer O Ring */}
        <div className={`relative ${sizeClasses.center} rounded-full border-[2px] border-orange-300/80 bg-transparent`}>
          {/* Inner O Fill */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 rounded-full bg-gradient-to-br from-orange-300 via-orange-500 to-orange-600 opacity-90">
            {/* Inner Hole */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 rounded-full bg-white" />
          </div>
        </div>
      </motion.div>

      {/* Additional glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-gradient-conic from-cyan-100/20 via-orange-100/20 to-blue-100/20 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

const ListeningStage: React.FC<{ size: string }> = ({ size }) => (
  <div className={`voice-stage listening-stage ${size}`}>
    <AnimatedListeningFrame size={size} />
  </div>
);

const ProcessingStage: React.FC<{ size: string }> = ({ size }) => (
  <div className={`voice-stage processing-stage ${size}`}>
    <svg viewBox="0 0 598 529" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Minimal white background - no animations */}
      <rect width="598" height="529" fill="white" />
    </svg>
  </div>
);

const RespondingStage: React.FC<{ size: string; audioData?: Float32Array | number[] }> = ({ size, audioData: _audioData }) => {
  return (
    <div className={`voice-stage responding-stage ${size}`}>
      <svg viewBox="0 0 598 529" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Minimal white background - no animations */}
        <rect width="598" height="529" fill="white" />
      </svg>
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
