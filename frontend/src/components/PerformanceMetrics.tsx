import { useState, useEffect } from "react";
import { getMetricsHistory, type ApiMetrics } from "../lib/api";
import "./PerformanceMetrics.css";

export function PerformanceMetrics() {
    const [metrics, setMetrics] = useState<ApiMetrics[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        setMetrics(getMetricsHistory());
    }, [refreshKey]);

    // Poll for new metrics
    useEffect(() => {
        const interval = setInterval(() => {
            setRefreshKey((k) => k + 1);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const calculateStats = () => {
        if (metrics.length === 0) {
            return { avgDuration: 0, successRate: 0, totalRequests: 0, p95Duration: 0 };
        }

        const durations = metrics.map((m) => m.duration);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const successCount = metrics.filter((m) => m.success).length;
        const successRate = (successCount / metrics.length) * 100;

        // Calculate P95
        const sorted = [...durations].sort((a, b) => a - b);
        const p95Index = Math.floor(sorted.length * 0.95);
        const p95Duration = sorted[p95Index] || sorted[sorted.length - 1] || 0;

        return {
            avgDuration: Math.round(avgDuration),
            successRate: Math.round(successRate),
            totalRequests: metrics.length,
            p95Duration: Math.round(p95Duration),
        };
    };

    const stats = calculateStats();

    const getEndpointStats = () => {
        const endpointMap = new Map<string, { success: number; failed: number; totalDuration: number }>();

        metrics.forEach((m) => {
            const key = `${m.method} ${m.endpoint}`;
            const current = endpointMap.get(key) || { success: 0, failed: 0, totalDuration: 0 };
            endpointMap.set(key, {
                success: current.success + (m.success ? 1 : 0),
                failed: current.failed + (m.success ? 0 : 1),
                totalDuration: current.totalDuration + m.duration,
            });
        });

        return Array.from(endpointMap.entries()).map(([endpoint, data]) => ({
            endpoint,
            ...data,
            avgDuration: Math.round(data.totalDuration / (data.success + data.failed)),
        }));
    };

    const endpointStats = getEndpointStats();

    return (
        <div className="performance-metrics-card">
            <div className="card-header">
                <h2>📊 Performance Metrics</h2>
            </div>

            <div className="card-body">
                <div className="stats-grid">
                    <div className="stat-item">
                        <span className="stat-value">{stats.totalRequests}</span>
                        <span className="stat-label">Total Requests</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{stats.avgDuration}ms</span>
                        <span className="stat-label">Avg Response</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value success">{stats.successRate}%</span>
                        <span className="stat-label">Success Rate</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{stats.p95Duration}ms</span>
                        <span className="stat-label">P95 Latency</span>
                    </div>
                </div>

                <div className="endpoint-breakdown">
                    <h3>Endpoint Breakdown</h3>
                    {endpointStats.length === 0 ? (
                        <div className="empty-state">
                            No API calls yet. Use the Download Jobs panel to make requests.
                        </div>
                    ) : (
                        <div className="endpoint-list">
                            {endpointStats.map((stat) => (
                                <div key={stat.endpoint} className="endpoint-item">
                                    <div className="endpoint-header">
                                        <code className="endpoint-name">{stat.endpoint}</code>
                                        <span className="endpoint-avg">{stat.avgDuration}ms avg</span>
                                    </div>
                                    <div className="endpoint-bar">
                                        <div
                                            className="bar-success"
                                            style={{
                                                width: `${(stat.success / (stat.success + stat.failed)) * 100}%`,
                                            }}
                                        />
                                        <div
                                            className="bar-failed"
                                            style={{
                                                width: `${(stat.failed / (stat.success + stat.failed)) * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <div className="endpoint-counts">
                                        <span className="count-success">✓ {stat.success}</span>
                                        <span className="count-failed">✗ {stat.failed}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="recent-requests">
                    <h3>Recent Requests</h3>
                    <div className="request-list">
                        {metrics.slice(0, 5).map((m, i) => (
                            <div key={i} className={`request-item ${m.success ? "success" : "failed"}`}>
                                <span className="request-method">{m.method}</span>
                                <span className="request-endpoint">{m.endpoint}</span>
                                <span className="request-duration">{m.duration}ms</span>
                                <span className={`request-status ${m.success ? "success" : "failed"}`}>
                                    {m.success ? "✓" : "✗"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
