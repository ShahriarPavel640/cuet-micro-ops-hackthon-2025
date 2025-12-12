import { useState, useEffect } from "react";
import { api, type HealthResponse } from "../lib/api";
import { getCurrentTraceId } from "../lib/tracing";
import "./HealthStatus.css";

export function HealthStatus() {
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);
    const [traceId, setTraceId] = useState<string | null>(null);

    const fetchHealth = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.getHealth();
            setHealth(response);
            setLastChecked(new Date());
            setTraceId(getCurrentTraceId());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch health");
            setHealth(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 10000); // Refresh every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = () => {
        if (loading) return "status-loading";
        if (error || health?.status === "unhealthy") return "status-error";
        return "status-healthy";
    };

    return (
        <div className={`health-status-card ${getStatusColor()}`}>
            <div className="card-header">
                <h2>🏥 Health Status</h2>
                <button onClick={fetchHealth} disabled={loading} className="refresh-btn">
                    {loading ? "⏳" : "🔄"}
                </button>
            </div>

            <div className="card-body">
                {loading && !health && (
                    <div className="loading-spinner">Loading...</div>
                )}

                {error && (
                    <div className="error-message">
                        <span className="error-icon">❌</span>
                        <span>{error}</span>
                    </div>
                )}

                {health && (
                    <div className="health-details">
                        <div className="status-row">
                            <span className="label">Overall Status:</span>
                            <span className={`badge ${health.status}`}>
                                {health.status === "healthy" ? "✅ Healthy" : "❌ Unhealthy"}
                            </span>
                        </div>
                        <div className="status-row">
                            <span className="label">Storage:</span>
                            <span className={`badge ${health.checks.storage}`}>
                                {health.checks.storage === "ok" ? "✅ OK" : "❌ Error"}
                            </span>
                        </div>
                    </div>
                )}

                {lastChecked && (
                    <div className="last-checked">
                        Last checked: {lastChecked.toLocaleTimeString()}
                    </div>
                )}

                {traceId && (
                    <div className="trace-id">
                        <span className="label">Trace ID:</span>
                        <code>{traceId.substring(0, 16)}...</code>
                    </div>
                )}
            </div>
        </div>
    );
}
