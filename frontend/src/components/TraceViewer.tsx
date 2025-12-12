import { useState, useEffect } from "react";
import { getCurrentTraceId } from "../lib/tracing";
import "./TraceViewer.css";

const JAEGER_UI_URL = import.meta.env.VITE_JAEGER_UI_URL || "http://localhost:16686";

export function TraceViewer() {
    const [currentTraceId, setCurrentTraceId] = useState<string | null>(null);
    const [traceHistory, setTraceHistory] = useState<string[]>([]);

    useEffect(() => {
        // Poll for trace ID updates
        const interval = setInterval(() => {
            const traceId = getCurrentTraceId();
            if (traceId && traceId !== currentTraceId) {
                setCurrentTraceId(traceId);
                setTraceHistory((prev) => {
                    const updated = [traceId, ...prev.filter((id) => id !== traceId)];
                    return updated.slice(0, 10); // Keep last 10
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [currentTraceId]);

    const handleOpenJaeger = (traceId?: string) => {
        const url = traceId
            ? `${JAEGER_UI_URL}/trace/${traceId}`
            : JAEGER_UI_URL;
        window.open(url, "_blank");
    };

    const handleCopyTraceId = (traceId: string) => {
        navigator.clipboard.writeText(traceId);
    };

    return (
        <div className="trace-viewer-card">
            <div className="card-header">
                <h2>🔍 Trace Viewer</h2>
                <button
                    onClick={() => handleOpenJaeger()}
                    className="jaeger-link-btn"
                >
                    Open Jaeger UI ↗
                </button>
            </div>

            <div className="card-body">
                <div className="current-trace">
                    <span className="label">Current Trace:</span>
                    {currentTraceId ? (
                        <div className="trace-id-display">
                            <code>{currentTraceId}</code>
                            <div className="trace-actions">
                                <button
                                    onClick={() => handleCopyTraceId(currentTraceId)}
                                    className="action-btn"
                                    title="Copy"
                                >
                                    📋
                                </button>
                                <button
                                    onClick={() => handleOpenJaeger(currentTraceId)}
                                    className="action-btn"
                                    title="View in Jaeger"
                                >
                                    🔗
                                </button>
                            </div>
                        </div>
                    ) : (
                        <span className="no-trace">No active trace</span>
                    )}
                </div>

                <div className="trace-history">
                    <h3>Recent Traces</h3>
                    {traceHistory.length === 0 ? (
                        <div className="empty-state">
                            No traces recorded yet. Perform some actions to generate traces.
                        </div>
                    ) : (
                        <div className="trace-list">
                            {traceHistory.map((traceId, index) => (
                                <div
                                    key={traceId}
                                    className={`trace-item ${index === 0 ? "active" : ""}`}
                                >
                                    <code className="trace-id">{traceId.substring(0, 24)}...</code>
                                    <div className="trace-actions">
                                        <button
                                            onClick={() => handleCopyTraceId(traceId)}
                                            className="action-btn small"
                                            title="Copy"
                                        >
                                            📋
                                        </button>
                                        <button
                                            onClick={() => handleOpenJaeger(traceId)}
                                            className="action-btn small"
                                            title="View in Jaeger"
                                        >
                                            🔗
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="trace-info">
                    <h3>📖 How Tracing Works</h3>
                    <p>
                        Every API call creates a trace that links frontend and backend operations.
                        The <code>traceparent</code> header propagates context across services.
                    </p>
                    <div className="trace-flow">
                        <span className="flow-step">Frontend Span</span>
                        <span className="flow-arrow">→</span>
                        <span className="flow-step">API Request</span>
                        <span className="flow-arrow">→</span>
                        <span className="flow-step">Backend Span</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
