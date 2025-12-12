import { useState, useEffect } from "react";
import {
    api,
    type DownloadInitiateResponse,
    type DownloadCheckResponse,
} from "../lib/api";
import { getCurrentTraceId } from "../lib/tracing";
import { captureException } from "../lib/sentry";
import "./DownloadJobs.css";

const JOBS_STORAGE_KEY = "observability_dashboard_jobs";

interface DownloadJob {
    id: string;
    fileId: number;
    status: "queued" | "processing" | "completed" | "failed" | "checking";
    result?: DownloadCheckResponse | DownloadInitiateResponse;
    error?: string;
    traceId?: string;
    timestamp: string; // Changed to string for JSON serialization
}

// Load jobs from localStorage
const loadJobsFromStorage = (): DownloadJob[] => {
    try {
        const stored = localStorage.getItem(JOBS_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to load jobs from storage:", e);
    }
    return [];
};

// Save jobs to localStorage
const saveJobsToStorage = (jobs: DownloadJob[]) => {
    try {
        localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
    } catch (e) {
        console.error("Failed to save jobs to storage:", e);
    }
};

export function DownloadJobs() {
    const [fileId, setFileId] = useState("");
    const [jobs, setJobs] = useState<DownloadJob[]>(() => loadJobsFromStorage());
    const [loading, setLoading] = useState(false);

    // Save jobs to localStorage whenever they change
    useEffect(() => {
        saveJobsToStorage(jobs);
    }, [jobs]);

    const addJob = (job: DownloadJob) => {
        setJobs((prev) => [job, ...prev].slice(0, 20)); // Keep last 20 jobs
    };

    const updateJob = (id: string, updates: Partial<DownloadJob>) => {
        setJobs((prev) =>
            prev.map((job) =>
                job.id === id ? { ...job, ...updates } : job
            )
        );
    };

    const clearJobs = () => {
        setJobs([]);
        localStorage.removeItem(JOBS_STORAGE_KEY);
    };

    const handleCheckDownload = async () => {
        if (!fileId || isNaN(parseInt(fileId))) return;

        const jobId = crypto.randomUUID();
        const fileIdNum = parseInt(fileId);

        addJob({
            id: jobId,
            fileId: fileIdNum,
            status: "checking",
            timestamp: new Date().toISOString(),
        });

        setLoading(true);
        try {
            const result = await api.checkDownload({ file_id: fileIdNum });
            updateJob(jobId, {
                status: result.available ? "completed" : "failed",
                result,
                traceId: getCurrentTraceId() || undefined,
            });
        } catch (err) {
            const error = err instanceof Error ? err.message : "Unknown error";
            updateJob(jobId, {
                status: "failed",
                error,
                traceId: getCurrentTraceId() || undefined,
            });
            captureException(err instanceof Error ? err : new Error(error));
        } finally {
            setLoading(false);
        }
    };

    const handleInitiateDownload = async () => {
        if (!fileId || isNaN(parseInt(fileId))) return;

        const jobId = crypto.randomUUID();
        const fileIdNum = parseInt(fileId);

        addJob({
            id: jobId,
            fileId: fileIdNum,
            status: "queued",
            timestamp: new Date().toISOString(),
        });

        setLoading(true);
        try {
            const result = await api.initiateDownload({ file_ids: [fileIdNum] });
            updateJob(jobId, {
                status: result.status,
                result,
                traceId: getCurrentTraceId() || undefined,
            });
        } catch (err) {
            const error = err instanceof Error ? err.message : "Unknown error";
            updateJob(jobId, {
                status: "failed",
                error,
                traceId: getCurrentTraceId() || undefined,
            });
            captureException(err instanceof Error ? err : new Error(error));
        } finally {
            setLoading(false);
        }
    };

    const handleTriggerSentryError = async () => {
        if (!fileId || isNaN(parseInt(fileId))) {
            setFileId("70000");
        }

        const jobId = crypto.randomUUID();
        const fileIdNum = parseInt(fileId) || 70000;

        addJob({
            id: jobId,
            fileId: fileIdNum,
            status: "checking",
            timestamp: new Date().toISOString(),
        });

        setLoading(true);
        try {
            await api.checkDownload({ file_id: fileIdNum }, true);
        } catch (err) {
            const error = err instanceof Error ? err.message : "Sentry test error";
            updateJob(jobId, {
                status: "failed",
                error,
                traceId: getCurrentTraceId() || undefined,
            });
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed":
                return "✅";
            case "failed":
                return "❌";
            case "queued":
                return "📋";
            case "processing":
                return "⚙️";
            case "checking":
                return "🔍";
            default:
                return "❓";
        }
    };

    return (
        <div className="download-jobs-card">
            <div className="card-header">
                <h2>📥 Download Jobs</h2>
            </div>

            <div className="card-body">
                <div className="input-group">
                    <input
                        type="number"
                        value={fileId}
                        onChange={(e) => setFileId(e.target.value)}
                        placeholder="Enter File ID (10000-100000000)"
                        min={10000}
                        max={100000000}
                        className="file-id-input"
                    />
                </div>

                <div className="button-group">
                    <button
                        onClick={handleCheckDownload}
                        disabled={loading || !fileId}
                        className="btn btn-primary"
                    >
                        🔍 Check Availability
                    </button>
                    <button
                        onClick={handleInitiateDownload}
                        disabled={loading || !fileId}
                        className="btn btn-secondary"
                    >
                        📤 Initiate Download
                    </button>
                    <button
                        onClick={handleTriggerSentryError}
                        disabled={loading}
                        className="btn btn-danger"
                    >
                        🐛 Trigger Sentry Error
                    </button>
                </div>

                <div className="jobs-list">
                    <div className="jobs-header">
                        <h3>Recent Jobs</h3>
                        {jobs.length > 0 && (
                            <button onClick={clearJobs} className="clear-btn">
                                🗑️ Clear
                            </button>
                        )}
                    </div>
                    {jobs.length === 0 ? (
                        <div className="empty-state">No jobs yet. Enter a file ID and click a button to start.</div>
                    ) : (
                        <div className="jobs-grid">
                            {jobs.map((job) => (
                                <div key={job.id} className={`job-item status-${job.status}`}>
                                    <div className="job-header">
                                        <span className="job-icon">{getStatusIcon(job.status)}</span>
                                        <span className="job-file-id">File #{job.fileId}</span>
                                        <span className={`job-status ${job.status}`}>{job.status}</span>
                                    </div>
                                    {job.error && (
                                        <div className="job-error">{job.error}</div>
                                    )}
                                    {job.traceId && (
                                        <div className="job-trace">
                                            Trace: <code>{job.traceId.substring(0, 12)}...</code>
                                        </div>
                                    )}
                                    <div className="job-time">
                                        {new Date(job.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
