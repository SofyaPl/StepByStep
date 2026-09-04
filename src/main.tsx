import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { registerPwaUpdateHandlers, initPwaInstallListener } from './serviceWorkerHelper';

registerPwaUpdateHandlers();
initPwaInstallListener();

// Request persistent storage from browser (prevents Chrome/Edge from evicting local data)
if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
