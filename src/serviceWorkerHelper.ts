export function registerPwaUpdateHandlers() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // When a new service worker takes control (via skipWaiting + clientsClaim), reload seamlessly
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  // Whenever the app is launched or resumed from background, check for updates
  navigator.serviceWorker.ready.then((registration) => {
    // Check right on launch
    registration.update().catch(() => {});

    // Check on visibility change (when returning to the app tab/app on phone)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update().catch(() => {});
      }
    });

    // Check on focus
    window.addEventListener('focus', () => {
      registration.update().catch(() => {});
    });

    // Also periodic check every 5 minutes
    setInterval(() => {
      registration.update().catch(() => {});
    }, 5 * 60 * 1000);
  }).catch(() => {});
}

export async function forceAppUpdate(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    }
  } catch (err) {
    console.error('Error clearing cache:', err);
  } finally {
    // Reload with cache-busting query parameter
    const url = new URL(window.location.href);
    url.searchParams.set('t', Date.now().toString());
    window.location.href = url.toString();
  }
}
