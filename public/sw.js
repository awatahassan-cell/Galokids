/*
 * The shop's service worker.
 *
 * Its only job is notifications. It is deliberately not a caching worker:
 * caching the panel would mean staff running yesterday's build after a deploy,
 * which is a much worse problem than a slow first paint.
 *
 * This runs when no tab is open, which is the whole point — an order at nine
 * in the evening should reach the phone in someone's pocket.
 */

// Take over as soon as a new version is installed, rather than waiting for
// every tab to close. A stale worker would keep showing the old notification
// text long after the shop updated it.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // A push with no readable body still deserves to ring, rather than being
    // dropped in silence.
    payload = { title: 'گەلۆ کیدز', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || '🛍️ داواکارییەکی نوێ';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/assets/galo-logo.png',
    badge: payload.badge || '/assets/galo-logo.png',
    // Same tag replaces rather than stacks, so ten orders do not bury the
    // phone in ten separate banners for the same one.
    tag: payload.tag || 'galokids',
    renotify: true,
    // Stays until it is dealt with. An order that scrolls past unnoticed is
    // the failure this feature exists to prevent.
    requireInteraction: true,
    dir: 'rtl',
    lang: 'ku',
    data: { url: payload.url || '/admin/orders' },
    vibrate: [180, 80, 180],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const target = (event.notification.data && event.notification.data.url) || '/admin/orders';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Prefer a tab that is already open on this site: focus it and send it
      // where the notification points, rather than opening a second panel
      // beside the one the shop is already using.
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }

      return self.clients.openWindow(target);
    })
  );
});
