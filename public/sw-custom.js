// Habitra Background Service Worker Helper for Native Desktop Notifications & Action Buttons
self.addEventListener('notificationclick', (event) => {
  const action = event.action || 'open';
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        client.postMessage({
          type: 'HABITRA_NOTIFICATION_ACTION',
          action,
          data: event.notification.data || {},
        });
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'HABITRA_SHOW_NOTIFICATION') {
    const { title, body, tag, actions, data, silent } = event.data.payload || {};
    if (self.registration && self.registration.showNotification) {
      self.registration.showNotification(title || '🌱 Habitra', {
        body: body || '',
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: tag || `habitra_${Date.now()}`,
        renotify: true,
        silent: Boolean(silent),
        data: data || {},
        actions: actions || [
          { action: 'open', title: 'Open Habitra' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      });
    }
  }
});
