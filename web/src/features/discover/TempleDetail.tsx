import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Landmark, ExternalLink, Radio, CalendarDays, Flame, Clock, Globe, Bookmark } from 'lucide-react';
import { motion } from 'motion/react';
import { getTemple, getTempleEvents, getLiveStreams, type Temple } from '@/lib/api/discover';
import { getSavedItems, toggleSavedItem } from '@/lib/api/profile';
import { redirectToLogin } from '@/lib/auth/redirect';
import { useAuth } from '@/features/auth/AuthContext';
import { supabase, localized } from '@/lib/supabase';

interface TempleOffering {
  id: string;
  slug?: string;
  title: string;
  priceRupees: number;
  imageUrl?: string;
  leadTimeDays: number;
}

async function getTempleOfferings(templeId: string): Promise<TempleOffering[]> {
  const { data, error } = await supabase
    .from('puja_offerings')
    .select('id,slug,name,name_i18n,price,image_url,lead_time_days')
    .eq('status', 'published')
    .eq('temple_id', templeId)
    .order('popular', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    slug: row.slug,
    title: row.name || localized(row.name_i18n),
    priceRupees: Number(row.price) / 100,
    imageUrl: row.image_url || undefined,
    leadTimeDays: row.lead_time_days ?? 0,
  }));
}

function formatDateRange(startsAt?: string, endsAt?: string): string {
  if (!startsAt) return 'Dates to be announced';
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;
  const sameDay = end && start.toDateString() === end.toDateString();
  const dateFmt = { day: 'numeric', month: 'short', year: 'numeric' } as const;
  const timeFmt = { hour: 'numeric', minute: '2-digit' } as const;
  if (sameDay) {
    return `${start.toLocaleDateString('en-IN', dateFmt)} · ${start.toLocaleTimeString('en-IN', timeFmt)} – ${end!.toLocaleTimeString('en-IN', timeFmt)}`;
  }
  return end
    ? `${start.toLocaleDateString('en-IN', dateFmt)} – ${end.toLocaleDateString('en-IN', dateFmt)}`
    : start.toLocaleDateString('en-IN', dateFmt);
}

export function TempleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: temple, isLoading, isError } = useQuery({
    queryKey: ['temple', slug],
    queryFn: () => getTemple(slug!),
    enabled: !!slug,
  });
  const { data: savedItems } = useQuery({
    queryKey: ['saved-items'],
    queryFn: getSavedItems,
    enabled: !!user,
  });
  const isSaved = !!savedItems?.some((s) => s.entityType === 'temple' && s.entitySlug === slug);
  const toggleSave = async () => {
    if (!user) { redirectToLogin(); return; }
    if (!slug || !temple) return;
    await toggleSavedItem({ entityType: 'temple', entitySlug: slug, entityTitle: temple.name }, isSaved);
    queryClient.invalidateQueries({ queryKey: ['saved-items'] });
  };
  const { data: offerings } = useQuery({
    queryKey: ['temple-offerings', temple?.id],
    queryFn: () => getTempleOfferings(temple!.id),
    enabled: !!temple?.id,
  });
  const { data: events } = useQuery({
    queryKey: ['temple-events', temple?.id],
    queryFn: () => getTempleEvents(temple!.id),
    enabled: !!temple?.id,
  });
  const { data: streams } = useQuery({
    queryKey: ['temple-streams'],
    queryFn: () => getLiveStreams(),
  });

  if (isLoading) {
    return <div className="discover-state">Opening the temple pages…</div>;
  }
  if (isError || !temple) {
    return (
      <div className="discover-state discover-error">
        <p>We could not find this temple.</p>
        <Link to="/discover" className="btn-secondary mt-3 inline-flex">Back to Discover</Link>
      </div>
    );
  }

  const templeStreams = (streams ?? []).filter((s) => s.templeId === temple.id);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6 pb-10">
      <Link to="/discover" className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-terracotta transition-colors self-start">
        <ArrowLeft size={16} /> Back to Discover
      </Link>

      <section className="temple-card overflow-hidden">
        {temple.imageUrl ? (
          <div className="relative w-full aspect-[21/9] max-h-80 overflow-hidden bg-surface-subtle">
            <img src={temple.imageUrl} alt={temple.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <button
              onClick={toggleSave}
              aria-label={isSaved ? 'Remove from My Journey' : 'Save to My Journey'}
              title={isSaved ? 'Saved to My Journey' : 'Save to My Journey'}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm border border-white/25 text-white hover:bg-black/60 transition-colors"
            >
              <Bookmark size={17} fill={isSaved ? '#E9C46A' : 'none'} color={isSaved ? '#E9C46A' : 'currentColor'} />
            </button>
            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
              <TempleTitle temple={temple} light />
            </div>
          </div>
        ) : (
          <div className="p-5 md:p-7 bg-gradient-to-br from-[#24150e] to-[#3e2114] text-[#fffaf2]">
            <TempleTitle temple={temple} light />
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
        <div className="flex flex-col gap-6">
          {temple.description && (
            <section className="temple-card p-5 md:p-6">
              <h2 className="font-serif text-xl font-semibold text-text-primary mb-3">About this temple</h2>
              <p className="text-sm md:text-base text-text-secondary leading-relaxed">{temple.description}</p>
            </section>
          )}

          {offerings && offerings.length > 0 && (
            <section className="temple-card p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-semibold text-text-primary flex items-center gap-2">
                  <Flame size={18} className="text-terracotta" /> Vazhipadu offerings
                </h2>
                <Link to="/pujas" className="text-xs font-semibold text-terracotta">All pujas →</Link>
              </div>
              <div className="flex flex-col gap-3">
                {offerings.map((o) => (
                  <Link key={o.id} to="/pujas" className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-gold transition-colors">
                    {o.imageUrl && <img src={o.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-text-primary truncate">{o.title}</p>
                      <p className="text-xs text-text-muted flex items-center gap-1">
                        <Clock size={11} /> Book {o.leadTimeDays > 0 ? `${o.leadTimeDays}+ days ahead` : 'same day'}
                      </p>
                    </div>
                    <span className="font-serif font-bold text-terracotta shrink-0">{o.priceRupees === 0 ? 'Free' : `₹${o.priceRupees}`}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {events && events.length > 0 && (
            <section className="temple-card p-5 md:p-6">
              <h2 className="font-serif text-xl font-semibold text-text-primary flex items-center gap-2 mb-4">
                <CalendarDays size={18} className="text-terracotta" /> Events at this temple
              </h2>
              <div className="flex flex-col gap-3">
                {events.map((e) => (
                  <Link key={e.id} to={`/events/${e.slug}`} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border hover:border-gold transition-colors">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-text-primary truncate">{e.title}</p>
                      <p className="text-xs text-text-muted">{formatDateRange(e.startsAt, e.endsAt)}</p>
                    </div>
                    <ExternalLink size={14} className="text-text-muted shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="temple-card p-5">
            <h3 className="font-serif text-base font-semibold text-text-primary mb-3">Visit</h3>
            <div className="flex flex-col gap-3 text-sm text-text-secondary">
              {temple.address && (
                <p className="flex items-start gap-2"><MapPin size={15} className="text-terracotta mt-0.5 shrink-0" />{temple.address}{temple.districtName ? `, ${temple.districtName}` : ''}</p>
              )}
              {temple.website && (
                <a href={temple.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-terracotta font-semibold">
                  <Globe size={15} /> Official website <ExternalLink size={12} />
                </a>
              )}
              {temple.hasGaushala && (
                <p className="flex items-center gap-2"><Landmark size={15} className="text-tulsi" /> Attached Gaushala</p>
              )}
            </div>
          </section>

          {(templeStreams.length > 0 || temple.liveStreamUrl) && (
            <section className="temple-card p-5">
              <h3 className="font-serif text-base font-semibold text-text-primary flex items-center gap-2 mb-3">
                <Radio size={16} className="text-terracotta" /> Live Darshan
              </h3>
              <div className="flex flex-col gap-2.5">
                {templeStreams.map((s) => (
                  <Link key={s.id} to={`/darshan/${s.id}`} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-tulsi-light text-sm font-semibold text-tulsi hover:opacity-90 transition-opacity">
                    <span className="truncate">{s.title}</span>
                    <ArrowLeft size={14} className="rotate-180 shrink-0" />
                  </Link>
                ))}
                {temple.liveStreamUrl && templeStreams.length === 0 && (
                  <a href={temple.liveStreamUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-terracotta font-semibold text-sm">
                    Open live stream <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </section>
          )}
        </aside>
      </div>
    </motion.div>
  );
}

function TempleTitle({ temple, light }: { temple: Temple; light?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      {temple.deity && (
        <span className={light ? 'badge-gold' : 'badge-gold'} style={light ? { background: 'rgba(251,245,230,0.92)' } : undefined}>
          {temple.deity}
        </span>
      )}
      <h1 className={`font-serif text-2xl md:text-3xl font-semibold ${light ? 'text-white' : 'text-text-primary'}`}>
        {temple.name}
      </h1>
      <p className={`text-sm flex items-center gap-1.5 ${light ? 'text-white/80' : 'text-text-secondary'}`}>
        <MapPin size={14} />
        {[temple.address, temple.districtName].filter(Boolean).join(' · ') || 'Kerala'}
      </p>
    </div>
  );
}
