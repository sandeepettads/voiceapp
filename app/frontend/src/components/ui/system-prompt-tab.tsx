import { useState } from 'react';
import { Save, RotateCcw, Undo, Copy, FileText, AlertCircle, CheckCircle, Info, Wand2, Volume2 } from 'lucide-react';
import { Button } from './button';
import useSystemConfig from '@/hooks/useSystemConfig';
import PasswordDialog from './password-dialog';

export default function SystemPromptTab() {
    const {
        systemPrompt,
        originalPrompt,
        isCustomPrompt,
        currentVoice,
        originalVoice,
        isCustomVoice,
        availableVoices,
        isLoading,
        error,
        isDirtyVoice,
        isDirty,
        updatePrompt,
        updateVoice,
        savePrompt,
        saveVoice,
        resetPromptToDefault,
        resetVoiceToDefault,
        revertPromptChanges,
        revertVoiceChanges,
    } = useSystemConfig();

    const [showOriginal, setShowOriginal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [showVoicePasswordDialog, setShowVoicePasswordDialog] = useState(false);
    const [pendingVoiceAction, setPendingVoiceAction] = useState<'save' | 'reset' | null>(null);

    // Handler for the save button - shows password dialog
    const handleSaveClick = () => {
        setShowPasswordDialog(true);
    };

    // Actual save after password confirmation
    const handleConfirmedSave = async () => {
        setShowPasswordDialog(false);
        const success = await savePrompt();
        if (success) {
            setSuccessMessage('System prompt updated successfully! Changes will apply to new conversations.');
            setTimeout(() => setSuccessMessage(''), 5000);
        }
    };

    // Cancel password dialog and revert changes
    const handleCancelSave = () => {
        setShowPasswordDialog(false);
        revertPromptChanges(); // Revert the changes as requested
        setSuccessMessage('Changes reverted due to authentication failure.');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleResetPrompt = async () => {
        const success = await resetPromptToDefault();
        if (success) {
            setSuccessMessage('System prompt reset to default successfully!');
            setTimeout(() => setSuccessMessage(''), 5000);
        }
    };

    const handleVoiceChange = (newVoice: string) => {
        updateVoice(newVoice);
    };

    // Voice actions that require password
    const handleSaveVoiceClick = () => {
        setPendingVoiceAction('save');
        setShowVoicePasswordDialog(true);
    };

    const handleResetVoiceClick = () => {
        setPendingVoiceAction('reset');
        setShowVoicePasswordDialog(true);
    };

    // Execute voice action after password confirmation
    const handleConfirmedVoiceAction = async () => {
        setShowVoicePasswordDialog(false);
        
        if (pendingVoiceAction === 'save') {
            const success = await saveVoice();
            if (success) {
                setSuccessMessage('Voice choice updated successfully!');
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } else if (pendingVoiceAction === 'reset') {
            const success = await resetVoiceToDefault();
            if (success) {
                setSuccessMessage('Voice choice reset to default successfully!');
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        }
        
        setPendingVoiceAction(null);
    };

    // Cancel voice password dialog and revert voice changes if needed
    const handleCancelVoiceAction = () => {
        setShowVoicePasswordDialog(false);
        
        if (pendingVoiceAction === 'save') {
            revertVoiceChanges(); // Revert voice changes like prompt changes
            setSuccessMessage('Voice changes reverted due to authentication failure.');
            setTimeout(() => setSuccessMessage(''), 3000);
        }
        
        setPendingVoiceAction(null);
    };

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setSuccessMessage('Copied to clipboard!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    };

    const generateSimplePrompt = () => {
        const simplePrompt = "You are a friendly assistant. Always be helpful and concise.";
        updatePrompt(simplePrompt);
    };

    const characterCount = systemPrompt.length;
    const wordCount = systemPrompt.trim() ? systemPrompt.trim().split(/\s+/).length : 0;

    return (
        <div className="flex h-full flex-col bg-gray-50">
            {/* Header */}
            <div className="border-b bg-white p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                            <Wand2 className="h-5 w-5" />
                            System Prompt Override
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                            Customize the AI's system instructions. Changes apply to new conversations.
                        </p>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="flex items-center gap-2">
                        {isCustomPrompt ? (
                            <div className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                                <Wand2 className="h-4 w-4" />
                                Custom Active
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                                <FileText className="h-4 w-4" />
                                Default Active
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="border-b border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="mr-2 inline h-4 w-4" />
                    {error}
                </div>
            )}
            
            {successMessage && (
                <div className="border-b border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    <CheckCircle className="mr-2 inline h-4 w-4" />
                    {successMessage}
                </div>
            )}

            {/* Controls */}
            <div className="border-b bg-white p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        onClick={handleSaveClick}
                        disabled={isLoading || !isDirty || !systemPrompt.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    
                    <Button
                        onClick={() => {
                            revertPromptChanges();
                            revertVoiceChanges();
                        }}
                        disabled={!isDirty}
                        variant="outline"
                    >
                        <Undo className="mr-2 h-4 w-4" />
                        Revert All
                    </Button>
                    
                    <Button
                        onClick={handleResetPrompt}
                        disabled={isLoading || !isCustomPrompt}
                        variant="outline"
                        className="text-orange-600 hover:text-orange-700"
                    >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset Prompt
                    </Button>
                    
                    <Button
                        onClick={generateSimplePrompt}
                        variant="outline"
                        className="text-purple-600 hover:text-purple-700"
                    >
                        <Wand2 className="mr-2 h-4 w-4" />
                        Simple Example
                    </Button>
                    
                    <Button
                        onClick={() => handleCopy(systemPrompt)}
                        variant="outline"
                        size="sm"
                    >
                        <Copy className="mr-1 h-4 w-4" />
                        Copy
                    </Button>
                    
                    <Button
                        onClick={() => setShowOriginal(!showOriginal)}
                        variant="outline"
                        size="sm"
                    >
                        <FileText className="mr-1 h-4 w-4" />
                        {showOriginal ? 'Hide' : 'Show'} Default
                    </Button>
                </div>
                
                {/* Stats */}
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                    <span>{wordCount} words</span>
                    <span>{characterCount} characters</span>
                    {isDirty && (
                        <span className="flex items-center gap-1 text-orange-600">
                            <Info className="h-3 w-3" />
                            Unsaved changes
                        </span>
                    )}
                </div>
            </div>

            {/* Voice Configuration Section */}
            <div className="border-b bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-gray-700" />
                        <h4 className="font-medium text-gray-800">Voice Configuration</h4>
                        {isCustomVoice && (
                            <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                                <Volume2 className="h-3 w-3" />
                                Custom
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Voice Selector */}
                    <div className="flex items-center gap-2">
                        <label htmlFor="voice-select" className="text-sm font-medium text-gray-700">
                            Voice:
                        </label>
                        <select
                            id="voice-select"
                            value={currentVoice || ''}
                            onChange={(e) => handleVoiceChange(e.target.value)}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            disabled={isLoading}
                        >
                            {!currentVoice && <option value="">No voice selected</option>}
                            {availableVoices.map((voice) => (
                                <option key={voice} value={voice}>
                                    {voice}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Voice Controls */}
                    <Button
                        onClick={handleSaveVoiceClick}
                        disabled={isLoading || !isDirtyVoice || !currentVoice}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                    >
                        <Volume2 className="mr-1 h-3 w-3" />
                        Save Voice
                    </Button>
                    
                    <Button
                        onClick={() => revertVoiceChanges()}
                        disabled={!isDirtyVoice}
                        variant="outline"
                        size="sm"
                    >
                        <Undo className="mr-1 h-3 w-3" />
                        Revert Voice
                    </Button>
                    
                    <Button
                        onClick={handleResetVoiceClick}
                        disabled={isLoading || !isCustomVoice}
                        variant="outline"
                        size="sm"
                        className="text-orange-600 hover:text-orange-700"
                    >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        Reset Voice
                    </Button>
                </div>
                
                {/* Voice Info */}
                <div className="mt-2 text-xs text-gray-500">
                    <span>Deployed: {originalVoice || 'None'}</span>
                    {currentVoice && currentVoice !== originalVoice && (
                        <span className="ml-4 text-orange-600">
                            • Override: {currentVoice}
                        </span>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Main Editor */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    <div className="flex-1 p-4">
                        <div className="h-full rounded-lg border border-gray-300 bg-white">
                            <textarea
                                value={systemPrompt}
                                onChange={(e) => updatePrompt(e.target.value)}
                                placeholder="Enter your custom system prompt here..."
                                className="h-full w-full resize-none border-none p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                </div>
                
                {/* Original Prompt Sidebar */}
                {showOriginal && (
                    <div className="w-1/2 border-l bg-gray-50">
                        <div className="flex items-center justify-between border-b bg-white p-3">
                            <h4 className="font-medium text-gray-800">Default System Prompt</h4>
                            <Button
                                onClick={() => handleCopy(originalPrompt)}
                                variant="outline"
                                size="sm"
                            >
                                <Copy className="mr-1 h-4 w-4" />
                                Copy
                            </Button>
                        </div>
                        <div className="h-full overflow-y-auto p-4">
                            <pre className="whitespace-pre-wrap text-xs text-gray-700">
                                {originalPrompt}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Info Panel */}
            <div className="border-t bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                    <div className="text-sm text-blue-800">
                        <p className="font-medium">Important Notes:</p>
                        <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
                            <li>Changes only apply to new conversations (restart current conversation to see changes)</li>
                            <li>The system prompt defines the AI's behavior, personality, and constraints</li>
                            <li>Use "Simple Example" for a basic friendly assistant prompt</li>
                            <li>Custom prompts are preserved until manually reset</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* System Prompt Password Dialog */}
            <PasswordDialog
                isOpen={showPasswordDialog}
                onConfirm={handleConfirmedSave}
                onCancel={handleCancelSave}
                title="Confirm System Prompt Change"
                description="Enter the password to save system prompt changes. Incorrect password will revert all changes."
            />
            
            {/* Voice Password Dialog */}
            <PasswordDialog
                isOpen={showVoicePasswordDialog}
                onConfirm={handleConfirmedVoiceAction}
                onCancel={handleCancelVoiceAction}
                title={`Confirm Voice ${pendingVoiceAction === 'save' ? 'Change' : 'Reset'}`}
                description={`Enter the password to ${pendingVoiceAction === 'save' ? 'save voice changes' : 'reset voice to default'}. Incorrect password will revert voice changes.`}
            />
        </div>
    );
}
