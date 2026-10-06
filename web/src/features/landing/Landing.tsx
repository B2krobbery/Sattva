import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarDays,
  Flame,
  HeartHandshake,
  MapPin,
  Sparkles,
  Sun,
  ChevronDown,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '@/features/auth/AuthContext';
import { getFestivals, getEvents, getLiveStreams } from '@/lib/api/discover';
import { getPujas } from '@/lib/api/puja';
import { getWelfareStats, getAnimals } from '@/lib/api/gaushala';
import { IMAGES, getSafeImageUrl } from '@/lib/images';
import { LandingFloaters } from './LandingFloaters';
import { AmbienceInvitation } from './AmbienceInvitation';
import './Landing.css';

const fmtDate = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    day: d.getDate().toString(),
    mon: d.toLocaleString('en-IN', { month: 'short' }).toUpperCase(),
    full: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
  };
};

const DISCOVERY_TILES = [
  { to: '/discover', label: 'Temples', caption: 'Sacred shrines across Bharat', img: IMAGES.pujas.templeHero },
  { to: '/pujas', label: 'Pujas', caption: 'Sankalpas performed in your name', img: IMAGES.rituals.kashiVishwanathAarti },
  { to: '/darshan', label: 'Live Darshan', caption: 'The divine, streaming home', img: IMAGES.pujas.rudraAbhishekam },
  { to: '/gaushala', label: 'Gaushala', caption: 'Meet the sacred herd', img: IMAGES.seva.fodderMonsoon },
  { to: '/seva', label: 'Seva', caption: 'Fodder, medicine & care', img: IMAGES.seva.healing },
  { to: '/discover', label: 'Festivals', caption: 'The living calendar of devotion', img: IMAGES.pujas.mahaSudarshana },
];

// Scroll-reveal via CSS scroll-driven animations (see Landing.css): content is
// visible by default and animates on entry only where animation-timeline:view()
// is supported — so a failed IntersectionObserver can never hide real content.
function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`landing-reveal ${className}`}>{children}</div>;
}

export function Landing() {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const { data: festivals } = useQuery({ queryKey: ['landing-festivals'], queryFn: getFestivals });
  const { data: events } = useQuery({ queryKey: ['landing-events'], queryFn: getEvents });
  const { data: pujaData } = useQuery({ queryKey: ['landing-pujas'], queryFn: () => getPujas() });
  const { data: streams } = useQuery({ queryKey: ['landing-streams'], queryFn: getLiveStreams });
  const { data: welfare } = useQuery({ queryKey: ['welfareStats'], queryFn: getWelfareStats });
  const { data: animalData } = useQuery({ queryKey: ['landing-animals'], queryFn: () => getAnimals() });

  const pujas = pujaData?.pujas ?? [];
  const upcomingEvents = (events ?? [])
    .filter((e) => !e.startsAt || new Date(e.startsAt).getTime() >= Date.now() - 86400000)
    .slice(0, 6);
  const festivalList = (festivals ?? []).slice(0, 6);
  const featuredStreams = (streams ?? []).slice(0, 3);

  return (
    <div className="landing">
      {/* ══ HERO ══ */}
      <section className="landing-hero">
        <div className="landing-hero-media" aria-hidden>
          <img
            src={IMAGES.rituals.kashiVishwanathAarti}
            alt=""
            fetchPriority="high"
          />
          <div className="landing-hero-veil" />
        </div>
        <div className="landing-hero-inner">
          <motion.p
            className="landing-hero-mantra"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            ॥ धर्मो रक्षति रक्षितः ॥
          </motion.p>
          <motion.h1
            className="landing-hero-title"
            initial={reduce ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            A living doorway into India's <em>sacred traditions.</em>
          </motion.h1>
          <motion.p
            className="landing-hero-sub"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
          >
            Temples, pujas, festivals, live darshan, seva and gaushalas —
            one quiet home for your spiritual life.
          </motion.p>
          <motion.div
            className="landing-hero-ctas"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <Link to="/discover" className="landing-cta-primary">
              <span>Explore Pratha</span>
              <ArrowRight size={17} />
            </Link>
            <Link to="/pujas" className="landing-cta-ghost">
              <Flame size={17} />
              <span>Explore Pujas</span>
            </Link>
          </motion.div>
          <AmbienceInvitation />
          <motion.nav
            className="landing-intents"
            aria-label="What brings you here today"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.75 }}
          >
            <span className="landing-intents-label">What brings you here?</span>
            <div className="landing-intents-row">
              <Link to="/pujas">Pooja</Link>
              <Link to="/darshan">Darshan</Link>
              <Link to="/seva">Seva</Link>
              <Link to="/gaushala">Gaushala</Link>
              <Link to="/discover">Festivals</Link>
              <Link to="/mantras">Mantras</Link>
              <Link to="/learn">Learn</Link>
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('pratha-open-rishi'))}>
                Ask Rishi
              </button>
            </div>
          </motion.nav>
        </div>
        <motion.div
          className="landing-scroll-cue"
          animate={reduce ? {} : { y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          aria-hidden
        >
          <ChevronDown size={22} />
        </motion.div>
      </section>

      {/* ══ DISCOVERY ══ */}
      <section className="landing-section">
        <Reveal>
          <div className="landing-section-head">
            <p className="landing-eyebrow">Begin Exploring</p>
            <h2 className="landing-h2">Every tradition, within reach.</h2>
          </div>
        </Reveal>
        <div className="landing-tiles hide-scrollbar">
          {DISCOVERY_TILES.map((t, i) => (
            <Reveal key={t.label} className="landing-tile-wrap">
              <Link to={t.to} className="landing-tile">
                <img src={t.img} alt="" loading={i > 2 ? 'lazy' : 'eager'} />
                <div className="landing-tile-veil" />
                <div className="landing-tile-text">
                  <span className="landing-tile-label">{t.label}</span>
                  <span className="landing-tile-cap">{t.caption}</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ FESTIVALS & EVENTS ══ */}
      <section className="landing-section">
        <Reveal>
          <div className="landing-section-head landing-section-head--row">
            <div>
              <p className="landing-eyebrow">The Living Calendar</p>
              <h2 className="landing-h2">Festivals &amp; gatherings.</h2>
            </div>
            <Link to="/discover" className="landing-link-arrow">
              View all <ArrowRight size={15} />
            </Link>
          </div>
        </Reveal>

        {(festivalList.length > 0 || upcomingEvents.length > 0) ? (
          <div className="landing-rail hide-scrollbar">
            {festivalList.map((f) => (
              <Link key={f.id} to={`/festivals/${f.slug}`} className="landing-fest-card">
                {f.imageUrl && <img src={f.imageUrl} alt="" loading="lazy" />}
                <div className="landing-fest-veil" />
                <div className="landing-fest-text">
                  {f.monthHint && <span className="landing-fest-month">{f.monthHint}</span>}
                  <span className="landing-fest-name">{f.name}</span>
                  {f.summary && <span className="landing-fest-sum">{f.summary}</span>}
                </div>
              </Link>
            ))}
            {upcomingEvents.map((e) => {
              const d = fmtDate(e.startsAt);
              return (
                <Link key={e.id} to={`/events/${e.slug}`} className="landing-event-card">
                  <div className="landing-event-img">
                    <img src={getSafeImageUrl(e.imageUrl, IMAGES.pujas.templeHero)} alt="" loading="lazy" />
                    {d && (
                      <div className="landing-event-date">
                        <span className="landing-event-day">{d.day}</span>
                        <span className="landing-event-mon">{d.mon}</span>
                      </div>
                    )}
                  </div>
                  <div className="landing-event-body">
                    <span className="landing-event-title">{e.title}</span>
                    <span className="landing-event-meta">
                      {e.templeName || e.venueName || e.districtName || ''}
                      {e.festivalName ? ` · ${e.festivalName}` : ''}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="landing-empty">New festivals and gatherings are being announced soon.</p>
        )}
      </section>

      {/* ══ SANKALPA / PUJA CONVERSION ══ */}
      <section className="landing-sankalpa">
        <div className="landing-sankalpa-inner">
          <Reveal>
            <p className="landing-eyebrow landing-eyebrow--gold">Sankalpa</p>
            <h2 className="landing-h2 landing-h2--light">A vow made in faith,<br />performed in your name.</h2>
            <p className="landing-lede landing-lede--light">
              Choose a sacred rite, offer your sankalpa, and let it be performed at the temple —
              with your name, gotra and intent carried into every mantra.
            </p>
          </Reveal>

          <div className="landing-puja-grid">
            {pujas.slice(0, 3).map((p) => (
              <Reveal key={p.id}>
                <Link to="/pujas" className="landing-puja-card">
                  <div className="landing-puja-head">
                    <Flame size={16} className="landing-puja-flame" />
                    <span className="landing-puja-temple">{p.templeName}</span>
                  </div>
                  <h3 className="landing-puja-name">{p.title}</h3>
                  <p className="landing-puja-desc">{p.description}</p>
                  <div className="landing-puja-foot">
                    <div className="landing-puja-price">
                      <span className="landing-puja-price-label">Sankalpa Dakshina</span>
                      <span className="landing-puja-price-val">₹{p.priceRupees.toLocaleString('en-IN')}</span>
                    </div>
                    <span className="landing-puja-cta">
                      Make Sankalpa <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
            {pujas.length === 0 && (
              <p className="landing-empty landing-empty--light">Pujas are being prepared.</p>
            )}
          </div>
        </div>
      </section>

      {/* ══ PERSONALIZATION ══ */}
      <section className="landing-section landing-split">
        <Reveal className="landing-split-text">
          <p className="landing-eyebrow">Guided by your Janma</p>
          <h2 className="landing-h2">Your spiritual journey,<br />personalised.</h2>
          <p className="landing-lede">
            Share your birth details once, and Pratha understands your nakshatra,
            your tithi and the rites that align with your chart — then surfaces the
            pujas, festivals and darshan that matter to you.
          </p>
          <div className="landing-split-feats">
            <div className="landing-feat"><Sun size={16} /><span>Janma-based puja recommendations</span></div>
            <div className="landing-feat"><CalendarDays size={16} /><span>Festivals that match your tithi</span></div>
            <div className="landing-feat"><Sparkles size={16} /><span>A daily reading of your stars</span></div>
          </div>
          <Link to={user ? '/profile' : '/login'} className="landing-cta-primary landing-cta--maroon">
            <span>{user ? 'Complete your Janma details' : 'Begin with your birth stars'}</span>
            <ArrowRight size={16} />
          </Link>
        </Reveal>
        <Reveal className="landing-split-art">
          <div className="landing-janma-card">
            <div className="landing-janma-om">ॐ</div>
            <div className="landing-janma-rows">
              <div className="landing-janma-row"><span>Nakshatra</span><b>Mrigashirsha</b></div>
              <div className="landing-janma-row"><span>Tithi</span><b>Shukla Ekadashi</b></div>
              <div className="landing-janma-row"><span>Rashi</span><b>Mithuna</b></div>
              <div className="landing-janma-row"><span>Auspicious</span><b>Abhijit Muhurat</b></div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══ LIVE DARSHAN ══ */}
      <section className="landing-darshan">
        <div className="landing-darshan-inner">
          <Reveal>
            <div className="landing-section-head landing-section-head--row">
              <div>
                <p className="landing-eyebrow landing-eyebrow--gold">Live Darshan</p>
                <h2 className="landing-h2 landing-h2--light">Be present, from afar.</h2>
              </div>
              <Link to="/darshan" className="landing-link-arrow landing-link-arrow--gold">
                Watch all <ArrowRight size={15} />
              </Link>
            </div>
          </Reveal>
          <div className="landing-darshan-grid">
            {featuredStreams.map((s) => (
              <Reveal key={s.id}>
                <Link to={`/darshan/${s.id}`} className="landing-stream-card">
                  <div className="landing-stream-img">
                    <img src={getSafeImageUrl(s.templeImage, IMAGES.pujas.templeHero)} alt="" loading="lazy" />
                    <span className="landing-live-badge">{s.provider === 'youtube' ? 'Live stream' : 'Official portal'}</span>
                  </div>
                  <div className="landing-stream-body">
                    <span className="landing-stream-title">{s.title}</span>
                    <span className="landing-stream-meta"><MapPin size={12} />{s.templeName}</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
          {featuredStreams.length === 0 && (
            <p className="landing-empty landing-empty--light">Darshan streams resume at the next aarti.</p>
          )}
        </div>
      </section>

      {/* ══ GAUSHALA ══ */}
      <section className="landing-section landing-split landing-split--rev">
        <Reveal className="landing-split-art landing-split-art--photo">
          <img src={IMAGES.backgrounds.authBg} alt="A caretaker offering fresh fodder to a garlanded cow in the gaushala courtyard" loading="lazy" />
        </Reveal>
        <Reveal className="landing-split-text">
          <p className="landing-eyebrow">Gaushala</p>
          <h2 className="landing-h2">Meet the sacred herd.</h2>
          <p className="landing-lede">
            Many arrived abandoned on hard roads or old and unwanted — गावो विश्वस्य मातरः,
            the cow is the mother of the world. Here she is fed, sheltered and healed,
            each with a name, a story, and a passport of care.
          </p>
          {!!(welfare?.totalRescued ?? animalData?.count) && (
            <div className="landing-gaushala-stat">
              <span className="landing-gaushala-num">{(welfare?.totalRescued || animalData?.count)?.toLocaleString('en-IN')}</span>
              <span className="landing-gaushala-cap">souls in sanctuary</span>
            </div>
          )}
          <div className="landing-split-actions">
            <Link to="/gaushala" className="landing-cta-primary landing-cta--maroon">
              <span>Meet the herd</span>
              <ArrowRight size={16} />
            </Link>
            <Link to="/seva" className="landing-link-arrow">
              Support Gau Seva <ArrowRight size={15} />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ══ SEVA / PARTICIPATE ══ */}
      <section className="landing-section">
        <Reveal>
          <div className="landing-section-head landing-section-head--center">
            <p className="landing-eyebrow">Participate</p>
            <h2 className="landing-h2">Devotion is a verb.</h2>
            <p className="landing-lede landing-lede--center">
              Pratha isn't a brochure — it's a place to act. Offer a sankalpa,
              sponsor a meal, keep a bell ringing.
            </p>
          </div>
        </Reveal>
        <div className="landing-seva-grid">
          <Reveal>
            <Link to="/pujas" className="landing-seva-card">
              <div className="landing-seva-icon"><Flame size={20} /></div>
              <h3>Offer a Sankalpa</h3>
              <p>Have a sacred rite performed at a temple, in your name and gotra.</p>
              <span className="landing-seva-cta">Book a Puja <ArrowRight size={14} /></span>
            </Link>
          </Reveal>
          <Reveal>
            <Link to="/seva" className="landing-seva-card">
              <div className="landing-seva-icon landing-seva-icon--tulsi"><HeartHandshake size={20} /></div>
              <h3>Give through Seva</h3>
              <p>Fodder, medicine and shelter — direct care for the rescued herd.</p>
              <span className="landing-seva-cta">Support Seva <ArrowRight size={14} /></span>
            </Link>
          </Reveal>
          <Reveal>
            <Link to="/discover" className="landing-seva-card">
              <div className="landing-seva-icon landing-seva-icon--gold"><Sun size={20} /></div>
              <h3>Visit &amp; Attend</h3>
              <p>Festivals, satsangs and aartis — find where devotion gathers near you.</p>
              <span className="landing-seva-cta">Discover events <ArrowRight size={14} /></span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ══ TRUST STRIP ══ */}
      {(welfare || pujaData || streams) && (
        <section className="landing-trust">
          <div className="landing-trust-grid">
            <div className="landing-trust-item">
              <span className="landing-trust-num">{(welfare?.publishedTemples ?? 0).toLocaleString('en-IN')}</span>
              <span className="landing-trust-label">Temples</span>
            </div>
            <div className="landing-trust-item">
              <span className="landing-trust-num">{(pujaData?.count ?? pujas.length).toLocaleString('en-IN')}</span>
              <span className="landing-trust-label">Sacred Pujas</span>
            </div>
            <div className="landing-trust-item">
              <span className="landing-trust-num">{(welfare?.totalRescued || animalData?.count || 0).toLocaleString('en-IN')}</span>
              <span className="landing-trust-label">Animals Sheltered</span>
            </div>
            <div className="landing-trust-item">
              <span className="landing-trust-num">{(streams?.length ?? 0).toLocaleString('en-IN')}</span>
              <span className="landing-trust-label">Darshan Streams</span>
            </div>
          </div>
        </section>
      )}

      {/* ══ FINAL CTA ══ */}
      <section className="landing-final">
        <div className="landing-final-media" aria-hidden>
          <img src={IMAGES.backgrounds.impactBg} alt="" loading="lazy" />
          <div className="landing-final-veil" />
        </div>
        <Reveal className="landing-final-inner">
          <p className="landing-hero-mantra">॥ यत्र नार्यस्तु पूज्यन्ते ॥</p>
          <h2 className="landing-final-title">Begin your journey.</h2>
          <div className="landing-final-links">
            <Link to="/discover" className="landing-final-link">Explore Temples</Link>
            <span className="landing-final-dot">·</span>
            <Link to="/pujas" className="landing-final-link">Discover Pujas</Link>
            <span className="landing-final-dot">·</span>
            <Link to="/darshan" className="landing-final-link">Experience Darshan</Link>
            <span className="landing-final-dot">·</span>
            <Link to="/seva" className="landing-final-link">Join Seva</Link>
          </div>
          {!user && (
            <Link to="/login" className="landing-cta-primary landing-cta--gold">
              <span>Join Pratha</span>
              <ArrowRight size={17} />
            </Link>
          )}
        </Reveal>
      </section>

      <LandingFloaters />
    </div>
  );
}
