import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { type User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/**
 * Registers for FCM push on native Android and persists the token so the
 * notify-send edge function can reach the device. No-op on web.
 */
export async function registerPushToken(user: User | null): Promise<void> {
  if (!user || !Capacitor.isNativePlatform()) return;

  try {
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return;

    await PushNotifications.register();

    await PushNotifications.addListener('registration', async ({ value }) => {
      await supabase.from('push_tokens').upsert(
        { user_id: user.id, token: value, platform: 'android', updated_at: new Date().toISOString() },
        { onConflict: 'token' }
      );
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.warn('[push] registration error:', err);
    });
  } catch (e) {
    console.warn('[push] register failed:', e);
  }
}
