import { HealthStatus } from "./HealthStatus";
import { DownloadJobs } from "./DownloadJobs";
import { ErrorLog } from "./ErrorLog";
import { TraceViewer } from "./TraceViewer";
import { PerformanceMetrics } from "./PerformanceMetrics";
import "./Dashboard.css";

export function Dashboard() {
    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-content">
                    <h1>🔭 Observability Dashboard</h1>
                    <p className="subtitle">
                        Sentry Error Tracking • OpenTelemetry Tracing • Real-time Metrics
                    </p>
                </div>
                <div className="header-badge">
                    Challenge 4 • CUET Fest 2025
                </div>
            </header>

            <main className="dashboard-grid">
                <HealthStatus />
                <ErrorLog />
                <DownloadJobs />
                <TraceViewer />
                <PerformanceMetrics />
            </main>

            <footer className="dashboard-footer">
                <p>
                    Built with React + Vite • Powered by Sentry & OpenTelemetry
                </p>
            </footer>
        </div>
    );
}
