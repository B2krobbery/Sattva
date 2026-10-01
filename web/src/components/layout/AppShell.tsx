import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, Flame, MapPin, HeartHandshake, User, Sparkles, Compass, LogIn } from 'lucide-react';
import { RishiChatModal } from '@/features/ai/RishiChatModal';
import { useAuth } from '@/features/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getProfile, avatarPublicUrl } from '@/lib/api/profile';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

export function AppShell() {
  const [rishiOpen, setRishiOpen] = useState(false);
  const { user } = useAuth();
  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: !!user,
  });
  const displayName =
    (profileData?.profile?.displayName || user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Devotee') as string;
  const avatarUrl = avatarPublicUrl(profileData?.profile?.avatarPath) || (user?.user_metadata?.avatar_url as string | undefined);

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Discover', path: '/discover', icon: Compass },
    { name: 'Pujas', path: '/pujas', icon: Flame },
    { name: 'Gaushala', path: '/gaushala', icon: MapPin },
    { name: 'Seva', path: '/seva', icon: HeartHandshake },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-text-primary antialiased">
      {/* Top App Header (Mobile & Tablet) */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 pt-[calc(12px+env(safe-area-inset-top,0px))] pb-3 bg-surface/80 backdrop-blur-xl border-b border-border-subtle">
        <NavLink to="/" className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-terracotta rounded-lg">
          <span className="font-serif text-2xl text-terracotta font-bold leading-none">ॐ</span>
          <span className="font-serif text-lg font-bold tracking-widest text-text-primary">PRATHA</span>
        </NavLink>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 bg-surface-subtle text-text-primary px-3 py-1.5 rounded-md text-xs font-medium"
            onClick={() => setRishiOpen(true)}
            aria-label="Open Rishi Vedic Assistant"
          >
            <Sparkles size={14} />
            <span>Ask Rishi</span>
          </motion.button>
          {user ? (
            <NavLink
              to="/profile"
              className="relative flex items-center justify-center w-8 h-8 rounded-full bg-terracotta text-white text-xs font-bold overflow-hidden"
              aria-label="Signed in — open profile"
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                : displayName.slice(0, 1).toUpperCase()}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-tulsi border-2 border-surface" />
            </NavLink>
          ) : (
            <NavLink
              to="/login"
              className="flex items-center gap-1 text-xs font-semibold text-terracotta px-2 py-1.5 rounded-md"
              aria-label="Sign in"
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </NavLink>
          )}
        </div>
      </header>

      {/* Desktop Side Navigation */}
      <nav className="hidden md:flex flex-col fixed top-0 bottom-0 left-0 w-64 bg-surface border-r border-border-subtle p-6 z-50">
        <div className="pb-8 mb-6 border-b border-border-subtle">
          <NavLink to="/" className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-terracotta rounded-lg">
            <span className="font-serif text-3xl text-terracotta font-bold leading-none">ॐ</span>
            <span className="font-serif text-xl font-bold tracking-widest text-text-primary">PRATHA</span>
          </NavLink>
          <p className="font-mantra text-xs text-gold tracking-widest mt-2 uppercase">Dharmo Rakshati Rakshitah</p>
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-4 px-4 py-3 rounded-md text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-terracotta",
                isActive 
                  ? "bg-terracotta-light text-terracotta font-semibold" 
                  : "text-text-secondary hover:bg-surface-subtle hover:text-text-primary"
              )}
            >
              <item.icon size={20} strokeWidth={2} />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </div>

        <div className="pt-6 border-t border-border-subtle">
          {user ? (
            <NavLink
              to="/profile"
              title={`Signed in as ${user.email}`}
              className="flex items-center gap-3 mb-4 px-3 py-2.5 rounded-lg bg-surface-subtle border border-border-subtle hover:border-terracotta/40 transition-colors"
            >
              <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-terracotta text-white text-sm font-bold shrink-0 overflow-hidden">
                {avatarUrl
                  ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  : displayName.slice(0, 1).toUpperCase()}
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-tulsi border-2 border-surface" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-text-primary truncate">{displayName}</span>
                <span className="block text-xs text-tulsi font-medium truncate">Signed in · {user.email}</span>
              </span>
            </NavLink>
          ) : (
            <NavLink
              to="/login"
              className="flex items-center justify-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-terracotta text-white text-sm font-semibold hover:bg-terracotta-hover transition-colors"
            >
              <LogIn size={16} />
              <span>Sign In to Pratha</span>
            </NavLink>
          )}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 bg-surface-subtle border border-border-subtle px-3 py-1.5 rounded-full text-xs font-medium text-text-secondary">
              <span className="w-2 h-2 rounded-full bg-tulsi animate-pulse" />
              Vrindavan Sanctum
            </div>
          </div>
          <motion.button 
            
            
            className="w-full flex items-center justify-center gap-2 bg-surface-subtle hover:bg-surface-subtle border border-border text-text-primary px-4 py-2 rounded-md text-sm font-medium transition-colors"
            onClick={() => setRishiOpen(true)}
          >
            <Sparkles size={16} />
            <span>Ask Rishi</span>
          </motion.button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 pb-[calc(80px+env(safe-area-inset-bottom,0px))] md:pb-8">
        <div className="p-4 md:p-8 xl:px-12 2xl:px-16 min-h-[calc(100vh-140px)]">
          <Outlet />
        </div>
      </main>

      {/* Mobile Floating Bottom Navigation */}
      <nav className="md:hidden fixed bottom-[calc(12px+env(safe-area-inset-bottom,0px))] left-4 right-4 h-16 flex items-center justify-around px-2 z-50 bg-surface/85 backdrop-blur-xl border border-border rounded-2xl shadow-sm">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center gap-1 flex-1 h-12 rounded-full transition-colors outline-none",
              isActive ? "text-terracotta" : "text-text-muted hover:text-text-secondary"
            )}
          >
            {({ isActive }) => (
              <>
                <motion.div
                  animate={{ y: isActive ? -2 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </motion.div>
                <span className="text-[11px] font-semibold tracking-wide">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <RishiChatModal isOpen={rishiOpen} onClose={() => setRishiOpen(false)} />
    </div>
  );
}
