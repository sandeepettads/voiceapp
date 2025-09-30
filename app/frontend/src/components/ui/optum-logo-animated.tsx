import { useEffect, useRef } from "react";
import "./optum-logo-animated.css";

interface OptumLogoAnimatedProps {
    isActive?: boolean;
    isListening?: boolean;
    isSpeaking?: boolean;
    audioData?: Float32Array | number[];
    className?: string;
    size?: "small" | "medium" | "large";
}

export default function OptumLogoAnimated({ 
    isActive = false, 
    isListening = false, 
    isSpeaking = false,
    audioData = [],
    className = "",
    size = "large" 
}: OptumLogoAnimatedProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();

    const sizeClasses = {
        small: "w-24 h-24",     // 1.5x of original w-16 h-16
        medium: "w-36 h-36",    // 1.5x of original w-24 h-24 
        large: "w-48 h-48"      // 1.5x of original w-32 h-32
    };

    // Generate audio visualization data for the circular segments
    const generateAudioSegments = () => {
        const time = Date.now() * 0.005;
        const segments = 24; // Number of segments around the circle
        
        return new Array(segments).fill(0).map((_, index) => {
            const frequency = index / segments;
            
            // Always generate animated waves when speaking (even if no real audio data)
            let baseAmplitude = 25; // Increased base amplitude
            if (audioData && audioData.length > 0) {
                const dataIndex = Math.floor((index / segments) * audioData.length);
                baseAmplitude = Math.max(15, audioData[dataIndex] * 0.8);
            }
            
            // Add animated waves for continuous smooth visualization
            const wave1 = Math.sin(time + frequency * Math.PI * 8) * 18;
            const wave2 = Math.sin(time * 1.2 + frequency * Math.PI * 12) * 12;
            const wave3 = Math.sin(time * 0.8 + frequency * Math.PI * 16) * 8;
            const noise = (Math.random() - 0.5) * 6;
            
            return Math.max(8, Math.min(45, baseAmplitude + wave1 + wave2 + wave3 + noise));
        });
    };

    const drawAudioVisualization = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        // Clear canvas
        ctx.clearRect(0, 0, rect.width, rect.height);

        if (!isSpeaking) return;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const innerRadius = Math.min(rect.width, rect.height) * 0.25;
        const maxSegmentHeight = Math.min(rect.width, rect.height) * 0.15;

        const segments = generateAudioSegments();
        const segmentAngle = (2 * Math.PI) / segments.length;

        // Set orange gradient for segments
        const gradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, innerRadius + maxSegmentHeight);
        gradient.addColorStop(0, "#FF8A50");
        gradient.addColorStop(0.5, "#FF612B");
        gradient.addColorStop(1, "#E55A2B");

        ctx.fillStyle = gradient;

        // Draw futuristic audio segments in a circle
        segments.forEach((amplitude, index) => {
            const angle = index * segmentAngle - Math.PI / 2; // Start from top
            const segmentHeight = (amplitude / 45) * maxSegmentHeight;
            
            const x1 = centerX + Math.cos(angle) * innerRadius;
            const y1 = centerY + Math.sin(angle) * innerRadius;
            const x2 = centerX + Math.cos(angle) * (innerRadius + segmentHeight);
            const y2 = centerY + Math.sin(angle) * (innerRadius + segmentHeight);

            // Create futuristic glow effect for each segment
            ctx.save();
            
            // Outer glow
            ctx.shadowColor = "#FF612B";
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            // Draw main segment with enhanced thickness
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineWidth = 4;
            ctx.strokeStyle = gradient;
            ctx.lineCap = "round";
            ctx.stroke();
            
            // Add inner bright core
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#FFB366"; // Brighter orange core
            ctx.lineCap = "round";
            ctx.stroke();
            
            ctx.restore();
        });
    };

    const animate = () => {
        drawAudioVisualization();
        if (isSpeaking) {
            animationRef.current = requestAnimationFrame(animate);
        }
    };

    // Effect to start/stop animation based on speaking state only
    useEffect(() => {
        if (isSpeaking) {
            if (!animationRef.current) {
                console.log('🎵 Starting continuous audio visualization animation');
                animate();
            }
        } else {
            if (animationRef.current) {
                console.log('🎵 Stopping audio visualization animation - user interrupted');
                cancelAnimationFrame(animationRef.current);
                animationRef.current = undefined;
            }
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = undefined;
            }
        };
    }, [isSpeaking]); // Animation controlled ONLY by isSpeaking state
    
    // Separate effect for audioData changes (doesn't restart animation)
    useEffect(() => {
        // Audio data changed, but animation loop will pick up the new data automatically
        // No need to restart the animation loop
    }, [audioData]);

    return (
        <div className={`optum-logo-animated-container ${className}`}>
            {/* Main logo container */}
            <div className={`optum-logo ${sizeClasses[size]} ${isActive ? 'active' : ''} ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
                
                {/* Audio visualization canvas - only visible when speaking */}
                {isSpeaking && (
                    <canvas
                        ref={canvasRef}
                        className="audio-visualization-canvas"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            zIndex: 2
                        }}
                    />
                )}

                {/* The actual Optum 'O' letter - extracted from your SVG */}
                <div className="optum-o-container">
                    <svg
                        viewBox="0 0 100 100"
                        className="optum-o-svg"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        {/* Extracted and scaled 'O' path from your Optum logo */}
                        <path
                            d="M50 15C68.5 15 83.5 30 83.5 50C83.5 70 68.5 85 50 85C31.5 85 16.5 70 16.5 50C16.5 30 31.5 15 50 15ZM50 25C36.5 25 26.5 36 26.5 50C26.5 64 36.5 75 50 75C63.5 75 73.5 64 73.5 50C73.5 36 63.5 25 50 25Z"
                            fill="#FF612B"
                            className="optum-o-path"
                        />

                        {/* Inner circle that appears during speaking mode */}
                        {isSpeaking && (
                            <circle
                                cx="50"
                                cy="50"
                                r="20"
                                fill="none"
                                stroke="#FF612B"
                                strokeWidth="2"
                                strokeOpacity="0.3"
                                className="inner-circle"
                            />
                        )}
                        
                        {/* Enhanced Futuristic Gradient definitions */}
                        <defs>
                            <radialGradient id="optumGradient" cx="30%" cy="30%" r="70%">
                                <stop offset="0%" stopColor="#FFB366" />
                                <stop offset="30%" stopColor="#FF8A50" />
                                <stop offset="70%" stopColor="#FF612B" />
                                <stop offset="100%" stopColor="#E55A2B" />
                            </radialGradient>
                            <filter id="futuristicGlow">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                <feMerge> 
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>
                    </svg>
                </div>

                {/* Pulsing indicator for active state */}
                {isActive && !isSpeaking && (
                    <div className="pulse-indicator">
                        <div className="pulse-dot"></div>
                    </div>
                )}
            </div>

        </div>
    );
}
