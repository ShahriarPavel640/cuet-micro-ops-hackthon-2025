import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initSentry, SentryErrorBoundary } from './lib/sentry'
import { initTracing } from './lib/tracing'

// Initialize observability
initSentry()
initTracing()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SentryErrorBoundary
      fallback={({ error }) => {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: '#0f0f1a',
            color: '#fff',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <h1 style={{ color: '#ef4444' }}>🚨 Something went wrong</h1>
            <p style={{ color: '#9ca3af' }}>{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                background: '#6366f1',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
          </div>
        );
      }}
      showDialog
    >
      <App />
    </SentryErrorBoundary>
  </StrictMode>,
)
