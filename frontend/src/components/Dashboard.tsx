import useSWR from 'swr';
import * as Sentry from "@sentry/react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Dashboard() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const { data: health, error: healthError } = useSWR(`${apiUrl}/health`, fetcher, { refreshInterval: 5000 });
  const { data: serverInfo, error: serverError } = useSWR(`${apiUrl}/`, fetcher);

  const triggerError = async () => {
    try {
      await fetch(`${apiUrl}/v1/download/check?sentry_test=true`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ file_id: 70000 })
      });
    } catch (e) {
      console.error(e);
      Sentry.captureException(e);
    }
  };

  const triggerFrontendError = () => {
      throw new Error("This is a frontend test error for Sentry!");
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Observability Dashboard</h1>
      
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>API Health</h2>
            {healthError && <span style={{color: 'red'}}>Offline</span>}
            {!health && !healthError && <span>Loading...</span>}
            {health && (
                <div>
                    <p>Status: <strong style={{color: health.status === 'healthy' ? 'green' : 'red'}}>{health.status}</strong></p>
                    <p>Storage: {health.checks?.storage}</p>
                </div>
            )}
        </div>

        <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Server Info</h2>
            {serverError && <span style={{color: 'red'}}>Error fetching info</span>}
            {serverInfo && <p>{serverInfo.message}</p>}
        </div>

        <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Debug Controls</h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                <button onClick={triggerError} style={{ padding: '0.5rem', cursor: 'pointer' }}>
                    Trigger Backend Error (Sentry)
                </button>
                 <button onClick={triggerFrontendError} style={{ padding: '0.5rem', cursor: 'pointer' }}>
                    Trigger Frontend Error (Sentry)
                </button>
            </div>
        </div>
        
        <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
             <h2>Links</h2>
             <ul>
                 <li><a href="http://localhost:16686" target="_blank" rel="noreferrer">Jaeger UI (Traces)</a></li>
                 <li><a href="http://localhost:3000/docs" target="_blank" rel="noreferrer">API Docs</a></li>
             </ul>
        </div>
      </div>
    </div>
  );
}
