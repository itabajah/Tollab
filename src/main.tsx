import { render } from 'preact';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initStorePersistence } from './services/store-persistence';
import './css/base.css';
import './css/layout.css';
import './css/components.css';
import './css/calendar.css';
import './css/modals.css';
import './css/toast.css';
import './css/utils.css';

// Bootstrap stores from localStorage before first render
initStorePersistence();

render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
  document.getElementById('app')!,
);
