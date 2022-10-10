// [Working example](/serviceworker-cookbook/json-cache/).

self.addEventListener('install', function(event) {
  console.log('[install] Kicking off service worker registration!');
});

self.addEventListener('fetch', function(event) {
    console.log('[fetch] Returning from server: ', event.request.url);
});

self.addEventListener('activate', function(event) {
  // Message to simply show the lifecycle flow
  console.log('[activate] Activating service worker!');
});