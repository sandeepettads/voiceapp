import "./companion-logo.css";

interface CompanionLogoProps {
    isActive?: boolean;
    isListening?: boolean;
    isSpeaking?: boolean;
    className?: string;
    size?: "small" | "medium" | "large";
}

export default function CompanionLogo({ 
    isActive = false, 
    isListening = false, 
    isSpeaking = false,
    className = "",
    size = "large" 
}: CompanionLogoProps) {
    const sizeClasses = {
        small: "w-16 h-16",
        medium: "w-24 h-24", 
        large: "w-32 h-32"
    };

    return (
        <div className={`companion-logo-container ${className}`}>
            {/* Animated rings around the logo */}
            <div className={`companion-rings ${isActive ? 'active' : ''} ${isListening ? 'listening' : ''}`}>
                <div className="ring ring-1"></div>
                <div className="ring ring-2"></div>
                <div className="ring ring-3"></div>
            </div>

            {/* Main logo container */}
            <div className={`companion-logo ${sizeClasses[size]} ${isActive ? 'active' : ''} ${isListening ? 'listening' : ''}`}>
                {/* Gradient background circle */}
                <div className="logo-background">
                    <div className="gradient-circle"></div>
                </div>

                {/* AI Companion Icon - Using a modern geometric design */}
                <div className="logo-icon">
                    <svg
                        viewBox="0 0 100 100"
                        className="w-full h-full"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        {/* Outer hexagon */}
                        <path
                            d="M50 10 L75 25 L75 55 L50 70 L25 55 L25 25 Z"
                            stroke="url(#logoGradient)"
                            strokeWidth="2"
                            fill="url(#logoFill)"
                            className="logo-hexagon"
                        />
                        
                        {/* Inner neural network pattern */}
                        <circle cx="50" cy="35" r="3" fill="url(#nodeGradient)" className="node node-1" />
                        <circle cx="35" cy="50" r="3" fill="url(#nodeGradient)" className="node node-2" />
                        <circle cx="65" cy="50" r="3" fill="url(#nodeGradient)" className="node node-3" />
                        <circle cx="50" cy="65" r="3" fill="url(#nodeGradient)" className="node node-4" />
                        
                        {/* Connections between nodes */}
                        <line x1="50" y1="35" x2="35" y2="50" stroke="url(#connectionGradient)" strokeWidth="1.5" className="connection" />
                        <line x1="50" y1="35" x2="65" y2="50" stroke="url(#connectionGradient)" strokeWidth="1.5" className="connection" />
                        <line x1="35" y1="50" x2="50" y2="65" stroke="url(#connectionGradient)" strokeWidth="1.5" className="connection" />
                        <line x1="65" y1="50" x2="50" y2="65" stroke="url(#connectionGradient)" strokeWidth="1.5" className="connection" />
                        <line x1="35" y1="50" x2="65" y2="50" stroke="url(#connectionGradient)" strokeWidth="1.5" className="connection" />

                        {/* Central brain/processor icon */}
                        <circle cx="50" cy="50" r="8" fill="url(#centralGradient)" className="central-node" />
                        <circle cx="50" cy="50" r="4" fill="#FFFFFF" opacity="0.9" className="central-core" />

                        {/* Gradient definitions */}
                        <defs>
                            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#FF612B" />
                                <stop offset="50%" stopColor="#FF8A50" />
                                <stop offset="100%" stopColor="#1e3a8a" />
                            </linearGradient>
                            <linearGradient id="logoFill" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#FF612B" stopOpacity="0.1" />
                                <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.1" />
                            </linearGradient>
                            <radialGradient id="nodeGradient" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#FF612B" />
                                <stop offset="100%" stopColor="#FF8A50" />
                            </radialGradient>
                            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#FF612B" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.6" />
                            </linearGradient>
                            <radialGradient id="centralGradient" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#1e3a8a" />
                                <stop offset="100%" stopColor="#3730a3" />
                            </radialGradient>
                        </defs>
                    </svg>
                </div>

                {/* Pulsing indicator for active state */}
                {isActive && (
                    <div className="pulse-indicator">
                        <div className="pulse-dot"></div>
                    </div>
                )}
            </div>

            {/* Status text */}
            <div className="companion-status">
                {isSpeaking ? (
                    <span className="status-text active">AI is responding...</span>
                ) : isListening ? (
                    <span className="status-text listening">Listening...</span>
                ) : isActive ? (
                    <span className="status-text active">Ready to help</span>
                ) : (
                    <span className="status-text idle">Your AI Companion</span>
                )}
            </div>
        </div>
    );
}
