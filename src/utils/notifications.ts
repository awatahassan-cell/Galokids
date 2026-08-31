/**
 * Browser notifications and Audio alerts for new incoming orders.
 */

class OrderNotificationService {
  private audioCtx: AudioContext | null = null;

  /**
   * Request browser notification permission if not yet granted.
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }
    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }
    return Notification.permission;
  }

  /**
   * Synthesize a clean, pleasant cash register / high-tone chime using Web Audio API.
   * Works offline without external MP3 dependencies.
   */
  playOrderChime() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Note 1: E6 (1318.5 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1318.5, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: B6 (1975.5 Hz) - bright chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1975.5, now + 0.12);
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0.35, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.6);

      // Note 3: E7 (2637.0 Hz) - celebration ping
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(2637.0, now + 0.24);
      gain3.gain.setValueAtTime(0, now);
      gain3.gain.setValueAtTime(0.4, now + 0.24);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.24);
      osc3.stop(now + 0.85);
    } catch (e) {
      console.warn('Web Audio chime not supported or blocked:', e);
    }
  }

  /**
   * Fire a native desktop notification and sound when a new order arrives.
   */
  notifyNewOrder(order: { id: string | number; customerName?: string; totalAmount?: number }) {
    // 1. Play sound
    this.playOrderChime();

    // 2. Show native browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const orderIdStr = String(order.id).slice(-6);
        const name = order.customerName || 'کڕیاری وێبسایت';
        const total = order.totalAmount ? `${Number(order.totalAmount).toLocaleString()} د.ع` : '';

        const notification = new Notification(`🛍️ داواکارییەکی نوێ گەیشت! (#${orderIdStr})`, {
          body: `کڕیار: ${name}\nبڕی داواکاری: ${total}`,
          icon: '/favicon.ico',
          tag: `order-${order.id}`,
          requireInteraction: true,
        });

        notification.onclick = () => {
          window.focus();
          window.location.href = '/admin/orders';
          notification.close();
        };
      } catch (err) {
        console.warn('Desktop notification error:', err);
      }
    }
  }
}

export const orderNotifier = new OrderNotificationService();
