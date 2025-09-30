import { useState, useEffect } from 'react';
import { X, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from './button';

interface PasswordDialogProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title?: string;
    description?: string;
}

export default function PasswordDialog({ 
    isOpen, 
    onConfirm, 
    onCancel, 
    title = "Confirm System Prompt Change",
    description = "Enter password to save system prompt changes"
}: PasswordDialogProps) {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [attempts, setAttempts] = useState(0);

    const CORRECT_PASSWORD = 'awesome';
    const MAX_ATTEMPTS = 3;

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setError('');
            setAttempts(0);
            setShowPassword(false);
        }
    }, [isOpen]);

    // Focus password input when dialog opens
    useEffect(() => {
        if (isOpen) {
            const input = document.getElementById('password-input');
            if (input) {
                setTimeout(() => input.focus(), 100);
            }
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password === CORRECT_PASSWORD) {
            // Success
            setError('');
            onConfirm();
        } else {
            // Incorrect password
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            
            if (newAttempts >= MAX_ATTEMPTS) {
                setError(`Access denied. Too many failed attempts (${MAX_ATTEMPTS}/${MAX_ATTEMPTS}). Dialog will close.`);
                setTimeout(() => {
                    onCancel();
                }, 2000);
            } else {
                setError(`Incorrect password. Attempt ${newAttempts}/${MAX_ATTEMPTS}`);
            }
            
            // Clear password field for retry
            setPassword('');
        }
    };

    const handleCancel = () => {
        setPassword('');
        setError('');
        onCancel();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            handleCancel();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between rounded-t-lg border-b bg-gray-50 p-4">
                    <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-gray-600" />
                        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                    </div>
                    <button 
                        onClick={handleCancel}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                        disabled={attempts >= MAX_ATTEMPTS}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="mb-4 text-sm text-gray-600">{description}</p>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 flex items-center gap-2 rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Password Form */}
                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label htmlFor="password-input" className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password-input"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full rounded border border-gray-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter password..."
                                    disabled={attempts >= MAX_ATTEMPTS}
                                    autoComplete="off"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    disabled={attempts >= MAX_ATTEMPTS}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 justify-end">
                            <Button
                                type="button"
                                onClick={handleCancel}
                                variant="outline"
                                disabled={attempts >= MAX_ATTEMPTS}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={!password.trim() || attempts >= MAX_ATTEMPTS}
                            >
                                <Lock className="mr-2 h-4 w-4" />
                                Confirm
                            </Button>
                        </div>
                    </form>

                    {/* Hint for development */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                            <strong>Dev Hint:</strong> Password is "awesome"
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
