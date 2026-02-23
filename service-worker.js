const CACHE_NAME = 'mrv-app-v2'; // Incremented version to force update
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force this SW to become active immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all pages immediately
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. API Calls: Network Only (Never Cache)
  if (url.pathname.includes('.php') || url.search.includes('action=')) {
    return; 
  }

  // 2. Navigation & Assets: Network First, Strong Fallback to Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If response is valid (200 OK), Cache it and Return it
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        }
        
        // CRITICAL FIX: If Network returns 404 or 500, DO NOT return that error.
        // Instead, look in cache.
        return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            // If not in cache and network failed/404, return the network response (the 404 page)
            // or if it's a navigation request, try to serve index.html as a last resort
            if (event.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
            return response;
        });
      })
      .catch(() => {
        // 3. Network Failed Completely (Offline)
        return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            
            // Fallback for navigation (SPA routing)
            if (event.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
        });
      })
  );
});