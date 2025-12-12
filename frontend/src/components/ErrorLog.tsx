import { useState, useEffect } from "react";
import { captureException, getLastEventId, showReportDialog } from "../lib/sentry";
import "./ErrorLog.css";

interface CapturedError {
    id: string;
    message: string;
    timestamp: Date;
    traceId?: string;
    eventId?: string;
}

// Global error store (would come from Sentry in production)
const errorStore: CapturedError[] = [];

// Listen for errors
if (typeof window !== "undefined") {
    window.addEventListener("error", (event) => {
        errorStore.unshift({
            id: crypto.randomUUID(),
            message: event.message || "Unknown error",
            timestamp: new Date(),
            eventId: getLastEventId(),
        });
        if (errorStore.length > 20) errorStore.pop();
    });

    window.addEventListener("unhandledrejection", (event) => {
        errorStore.unshift({
            id: crypto.randomUUID(),
            message: event.reason?.message || "Unhandled promise rejection",
            timestamp: new Date(),
            eventId: getLastEventId(),
        });
        if (errorStore.length > 20) errorStore.pop();
    });
}

export function ErrorLog() {
    const [errors, setErrors] = useState<CapturedError[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        setErrors([...errorStore]);
    }, [refreshKey]);

    const handleRefresh = () => {
        setRefreshKey((k) => k + 1);
    };

    const handleClearErrors = () => {
        errorStore.length = 0;
        setErrors([]);
    };

    const handleTestError = () => {
        try {
            throw new Error("Test error from Error Log panel");
        } catch (err) {
            if (err instanceof Error) {
                captureException(err);
                errorStore.unshift({
                    id: crypto.randomUUID(),
                    message: err.message,
                    timestamp: new Date(),
                    eventId: getLastEventId(),
                });
                setErrors([...errorStore]);
            }
        }
    };

    const handleSendFeedback = (eventId?: string) => {
        showReportDialog(eventId);
    };

    return (
        <div className="error-log-card">
            <div className="card-header">
                <h2>🚨 Error Log</h2>
                <div className="header-actions">
                    <button onClick={handleRefresh} className="action-btn" title="Refresh">
                        🔄
                    </button>
                    <button onClick={handleClearErrors} className="action-btn" title="Clear">
                        🗑️
                    </button>
                </div>
            </div>

            <div className="card-body">
                <button onClick={handleTestError} className="test-error-btn">
                    🧪 Trigger Test Error
                </button>

                <div className="error-list">
                    {errors.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">✨</span>
                            <span>No errors captured yet</span>
                        </div>
                    ) : (
                        errors.map((error) => (
                            <div key={error.id} className="error-item">
                                <div className="error-header">
                                    <span className="error-icon">❌</span>
                                    <span className="error-message">{error.message}</span>
                                </div>
                                <div className="error-meta">
                                    <span className="error-time">
                                        {error.timestamp.toLocaleTimeString()}
                                    </span>
                                    {error.eventId && (
                                        <button
                                            onClick={() => handleSendFeedback(error.eventId)}
                                            className="feedback-btn"
                                        >
                                            💬 Send Feedback
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
