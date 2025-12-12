import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export const initSentry = () => {
  if (!SENTRY_DSN) {
    console.log("[Sentry] No DSN configured, running in mock mode");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of transactions for demo
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
  });

  console.log("[Sentry] Initialized successfully");
};

// Error boundary wrapper
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Capture exception manually
export const captureException = (error: Error, context?: Record<string, unknown>) => {
  if (SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
  console.error("[Sentry] Error captured:", error.message, context);
};

// Capture message
export const captureMessage = (message: string, level: Sentry.SeverityLevel = "info") => {
  if (SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
  console.log(`[Sentry] ${level}:`, message);
};

// Set user context
export const setUser = (user: { id: string; email?: string; username?: string } | null) => {
  Sentry.setUser(user);
};

// Add breadcrumb
export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb) => {
  Sentry.addBreadcrumb(breadcrumb);
};

// User feedback dialog
export const showReportDialog = (eventId?: string) => {
  Sentry.showReportDialog({ eventId });
};

// Get last event ID for feedback
export const getLastEventId = () => {
  return Sentry.lastEventId();
};
