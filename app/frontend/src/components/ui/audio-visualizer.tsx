import { useEffect, useRef } from "react";
import "./audio-visualizer.css";

interface AudioVisualizerProps {
    isPlaying: boolean;
    isFullscreen?: boolean;
    audioData?: Float32Array | number[];
    className?: string;
}

export default function AudioVisualizer({ 
    isPlaying, 
    isFullscreen = false, 
    audioData = [], 
    className = "" 
}: AudioVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    // Audio processing state - currently using props data

    // Generate realistic animated audio data - always animated for speaking state
    const generateAnimatedAudioData = (baseData?: Float32Array | number[]) => {
        const time = Date.now() * 0.005; // Faster animation
        const dataArray = new Array(128).fill(0).map((_, index) => {
            const frequency = index / 128;
            
            // If we have real audio data, use it as a base and animate it
            let baseAmplitude = 30;
            if (baseData && baseData.length > 0 && index < baseData.length) {
                baseAmplitude = Math.max(10, baseData[index] * 0.8); // Scale real data
            }
            
            // Create multiple animated frequency components
            const wave1 = Math.sin(time + frequency * Math.PI * 6) * 25;
            const wave2 = Math.sin(time * 1.3 + frequency * Math.PI * 10) * 20;
            const wave3 = Math.sin(time * 0.7 + frequency * Math.PI * 14) * 15;
            const wave4 = Math.sin(time * 2.1 + frequency * Math.PI * 3) * 12;
            const noise = (Math.random() - 0.5) * 8;
            
            // Speech envelope - focus energy on mid frequencies
            const envelope = Math.max(0.3, 1.2 - Math.abs(frequency - 0.35) * 1.8);
            
            // Combine base amplitude with animated waves
            const totalAmplitude = (baseAmplitude + wave1 + wave2 + wave3 + wave4 + noise) * envelope;
            
            // Ensure minimum visibility and reasonable range
            return Math.max(8, Math.min(95, Math.abs(totalAmplitude) + 15));
        });
        return dataArray;
    };

    const drawWaveform = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        // Clear canvas
        ctx.clearRect(0, 0, rect.width, rect.height);

        if (!isPlaying) return;

        // Always generate animated data - use real audio as base if available
        const dataArray = generateAnimatedAudioData(audioData);
        
        const barWidth = rect.width / dataArray.length;
        const centerY = rect.height / 2;

        // Set gradient for bars
        const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
        gradient.addColorStop(0, "#FF612B");
        gradient.addColorStop(0.5, "#FF8A50");
        gradient.addColorStop(1, "#1e3a8a");

        ctx.fillStyle = gradient;

        // Draw bars
        dataArray.forEach((value, index) => {
            const barHeight = (value / 100) * (rect.height * 0.8);
            const x = index * barWidth;
            const y = centerY - barHeight / 2;

            // Add glow effect for fullscreen mode
            if (isFullscreen) {
                ctx.shadowColor = "#FF612B";
                ctx.shadowBlur = 20;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }

            // Draw main bar
            ctx.fillRect(x, y, barWidth - 2, barHeight);
            
            // Add reflection for fullscreen mode
            if (isFullscreen) {
                ctx.globalAlpha = 0.3;
                ctx.fillRect(x, centerY + barHeight / 4, barWidth - 2, barHeight / 2);
                ctx.globalAlpha = 1.0;
            }
        });

        // Reset shadow
        ctx.shadowBlur = 0;
    };

    const animate = () => {
        drawWaveform();
        if (isPlaying) {
            animationRef.current = requestAnimationFrame(animate);
        }
    };

    useEffect(() => {
        if (isPlaying) {
            // Only start animation if not already running
            if (!animationRef.current) {
                animate();
            }
        } else {
            if (animationRef.current) {
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
    }, [isPlaying]);
    
    // Separate effect for audio data updates (don't restart animation)
    useEffect(() => {
        // Audio data changed, but don't restart the entire animation loop
        // The animation loop will pick up the new data automatically
    }, [audioData]);

    if (!isPlaying && !isFullscreen) return null;

    return (
        <div
            className={`audio-visualizer ${isFullscreen ? 'fullscreen' : ''} ${className}`}
            style={{
                position: isFullscreen ? 'fixed' : 'relative',
                top: isFullscreen ? 0 : 'auto',
                left: isFullscreen ? 0 : 'auto',
                width: isFullscreen ? '100vw' : '300px',
                height: isFullscreen ? '100vh' : '60px',
                zIndex: isFullscreen ? 9999 : 1,
                background: isFullscreen 
                    ? 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #1e1b4b 100%)' 
                    : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease-in-out'
            }}
        >
            {isFullscreen && (
                <div className="absolute inset-0 bg-black bg-opacity-20 backdrop-blur-sm" />
            )}
            
            <canvas
                ref={canvasRef}
                className={`audio-canvas ${isFullscreen ? 'fullscreen-canvas' : ''}`}
                style={{
                    width: isFullscreen ? '80%' : '100%',
                    height: isFullscreen ? '200px' : '100%',
                    maxWidth: isFullscreen ? '800px' : '100%',
                    position: 'relative',
                    zIndex: 1
                }}
            />

            {isFullscreen && (
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white text-center z-10">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-lg font-medium">AI Companion is speaking...</span>
                    </div>
                    <p className="text-sm opacity-75">Audio visualization in progress</p>
                </div>
            )}
        </div>
    );
}
