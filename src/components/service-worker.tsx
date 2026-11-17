'use client';

import { useEffect } from 'react';

// Registered in production builds only. In development the worker would sit
// between the browser and the dev server and hide changes.
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // The site works the same without the worker, so a failed
      // registration is not worth showing to anyone.
    });
  }, []);

  return null;
}
