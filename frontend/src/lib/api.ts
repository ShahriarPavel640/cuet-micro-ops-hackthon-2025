import { captureException, addBreadcrumb } from "./sentry";
import { setCurrentTraceId, getCurrentTraceId } from "./tracing";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
console.log("[API] Using API_URL:", API_URL);

export interface HealthResponse {
    status: "healthy" | "unhealthy";
    checks: {
        storage: "ok" | "error";
    };
}

export interface DownloadCheckRequest {
    file_id: number;
}

export interface DownloadCheckResponse {
    file_id: number;
    available: boolean;
    s3Key: string | null;
    size: number | null;
}

export interface DownloadInitiateRequest {
    file_ids: number[];
}

export interface DownloadInitiateResponse {
    jobId: string;
    status: "queued" | "processing";
    totalFileIds: number;
}

export interface DownloadStartRequest {
    file_id: number;
}

export interface DownloadStartResponse {
    file_id: number;
    status: "completed" | "failed";
    downloadUrl: string | null;
    size: number | null;
    processingTimeMs: number;
    message: string;
}

export interface ApiError {
    error: string;
    message: string;
    requestId?: string;
}

// Performance metrics tracking
export interface ApiMetrics {
    endpoint: string;
    method: string;
    status: number;
    duration: number;
    success: boolean;
    timestamp: Date;
    traceId?: string;
}

const metricsHistory: ApiMetrics[] = [];

export const getMetricsHistory = (): ApiMetrics[] => [...metricsHistory];

export const clearMetricsHistory = () => {
    metricsHistory.length = 0;
};

// Generate a random trace ID
const generateTraceId = (): string => {
    const chars = "0123456789abcdef";
    let result = "";
    for (let i = 0; i < 32; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
};

// Generic fetch wrapper with tracing and error capture
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const startTime = Date.now();
    const url = `${API_URL}${endpoint}`;

    console.log(`[API] Requesting: ${url}`);

    // Get or generate trace ID
    let traceId = getCurrentTraceId();
    if (!traceId) {
        traceId = generateTraceId();
        setCurrentTraceId(traceId);
    }

    addBreadcrumb({
        category: "api",
        message: `${options.method || "GET"} ${endpoint}`,
        level: "info",
        data: { url, traceId },
    });

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                // Note: traceparent header removed due to CORS restrictions
                // The backend would need to add "traceparent" to Access-Control-Allow-Headers
                ...options.headers,
            },
        });

        console.log(`[API] Response: ${response.status} ${response.statusText}`);

        const duration = Date.now() - startTime;

        // Record metrics
        metricsHistory.push({
            endpoint,
            method: options.method || "GET",
            status: response.status,
            duration,
            success: response.ok,
            timestamp: new Date(),
            traceId,
        });

        // Keep only last 100 metrics
        if (metricsHistory.length > 100) {
            metricsHistory.shift();
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                error: "Unknown Error",
                message: `HTTP ${response.status}`,
            }));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        return response.json();
    } catch (error) {
        console.error(`[API] Error fetching ${url}:`, error);
        const duration = Date.now() - startTime;

        // Record failed metrics
        metricsHistory.push({
            endpoint,
            method: options.method || "GET",
            status: 0,
            duration,
            success: false,
            timestamp: new Date(),
            traceId,
        });

        if (error instanceof Error) {
            captureException(error, {
                endpoint,
                method: options.method || "GET",
                traceId,
            });
        }
        throw error;
    }
}

// API Methods
export const api = {
    // Health check
    async getHealth(): Promise<HealthResponse> {
        return apiRequest<HealthResponse>("/health");
    },

    // Check download availability
    async checkDownload(
        request: DownloadCheckRequest,
        triggerSentryTest = false
    ): Promise<DownloadCheckResponse> {
        const query = triggerSentryTest ? "?sentry_test=true" : "";
        return apiRequest<DownloadCheckResponse>(`/v1/download/check${query}`, {
            method: "POST",
            body: JSON.stringify(request),
        });
    },

    // Initiate download job
    async initiateDownload(
        request: DownloadInitiateRequest
    ): Promise<DownloadInitiateResponse> {
        return apiRequest<DownloadInitiateResponse>("/v1/download/initiate", {
            method: "POST",
            body: JSON.stringify(request),
        });
    },

    // Start download (long-running)
    async startDownload(
        request: DownloadStartRequest
    ): Promise<DownloadStartResponse> {
        return apiRequest<DownloadStartResponse>("/v1/download/start", {
            method: "POST",
            body: JSON.stringify(request),
        });
    },
};
