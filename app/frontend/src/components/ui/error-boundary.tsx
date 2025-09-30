import React from "react";
import { AlertCircle } from "lucide-react";

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log the error to console for debugging
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // Render custom fallback UI or use provided fallback
            return (
                this.props.fallback || (
                    <div className="flex h-full items-center justify-center bg-red-50">
                        <div className="max-w-md p-8 text-center">
                            <div className="mb-4 text-red-600">
                                <AlertCircle className="mx-auto mb-2 h-12 w-12" />
                                <h3 className="text-lg font-semibold">Something went wrong</h3>
                            </div>
                            <p className="mb-4 text-gray-600">There was an error loading this component. Please try refreshing the page.</p>
                            {this.state.error && (
                                <details className="mb-4 rounded bg-gray-100 p-3 text-left text-sm">
                                    <summary className="mb-2 cursor-pointer font-medium text-gray-700">Error Details</summary>
                                    <pre className="whitespace-pre-wrap text-xs text-gray-600">
                                        {this.state.error.message}
                                        {this.state.error.stack && `\n\n${this.state.error.stack}`}
                                    </pre>
                                </details>
                            )}
                            <div className="space-x-2">
                                <button
                                    onClick={() => this.setState({ hasError: false, error: null })}
                                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                                >
                                    Try Again
                                </button>
                                <button onClick={() => window.location.reload()} className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700">
                                    Reload Page
                                </button>
                            </div>
                        </div>
                    </div>
                )
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
