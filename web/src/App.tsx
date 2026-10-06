import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { BirthDetailsPrompt } from '@/components/auth/BirthDetailsPrompt';
import { handleAuthDeepLink } from '@/lib/auth/oauth';
import { captureInboundReferral } from '@/lib/referral';

import { Home } from '@/features/home/Home';
import { Landing } from '@/features/landing/Landing';
import { Auth } from '@/features/auth/Auth';

import { LoadingScreen } from '@/components/ui/LoadingScreen';

// Route-level code splitting: admin + secondary routes ship in separate chunks
// so the landing/first-load bundle stays lean.
const Discover = React.lazy(() => import('@/features/discover/Discover').then((m) => ({ default: m.Discover })));
const TempleDetail = React.lazy(() => import('@/features/discover/TempleDetail').then((m) => ({ default: m.TempleDetail })));
const EventDetail = React.lazy(() => import('@/features/discover/EventDetail').then((m) => ({ default: m.EventDetail })));
const FestivalDetail = React.lazy(() => import('@/features/discover/FestivalDetail').then((m) => ({ default: m.FestivalDetail })));
const LiveDarshan = React.lazy(() => import('@/features/discover/LiveDarshan').then((m) => ({ default: m.LiveDarshan })));
const LiveDarshanDetail = React.lazy(() => import('@/features/discover/LiveDarshan').then((m) => ({ default: m.LiveDarshanDetail })));
const PujaDiscovery = React.lazy(() => import('@/features/pujas/PujaDiscovery').then((m) => ({ default: m.PujaDiscovery })));
const GaushalaDiscovery = React.lazy(() => import('@/features/gaushala/GaushalaDiscovery').then((m) => ({ default: m.GaushalaDiscovery })));
const Mantras = React.lazy(() => import('@/features/mantras/Mantras').then((m) => ({ default: m.Mantras })));
const Learn = React.lazy(() => import('@/features/learn/Learn').then((m) => ({ default: m.Learn })));
const ArticleDetail = React.lazy(() => import('@/features/learn/Learn').then((m) => ({ default: m.ArticleDetail })));
const AnimalPassport = React.lazy(() => import('@/features/gaushala/AnimalPassport').then((m) => ({ default: m.AnimalPassport })));
const SevaExperience = React.lazy(() => import('@/features/seva/SevaExperience').then((m) => ({ default: m.SevaExperience })));
const Profile = React.lazy(() => import('@/features/profile/Profile').then((m) => ({ default: m.Profile })));
const Admin = React.lazy(() => import('@/features/admin/Admin').then((m) => ({ default: m.Admin })));

// Shell wrapper: routes are public; transactional actions prompt for sign-in.
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen message="Restoring Sacred Session..." subtext="Connecting to Pratha" />;
  return <>{children}</>;
};

// Routes that only make sense for a signed-in user. The requested path is
// stashed so Auth can return the user after sign-in.
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  React.useEffect(() => {
    if (!loading && !user) {
      try { sessionStorage.setItem('postLoginRedirect', location.pathname + location.search); } catch { /* noop */ }
    }
  }, [loading, user, location]);
  if (loading) return <LoadingScreen message="Restoring Sacred Session..." subtext="Connecting to Pratha" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// '/' is the public marketing landing for visitors; signed-in devotees land
// on their personal dashboard instead.
const HomeOrLanding = () => {
  const { user } = useAuth();
  // Native installs skip marketing — land straight on the app home.
  if (Capacitor.isNativePlatform()) return <Home />;
  return user ? <Home /> : <Landing />;
};

export const queryClient = new QueryClient();
// Re-exported so the Expo DOM bridge shares this module copy; a second
// react-query instance would split the provider context at runtime.
export { QueryClientProvider } from '@tanstack/react-query';

export function PrathaAppContent() {
  return (
    <React.Suspense fallback={<LoadingScreen message="Opening Pratha..." subtext="Loading the sacred path" />}>
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
        <Route path="/" element={<HomeOrLanding />} />
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
        <Route path="/mantras" element={<Mantras />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/learn/:slug" element={<ArticleDetail />} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </React.Suspense>
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
