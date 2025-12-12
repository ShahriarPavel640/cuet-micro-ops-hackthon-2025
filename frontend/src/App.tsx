import { useEffect } from 'react';
import { initSentry } from './utils/sentry';
import { initTelemetry } from './utils/telemetry';
import Dashboard from './components/Dashboard';

import './App.css';

// Initialize Observability
initSentry();
initTelemetry();

function App() {
  return (
    <Dashboard />
  );
}

export default App;
