import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { BirthDetailsPrompt } from '@/components/auth/BirthDetailsPrompt';
import { handleAuthDeepLink } from '@/lib/auth/oauth';
import { captureInboundReferral } from '@/lib/referral';

import { Home } from '@/features/home/Home';
import { Auth } from '@/features/auth/Auth';

import { GaushalaDiscovery } from '@/features/gaushala/GaushalaDiscovery';
import { AnimalPassport } from '@/features/gaushala/AnimalPassport';
import { PujaDiscovery } from '@/features/pujas/PujaDiscovery';
import { SevaExperience } from '@/features/seva/SevaExperience';
import { Profile } from '@/features/profile/Profile';
import { Admin } from '@/features/admin/Admin';

import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Discover } from '@/features/discover/Discover';
import { TempleDetail } from '@/features/discover/TempleDetail';
import { EventDetail } from '@/features/discover/EventDetail';
import { FestivalDetail } from '@/features/discover/FestivalDetail';
import { LiveDarshan, LiveDarshanDetail } from '@/features/discover/LiveDarshan';

// Shell wrapper: routes are public; transactional actions prompt for sign-in.
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen message="Restoring Sacred Session..." subtext="Connecting to Pratha" />;
  return <>{children}</>;
};

// Routes that only make sense for a signed-in user.
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen message="Restoring Sacred Session..." subtext="Connecting to Pratha" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const queryClient = new QueryClient();
// Re-exported so the Expo DOM bridge shares this module copy; a second
// react-query instance would split the provider context at runtime.
export { QueryClientProvider } from '@tanstack/react-query';

export function PrathaAppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Auth />} />
      
      <Route 
        element={
          <ProtectedRoute>
            <AppShell />
            <BirthDetailsPrompt />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/temples/:slug" element={<TempleDetail />} />
        <Route path="/events/:slug" element={<EventDetail />} />
        <Route path="/festivals/:slug" element={<FestivalDetail />} />
        <Route path="/darshan" element={<LiveDarshan />} />
        <Route path="/darshan/:id" element={<LiveDarshanDetail />} />
        <Route path="/pujas" element={<PujaDiscovery />} />
        <Route path="/gaushala" element={<GaushalaDiscovery />} />
        <Route path="/gaushala/animal/:id" element={<AnimalPassport />} />
        <Route path="/seva" element={<SevaExperience />} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Backward-compatible alias
export const SattvaAppContent = PrathaAppContent;

export default function App() {
  // OAuth deep links (pratha://auth/callback?code=...) arrive via the Capacitor
  // App plugin when Google sign-in returns from the system browser.
  React.useEffect(() => {
    // Capture any referral code passed via query string (?ref=CODE)
    captureInboundReferral();

    if (!Capacitor.isNativePlatform()) return;
    const listener = CapApp.addListener('appUrlOpen', ({ url }) => {
      void handleAuthDeepLink(url);
    });
    // Hardware back: navigate history, else minimize (don't kill the app).
    const backListener = CapApp.addListener('backButton', () => {
      if (window.history.length > 1) window.history.back();
      else void CapApp.minimizeApp();
    });
    return () => {
      listener.then((l) => l.remove());
      backListener.then((l) => l.remove());
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <PrathaAppContent />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
