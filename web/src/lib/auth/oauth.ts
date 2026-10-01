import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { supabase } from '@/lib/supabase';

// Deep-link target for the native app. Must be allow-listed under
// Authentication → URL Configuration → Redirect URLs in the Supabase dashboard.
const NATIVE_REDIRECT = 'pratha://auth/callback';

// The Google OAuth *Web* client ID — the same client configured on the
// Google provider in Supabase dashboard. Android also needs an Android-type
// OAuth client in the same GCP project (package com.utsavam.sattva + SHA-1).
const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined;

export function isAuthDeepLink(url: string): boolean {
  return url.startsWith(NATIVE_REDIRECT);
}

// Supabase puts the PKCE `code` in the deep-link query; exchanging it inside the
// WebView works because the code verifier was persisted there by signInWithOAuth.
export async function handleAuthDeepLink(url: string): Promise<void> {
  if (!isAuthDeepLink(url)) return;
  const code = new URL(url).searchParams.get('code');
  if (!code) return;
  await supabase.auth.exchangeCodeForSession(code);
}

let socialLoginReady = false;
async function ensureSocialLogin(): Promise<void> {
  if (socialLoginReady) return;
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error('Native Google sign-in is not configured (VITE_GOOGLE_WEB_CLIENT_ID missing).');
  }
  await SocialLogin.initialize({
    google: { webClientId: GOOGLE_WEB_CLIENT_ID, mode: 'online' },
  });
  socialLoginReady = true;
}

export async function signInWithGoogle(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    // Native bottom-sheet sign-in → ID token → Supabase session.
    // Falls back to the browser OAuth flow if the plugin/config isn't ready.
    try {
      await ensureSocialLogin();
      const res = await SocialLogin.login({
        provider: 'google',
        options: { scopes: ['email', 'profile'] },
      });
      const result = res.result as { idToken?: string } | undefined;
      if (!result?.idToken) throw new Error('Google did not return an ID token');
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: result.idToken,
      });
      if (error) throw error;
      return;
    } catch (nativeErr) {
      if (nativeErr instanceof Error && /cancel/i.test(nativeErr.message)) throw nativeErr;
      console.warn('[oauth] native Google sign-in unavailable, using browser flow:', nativeErr);
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (data?.url) await Browser.open({ url: data.url });
    return;
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}
