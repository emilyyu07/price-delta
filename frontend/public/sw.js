// Service Worker for background scraping
const CACHE_NAME = 'pricedelta-scraping-v1';

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing background scraping service');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([]);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating background scraping service');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync triggered:', event.tag);
  
  if (event.tag === 'scraping-poll') {
    event.waitUntil(
      performBackgroundPoll()
    );
  }
});

// Handle push notifications for scraping completion
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push notification received');
  
  const options = {
    body: 'Your product has been successfully tracked!',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: 'scraping-complete',
    data: {
      url: '/dashboard'
    }
  };

  event.waitUntil(
    self.registration.showNotification('PriceDelta - Product Tracked!', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

async function performBackgroundPoll() {
  try {
    // Get pending scraping jobs from IndexedDB
    const pendingJobs = await getPendingScrapingJobs();
    
    for (const job of pendingJobs) {
      try {
        const response = await fetch(`/api/products/track/${job.listingId}/status`);
        const data = await response.json();
        
        if (data.status === 'COMPLETED') {
          // Show notification
          await self.registration.showNotification('Product Tracked!', {
            body: `${job.productName} has been successfully added to your tracked items.`,
            icon: '/favicon.png',
            tag: 'scraping-complete',
            data: { url: `/products/${data.productId}` }
          });
          
          // Remove from pending jobs
          await removePendingJob(job.listingId);
        } else if (data.status === 'FAILED') {
          // Remove failed jobs
          await removePendingJob(job.listingId);
        }
      } catch (error) {
        console.error('[ServiceWorker] Error polling job:', job.listingId, error);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Error in background poll:', error);
  }
}

// IndexedDB helpers for storing pending jobs
async function getPendingScrapingJobs() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pricedelta-scraping', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingJobs'], 'readonly');
      const store = transaction.objectStore('pendingJobs');
      const getRequest = store.getAll();
      
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => resolve(getRequest.result || []);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('pendingJobs')) {
        db.createObjectStore('pendingJobs', { keyPath: 'listingId' });
      }
    };
  });
}

async function removePendingJob(listingId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pricedelta-scraping', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingJobs'], 'readwrite');
      const store = transaction.objectStore('pendingJobs');
      const deleteRequest = store.delete(listingId);
      
      deleteRequest.onerror = () => reject(deleteRequest.error);
      deleteRequest.onsuccess = () => resolve(deleteRequest.result);
    };
  });
}
