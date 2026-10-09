import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { type User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/**
 * High-importance notification channel — required on Android 8+ for
 * heads-up banners + lock-screen visibility. The FCM payload must send
 * `android.notification.channel_id` with this same id.
 */
export const PUSH_CHANNEL_ID = 'pratha_notifications';

let listenersRegistered = false;

/**
 * Registers for FCM push on native Android:
 *   1. creates the heads-up notification channel
 *   2. requests the POST_NOTIFICATIONS runtime permission (Android 13+)
 *   3. registers for an FCM token → stored in push_tokens (broadcasts fan
 *      out server-side over push_tokens — FCM topics aren't exposed by the
 *      Capacitor 8 plugin)
 *   4. shows banners for pushes received while the app is in the foreground
 *      (FCM is silent in the foreground by default)
 * No-op on web.
 */
export async function registerPushToken(user: User | null): Promise<void> {
  if (!user || !Capacitor.isNativePlatform()) return;

  try {
    await LocalNotifications.createChannel({
      id: PUSH_CHANNEL_ID,
      name: 'Pratha Notifications',
      description: 'Puja bookings, seva updates, and sacred reminders',
      importance: 4, // IMPORTANCE_HIGH — heads-up + lock screen
      visibility: 1, // VISIBILITY_PUBLIC
      vibration: true,
      lights: true,
    });

    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return;
    await LocalNotifications.requestPermissions();

    // Listeners must be attached BEFORE register() — FCM can deliver a
    // cached token synchronously, so attaching after would miss the event
    // and the token would never reach push_tokens.
    let registered = false;
    await PushNotifications.addListener('registration', async ({ value }) => {
      if (registered) return;
      registered = true;
      // SECURITY DEFINER RPC — the plain upsert fails when the device token is
      // still bound to a previous account on this device (own-row RLS rejects
      // the conflict UPDATE). The RPC claims the token for the current user.
      const { error } = await supabase.rpc('register_push_token', {
        p_token: value,
        p_platform: 'android',
      });
      if (error) console.warn('[push] token upsert failed:', error.message);
    });
    await PushNotifications.register();

    if (!listenersRegistered) {
      listenersRegistered = true;

      PushNotifications.addListener('registrationError', (err) => {
        console.warn('[push] registration error:', err);
      });

      // FCM does not display notifications while the app is foregrounded —
      // mirror them as local notifications so the user still sees a banner.
      PushNotifications.addListener('pushNotificationReceived', async (n) => {
        try {
          await LocalNotifications.schedule({
            notifications: [{
              id: Math.floor(Math.random() * 2 ** 31),
              channelId: PUSH_CHANNEL_ID,
              title: n.title || 'Pratha',
              body: n.body || '',
              extra: n.data,
            }],
          });
        } catch (e) {
          console.warn('[push] foreground display failed:', e);
        }
      });

      // Tapping a notification deep-links when a route is in the payload.
      PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        const route = (notification.data as { route?: string })?.route;
        if (route && typeof route === 'string' && route.startsWith('/')) {
          // SPA nav — location.href reloads the WebView and can blank the app.
          window.history.pushState({}, '', route);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      });
    }
  } catch (e) {
    console.warn('[push] register failed:', e);
  }
}
