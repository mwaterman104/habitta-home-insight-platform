import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Service Worker disabled to avoid stale-cache during development and previews
if ('serviceWorker' in navigator) {
  // Unregister any existing service workers to prevent serving stale bundles
  navigator.serviceWorker.getRegistrations?.().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
  // Best-effort cache cleanup
  // @ts-ignore
  if (window.caches?.keys) {
    // @ts-ignore
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
