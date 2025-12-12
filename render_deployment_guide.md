# Render Deployment Guide

This guide provides instructions for deploying the micro-ops-hackathon-2025 application to Render.

## 1. Using `render.yaml`

The most straightforward way to deploy is by using the `render.yaml` file located in the root of the project. This file defines the necessary services for the backend and frontend.

However, the existing `render.yaml` has some errors. Below is the corrected version. You can either update your existing `render.yaml` or use this updated version when creating a new "Blueprint" on Render.

### Corrected `render.yaml`

```yaml
services:
  - type: web
    name: micro-ops-backend
    env: node
    rootDir: ./
    plan: free
    healthCheckPath: /health
    initialDeployHook: npm install
    startCommand: npm run start
    envVars:
      - key: NODE_VERSION
        value: 20.11.1
      # IMPORTANT: Add the rest of your environment variables in the Render dashboard
      # as described in the section below.

  - type: web
    name: micro-ops-frontend
    env: static
    rootDir: ./frontend
    plan: free
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
```

### Key Changes:

1.  **`healthCheckPath`**: Changed from `/` to `/health` for the backend service to point to the correct health check endpoint defined in `src/index.ts`.
2.  **`initialDeployHook`**: Changed from `npm install && npm run build` to `npm install` for the backend service. The root `package.json` does not have a `build` script, only a `start` script.

## 2. Setting Environment Variables

The backend service requires several environment variables to function correctly. These are for S3 bucket access, Sentry for error tracking, and OpenTelemetry for tracing.

After deploying the blueprint, navigate to your backend service (`micro-ops-backend`) on the Render dashboard and add the following environment variables in the "Environment" tab:

### Required Environment Variables

These variables are defined in `src/index.ts` and are essential for the application to start.

-   `S3_BUCKET_NAME`: The name of your S3 bucket.
-   `S3_REGION`: The AWS region of your S3 bucket (e.g., `us-east-1`).
-   `S3_ENDPOINT`: The endpoint for your S3-compatible storage.
-   `S3_ACCESS_KEY_ID`: Your S3 access key.
-   `S3_SECRET_ACCESS_KEY`: Your S3 secret access key.
-   `SENTRY_DSN`: Your Sentry DSN for error reporting.
-   `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`: The OTLP endpoint for traces (e.g., `https://api.honeycomb.io/v1/traces`).
-   `OTEL_EXPORTER_OTLP_TRACES_HEADERS`: Headers for the OTLP exporter, typically your API key (e.g., `x-honeycomb-team=YOUR_API_KEY`).
-   `OTEL_SERVICE_NAME`: The name of your service for OpenTelemetry (e.g., `micro-ops-backend`).

**Note:** It is critical to set all these environment variables. The backend service will fail to start without them, as validated by the Zod schema in `src/index.ts`.
