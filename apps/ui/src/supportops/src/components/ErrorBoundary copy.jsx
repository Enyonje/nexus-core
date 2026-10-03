import React from "react";

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render shows fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can log error details to a monitoring service here
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
                    <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
                    <p className="text-slate-400 mb-6">
                        Please refresh the page or try again later.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition"
                    >
                        Reload App
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
