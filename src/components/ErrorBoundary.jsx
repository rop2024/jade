import React, { Component } from 'react';

export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    reset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
                    <div className="bg-pink/10 border border-pink/30 panel p-8 max-w-md">
                        <h2 className="text-pink font-technical font-bold text-lg mb-2">Chat error</h2>
                        <p className="text-text text-sm mb-4">{this.state.error?.message || 'An unexpected error occurred.'}</p>
                        <button
                            onClick={this.reset}
                            className="px-4 py-2 text-cyan hover:text-text underline"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
