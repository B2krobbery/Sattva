import { Capacitor } from '@capacitor/core';

// Single source of truth for runtime platform. `web` when running in a
// browser (Vercel) or the Expo DOM bridge; `android`/`ios` in Capacitor.
export const platform = Capacitor.getPlatform(); // 'web' | 'android' | 'ios'
export const isNative = Capacitor.isNativePlatform();

// Set data-platform="android|ios|web" on <html> so CSS can scope rules:
// html[data-platform='android'] { ... } / html[data-platform='web'] { ... }
// Call once at startup, before React mounts.
export function initPlatform() {
  document.documentElement.dataset.platform = platform;
}
