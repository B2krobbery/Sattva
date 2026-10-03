import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import {
  getMyAdminRoles, getAdminStats, getAdminBookings, completeBooking, cancelBooking,
  getAdminProfiles, getAllRoles, grantRole, revokeRole,
  type AdminBooking,
} from '@/lib/api/admin';
import { motion } from 'motion/react';
import {
  ShieldCheck, LayoutDashboard, CalendarCheck, Users, KeyRound,
  CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'bookings', label: 'Bookings', icon: CalendarCheck },
  { id: 'devotees', label: 'Devotees', icon: Users },
  { id: 'roles', label: 'Roles', icon: KeyRound },
] as const;

type TabId = typeof TABS[number]['id'];

const STATUS_STYLES: Record<string, string> = {
  pending_payment: 'bg-amber-500/15 text-amber-600',
  confirmed: 'bg-blue-500/15 text-blue-600',
  performed: 'bg-tulsi/15 text-tulsi',
  cancelled: 'bg-red-500/15 text-red-500',
  refunded: 'bg-purple-500/15 text-purple-500',
  failed: 'bg-red-500/15 text-red-500',
};

const STAT_LABELS: Record<string, string> = {
  profiles: 'Devotees', puja_bookings: 'Bookings', puja_offerings: 'Offerings',
  temples: 'Temples', events: 'Events', animals: 'Animals',
  seva_contributions: 'Contributions', referrals: 'Referrals', live_streams: 'Live Streams',
};

export function Admin() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantRoleName, setGrantRoleName] = useState('editor');

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: getMyAdminRoles,
    enabled: !!user,
  });

  const isAdmin = (roles?.length ?? 0) > 0;
  const isSuperAdmin = roles?.some((r) => r.role === 'super_admin') ?? false;

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    enabled: isAdmin,
  });
  const { data: bookings } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: getAdminBookings,
    enabled: isAdmin,
  });
  const { data: devotees } = useQuery({
    queryKey: ['admin-devotees'],
    queryFn: getAdminProfiles,
    enabled: isAdmin,
  });
  const { data: allRoles } = useQuery({
    queryKey: ['admin-all-roles'],
    queryFn: getAllRoles,
    enabled: isSuperAdmin,
  });

  if (!loading && !user) return <Navigate to="/login" replace />;
  if (rolesLoading || loading) {
    return <div className="flex justify-center py-20 text-text-muted"><Loader2 className="animate-spin" /></div>;
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  const act = async (booking: AdminBooking, kind: 'complete' | 'cancel') => {
    setActionBusy(booking.id);
    try {
      if (kind === 'complete') await completeBooking(booking.id);
      else await cancelBooking(booking.id);
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    } catch (e) {
      console.error(`[admin] ${kind} failed:`, e);
    } finally {
      setActionBusy(null);
    }
  };

  const handleGrant = async () => {
    const uid = grantUserId.trim();
    if (!uid) return;
    setActionBusy('grant');
    try {
      await grantRole(uid, grantRoleName);
      setGrantUserId('');
      queryClient.invalidateQueries({ queryKey: ['admin-all-roles'] });
    } catch (e) {
      console.error('[admin] grant failed:', e);
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gold">
          <ShieldCheck size={13} /> Admin Console
        </div>
        <h1 className="font-serif text-3xl font-bold text-text-primary mt-1">Sanctum Control</h1>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {roles!.map((r, i) => (
            <span key={i} className="text-[11px] font-semibold bg-gold/15 text-gold px-2.5 py-1 rounded-full">
              {r.role}{r.scopeType !== 'global' ? ` · ${r.scopeType}` : ''}
            </span>
          ))}
        </div>
      </motion.section>

      <motion.section className="flex gap-2 overflow-x-auto hide-scrollbar">
        {TABS.filter((t) => t.id !== 'roles' || isSuperAdmin).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-all',
              activeTab === t.id
                ? 'bg-terracotta text-white border-terracotta'
                : 'bg-surface text-text-secondary border-border hover:border-terracotta/50'
            )}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </motion.section>

      {activeTab === 'overview' && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(STAT_LABELS).map(([key, label]) => (
            <div key={key} className="glass-card p-4 rounded-2xl border border-border-subtle bg-surface">
              <div className="text-2xl font-bold text-text-primary">{stats?.[key] ?? '—'}</div>
              <div className="text-xs text-text-muted mt-0.5">{label}</div>
            </div>
          ))}
        </motion.section>
      )}

      {activeTab === 'bookings' && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2.5">
          {(bookings ?? []).length === 0 && (
            <p className="text-sm text-text-muted py-8 text-center">No bookings visible to your role.</p>
          )}
          {(bookings ?? []).map((b) => (
            <div key={b.id} className="glass-card flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-border-subtle bg-surface">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text-primary truncate">{b.offeringTitle}</div>
                <div className="text-xs text-text-muted mt-0.5">
                  {b.templeName} · {b.bookingDate} · {b.devoteeName} × {b.quantity}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', STATUS_STYLES[b.status] || 'bg-surface-subtle text-text-secondary')}>
                  {b.status.replace('_', ' ')}
                </span>
                {b.status === 'confirmed' && (
                  <button
                    onClick={() => act(b, 'complete')}
                    disabled={actionBusy === b.id}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-tulsi/15 text-tulsi px-2.5 py-1.5 rounded-full hover:bg-tulsi/25 disabled:opacity-50"
                  >
                    <CheckCircle2 size={12} /> Mark Performed
                  </button>
                )}
                {['pending_payment', 'confirmed'].includes(b.status) && (
                  <button
                    onClick={() => act(b, 'cancel')}
                    disabled={actionBusy === b.id}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-red-500/15 text-red-500 px-2.5 py-1.5 rounded-full hover:bg-red-500/25 disabled:opacity-50"
                  >
                    <XCircle size={12} /> Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </motion.section>
      )}

      {activeTab === 'devotees' && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2.5">
          {(devotees ?? []).map((d) => (
            <div key={d.id} className="glass-card flex items-center justify-between gap-3 p-4 rounded-2xl border border-border-subtle bg-surface">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text-primary truncate">{d.displayName}</div>
                <div className="text-xs text-text-muted truncate">{d.email}</div>
              </div>
              <span className="text-[10px] font-mono text-text-muted shrink-0">{d.referralCode || ''}</span>
            </div>
          ))}
        </motion.section>
      )}

      {activeTab === 'roles' && isSuperAdmin && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
          <div className="glass-card p-4 rounded-2xl border border-border-subtle bg-surface flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs font-semibold text-text-secondary">User ID</label>
              <input
                className="form-input w-full mt-1 text-sm"
                placeholder="uuid of the devotee"
                value={grantUserId}
                onChange={(e) => setGrantUserId(e.target.value)}
              />
            </div>
            <select
              className="form-input text-sm"
              value={grantRoleName}
              onChange={(e) => setGrantRoleName(e.target.value)}
            >
              {['super_admin', 'editor', 'temple_admin', 'gaushala_admin', 'gaushala_staff', 'vet'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button
              onClick={handleGrant}
              disabled={actionBusy === 'grant' || !grantUserId.trim()}
              className="px-4 py-2 rounded-full bg-terracotta text-white text-sm font-semibold hover:bg-terracotta-hover disabled:opacity-50"
            >
              Grant
            </button>
          </div>
          {(allRoles ?? []).map((r) => (
            <div key={r.id} className="glass-card flex items-center justify-between gap-3 p-4 rounded-2xl border border-border-subtle bg-surface">
              <div>
                <div className="text-sm font-semibold text-text-primary">{r.role}</div>
                <div className="text-xs text-text-muted font-mono">{r.userId}</div>
              </div>
              <button
                onClick={async () => { setActionBusy(r.id); try { await revokeRole(r.id); queryClient.invalidateQueries({ queryKey: ['admin-all-roles'] }); } finally { setActionBusy(null); } }}
                disabled={actionBusy === r.id}
                className="text-[11px] font-semibold bg-red-500/15 text-red-500 px-2.5 py-1.5 rounded-full hover:bg-red-500/25 disabled:opacity-50"
              >
                Revoke
              </button>
            </div>
          ))}
        </motion.section>
      )}
    </div>
  );
}
