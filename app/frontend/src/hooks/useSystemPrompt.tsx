import { useState, useEffect, useCallback } from 'react';

interface SystemPromptData {
    current_prompt: string;
    original_prompt: string;
    is_custom: boolean;
}

interface UseSystemPromptReturn {
    // State
    systemPrompt: string;
    originalPrompt: string;
    isCustom: boolean;
    isLoading: boolean;
    error: string | null;
    isDirty: boolean;
    
    // Actions
    updatePrompt: (newPrompt: string) => void;
    savePrompt: () => Promise<boolean>;
    resetToDefault: () => Promise<boolean>;
    revertChanges: () => void;
    refreshData: () => Promise<void>;
}

export default function useSystemPrompt(): UseSystemPromptReturn {
    const [systemPrompt, setSystemPrompt] = useState('');
    const [originalPrompt, setOriginalPrompt] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedPrompt, setSavedPrompt] = useState(''); // For tracking changes
    
    // Check if current prompt differs from saved prompt
    const isDirty = systemPrompt !== savedPrompt;
    
    const fetchSystemPrompt = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/debug/system-prompt');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data: SystemPromptData = await response.json();
            setSystemPrompt(data.current_prompt);
            setSavedPrompt(data.current_prompt);
            setOriginalPrompt(data.original_prompt);
            setIsCustom(data.is_custom);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch system prompt';
            setError(errorMessage);
            console.error('Error fetching system prompt:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const updatePrompt = useCallback((newPrompt: string) => {
        setSystemPrompt(newPrompt);
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
            setIsCustom(true);
            
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
    
    const resetToDefault = useCallback(async (): Promise<boolean> => {
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
            await fetchSystemPrompt();
            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to reset system prompt';
            setError(errorMessage);
            console.error('Error resetting system prompt:', err);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [fetchSystemPrompt]);
    
    const revertChanges = useCallback(() => {
        setSystemPrompt(savedPrompt);
        setError(null);
    }, [savedPrompt]);
    
    const refreshData = useCallback(async () => {
        await fetchSystemPrompt();
    }, [fetchSystemPrompt]);
    
    // Initial load
    useEffect(() => {
        fetchSystemPrompt();
    }, [fetchSystemPrompt]);
    
    return {
        // State
        systemPrompt,
        originalPrompt,
        isCustom,
        isLoading,
        error,
        isDirty,
        
        // Actions
        updatePrompt,
        savePrompt,
        resetToDefault,
        revertChanges,
        refreshData,
    };
}
