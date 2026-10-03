import { supabase } from '@/lib/supabase';

export interface AdminRole {
  role: string;
  scopeType: string;
  scopeId: string | null;
}

export interface AdminBooking {
  id: string;
  userId: string;
  templeId: string | null;
  offeringTitle: string;
  templeName: string;
  bookingDate: string;
  quantity: number;
  status: string;
  devoteeName: string;
}

/**
 * Fetches the current user's roles from user_roles (RLS: own rows always visible).
 * Non-admin users get an empty list — that's the whole gate.
 */
export async function getMyAdminRoles(): Promise<AdminRole[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role, scope_type, scope_id');
  if (error) {
    console.warn('[admin] roles fetch failed:', error.message);
    return [];
  }
  return (data || []).map((r) => ({
    role: r.role,
    scopeType: r.scope_type,
    scopeId: r.scope_id,
  }));
}

/**
 * Head-count overview. Each query is independently RLS-filtered, so a
 * temple admin only sees their own temple's numbers.
 */
export async function getAdminStats(): Promise<Record<string, number>> {
  const tables = [
    'profiles', 'puja_bookings', 'puja_offerings', 'temples',
    'events', 'animals', 'seva_contributions', 'referrals', 'live_streams',
  ];
  const out: Record<string, number> = {};
  await Promise.all(tables.map(async (t) => {
    const { count } = await supabase.from(t).select('id', { count: 'exact', head: true });
    out[t] = count ?? 0;
  }));
  return out;
}

/**
 * Bookings visible to the caller per RLS (own temple's or all for super admin).
 */
export async function getAdminBookings(): Promise<AdminBooking[]> {
  const { data, error } = await supabase
    .from('puja_bookings')
    .select(`
      id, user_id, temple_id, booking_date, quantity, status,
      offering:puja_offerings ( title_i18n ),
      temple:temples ( name_i18n ),
      devotee:profiles ( display_name )
    `)
    .order('booking_date', { ascending: false })
    .limit(100);
  if (error) throw error;

  return (data || []).map((b) => {
    const title = (b.offering as { title_i18n?: Record<string, string> } | null)?.title_i18n;
    const tname = (b.temple as { name_i18n?: Record<string, string> } | null)?.name_i18n;
    return {
      id: b.id,
      userId: b.user_id,
      templeId: b.temple_id,
      offeringTitle: title?.en || 'Puja',
      templeName: tname?.en || '—',
      bookingDate: b.booking_date,
      quantity: b.quantity ?? 1,
      status: b.status,
      devoteeName: (b.devotee as { display_name?: string } | null)?.display_name || 'Devotee',
    };
  });
}

export async function completeBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc('complete_booking', { p_booking_id: bookingId });
  if (error) throw error;
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_puja_booking', { p_booking_id: bookingId });
  if (error) throw error;
}

/**
 * Devotees list (RLS: admins see all profiles).
 */
export async function getAdminProfiles(): Promise<Array<{
  id: string; displayName: string; email: string; referralCode: string | null;
}>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, email, referral_code')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data || []).map((p) => ({
    id: p.id, displayName: p.display_name || 'Devotee', email: p.email || '', referralCode: p.referral_code,
  }));
}

/**
 * Role grant/revoke — user_roles RLS only lets super_admin write.
 */
export async function grantRole(userId: string, role: string): Promise<void> {
  const { error } = await supabase.from('user_roles').insert({ user_id: userId, role, scope_type: 'global' });
  if (error) throw error;
}

export async function getAllRoles(): Promise<Array<{ id: string; userId: string; role: string; scopeType: string }>> {
  const { data, error } = await supabase.from('user_roles').select('id, user_id, role, scope_type');
  if (error) return [];
  return (data || []).map((r) => ({ id: r.id, userId: r.user_id, role: r.role, scopeType: r.scope_type }));
}

export async function revokeRole(roleRowId: string): Promise<void> {
  const { error } = await supabase.from('user_roles').delete().eq('id', roleRowId);
  if (error) throw error;
}
