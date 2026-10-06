import { supabase, localized } from '@/lib/supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function bySlugOrId(table: string, slugOrId: string, select: string) {
  const q = supabase.from(table).select(select).eq('status', 'published');
  return UUID_RE.test(slugOrId) ? q.or(`slug.eq.${slugOrId},id.eq.${slugOrId}`) : q.eq('slug', slugOrId);
}

export interface Temple {
  id: string;
  slug: string;
  name: string;
  deity?: string;
  description?: string;
  address?: string;
  districtName?: string;
  imageUrl?: string;
  website?: string;
  liveStreamUrl?: string;
  liveStreamProvider?: string;
  timings: unknown[];
  hasGaushala: boolean;
}

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  description?: string;
  activities: string[];
  categoryName?: string;
  templeName?: string;
  templeSlug?: string;
  festivalName?: string;
  festivalSlug?: string;
  venueName?: string;
  venueAddress?: string;
  districtName?: string;
  startsAt?: string;
  endsAt?: string;
  dailyStartTime?: string;
  dailyEndTime?: string;
  isFree: boolean;
  ticketInfo?: string;
  howToReach?: string;
  liveStreamUrl?: string;
  imageUrl?: string;
}

export interface Festival {
  id: string;
  slug: string;
  name: string;
  summary?: string;
  body?: string;
  monthHint?: string;
  imageUrl?: string;
}

export interface LiveStream {
  id: string;
  templeId?: string;
  templeName?: string;
  templeSlug?: string;
  templeImage?: string;
  title: string;
  url: string;
  provider: 'youtube' | 'website' | 'other';
  scheduleNote?: string;
  featured: boolean;
}

function mapTemple(row: any): Temple {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name || localized(row.name_i18n),
    deity: localized(row.deity_i18n) || undefined,
    description: localized(row.description_i18n) || undefined,
    address: row.address || undefined,
    districtName: row.districts?.name || undefined,
    imageUrl: row.cover_image_url || undefined,
    website: row.website || undefined,
    liveStreamUrl: row.live_stream_url || undefined,
    liveStreamProvider: row.live_stream_provider || undefined,
    timings: Array.isArray(row.timings) ? row.timings : [],
    hasGaushala: Boolean(row.has_gaushala),
  };
}

function mapEvent(row: any): EventItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title || localized(row.title_i18n),
    description: localized(row.description_i18n) || undefined,
    activities: (row.activities_i18n ?? []).map((a: any) => localized(a)).filter(Boolean),
    categoryName: row.categories?.name || undefined,
    templeName: row.temples?.name || undefined,
    templeSlug: row.temples?.slug || undefined,
    festivalName: row.festivals?.name || undefined,
    festivalSlug: row.festivals?.slug || undefined,
    venueName: row.venue_name || undefined,
    venueAddress: row.venue_address || undefined,
    districtName: row.districts?.name || undefined,
    startsAt: row.starts_at || undefined,
    endsAt: row.ends_at || undefined,
    dailyStartTime: row.daily_start_time || undefined,
    dailyEndTime: row.daily_end_time || undefined,
    isFree: row.is_free ?? true,
    ticketInfo: localized(row.ticket_info_i18n) || undefined,
    howToReach: localized(row.how_to_reach_i18n) || undefined,
    liveStreamUrl: row.live_stream_url || undefined,
    imageUrl: row.cover_image_url || undefined,
  };
}

function mapStream(row: any): LiveStream {
  const schedule = Array.isArray(row.schedule) ? row.schedule : [];
  const note = schedule.map((s: any) => s?.note_en || s?.note).filter(Boolean).join(' ');
  return {
    id: row.id,
    templeId: row.temple_id || undefined,
    templeName: row.temples?.name || undefined,
    templeSlug: row.temples?.slug || undefined,
    templeImage: row.temples?.cover_image_url || undefined,
    title: row.title || localized(row.title_i18n),
    url: row.url,
    provider: row.provider || 'website',
    scheduleNote: note || undefined,
    featured: Boolean(row.featured),
  };
}

const TEMPLE_SELECT = 'id,slug,name,name_i18n,deity_i18n,description_i18n,address,district_id,districts(name),cover_image_url,website,live_stream_url,live_stream_provider,timings,has_gaushala';
const EVENT_SELECT = 'id,slug,title,title_i18n,description_i18n,activities_i18n,venue_name,venue_address,starts_at,ends_at,daily_start_time,daily_end_time,is_free,ticket_info_i18n,how_to_reach_i18n,live_stream_url,cover_image_url,categories!events_category_id_fkey(name),temples(name,slug),festivals(name,slug),districts(name)';

export async function getTemples(): Promise<Temple[]> {
  const { data, error } = await supabase
    .from('temples')
    .select(TEMPLE_SELECT)
    .eq('status', 'published')
    .order('featured', { ascending: false })
    .order('name');
  if (error) throw error;
  return (data ?? []).map(mapTemple);
}

export async function getTemple(slugOrId: string): Promise<Temple | null> {
  const { data, error } = await bySlugOrId('temples', slugOrId, TEMPLE_SELECT).maybeSingle();
  if (error) throw error;
  return data ? mapTemple(data) : null;
}

export async function getTempleEvents(templeId: string): Promise<EventItem[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('status', 'published')
    .eq('temple_id', templeId)
    .order('starts_at');
  if (error) throw error;
  return (data ?? []).map(mapEvent);
}

export async function getEvent(slugOrId: string): Promise<EventItem | null> {
  const { data, error } = await bySlugOrId('events', slugOrId, EVENT_SELECT).maybeSingle();
  if (error) throw error;
  return data ? mapEvent(data) : null;
}

export async function getFestivals(): Promise<Festival[]> {
  const { data, error } = await supabase
    .from('festivals')
    .select('id,slug,name,name_i18n,summary_i18n,month_hint,cover_image_url')
    .eq('status', 'published')
    .order('featured', { ascending: false })
    .order('name');
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    slug: row.slug,
    name: row.name || localized(row.name_i18n),
    summary: localized(row.summary_i18n) || undefined,
    monthHint: row.month_hint || undefined,
    imageUrl: row.cover_image_url || undefined,
  }));
}

export async function getEvents(): Promise<EventItem[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('status', 'published')
    .order('starts_at');
  if (error) throw error;
  return (data ?? []).map(mapEvent);
}

export async function getFestival(slugOrId: string): Promise<Festival | null> {
  const { data, error } = await bySlugOrId('festivals', slugOrId, 'id,slug,name,name_i18n,summary_i18n,body_i18n,month_hint,cover_image_url').maybeSingle();
  if (error) throw error;
  const row = data as any;
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name || localized(row.name_i18n),
    summary: localized(row.summary_i18n) || undefined,
    body: localized(row.body_i18n) || undefined,
    monthHint: row.month_hint || undefined,
    imageUrl: row.cover_image_url || undefined,
  };
}

export async function getFestivalEvents(festivalId: string): Promise<EventItem[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('status', 'published')
    .eq('festival_id', festivalId)
    .order('starts_at');
  if (error) throw error;
  return (data ?? []).map(mapEvent);
}

export async function getLiveStreams(): Promise<LiveStream[]> {
  const { data, error } = await supabase
    .from('live_streams')
    .select('id,temple_id,title,title_i18n,url,provider,schedule,featured,temples(name,slug,cover_image_url)')
    .eq('status', 'published')
    .order('featured', { ascending: false })
    .order('title');
  if (error) throw error;
  return (data ?? []).map(mapStream);
}

export async function getLiveStream(id: string): Promise<LiveStream | null> {
  const { data, error } = await supabase
    .from('live_streams')
    .select('id,temple_id,title,title_i18n,url,provider,schedule,featured,temples(name,slug,cover_image_url,address)')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  return data ? mapStream(data) : null;
}

// Converts a YouTube watch/share/live URL into an embeddable URL; returns
// null for non-YouTube input so callers can fall back to an external link.
export function toEmbedUrl(url: string, provider: string): string | null {
  if (provider !== 'youtube') return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      const live = u.pathname.match(/\/(live|embed)\/([\w-]+)/);
      if (live?.[2]) return `https://www.youtube.com/embed/${live[2]}`;
    }
  } catch {
    return null;
  }
  return null;
}

export interface SearchResult {
  entityType: 'temple' | 'event' | 'gaushala' | 'puja' | string;
  id: string;
  slug?: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
}

export function searchResultUrl(r: SearchResult): string {
  switch (r.entityType) {
    case 'temple': return `/temples/${r.slug}`;
    case 'event': return `/events/${r.slug}`;
    case 'puja': return `/pujas?book=${r.id}`;
    case 'gaushala': return '/gaushala';
    default: return '/discover';
  }
}

export async function searchAll(q: string): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc('search_all', { q, lim: 24 });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    entityType: r.entity_type,
    id: r.id,
    slug: r.slug || undefined,
    title: r.title,
    subtitle: r.subtitle || undefined,
    imageUrl: r.image_url || undefined,
  }));
}
