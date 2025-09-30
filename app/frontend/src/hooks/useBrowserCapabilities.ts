import { useState, useEffect } from 'react';

interface BrowserCapabilities {
  supportsForeignObject: boolean;
  supportsConicGradient: boolean;
  isModernBrowser: boolean;
}

/**
 * Hook to detect browser support for advanced SVG and CSS features
 * Used for progressive enhancement to provide fallbacks for older browsers
 */
export const useBrowserCapabilities = (): BrowserCapabilities => {
  const [capabilities, setCapabilities] = useState<BrowserCapabilities>({
    supportsForeignObject: false,
    supportsConicGradient: false,
    isModernBrowser: false,
  });

  useEffect(() => {
    const detectCapabilities = (): BrowserCapabilities => {
      // Test for foreignObject support
      const testForeignObject = (): boolean => {
        try {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
          svg.appendChild(foreignObject);
          
          // Test if foreignObject is properly supported
          return foreignObject instanceof SVGForeignObjectElement;
        } catch {
          return false;
        }
      };

      // Test for conic-gradient support
      const testConicGradient = (): boolean => {
        try {
          const testDiv = document.createElement('div');
          testDiv.style.background = 'conic-gradient(red, blue)';
          
          // Check if the browser applied the conic-gradient
          return testDiv.style.background.includes('conic-gradient') || 
                 testDiv.style.backgroundImage.includes('conic-gradient');
        } catch {
          return false;
        }
      };

      const supportsForeignObject = testForeignObject();
      const supportsConicGradient = testConicGradient();
      
      // Consider it a modern browser if it supports both features
      const isModernBrowser = supportsForeignObject && supportsConicGradient;

      return {
        supportsForeignObject,
        supportsConicGradient,
        isModernBrowser,
      };
    };

    // Run detection after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setCapabilities(detectCapabilities());
      });
    } else {
      setCapabilities(detectCapabilities());
    }
  }, []);

  return capabilities;
};

export default useBrowserCapabilities;
