import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapPin, CalendarDays, Landmark, Radio, Search, X } from 'lucide-react';
import { supabase, localized } from '@/lib/supabase';
import { searchAll, searchResultUrl } from '@/lib/api/discover';
import { getSafeImageUrl, IMAGES } from '@/lib/images';
import './Discover.css';

type DiscoverItem = {
  id: string;
  title: string;
  summary: string;
  meta: string;
  to: string;
  image?: string;
};

// Order festivals by next occurrence — extract the first English month name
// from month_hint (e.g. "April–May (Medam)") and sort by distance from today.
const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
function nextMonthDistance(hint?: string): number {
  if (!hint) return 12;
  const m = MONTHS.findIndex((mo) => hint.toLowerCase().includes(mo));
  if (m < 0) return 12;
  const now = new Date().getMonth();
  return (m - now + 12) % 12;
}

async function loadDiscovery(): Promise<{ temples: DiscoverItem[]; events: DiscoverItem[]; festivals: DiscoverItem[]; darshan: DiscoverItem[] }> {
  const [temples, events, festivals, streams] = await Promise.all([
    supabase.from('temples').select('id,slug,name,name_i18n,description_i18n,address,cover_image_url,live_stream_url').eq('status', 'published').order('featured', { ascending: false }),
    supabase.from('events').select('id,slug,title,title_i18n,description_i18n,venue_name,starts_at,cover_image_url').eq('status', 'published').order('starts_at').limit(8),
    supabase.from('festivals').select('id,slug,name,name_i18n,summary_i18n,month_hint,cover_image_url').eq('status', 'published').order('featured', { ascending: false }),
    supabase.from('live_streams').select('id,title,title_i18n,provider,temples(name)').eq('status', 'published').order('featured', { ascending: false }),
  ]);
  if (temples.error) throw temples.error;
  if (events.error) throw events.error;
  if (festivals.error) throw festivals.error;
  if (streams.error) throw streams.error;
  return {
    temples: (temples.data ?? []).map((item) => ({
      id: item.id,
      title: item.name || localized(item.name_i18n),
      summary: localized(item.description_i18n) || 'A living place of worship and cultural heritage.',
      meta: item.address || 'Kerala',
      to: `/temples/${item.slug}`,
      image: item.cover_image_url || undefined,
    })),
    events: (events.data ?? []).map((item) => ({
      id: item.id,
      title: item.title || localized(item.title_i18n),
      summary: localized(item.description_i18n) || 'Discover a cultural experience in the Pratha calendar.',
      meta: [item.venue_name, item.starts_at ? new Date(item.starts_at).toLocaleDateString() : 'Date to be announced'].filter(Boolean).join(' · '),
      to: `/events/${item.slug}`,
      image: item.cover_image_url || undefined,
    })),
    festivals: (festivals.data ?? [])
      .sort((a, b) => nextMonthDistance(a.month_hint) - nextMonthDistance(b.month_hint))
      .map((item) => ({
      id: item.id,
      title: item.name || localized(item.name_i18n),
      summary: localized(item.summary_i18n) || 'Explore the stories, rituals, and traditions behind this festival.',
      meta: item.month_hint || 'Annual celebration',
      to: `/festivals/${item.slug}`,
      image: item.cover_image_url || undefined,
    })),
    darshan: (streams.data ?? []).map((item: any) => ({
      id: item.id,
      title: item.title || localized(item.title_i18n),
      summary: item.provider === 'youtube' ? 'Watch the live broadcast.' : 'Official portal for darshan and schedules.',
      meta: item.temples?.name || 'Temple',
      to: `/darshan/${item.id}`,
    })),
  };
}

const ENTITY_LABEL: Record<string, string> = {
  temple: 'Temple', event: 'Event', gaushala: 'Gaushala', puja: 'Puja',
};

export function Discover() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['discovery'], queryFn: loadDiscovery });
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => searchAll(debounced),
    enabled: debounced.length >= 2,
  });
  const searching = debounced.length >= 2;
  const groups = [
    { title: 'Temples', icon: Landmark, items: data?.temples ?? [], action: 'Open temple' },
    { title: 'Live Darshan', icon: Radio, items: data?.darshan ?? [], action: 'Open darshan' },
    { title: 'Upcoming cultural events', icon: CalendarDays, items: data?.events ?? [], action: 'Explore event' },
    { title: 'Festival calendar', icon: CalendarDays, items: data?.festivals ?? [], action: 'Read story' },
  ];

  return (
    <div className="discover-page">
      <section className="discover-hero">
        <span className="badge-gold">Utsav-inspired discovery</span>
        <h1 className="typography-headline-lg">Find what is sacred, local, and alive.</h1>
        <p>Explore temples, festivals, and cultural moments across Kerala through one calm, editorial calendar.</p>
        <div className="discover-search">
          <Search size={17} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search temples, pujas, events…"
            aria-label="Search temples, pujas and events"
          />
          {query && (
            <button className="discover-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
      </section>

      {searching && (
        <section className="discover-group">
          <div className="discover-group-heading">
            <div><Search size={18} /><h2>Results for “{debounced}”</h2></div>
            <span>{results?.length ?? 0} found</span>
          </div>
          <div className="discover-grid">
            {(results ?? []).map((r) => (
              <Link to={searchResultUrl(r)} className="discover-card block hover:border-gold transition-colors" key={`${r.entityType}-${r.id}`}>
                {r.imageUrl
                  ? <img src={getSafeImageUrl(r.imageUrl, IMAGES.pujas.templeHero)} alt="" />
                  : <div className="discover-card-placeholder"><Landmark size={26} /></div>}
                <div className="discover-card-body">
                  <span className="discover-meta">{ENTITY_LABEL[r.entityType] ?? r.entityType}{r.subtitle ? ` · ${r.subtitle}` : ''}</span>
                  <h3>{r.title}</h3>
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-terracotta">Open →</span>
                </div>
              </Link>
            ))}
            {results && results.length === 0 && (
              <div className="discover-empty">Nothing found for “{debounced}” — try a temple, deity, or ritual name.</div>
            )}
          </div>
        </section>
      )}

      {!searching && isLoading && <div className="discover-state">Loading the cultural calendar…</div>}
      {isError && <div className="discover-state discover-error">We could not load the calendar. Please try again.</div>}
      {!searching && !isLoading && !isError && groups.map((group) => (
        <section className="discover-group" key={group.title}>
          <div className="discover-group-heading">
            <div><group.icon size={18} /><h2>{group.title}</h2></div>
            <span>{group.items.length} listings</span>
          </div>
          <div className="discover-grid">
            {group.items.map((item) => (
              <Link to={item.to} className="discover-card block hover:border-gold transition-colors" key={item.id}>
                {item.image ? <img src={item.image} alt="" /> : <div className="discover-card-placeholder"><group.icon size={26} /></div>}
                <div className="discover-card-body">
                  <span className="discover-meta"><MapPin size={13} />{item.meta}</span>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-terracotta">{group.action} →</span>
                </div>
              </Link>
            ))}
            {!group.items.length && <div className="discover-empty">More listings are being curated.</div>}
          </div>
        </section>
      ))}
    </div>
  );
}
