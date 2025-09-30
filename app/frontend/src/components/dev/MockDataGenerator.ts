/**
 * Mock Data Generator for Development Testing
 * This file is only used in development mode and will not be included in production builds
 */

export const generateMockAudioData = (): Float32Array => {
  // Generate realistic audio frequency data similar to real speech patterns
  const dataArray = new Float32Array(128);
  const time = Date.now() * 0.005;
  
  for (let i = 0; i < 128; i++) {
    const frequency = i / 128;
    
    // Create multiple frequency components that simulate speech
    const wave1 = Math.sin(time + frequency * Math.PI * 6) * 25;
    const wave2 = Math.sin(time * 1.3 + frequency * Math.PI * 10) * 20;
    const wave3 = Math.sin(time * 0.7 + frequency * Math.PI * 14) * 15;
    const wave4 = Math.sin(time * 2.1 + frequency * Math.PI * 3) * 12;
    const noise = (Math.random() - 0.5) * 8;
    
    // Speech envelope - focus energy on mid frequencies (human speech range)
    const envelope = Math.max(0.3, 1.2 - Math.abs(frequency - 0.35) * 1.8);
    
    // Combine all components
    const totalAmplitude = (wave1 + wave2 + wave3 + wave4 + noise) * envelope;
    
    // Ensure values are in reasonable range (0-100)
    dataArray[i] = Math.max(8, Math.min(95, Math.abs(totalAmplitude) + 15));
  }
  
  return dataArray;
};

export const mockWebSocketEvents = {
  // Simulate WebSocket events for development testing
  simulateAudioDelta: (callback: (data: { delta: string }) => void) => {
    const interval = setInterval(() => {
      // Generate mock base64 audio delta
      const mockData = new Uint8Array(4800);
      for (let i = 0; i < mockData.length; i++) {
        mockData[i] = Math.floor(Math.random() * 256);
      }
      
      const base64Delta = btoa(String.fromCharCode(...mockData));
      callback({ delta: base64Delta });
    }, 100); // Every 100ms
    
    return () => clearInterval(interval);
  },
  
  simulateProcessing: (callback: () => void) => {
    setTimeout(callback, 1000); // Simulate 1 second processing delay
  }
};