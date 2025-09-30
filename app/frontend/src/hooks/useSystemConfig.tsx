import { useState, useEffect, useCallback } from 'react';

interface SystemConfigData {
    current_prompt: string;
    original_prompt: string;
    is_custom_prompt: boolean;
    current_voice: string | null;
    original_voice: string | null;
    is_custom_voice: boolean;
    available_voices: string[];
}

interface UseSystemConfigReturn {
    // State
    systemPrompt: string;
    originalPrompt: string;
    isCustomPrompt: boolean;
    currentVoice: string | null;
    originalVoice: string | null;
    isCustomVoice: boolean;
    availableVoices: string[];
    isLoading: boolean;
    error: string | null;
    isDirtyPrompt: boolean;
    isDirtyVoice: boolean;
    isDirty: boolean;
    
    // Actions
    updatePrompt: (newPrompt: string) => void;
    updateVoice: (newVoice: string) => void;
    savePrompt: () => Promise<boolean>;
    saveVoice: () => Promise<boolean>;
    resetPromptToDefault: () => Promise<boolean>;
    resetVoiceToDefault: () => Promise<boolean>;
    revertPromptChanges: () => void;
    revertVoiceChanges: () => void;
    refreshData: () => Promise<void>;
}

export default function useSystemConfig(): UseSystemConfigReturn {
    const [systemPrompt, setSystemPrompt] = useState('');
    const [originalPrompt, setOriginalPrompt] = useState('');
    const [isCustomPrompt, setIsCustomPrompt] = useState(false);
    const [savedPrompt, setSavedPrompt] = useState(''); // For tracking changes
    
    const [currentVoice, setCurrentVoice] = useState<string | null>(null);
    const [originalVoice, setOriginalVoice] = useState<string | null>(null);
    const [isCustomVoice, setIsCustomVoice] = useState(false);
    const [savedVoice, setSavedVoice] = useState<string | null>(null); // For tracking changes
    const [availableVoices, setAvailableVoices] = useState<string[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Check if current settings differ from saved settings
    const isDirtyPrompt = systemPrompt !== savedPrompt;
    const isDirtyVoice = currentVoice !== savedVoice;
    const isDirty = isDirtyPrompt || isDirtyVoice;
    
    const fetchSystemConfig = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/debug/system-config');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data: SystemConfigData = await response.json();
            setSystemPrompt(data.current_prompt);
            setSavedPrompt(data.current_prompt);
            setOriginalPrompt(data.original_prompt);
            setIsCustomPrompt(data.is_custom_prompt);
            
            setCurrentVoice(data.current_voice);
            setSavedVoice(data.current_voice);
            setOriginalVoice(data.original_voice);
            setIsCustomVoice(data.is_custom_voice);
            setAvailableVoices(data.available_voices);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch system configuration';
            setError(errorMessage);
            console.error('Error fetching system configuration:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const updatePrompt = useCallback((newPrompt: string) => {
        setSystemPrompt(newPrompt);
        setError(null); // Clear any previous errors
    }, []);
    
    const updateVoice = useCallback((newVoice: string) => {
        setCurrentVoice(newVoice);
        setError(null); // Clear any previous errors
    }, []);
    
    const savePrompt = useCallback(async (): Promise<boolean> => {
        if (!systemPrompt.trim()) {
            setError('Prompt cannot be empty');
            return false;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/debug/system-prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: systemPrompt }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            await response.json(); // Response processed successfully
            setSavedPrompt(systemPrompt);
            setIsCustomPrompt(true);
            
            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to save system prompt';
            setError(errorMessage);
            console.error('Error saving system prompt:', err);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [systemPrompt]);
    
    const saveVoice = useCallback(async (): Promise<boolean> => {
        if (!currentVoice) {
            setError('Voice choice cannot be empty');
            return false;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/debug/voice-choice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ voice: currentVoice }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            await response.json(); // Response processed successfully
            setSavedVoice(currentVoice);
            setIsCustomVoice(true);
            
            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to save voice choice';
            setError(errorMessage);
            console.error('Error saving voice choice:', err);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [currentVoice]);
    
    const resetPromptToDefault = useCallback(async (): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/debug/system-prompt/reset', {
                method: 'POST',
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Refresh data after reset
            await fetchSystemConfig();
            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to reset system prompt';
            setError(errorMessage);
            console.error('Error resetting system prompt:', err);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [fetchSystemConfig]);
    
    const resetVoiceToDefault = useCallback(async (): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/debug/voice-choice/reset', {
                method: 'POST',
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Refresh data after reset
            await fetchSystemConfig();
            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to reset voice choice';
            setError(errorMessage);
            console.error('Error resetting voice choice:', err);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [fetchSystemConfig]);
    
    const revertPromptChanges = useCallback(() => {
        setSystemPrompt(savedPrompt);
        setError(null);
    }, [savedPrompt]);
    
    const revertVoiceChanges = useCallback(() => {
        setCurrentVoice(savedVoice);
        setError(null);
    }, [savedVoice]);
    
    const refreshData = useCallback(async () => {
        await fetchSystemConfig();
    }, [fetchSystemConfig]);
    
    // Initial load
    useEffect(() => {
        fetchSystemConfig();
    }, [fetchSystemConfig]);
    
    return {
        // State
        systemPrompt,
        originalPrompt,
        isCustomPrompt,
        currentVoice,
        originalVoice,
        isCustomVoice,
        availableVoices,
        isLoading,
        error,
        isDirtyPrompt,
        isDirtyVoice,
        isDirty,
        
        // Actions
        updatePrompt,
        updateVoice,
        savePrompt,
        saveVoice,
        resetPromptToDefault,
        resetVoiceToDefault,
        revertPromptChanges,
        revertVoiceChanges,
        refreshData,
    };
}
