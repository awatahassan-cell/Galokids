import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { resolveLink } from '../utils/links';
import * as WebBrowser from 'expo-web-browser';

/**
 * Sends the customer to the right screen when they arrive from a link.
 *
 * Two cases, and both matter. The app may be cold — someone taps a discount
 * link in WhatsApp and the app launches to serve it — or already running,
 * where the link arrives as an event. `getInitialURL` covers the first,
 * the `url` listener the second.
 *
 * Links to the admin panel or the till open in the browser instead: they are
 * the shop's own addresses, so dropping them silently would look broken, but
 * the app has no such screens and should not pretend otherwise.
 */
export function useDeepLinks() {
  const router = useRouter();
  // A cold start delivers the same URL through both paths on some Android
  // versions; navigating twice would leave a duplicate screen on the stack.
  const handled = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;

    const go = (url: string | null) => {
      if (!alive || !url || handled.current === url) return;
      handled.current = url;

      const { path, webOnly } = resolveLink(url);

      if (webOnly) {
        WebBrowser.openBrowserAsync(url).catch(() => {});
        return;
      }

      // An unrecognised link is left alone. The app opens where it would have
      // opened anyway, rather than being steered by whatever the URL said.
      if (path && path !== '/') router.push(path as never);
    };

    Linking.getInitialURL().then(go).catch(() => {});
    const subscription = Linking.addEventListener('url', event => go(event.url));

    return () => {
      alive = false;
      subscription.remove();
    };
  }, [router]);
}
