import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { signInWithGoogle } from '@/lib/auth/oauth';

// Demo accounts for client evaluation. RLS-scoped like any user — no
// privileged access. Rotate after client testing. Remove pre-production.
const DEMO_ADMIN = { email: 'pratha.demo.client@gmail.com', password: 'PrathaDemo!2026' };
const DEMO_DEVOTEE = { email: 'pratha.demo.devotee@gmail.com', password: 'DemoDevotee#2026' };
// Demo sign-in buttons ship only when explicitly enabled (launch: unset the
// env on Vercel so production builds hide them).
const DEMO_BUTTONS = import.meta.env.VITE_ENABLE_DEMO_BUTTONS !== 'false';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Gift } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { getStoredInboundReferral, clearInboundReferral } from '@/lib/referral';
import './Auth.css';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [view, setView] = useState<'auth' | 'forgot' | 'recovery'>('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState(() => getStoredInboundReferral() || '');
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && view !== 'recovery') {
      const target = sessionStorage.getItem('postLoginRedirect') || '/';
      sessionStorage.removeItem('postLoginRedirect');
      navigate(target, { replace: true });
    }
  }, [user, navigate, view]);

  // Password-reset links arrive with type=recovery in the URL; the supabase
  // client consumes it and emits PASSWORD_RECOVERY — show the reset form
  // instead of bouncing a signed-in-looking session into the app.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setView('recovery');
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return <LoadingScreen message="Verifying Devotee..." subtext="Accessing your sacred journey" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: email.split('@')[0],
              ...(referralCode.trim() ? { referred_by: referralCode.trim().toUpperCase() } : {})
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (signUpError) throw signUpError;
        clearInboundReferral();
        if (!data.session) {
          setNotice('Account created. Check your email to confirm access, then sign in.');
          setIsLogin(true);
          return;
        }
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (resetError) throw resetError;
      setNotice('If an account exists for this email, a reset link is on its way. Open it on this device.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Please choose a password of at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setView('auth');
      setIsLogin(true);
      setPassword('');
      setConfirmPassword('');
      setNotice('Password updated. Sign in with your new password.');
      await supabase.auth.signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the password. Please request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-background" />

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-om-emblem">ॐ</div>
          <h2 className="auth-title">
            {view === 'forgot' ? 'Restore Access' : view === 'recovery' ? 'Choose a New Password' : isLogin ? 'Welcome, Devotee' : 'Enter the Sanctuary'}
          </h2>
          <p className="auth-subtitle">
            {view === 'forgot'
              ? 'We will send a secure reset link to your email.'
              : view === 'recovery'
                ? 'Set a new password for your devotee account.'
                : isLogin
                  ? 'Connect with Vedic rituals, sacred cow care, and lifelong seva.'
                  : 'Join a community of compassionate devotion and sacred sanctuary seva.'}
          </p>
        </div>

        {view === 'auth' && (
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(true); setError(''); setNotice(''); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(false); setError(''); setNotice(''); }}
            >
              Create Account
            </button>
          </div>
        )}

        {error && <div className="auth-error">{error}</div>}
        {notice && <div className="auth-error" style={{ background: 'var(--color-tulsi-light)', color: 'var(--color-tulsi)', borderColor: 'rgba(45,90,67,0.25)' }}>{notice}</div>}

        {view === 'forgot' && (
          <form className="auth-form" onSubmit={handleForgot}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="devotee@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
              <span>{loading ? 'Sending...' : 'Send Reset Link'}</span>
              <ArrowRight size={16} />
            </button>
            <button type="button" className="btn-secondary" onClick={() => { setView('auth'); setError(''); setNotice(''); }}>
              Back to Sign In
            </button>
          </form>
        )}

        {view === 'recovery' && (
          <form className="auth-form" onSubmit={handleRecovery}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
              <span>{loading ? 'Updating...' : 'Update Password'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {view === 'auth' && (
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="devotee@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {isLogin && (
              <button
                type="button"
                className="text-xs font-semibold text-terracotta mt-1.5 self-start"
                onClick={() => { setView('forgot'); setError(''); setNotice(''); }}
              >
                Forgot password?
              </button>
            )}
          </div>

          {!isLogin && (
            <div className="form-group">
              <div className="flex items-center justify-between">
                <label className="form-label flex items-center gap-1.5">
                  <Gift size={13} className="text-terracotta" />
                  <span>Referral Code (Optional)</span>
                </label>
                {referralCode && (
                  <span className="text-[11px] font-semibold text-tulsi">Code Applied</span>
                )}
              </div>
              <input
                type="text"
                className="form-input uppercase tracking-wider"
                placeholder="e.g. PRATHA-RAJESH-108"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn-primary auth-submit-btn"
            disabled={loading}
          >
            <span>{loading ? 'Processing...' : (isLogin ? 'Enter App' : 'Begin Journey')}</span>
            <ArrowRight size={16} />
          </button>

          {DEMO_BUTTONS && <button
            type="button"
            className="btn-secondary auth-submit-btn"
            disabled={loading}
            onClick={async () => {
              setError('');
              setNotice('');
              setLoading(true);
              try {
                const { error: demoError } = await supabase.auth.signInWithPassword(DEMO_ADMIN);
                if (demoError) throw demoError;
                sessionStorage.setItem('postLoginRedirect', '/admin');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Demo sign-in failed. Please try again.');
                setLoading(false);
              }
            }}
          >
            <span>{loading ? 'Signing in...' : 'Explore Admin Console'}</span>
          </button>}

          {DEMO_BUTTONS && <button
            type="button"
            className="btn-secondary auth-submit-btn"
            disabled={loading}
            onClick={async () => {
              setError('');
              setNotice('');
              setLoading(true);
              try {
                const { error: demoError } = await supabase.auth.signInWithPassword(DEMO_DEVOTEE);
                if (demoError) throw demoError;
                navigate('/');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Demo sign-in failed. Please try again.');
                setLoading(false);
              }
            }}
          >
            <span>{loading ? 'Signing in...' : 'Explore Demo Account'}</span>
          </button>}

          <button
            type="button"
            className="btn-secondary auth-submit-btn"
            disabled={loading}
            onClick={async () => {
              setError('');
              setNotice('');
              setLoading(true);
              try {
                await signInWithGoogle();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
                setLoading(false);
              }
            }}
          >
            <span>{loading ? 'Opening Google...' : 'Continue with Google'}</span>
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
