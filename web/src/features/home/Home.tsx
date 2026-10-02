import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Flame, 
  MapPin, 
  HeartHandshake, 
  Sparkles, 
  ArrowRight, 
  Sun, 
  ShieldCheck, 
  Clock, 
  Activity,
  Gift 
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { getProfile } from '@/lib/api/profile';
import { getPujas } from '@/lib/api/puja';
import { getWelfareStats } from '@/lib/api/gaushala';
import { IMAGES } from '@/lib/images';
import { RishiChatModal } from '@/features/ai/RishiChatModal';
import { ProfileNudge } from '@/components/profile/ProfileNudge';
import './Home.css';

export function Home() {
  const { user } = useAuth();
  const [rishiOpen, setRishiOpen] = useState(false);
  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: !!user,
  });
  const devoteeName = profileData?.profile?.displayName?.split(' ')[0] || user?.user_metadata?.display_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Devotee';

  const { data: pujaData } = useQuery({
    queryKey: ['pujas'],
    queryFn: () => getPujas(),
  });

  const { data: welfareData } = useQuery({
    queryKey: ['welfareStats'],
    queryFn: () => getWelfareStats(),
  });

  const featuredPuja = pujaData?.pujas?.[0] || {
    id: 'ganga_aarti_varanasi',
    title: 'Maha Ganga Aarti & Deep Daan',
    templeName: 'Dashashwamedh Ghat, Varanasi',
    dateTimeStr: 'Daily, 6:45 PM IST',
    durationStr: '1.5 Hours',
    devoteesCount: '45.2k Devotees attending',
    priceRupees: 1101,
    description: 'Experience the divine energy of Varanasi\'s most sacred evening ritual of sacred lamps, Vedic mantras, and holy river aradhana.'
  };

  const totalRescued = welfareData?.totalRescued || 450;
  const publishedTemples = welfareData?.publishedTemples ?? 0;

  return (
    <div className="home-page">
      {/* Editorial Dawn Sanctuary Banner */}
      <section className="home-hero-dawn">
        <div className="hero-tag-row">
          <span className="hero-subhead">सुप्रभातम् • शुभं भवतु</span>
          <span className="badge-gold">
            <ShieldCheck size={13} />
            Vrindavan Sanctuary
          </span>
        </div>

        <h1 className="hero-greeting">
          Good Morning, {devoteeName}.
        </h1>
        <p className="hero-desc">
          Step into today with peace. Connect with timeless rituals, nourish indigenous cattle, and invoke blessings for your family.
        </p>

        <div className="hero-actions">
          <Link to="/seva" className="btn-primary">
            <HeartHandshake size={16} />
            <span>Sponsor Daily Fodder</span>
          </Link>
          <Link to="/pujas" className="btn-secondary">
            <Flame size={16} />
            <span>Explore Pujas</span>
          </Link>
        </div>
      </section>

      <ProfileNudge />

      <Link 
        to="/profile?tab=referral"
        className="glass-card flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-gold/30 bg-surface hover:border-gold/60 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold/15 text-gold flex items-center justify-center shrink-0">
            <Gift size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-primary">Dharma Mitra Referral</span>
              <span className="badge-tulsi text-[10px] py-0 px-1.5">+108 Punya</span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">Invite family &amp; friends to earn sacred Seva merits</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-terracotta shrink-0 group-hover:translate-x-0.5 transition-transform">
          <span>Invite</span>
          <ArrowRight size={14} />
        </div>
      </Link>

      {/* Quick Action Navigation Grid */}
      <section className="quick-action-grid">
        <Link to="/pujas" className="action-tile pujas">
          <div className="action-icon-circle">
            <Flame size={20} />
          </div>
          <div>
            <h4 className="action-title">Book a Puja</h4>
            <p className="action-caption">Varanasi, Ujjain, Tirupati</p>
          </div>
        </Link>

        <Link to="/seva" className="action-tile seva">
          <div className="action-icon-circle">
            <HeartHandshake size={20} />
          </div>
          <div>
            <h4 className="action-title">Gau Seva</h4>
            <p className="action-caption">Green Fodder & Medicine</p>
          </div>
        </Link>

        <Link to="/gaushala" className="action-tile gaushala">
          <div className="action-icon-circle">
            <MapPin size={20} />
          </div>
          <div>
            <h4 className="action-title">Meet the Herd</h4>
            <p className="action-caption">Shri Krishna Gaushala</p>
          </div>
        </Link>

        <button className="action-tile rishi" onClick={() => setRishiOpen(true)}>
          <div className="action-icon-circle">
            <Sparkles size={20} />
          </div>
          <div>
            <h4 className="action-title">Rishi Vedic AI</h4>
            <p className="action-caption">Vedic Guidance & Timing</p>
          </div>
        </button>
      </section>

      {/* Rich Panchang Almanac Widget */}
      <section className="panchang-card">
        <div className="panchang-header">
          <div className="panchang-title-group">
            <Sun size={20} className="text-gold" />
            <h3 className="font-serif text-lg font-semibold">Today's Vedic Panchang</h3>
          </div>
          <span className="badge-tulsi">
            Margashirsha Maas
          </span>
        </div>

        <div className="panchang-grid">
          <div className="panchang-cell">
            <div className="panchang-label">Tithi</div>
            <div className="panchang-value">Shukla Ekadashi</div>
            <div className="panchang-sub">Auspicious for Vishnu Pooja</div>
          </div>

          <div className="panchang-cell">
            <div className="panchang-label">Nakshatra</div>
            <div className="panchang-value">Mrigashirsha</div>
            <div className="panchang-sub">Ruled by Soma • Gentle</div>
          </div>

          <div className="panchang-cell">
            <div className="panchang-label">Auspicious Muhurat</div>
            <div className="panchang-value">Abhijit Muhurat</div>
            <div className="panchang-sub">11:48 AM – 12:36 PM</div>
          </div>

          <div className="panchang-cell">
            <div className="panchang-label">Surya Timings</div>
            <div className="panchang-value">Sunrise 06:28 AM</div>
            <div className="panchang-sub">Sunset 06:42 PM</div>
          </div>
        </div>
      </section>

      {/* Sanctuary Impact Strip (Real Data) */}
      <section className="impact-strip">
        <div className="impact-col">
          <div className="impact-icon-badge">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="impact-stat">{totalRescued}</div>
            <div className="impact-stat-label">Indigenous Cows Sheltered</div>
          </div>
        </div>

        <div className="impact-col">
          <div className="impact-icon-badge">
            <Activity size={22} />
          </div>
          <div>
            <div className="impact-stat">{publishedTemples.toLocaleString()}</div>
            <div className="impact-stat-label">Published Temples</div>
          </div>
        </div>

        <div className="impact-col">
          <div className="impact-icon-badge">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="impact-stat">100%</div>
            <div className="impact-stat-label">Direct Care Allocation</div>
          </div>
        </div>
      </section>

      {/* Today's Featured Ritual */}
      <section className="featured-ritual-box">
        <div className="ritual-image-side">
          <img 
            src={IMAGES.rituals.kashiVishwanathAarti} 
            alt={featuredPuja.title} 
          />
          <div className="ritual-badge-overlay">
            <span className="pulse-indicator"></span>
            <span>Featured Daily Aarti</span>
          </div>
        </div>

        <div className="ritual-info-side">
          <div>
            <div className="ritual-meta-line">
              <span className="flex items-center gap-1">
                <MapPin size={14} className="text-terracotta" />
                {featuredPuja.templeName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {featuredPuja.dateTimeStr}
              </span>
            </div>

            <h3 className="ritual-title">{featuredPuja.title}</h3>
            <p className="ritual-desc">{featuredPuja.description}</p>
          </div>

          <div className="ritual-bottom-row">
            <div>
              <span className="text-xs text-muted block">Sankalpa Seva Dakshina</span>
              <span className="ritual-price">₹{featuredPuja.priceRupees}</span>
            </div>

            <Link to="/pujas" className="btn-primary">
              <span>Participate</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Daily Vedic Wisdom Shloka */}
      <section className="wisdom-card">
        <div className="wisdom-om">ॐ</div>
        <h4 className="wisdom-sanskrit">गावो विश्वस्य मातरः</h4>
        <p className="wisdom-trans">
          "The Cow is the Mother of the cosmic universe — embodying unconditional sustenance, forgiveness, and universal motherly love."
        </p>
      </section>

      <RishiChatModal isOpen={rishiOpen} onClose={() => setRishiOpen(false)} />
    </div>
  );
}
