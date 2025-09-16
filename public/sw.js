const CACHE_NAME = "habitta-v1.0.0";
const STATIC_CACHE = "habitta-static-v1.0.0";
const DYNAMIC_CACHE = "habitta-dynamic-v1.0.0";

// Assets to cache on install
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/manifest.json",
  "/favicon.ico",
];

// API routes that should be cached
const CACHEABLE_APIS = [
  "/api/property",
  "/api/tasks",
  "/api/health",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("Caching static assets");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== STATIC_CACHE && 
            cacheName !== DYNAMIC_CACHE &&
            cacheName !== CACHE_NAME
          ) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/supabase/")) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets and navigation
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const cacheName = DYNAMIC_CACHE;
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses for supported APIs
    if (networkResponse.ok && CACHEABLE_APIS.some(api => request.url.includes(api))) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline message for failed API calls
    return new Response(
      JSON.stringify({ 
        error: "Offline", 
        message: "This feature is not available offline" 
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Try network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // For navigation requests, return the cached index.html
    if (request.mode === "navigate") {
      const cachedIndex = await caches.match("/");
      if (cachedIndex) {
        return cachedIndex;
      }
    }
    
    // Return offline page for other requests
    return new Response("Offline content not available", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// Handle messages from the main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync-tasks") {
    event.waitUntil(syncOfflineActions());
  }
});

async function syncOfflineActions() {
  // Sync any offline actions when connection is restored
  const cache = await caches.open(DYNAMIC_CACHE);
  const offlineActions = await cache.match("/offline-actions");
  
  if (offlineActions) {
    try {
      const actions = await offlineActions.json();
      // Process offline actions here
      console.log("Syncing offline actions:", actions);
      
      // Clear offline actions after sync
      await cache.delete("/offline-actions");
    } catch (error) {
      console.error("Failed to sync offline actions:", error);
    }
  }
}