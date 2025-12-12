import { 
  HeadObjectCommand, 
  S3Client, 
  PutObjectCommand 
} from "@aws-sdk/client-s3";
import { serve } from "@hono/node-server";
import type { ServerType } from "@hono/node-server";
import { httpInstrumentationMiddleware } from "@hono/otel";
import { sentry } from "@hono/sentry";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { Scalar } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";
import { rateLimiter } from "hono-rate-limiter";

// Helper for optional URL that treats empty string as undefined
const optionalUrl = z
  .string()
  .optional()
  .transform((val) => (val === "" ? undefined : val))
  .pipe(z.url().optional());

// Environment schema
const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: optionalUrl,
  S3_BUCKET_NAME: z.string().default("downloads"),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  SENTRY_DSN: optionalUrl,
  OTEL_EXPORTER_OTLP_ENDPOINT: optionalUrl,
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(100),
  CORS_ORIGINS: z
    .string()
    .default("*")
    .transform((val) => (val === "*" ? "*" : val.split(","))),
  // Download delay simulation (in milliseconds)
  DOWNLOAD_DELAY_MIN_MS: z.coerce.number().int().min(0).default(10000), // 10 seconds
  DOWNLOAD_DELAY_MAX_MS: z.coerce.number().int().min(0).default(200000), // 200 seconds
  DOWNLOAD_DELAY_ENABLED: z.coerce.boolean().default(true),
});

// Parse and validate environment
const env = EnvSchema.parse(process.env);

// S3 Client
const s3Client = new S3Client({
  region: env.S3_REGION,
  ...(env.S3_ENDPOINT && { endpoint: env.S3_ENDPOINT }),
  ...(env.S3_ACCESS_KEY_ID &&
    env.S3_SECRET_ACCESS_KEY && {
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    }),
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
});

// Initialize OpenTelemetry SDK
const otelSDK = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "delineate-hackathon-challenge",
  }),
  traceExporter: new OTLPTraceExporter(),
});
otelSDK.start();

// --- STATE MANAGEMENT (In-Memory for Hackathon) ---
// In production, use Redis/BullMQ
interface JobState {
  jobId: string;
  fileId: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string | null;
  message?: string;
  createdAt: number;
}
const jobQueue: Record<string, JobState> = {};

const app = new OpenAPIHono();

// Request ID middleware
app.use(async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
  c.set("requestId", requestId);
  c.header("x-request-id", requestId);
  await next();
});

// Security headers
app.use(secureHeaders());

// CORS
app.use(
  cors({
    origin: env.CORS_ORIGINS,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    exposeHeaders: [
      "X-Request-ID",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
    ],
    maxAge: 86400,
  }),
);

// Timeouts & Rate Limits
app.use(timeout(env.REQUEST_TIMEOUT_MS));
app.use(
  rateLimiter({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: "draft-6",
    keyGenerator: (c) =>
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      "anonymous",
  }),
);

// Observability Middleware
app.use(
  httpInstrumentationMiddleware({
    serviceName: "delineate-hackathon-challenge",
  }),
);
app.use(
  sentry({
    dsn: env.SENTRY_DSN,
  }),
);

// --- SCHEMAS ---

// Error Response
const ErrorResponseSchema = z
  .object({
    error: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
  })
  .openapi("ErrorResponse");

app.onError((err, c) => {
  c.get("sentry").captureException(err);
  const requestId = c.get("requestId") as string | undefined;
  return c.json(
    {
      error: "Internal Server Error",
      message: env.NODE_ENV === "development" ? err.message : "An unexpected error occurred",
      requestId,
    },
    500,
  );
});

const MessageResponseSchema = z.object({ message: z.string() }).openapi("MessageResponse");

const HealthResponseSchema = z
  .object({
    status: z.enum(["healthy", "unhealthy"]),
    checks: z.object({
      storage: z.enum(["ok", "error"]),
    }),
  })
  .openapi("HealthResponse");

// Existing Initiator Schemas (unchanged)
const DownloadInitiateRequestSchema = z
  .object({
    file_ids: z.array(z.number().int()).min(1).max(1000),
  })
  .openapi("DownloadInitiateRequest");

const DownloadInitiateResponseSchema = z
  .object({
    jobId: z.string(),
    status: z.enum(["queued", "processing"]),
    totalFileIds: z.number().int(),
  })
  .openapi("DownloadInitiateResponse");

const DownloadCheckRequestSchema = z.object({
  file_id: z.number().int(),
}).openapi("DownloadCheckRequest");

const DownloadCheckResponseSchema = z.object({
  file_id: z.number().int(),
  available: z.boolean(),
  s3Key: z.string().nullable(),
  size: z.number().int().nullable(),
}).openapi("DownloadCheckResponse");

// --- UPDATED SCHEMAS FOR ASYNC ARCHITECTURE ---

const DownloadStartRequestSchema = z
  .object({
    file_id: z.number().int().min(10000).max(100000000).openapi({ description: "File ID to download" }),
  })
  .openapi("DownloadStartRequest");

// CHANGED: Returns Job ID immediately, not the file
const DownloadStartResponseSchema = z
  .object({
    message: z.string(),
    jobId: z.string().openapi({ description: "UUID to track progress" }),
    status: z.enum(["queued", "processing"]),
    pollingUrl: z.string().openapi({ description: "URL to check status" }),
  })
  .openapi("DownloadStartResponse");

// NEW: Schema for checking job status
const DownloadStatusResponseSchema = z
  .object({
    jobId: z.string(),
    fileId: z.number(),
    status: z.enum(["queued", "processing", "completed", "failed"]),
    progress: z.number().min(0).max(100),
    downloadUrl: z.string().nullable().optional(),
    message: z.string().optional(),
  })
  .openapi("DownloadStatusResponse");


// --- HELPERS ---

const sanitizeS3Key = (fileId: number): string => {
  const sanitizedId = Math.floor(Math.abs(fileId));
  return `downloads/${String(sanitizedId)}.zip`;
};

const checkS3Health = async (): Promise<boolean> => {
  if (!env.S3_BUCKET_NAME) return true;
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: "__health_check_marker__", // Doesn't need to exist, just checks bucket access/auth
    }));
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === "NotFound") return true;
    return false;
  }
};

const checkS3Availability = async (fileId: number) => {
  const s3Key = sanitizeS3Key(fileId);
  if (!env.S3_BUCKET_NAME) return { available: false, s3Key: null, size: null };

  try {
    const response = await s3Client.send(new HeadObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: s3Key,
    }));
    return { available: true, s3Key, size: response.ContentLength ?? null };
  } catch {
    return { available: false, s3Key: null, size: null };
  }
};

const getRandomDelay = (): number => {
  if (!env.DOWNLOAD_DELAY_ENABLED) return 0;
  return Math.floor(Math.random() * (env.DOWNLOAD_DELAY_MAX_MS - env.DOWNLOAD_DELAY_MIN_MS + 1)) + env.DOWNLOAD_DELAY_MIN_MS;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- WORKER LOGIC (Background Process) ---

async function processDownloadInBackground(jobId: string, fileId: number) {
  try {
    const delayMs = getRandomDelay();
    console.log(`[Worker] Job ${jobId}: Processing file ${fileId} (${delayMs}ms delay)`);

    // 1. Simulate Progress updates
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      await sleep(delayMs / steps);
      if (jobQueue[jobId]) {
        jobQueue[jobId].progress = Math.floor((i / steps) * 90); // Go up to 90%
      }
    }

    // 2. Generate and Upload "File" to S3
    const fileName = sanitizeS3Key(fileId);
    const fileContent = `Generated content for File ID: ${fileId}\nTimestamp: ${new Date().toISOString()}`;

    await s3Client.send(new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: fileName,
      Body: fileContent,
      ContentType: "text/plain",
    }));

    // 3. Mark Completed
    // Note: constructing a direct URL. In production, consider Presigned URLs.
    const downloadUrl = `${env.S3_ENDPOINT}/${env.S3_BUCKET_NAME}/${fileName}`;

    if (jobQueue[jobId]) {
      jobQueue[jobId].status = 'completed';
      jobQueue[jobId].progress = 100;
      jobQueue[jobId].downloadUrl = downloadUrl;
      jobQueue[jobId].message = "File ready for download";
    }
    
    console.log(`[Worker] Job ${jobId}: Completed successfully`);

  } catch (err) {
    console.error(`[Worker] Job ${jobId} failed:`, err);
    if (jobQueue[jobId]) {
      jobQueue[jobId].status = 'failed';
      jobQueue[jobId].message = "Processing failed internal error";
    }
  }
}

// --- ROUTES ---

const rootRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["General"],
  summary: "Root endpoint",
  responses: { 200: { description: "Success", content: { "application/json": { schema: MessageResponseSchema } } } },
});

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["Health"],
  summary: "Health check",
  responses: {
    200: { description: "Healthy", content: { "application/json": { schema: HealthResponseSchema } } },
    503: { description: "Unhealthy", content: { "application/json": { schema: HealthResponseSchema } } },
  },
});

app.openapi(rootRoute, (c) => c.json({ message: "Hello Hono!" }, 200));

app.openapi(healthRoute, async (c) => {
  const storageHealthy = await checkS3Health();
  return c.json({ status: storageHealthy ? "healthy" : "unhealthy", checks: { storage: storageHealthy ? "ok" : "error" } }, storageHealthy ? 200 : 503);
});

// -- Existing V1 Endpoints (Legacy/Helpers) --
const downloadInitiateRoute = createRoute({
  method: "post",
  path: "/v1/download/initiate",
  tags: ["Download"],
  summary: "Bulk initiate (Legacy)",
  request: { body: { content: { "application/json": { schema: DownloadInitiateRequestSchema } } } },
  responses: { 200: { description: "OK", content: { "application/json": { schema: DownloadInitiateResponseSchema } } } },
});

app.openapi(downloadInitiateRoute, (c) => {
  const { file_ids } = c.req.valid("json");
  return c.json({ jobId: crypto.randomUUID(), status: "queued", totalFileIds: file_ids.length }, 200);
});

const downloadCheckRoute = createRoute({
  method: "post",
  path: "/v1/download/check",
  tags: ["Download"],
  summary: "Check availability",
  request: { 
    query: z.object({ sentry_test: z.string().optional() }),
    body: { content: { "application/json": { schema: DownloadCheckRequestSchema } } } 
  },
  responses: { 200: { description: "OK", content: { "application/json": { schema: DownloadCheckResponseSchema } } } },
});

app.openapi(downloadCheckRoute, async (c) => {
  const { sentry_test } = c.req.valid("query");
  const { file_id } = c.req.valid("json");
  if (sentry_test === "true") throw new Error("Sentry test error");
  const s3Result = await checkS3Availability(file_id);
  return c.json({ file_id, ...s3Result }, 200);
});


// --- CHALLENGE 2 SOLUTION: ASYNC DOWNLOADS ---

// 1. ASYNC START ROUTE
const downloadStartRoute = createRoute({
  method: "post",
  path: "/v1/download/start",
  tags: ["Download"],
  summary: "Start file download (Async)",
  description: "Starts a background job and returns a Job ID immediately to prevent timeouts.",
  request: { body: { content: { "application/json": { schema: DownloadStartRequestSchema } } } },
  responses: { 
    202: { description: "Accepted", content: { "application/json": { schema: DownloadStartResponseSchema } } } 
  },
});

app.openapi(downloadStartRoute, async (c) => {
  const { file_id } = c.req.valid("json"); // The variable is named 'file_id'
  const jobId = crypto.randomUUID();

  // Initialize State
  jobQueue[jobId] = {
    jobId,
    fileId: file_id, // <--- FIX: Map 'file_id' to 'fileId'
    status: 'queued',
    progress: 0,
    createdAt: Date.now()
  };

  console.log(`[API] Received request for file ${file_id}, created Job ${jobId}`);

  // Trigger Background Worker (Fire & Forget - DO NOT AWAIT)
  processDownloadInBackground(jobId, file_id);

  // Return immediately
  return c.json({
    message: "Download initiated successfully",
    jobId: jobId,
    status: "queued",
    pollingUrl: `/v1/download/status/${jobId}`
  }, 202);
});

// 2. POLLING STATUS ROUTE
const downloadStatusRoute = createRoute({
  method: "get",
  path: "/v1/download/status/{jobId}",
  tags: ["Download"],
  summary: "Check Job Status",
  description: "Poll this endpoint to check the progress of your download.",
  request: {
    params: z.object({ jobId: z.string().uuid() })
  },
  responses: {
    200: { description: "Job Status", content: { "application/json": { schema: DownloadStatusResponseSchema } } },
    404: { description: "Job Not Found", content: { "application/json": { schema: ErrorResponseSchema } } }
  }
});

app.openapi(downloadStatusRoute, (c) => {
  const { jobId } = c.req.valid("param");
  const job = jobQueue[jobId];

  if (!job) {
    return c.json({ error: "Not Found", message: "Job ID not found" }, 404);
  }

  return c.json({
    jobId: job.jobId,
    fileId: job.fileId,
    status: job.status,
    progress: job.progress,
    downloadUrl: job.downloadUrl,
    message: job.message
  }, 200);
});


// --- SERVER SETUP ---

if (env.NODE_ENV !== "production") {
  app.doc("/openapi", {
    openapi: "3.0.0",
    info: { title: "Delineate Hackathon Challenge API", version: "1.0.0" },
    servers: [{ url: "http://localhost:3000" }],
  });
  app.get("/docs", Scalar({ url: "/openapi" }));
}

const gracefulShutdown = (server: ServerType) => (signal: string) => {
  console.log(`\n${signal} received. Shutdown...`);
  server.close(() => {
    otelSDK.shutdown().finally(() => {
      s3Client.destroy();
      console.log("Cleanup complete");
    });
  });
};

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
  if (env.NODE_ENV !== "production") console.log(`Docs: http://localhost:${info.port}/docs`);
});

const shutdown = gracefulShutdown(server);
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));