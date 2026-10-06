import { supabase, localized } from '@/lib/supabase';
import { friendlyRpcError } from '@/lib/api/errors';

export interface Profile {
  id?: string;
  displayName?: string;
  city?: string;
  gotra?: string;
  nakshatra?: string;
  phone?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  avatarPath?: string;
  notificationsEnabled?: boolean;
}

export interface Donation {
  id: string;
  targetType: string;
  amountRupees: number;
  paymentStatus: string;
  targetName?: string;
  sevaCategory?: string;
  dedication?: string;
  taxExempt80G?: boolean;
  createdAt?: string;
  dateStr?: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  rashi?: string;
  nakshatra?: string;
}

export interface SevaCampaign {
  id: string;
  title: string;
  description?: string;
  goalRupees?: number;
  raisedRupees?: number;
  imageUrl?: string;
  gaushalaId?: string;
}

const CONTRIBUTION_ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: 'Please sign in to record your offering.',
  amount_too_small: 'The minimum offering is ₹10.',
  amount_too_large: 'This offering is above the single-contribution limit.',
  gaushala_not_found: 'This sanctuary is not accepting offerings right now.',
  animal_not_found: 'This animal is not available for sponsorship.',
  campaign_mismatch: 'The selected campaign does not belong to this sanctuary.',
  campaign_not_found: 'This campaign is not active right now.',
};

export async function getProfile(): Promise<{ profile: Profile | null }> {
  const { data, error } = await supabase.from('profiles').select('id,display_name,city,gotra,nakshatra,phone,birth_date,birth_time,birth_place,avatar_path,notifications_enabled').maybeSingle();
  if (error) throw error;
  return { profile: data ? { id: data.id, displayName: data.display_name, city: data.city, gotra: data.gotra, nakshatra: data.nakshatra, phone: data.phone, birthDate: data.birth_date, birthTime: data.birth_time, birthPlace: data.birth_place, avatarPath: data.avatar_path, notificationsEnabled: data.notifications_enabled } : null };
}

export async function updateProfile(profile: Partial<Profile>): Promise<{ success: boolean }> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error('not_authenticated');
  // Profiles are created by the handle_new_user trigger (profiles_insert is
  // intentionally absent); users may only update their own editable columns.
  // Only write fields the caller actually supplied — a partial update must
  // never null out columns it wasn't asked to touch (a birth-details save
  // was wiping `phone` because it wasn't in the payload).
  const updates: Record<string, string | boolean | null> = {};
  if (profile.displayName !== undefined) updates.display_name = profile.displayName;
  if (profile.city !== undefined) updates.city = profile.city;
  if (profile.gotra !== undefined) updates.gotra = profile.gotra;
  if (profile.nakshatra !== undefined) updates.nakshatra = profile.nakshatra;
  if (profile.birthDate !== undefined) updates.birth_date = profile.birthDate || null;
  if (profile.birthTime !== undefined) updates.birth_time = profile.birthTime || null;
  if (profile.birthPlace !== undefined) updates.birth_place = profile.birthPlace || null;
  if (profile.phone !== undefined) updates.phone = profile.phone || null;
  if (profile.avatarPath !== undefined) updates.avatar_path = profile.avatarPath || null;
  if (profile.notificationsEnabled !== undefined) updates.notifications_enabled = profile.notificationsEnabled;
  if (Object.keys(updates).length === 0) return { success: true };
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
  if (error) throw error;
  return { success: true };
}

// Uploads to avatars/{uid}/ and returns the storage path (store in
// profiles.avatar_path). The bucket is public-read; write is user-scoped.
export async function uploadAvatar(file: File): Promise<{ path: string; publicUrl: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('not_authenticated');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export function avatarPublicUrl(path?: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

export async function getDonations(): Promise<{ donations: Donation[] }> {
  const { data, error } = await supabase
    .from('seva_contributions')
    .select('id,amount,status,message,created_at,seva_campaigns(title,title_i18n),animals(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return {
    donations: (data ?? []).map((row: any) => ({
      id: row.id,
      targetType: 'SEVA',
      amountRupees: Number(row.amount) / 100,
      paymentStatus: row.status,
      targetName: row.seva_campaigns?.title ? row.seva_campaigns.title || localized(row.seva_campaigns.title_i18n) : row.animals?.name || undefined,
      dedication: row.message || undefined,
      createdAt: row.created_at,
    })),
  };
}

export async function getSevaCampaigns(): Promise<SevaCampaign[]> {
  const { data, error } = await supabase
    .from('seva_campaigns')
    .select('id,title,title_i18n,description_i18n,goal_amount,raised_amount,image_url,gaushala_id')
    .eq('status', 'published')
    .order('featured', { ascending: false })
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title || localized(row.title_i18n),
    description: localized(row.description_i18n) || undefined,
    goalRupees: row.goal_amount != null ? Number(row.goal_amount) / 100 : undefined,
    raisedRupees: row.raised_amount != null ? Number(row.raised_amount) / 100 : undefined,
    imageUrl: row.image_url || undefined,
    gaushalaId: row.gaushala_id || undefined,
  }));
}

export async function createDonation(donation: {
  amountRupees: number;
  campaignId?: string;
  gaushalaId?: string;
  animalId?: string;
  dedication?: string;
  isAnonymous?: boolean;
}): Promise<{ success: boolean; donationId: string; status?: string }> {
  let campaignId = donation.campaignId || null;
  let gaushalaId = donation.gaushalaId || null;

  // Untargeted donations attach to the featured published campaign so the
  // contribution always has a valid gaushala/campaign context.
  if (!campaignId && !gaushalaId && !donation.animalId) {
    const { data: campaign, error: campaignError } = await supabase
      .from('seva_campaigns')
      .select('id,gaushala_id')
      .eq('status', 'published')
      .order('featured', { ascending: false })
      .order('created_at')
      .limit(1)
      .maybeSingle();
    if (campaignError) throw campaignError;
    if (!campaign) throw new Error('No active seva campaign is available.');
    campaignId = campaign.id;
    gaushalaId = campaign.gaushala_id || null;
  }
  if (campaignId && !gaushalaId) {
    const { data: campaign, error: campaignError } = await supabase
      .from('seva_campaigns')
      .select('gaushala_id')
      .eq('id', campaignId)
      .maybeSingle();
    if (campaignError) throw campaignError;
    gaushalaId = campaign?.gaushala_id || null;
  }

  const { data, error } = await supabase.rpc('create_contribution', {
    p_amount: Math.max(1000, Math.round(donation.amountRupees * 100)),
    p_campaign_id: campaignId,
    p_gaushala_id: gaushalaId,
    p_animal_id: donation.animalId || null,
    p_message: donation.dedication || null,
    p_is_anonymous: donation.isAnonymous ?? false,
  });
  if (error) throw new Error(friendlyRpcError(error, CONTRIBUTION_ERROR_MESSAGES, 'The offering could not be recorded. Please try again.'));
  return { success: true, donationId: data?.id || 'pending', status: data?.status || undefined };
}

export async function getFamily(): Promise<{ family: FamilyMember[] }> {
  const { data, error } = await supabase.from('family_members').select('id,name,relation,gotra,nakshatra').order('created_at');
  if (error) throw error;
  return { family: (data ?? []).map((row) => ({ id: row.id, name: row.name, relationship: row.relation || '', rashi: row.gotra, nakshatra: row.nakshatra })) };
}

export async function addFamilyMember(member: Omit<FamilyMember, 'id'>): Promise<{ success: boolean, memberId: string }> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error('not_authenticated');
  const { data, error } = await supabase.from('family_members').insert({
    user_id: userId,
    name: member.name,
    relation: member.relationship,
    gotra: member.rashi,
    nakshatra: member.nakshatra,
  }).select('id').single();
  if (error) throw error;
  return { success: true, memberId: data.id };
}

export interface SavedItem {
  entityType: 'temple' | 'festival' | 'event' | 'puja';
  entitySlug: string;
  entityTitle: string;
  createdAt: string;
}

export async function getSavedItems(): Promise<SavedItem[]> {
  const { data, error } = await supabase
    .from('saved_items')
    .select('entity_type, entity_slug, entity_title, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    entityType: r.entity_type,
    entitySlug: r.entity_slug,
    entityTitle: r.entity_title,
    createdAt: r.created_at,
  }));
}

export async function toggleSavedItem(item: Omit<SavedItem, 'createdAt'>, currentlySaved: boolean) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('not_authenticated');
  if (currentlySaved) {
    const { error } = await supabase.from('saved_items').delete()
      .eq('user_id', u.user.id).eq('entity_type', item.entityType).eq('entity_slug', item.entitySlug);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from('saved_items').upsert({
    user_id: u.user.id,
    entity_type: item.entityType,
    entity_slug: item.entitySlug,
    entity_title: item.entityTitle,
  });
  if (error) throw error;
  return true;
}

// Consecutive-day streak ending today/yesterday (a day still counts while
// today is unrecorded — the streak isn't broken until tomorrow).
export async function getSadhanaStreak(): Promise<{ streak: number; todayDone: boolean }> {
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const { data, error } = await supabase
    .from('sadhana_checkins')
    .select('for_date')
    .eq('practice', 'mantra')
    .gte('for_date', since.toISOString().slice(0, 10))
    .order('for_date', { ascending: false });
  if (error) throw error;
  const days = new Set((data ?? []).map((r: any) => r.for_date as string));
  const today = new Date().toISOString().slice(0, 10);
  const todayDone = days.has(today);
  let streak = 0;
  const cursor = new Date();
  if (!todayDone) cursor.setDate(cursor.getDate() - 1); // grace for today
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { streak, todayDone };
}

export async function checkinSadhana(): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('not_authenticated');
  const { error } = await supabase.from('sadhana_checkins').upsert({
    user_id: u.user.id,
    for_date: new Date().toISOString().slice(0, 10),
    practice: 'mantra',
  });
  if (error) throw error;
}
