import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { type User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ensureReferralCode, recordStoredReferral, sendEngagementEmail } from '@/lib/referral';
import { registerPushToken } from '@/lib/push';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, signOut: async () => {} });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Post-auth housekeeping, once per user per session:
  // - ensure their referral code exists on the profile
  // - credit any stored inbound referral (sign-up attribution)
  // - send the deduped welcome email
  const onboardedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || onboardedRef.current === user.id) return;
    onboardedRef.current = user.id;
    (async () => {
      await ensureReferralCode(user);
      await recordStoredReferral();
      sendEngagementEmail('welcome');
      registerPushToken(user);
    })();
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
