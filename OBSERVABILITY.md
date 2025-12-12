# Observability Dashboard Setup Guide

This document explains how to set up and run the Observability Dashboard (Challenge 4) for the Delineate Hackathon.

## Overview

The Observability Dashboard is a React application that provides:

- **Health Status**: Real-time API health monitoring
- **Download Jobs**: Interface to initiate and track downloads
- **Error Log**: Captured errors with Sentry integration
- **Trace Viewer**: OpenTelemetry trace visualization with Jaeger
- **Performance Metrics**: API response times and success rates

## Quick Start

### Run with Docker Compose (Recommended)

```bash
# From the project root
npm run docker:dev
```

This starts:
- Backend API: http://localhost:3000
- Frontend Dashboard: http://localhost:5173
- Jaeger UI: http://localhost:16686
- MinIO Console: http://localhost:9001

### Run Frontend Locally

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

## Sentry Integration

### 1. Create Sentry Project

1. Go to [sentry.io](https://sentry.io) and create an account
2. Create a new project and select **React**
3. Copy your DSN from the project settings

### 2. Configure Sentry DSN

Add your DSN to the frontend environment:

```bash
# frontend/.env
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

Or set it in Docker Compose:

```yaml
# docker/compose.dev.yml
environment:
  - VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

### 3. Test Sentry

1. Open the dashboard at http://localhost:5173
2. Click **"🐛 Trigger Sentry Error"** in the Download Jobs panel
3. Check your Sentry dashboard for the captured error

### Sentry Features

| Feature | Implementation |
|---------|---------------|
| Error Boundary | Wraps entire app, shows fallback UI on crash |
| Error Capture | Automatic capture for API failures |
| User Feedback | Dialog for users to report issues |
| Performance | Tracks page loads and transactions |
| Breadcrumbs | Records user actions for debugging |

## OpenTelemetry Integration

### How It Works

1. **Frontend creates spans** for user interactions
2. **Trace context propagates** via `traceparent` header
3. **Backend continues the trace** with its own spans
4. **Jaeger collects and visualizes** the distributed traces

### Trace Flow

```
User Action → Frontend Span → API Request → Backend Span
     │              │              │              │
     └──────────────┴──────────────┴──────────────┘
                         └── trace_id: abc123
```

### View Traces in Jaeger

1. Start the stack: `npm run docker:dev`
2. Open Jaeger UI: http://localhost:16686
3. Select service: `observability-dashboard`
4. Click **Find Traces**
5. Click any trace to see the full span tree

### Trace Correlation

Each API call displays its trace ID in the dashboard. Click the link icon to open that trace directly in Jaeger.

## Environment Variables

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000` |
| `VITE_SENTRY_DSN` | Sentry DSN (optional) | Empty (mock mode) |
| `VITE_OTEL_ENDPOINT` | OTEL collector endpoint | `http://localhost:4318` |
| `VITE_JAEGER_UI_URL` | Jaeger UI URL | `http://localhost:16686` |

### Backend (`.env`)

| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` | Backend Sentry DSN |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTEL collector endpoint |

## Dashboard Components

### Health Status
- Auto-refreshes every 10 seconds
- Shows overall status and storage check
- Displays current trace ID

### Download Jobs
- Enter file ID (10000-100000000)
- **Check Availability**: Quick S3 lookup
- **Initiate Download**: Create a download job
- **Trigger Sentry Error**: Test error tracking

### Error Log
- Shows captured JavaScript errors
- Test error generation button
- Sentry feedback dialog integration

### Trace Viewer
- Current trace ID display
- Recent trace history
- Direct links to Jaeger UI
- Copy trace ID to clipboard

### Performance Metrics
- Total requests counter
- Average response time
- Success rate percentage
- P95 latency
- Per-endpoint breakdown

## Troubleshooting

### CORS Errors

Ensure the backend allows frontend origin:

```env
CORS_ORIGINS=http://localhost:5173
```

### Connection Refused

Make sure all services are running:

```bash
docker compose -f docker/compose.dev.yml ps
```

### Traces Not Appearing

1. Check Jaeger is running: http://localhost:16686
2. Verify OTEL endpoint is reachable
3. Check browser console for tracing initialization

### Sentry Not Capturing

1. Verify DSN is correct
2. Check browser console for Sentry init message
3. Ensure DSN is not empty string

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            React Dashboard (port 5173)               │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────────────────┐    │    │
│  │  │ Sentry  │ │  OTEL   │ │   Dashboard UI      │    │    │
│  │  │  SDK    │ │ Tracer  │ │   Components        │    │    │
│  │  └────┬────┘ └────┬────┘ └──────────┬──────────┘    │    │
│  └───────┼───────────┼─────────────────┼───────────────┘    │
└──────────┼───────────┼─────────────────┼────────────────────┘
           │           │                 │
           ▼           │                 ▼
    ┌──────────┐       │         ┌──────────────┐
    │  Sentry  │       │         │ Backend API  │
    │  Cloud   │       │         │ (port 3000)  │
    └──────────┘       │         └──────┬───────┘
                       │                │
                       ▼                ▼
                 ┌──────────────────────────┐
                 │   Jaeger (port 16686)    │
                 │   OTEL Collector (4318)  │
                 └──────────────────────────┘
```
