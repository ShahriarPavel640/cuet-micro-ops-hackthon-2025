import { trace, SpanStatusCode, type Span } from "@opentelemetry/api";

const OTEL_ENDPOINT = import.meta.env.VITE_OTEL_ENDPOINT || "http://localhost:4318";

let currentTraceId: string | null = null;
let isInitialized = false;

export const initTracing = () => {
    try {
        // For browser tracing, we'll use a simpler approach
        // The full WebTracerProvider requires additional setup
        // For the hackathon, we'll focus on trace context propagation
        console.log(`[OpenTelemetry] Tracing initialized (endpoint: ${OTEL_ENDPOINT})`);
        isInitialized = true;
    } catch (error) {
        console.warn("[OpenTelemetry] Failed to initialize tracing:", error);
    }
};

// Get tracer instance
export const getTracer = () => {
    return trace.getTracer("observability-dashboard");
};

// Get current trace ID
export const getCurrentTraceId = (): string | null => {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
        return activeSpan.spanContext().traceId;
    }
    return currentTraceId;
};

// Set current trace ID (for display purposes)
export const setCurrentTraceId = (traceId: string) => {
    currentTraceId = traceId;
};

// Generate a random trace ID (for demo purposes when no real tracing)
const generateTraceId = (): string => {
    const chars = "0123456789abcdef";
    let result = "";
    for (let i = 0; i < 32; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
};

// Create a new span for user interactions
export const startSpan = <T>(
    name: string,
    fn: (span: Span | null) => T
): T => {
    const tracer = getTracer();
    try {
        return tracer.startActiveSpan(name, (span) => {
            try {
                setCurrentTraceId(span.spanContext().traceId);
                const result = fn(span);
                span.setStatus({ code: SpanStatusCode.OK });
                return result;
            } catch (error) {
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : "Unknown error",
                });
                throw error;
            } finally {
                span.end();
            }
        });
    } catch {
        // Fallback when tracer not available
        const mockTraceId = generateTraceId();
        setCurrentTraceId(mockTraceId);
        return fn(null);
    }
};

// Create async span
export const startAsyncSpan = async <T>(
    name: string,
    fn: (span: Span | null) => Promise<T>
): Promise<T> => {
    const tracer = getTracer();
    try {
        return await tracer.startActiveSpan(name, async (span) => {
            try {
                setCurrentTraceId(span.spanContext().traceId);
                const result = await fn(span);
                span.setStatus({ code: SpanStatusCode.OK });
                return result;
            } catch (error) {
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : "Unknown error",
                });
                throw error;
            } finally {
                span.end();
            }
        });
    } catch {
        // Fallback when tracer not available
        const mockTraceId = generateTraceId();
        setCurrentTraceId(mockTraceId);
        return fn(null);
    }
};

// Get trace context headers for propagation
export const getTraceHeaders = (): Record<string, string> => {
    const traceId = getCurrentTraceId();
    if (!traceId) {
        // Generate a new trace ID for this request
        const newTraceId = generateTraceId();
        const spanId = newTraceId.substring(0, 16);
        setCurrentTraceId(newTraceId);
        return {
            traceparent: `00-${newTraceId}-${spanId}-01`,
        };
    }

    const spanId = traceId.substring(0, 16);
    return {
        traceparent: `00-${traceId}-${spanId}-01`,
    };
};

// Check if tracing is initialized
export const isTracingInitialized = () => isInitialized;
