import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  LogOut, 
  Plus, 
  MapPin,
  Heart,
  Flame,
  Users,
  FileCheck,
  ArrowRight,
  Sun,
  Moon,
  MonitorSmartphone,
  Gift,
  Copy,
  Check,
  Share2,
  Sparkles
} from 'lucide-react';
import { useThemeMode, setThemeMode } from '@/lib/theme';
import { getProfile, updateProfile, uploadAvatar, avatarPublicUrl, getDonations, getFamily, addFamilyMember, type Donation, type FamilyMember } from '@/lib/api/profile';
import { getBookings, type PujaBooking } from '@/lib/api/puja';
import { useAuth } from '@/features/auth/AuthContext';
import { IMAGES } from '@/lib/images';
import { generateReferralCode, getReferralLink, getReferralShareMessage, getReferralStats } from '@/lib/referral';
import './Profile.css';

export function Profile() {
  const { user, signOut } = useAuth();
  const themeMode = useThemeMode();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'seva' | 'pujas' | 'family' | 'referral' | 'settings') || 'seva';
  const [activeTab, setActiveTab] = useState<'seva' | 'pujas' | 'family' | 'referral' | 'settings'>(
    ['seva', 'pujas', 'family', 'referral', 'settings'].includes(initialTab) ? initialTab : 'seva'
  );
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberRelation, setMemberRelation] = useState('Spouse');
  const [memberNakshatra, setMemberNakshatra] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [birthSaved, setBirthSaved] = useState(false);
  const [birthInit, setBirthInit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editGotra, setEditGotra] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const { data: profileData, refetch: refetchProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => getProfile(),
    enabled: !!user,
  });

  const { data: donationsData } = useQuery({
    queryKey: ['donations'],
    queryFn: () => getDonations(),
    enabled: !!user,
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => getBookings(),
    enabled: !!user,
  });

  const { data: familyData, refetch: refetchFamily } = useQuery({
    queryKey: ['family'],
    queryFn: () => getFamily(),
    enabled: !!user,
  });

  const profile = profileData?.profile;
  if (profile && !birthInit) {
    setBirthInit(true);
    setBirthDate(profile.birthDate ?? '');
    setBirthTime(profile.birthTime ?? '');
    setBirthPlace(profile.birthPlace ?? '');
    setEditName(profile.displayName ?? '');
    setEditPhone(profile.phone ?? '');
    setEditCity(profile.city ?? '');
    setEditGotra(profile.gotra ?? '');
  }
  const displayName = profile?.displayName || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Devotee';
  const email = user?.email || 'Registered Devotee';

  // Ground strictly in backend data without placeholder user identities or mock data
  const donations: Donation[] = donationsData?.donations || [];
  const bookings: PujaBooking[] = bookingsData?.bookings || [];
  const family: FamilyMember[] = familyData?.family || [];

  const totalContributions = donations.reduce((sum, d) => sum + (d.amountRupees || 0), 0);

  const handleAddFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) return;

    try {
      await addFamilyMember({
        name: memberName.trim(),
        relationship: memberRelation,
        nakshatra: memberNakshatra.trim() || undefined,
      });
      setShowAddFamily(false);
      setMemberName('');
      refetchFamily();
    } catch (err) {
      setShowAddFamily(false);
    }
  };

  const myReferralCode = generateReferralCode(user, displayName);
  const myReferralLink = getReferralLink(myReferralCode);
  const referralStats = getReferralStats(user);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(myReferralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(myReferralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleWhatsAppShare = () => {
    const msg = getReferralShareMessage(myReferralCode, myReferralLink);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    const msg = getReferralShareMessage(myReferralCode, myReferralLink);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Pratha Platform',
          text: msg,
          url: myReferralLink,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2500);
      } catch {
        // ignore
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="profile-page">
      {/* Devotee Header Identity Card */}
      <section className="devotee-profile-card">
        <div className="devotee-avatar-box">
          <img
            src={avatarPreview || avatarPublicUrl(profile?.avatarPath) || user?.user_metadata?.avatar_url || IMAGES.profile.defaultAvatar}
            alt={displayName}
          />
        </div>

        <h2 className="devotee-name-title">{displayName}</h2>
        <p className="devotee-tagline">{email}</p>

        <div className="devotee-badges-row">
          {profile?.gotra ? (
            <span className="badge-gold">Gotra: {profile.gotra}</span>
          ) : (
            <span className="badge-gold text-muted">Gotra: Not specified</span>
          )}

          {profile?.nakshatra ? (
            <span className="badge-tulsi">Nakshatra: {profile.nakshatra}</span>
          ) : (
            <span className="badge-tulsi text-muted">Nakshatra: Not specified</span>
          )}

          {profile?.city ? (
            <span className="badge-gold">
              <MapPin size={12} />
              {profile.city}
            </span>
          ) : (
            <span className="badge-gold text-muted">
              <MapPin size={12} />
              Location: Not specified
            </span>
          )}
        </div>
      </section>

      {/* Profile Multi-Tab Selector */}
      <div className="profile-nav-tabs hide-scrollbar">
        <button 
          className={`profile-tab-btn ${activeTab === 'seva' ? 'active' : ''}`}
          onClick={() => setActiveTab('seva')}
        >
          My Seva (₹{totalContributions.toLocaleString()})
        </button>

        <button 
          className={`profile-tab-btn ${activeTab === 'pujas' ? 'active' : ''}`}
          onClick={() => setActiveTab('pujas')}
        >
          Puja Bookings ({bookings.length})
        </button>

        <button 
          className={`profile-tab-btn ${activeTab === 'family' ? 'active' : ''}`}
          onClick={() => setActiveTab('family')}
        >
          Sankalpa Family ({family.length})
        </button>

        <button 
          className={`profile-tab-btn ${activeTab === 'referral' ? 'active' : ''}`}
          onClick={() => setActiveTab('referral')}
        >
          <span className="flex items-center gap-1.5">
            <Gift size={14} className="text-terracotta" />
            <span>Invite &amp; Earn</span>
          </span>
        </button>

        <button 
          className={`profile-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'seva' && (
        <div className="profile-content-panel">
          {donations.length === 0 ? (
            <div className="profile-empty-card">
              <div className="profile-empty-icon-wrap">
                <Heart size={26} />
              </div>
              <h4 className="profile-empty-title">No Seva Contributions Recorded</h4>
              <p className="profile-empty-desc">
                Your sacred offerings towards green fodder, sanctuary shelter, and medical care will appear here.
              </p>
              <Link to="/seva" className="btn-secondary mt-1">
                <span>Explore Gau Seva</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            donations.map((d) => (
              <div key={d.id} className="activity-item-card">
                <div>
                  <h4 className="activity-meta-title">{d.targetName || 'Gau Seva Offering'}</h4>
                  <p className="activity-meta-sub">
                    Ref: {d.id} • {d.createdAt || d.dateStr || 'Recorded'} • 
                    <span className="text-tulsi ml-1 font-semibold">{d.paymentStatus}</span>
                  </p>
                  {d.dedication && (
                    <p className="text-xs text-text-secondary italic mt-1">
                      "{d.dedication}"
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className="font-serif font-bold text-lg text-terracotta block">
                    ₹{d.amountRupees}
                  </span>
                  <span className="text-xs text-gold flex items-center justify-end gap-1 mt-1">
                    <FileCheck size={12} /> Receipt Recorded
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'pujas' && (
        <div className="profile-content-panel">
          {bookings.length === 0 ? (
            <div className="profile-empty-card">
              <div className="profile-empty-icon-wrap">
                <Flame size={26} />
              </div>
              <h4 className="profile-empty-title">No Puja Bookings Found</h4>
              <p className="profile-empty-desc">
                Book an authentic temple ceremony across sacred sanctums to view your confirmed bookings and live darshan links here.
              </p>
              <Link to="/pujas" className="btn-secondary mt-1">
                <span>Explore Sacred Pujas</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            bookings.map((b) => (
              <div key={b.id || (b as any).bookingId} className="activity-item-card">
                <div>
                  <div className="badge-gold self-start mb-1 text-xs">
                    {b.status || 'CONFIRMED'}
                  </div>
                  <h4 className="activity-meta-title">{b.pujaTitle}</h4>
                  <p className="activity-meta-sub">
                    {b.templeName} • {b.bookingDate || 'Scheduled Daily'}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Chanted for: <strong>{b.sankalpaName}</strong> (Gotra: {b.gotra || 'Self'})
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-serif font-bold text-base text-terracotta">
                    ₹{b.amountRupees}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'family' && (
        <div className="profile-content-panel">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-muted tracking-wider">
              Chanted in Sankalpas
            </span>
            <button 
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
              onClick={() => setShowAddFamily(!showAddFamily)}
            >
              <Plus size={14} />
              <span>Add Member</span>
            </button>
          </div>

          {showAddFamily && (
            <form onSubmit={handleAddFamily} className="temple-card p-4 flex flex-col gap-3">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Family member name"
                  className="form-input"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Relationship</label>
                  <select
                    className="form-input"
                    value={memberRelation}
                    onChange={(e) => setMemberRelation(e.target.value)}
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Nakshatra</label>
                  <input
                    type="text"
                    placeholder="e.g. Ashwini"
                    className="form-input"
                    value={memberNakshatra}
                    onChange={(e) => setMemberNakshatra(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button 
                  type="button" 
                  className="btn-secondary text-xs py-2 px-3"
                  onClick={() => setShowAddFamily(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs py-2 px-4">
                  Save Member
                </button>
              </div>
            </form>
          )}

          {family.length === 0 ? (
            <div className="profile-empty-card">
              <div className="profile-empty-icon-wrap">
                <Users size={26} />
              </div>
              <h4 className="profile-empty-title">No Family Members Registered</h4>
              <p className="profile-empty-desc">
                Add your family members to include them automatically during sacred Sankalpa chants.
              </p>
              <button 
                type="button"
                className="btn-secondary mt-1"
                onClick={() => setShowAddFamily(true)}
              >
                <Plus size={14} />
                <span>Add Family Member</span>
              </button>
            </div>
          ) : (
            family.map((f) => (
              <div key={f.id} className="family-member-chip">
                <div>
                  <h5 className="font-semibold text-sm text-text-primary">{f.name}</h5>
                  <p className="text-xs text-text-muted">
                    {f.relationship} {f.nakshatra ? `• Nakshatra: ${f.nakshatra}` : ''}
                  </p>
                </div>
                <span className="badge-tulsi text-xs">Included in Chants</span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'referral' && (
        <div className="profile-content-panel">
          {/* Main Referral Code & Share Card */}
          <div className="activity-item-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 16 }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="badge-gold self-start mb-2 inline-flex items-center gap-1.5 text-xs">
                  <Sparkles size={12} />
                  <span>Dharma Mitra Program</span>
                </div>
                <h3 className="activity-meta-title text-lg font-serif">Invite Devotees &amp; Earn Punya</h3>
                <p className="activity-meta-sub">Share your sacred invite code to welcome family and friends to Pratha</p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto bg-surface-subtle border border-border-subtle px-3 py-1.5 rounded-full">
                <Gift size={14} className="text-terracotta" />
                <span className="text-xs font-semibold text-text-primary">+108 Punya / Invite</span>
              </div>
            </div>

            {/* Code Box */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-subtle p-4 rounded-xl border border-border-subtle">
              <div>
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
                  Your Devotee Referral Code
                </span>
                <span className="font-mono text-lg font-bold text-terracotta tracking-wider">
                  {myReferralCode}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                  title="Copy Code"
                >
                  {copiedCode ? <Check size={14} className="text-tulsi" /> : <Copy size={14} />}
                  <span>{copiedCode ? 'Code Copied!' : 'Copy Code'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                  title="Copy Link"
                >
                  {copiedLink ? <Check size={14} className="text-tulsi" /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-sm transition-all"
              >
                <Share2 size={15} />
                <span>Share via WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="btn-primary text-xs py-2.5 px-4 flex items-center justify-center gap-2"
              >
                <Share2 size={15} />
                <span>{shareSuccess ? 'Shared Successfully!' : 'Share with Friends'}</span>
              </button>
            </div>
          </div>

          {/* Devotee Merit & Tier Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="activity-item-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <span className="text-xs text-text-muted uppercase font-semibold">Devotees Welcomed</span>
              <span className="font-serif text-2xl font-bold text-text-primary">
                {referralStats.invitedCount}
              </span>
              <span className="text-[11px] text-tulsi font-medium">Spiritual Companions</span>
            </div>

            <div className="activity-item-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <span className="text-xs text-text-muted uppercase font-semibold">Earned Punya Points</span>
              <span className="font-serif text-2xl font-bold text-terracotta">
                {referralStats.punyaPoints}
              </span>
              <span className="text-[11px] text-gold font-medium">Seva Merits Accumulated</span>
            </div>

            <div className="activity-item-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <span className="text-xs text-text-muted uppercase font-semibold">Dharma Tier</span>
              <span className="font-serif text-base font-bold text-text-primary">
                {referralStats.tierName}
              </span>
              <span className="text-[11px] text-text-muted">Unlocks Seva Blessings</span>
            </div>
          </div>

          {/* How It Works Card */}
          <div className="activity-item-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 14 }}>
            <h4 className="activity-meta-title text-sm font-serif">How the Referral Program Works</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="p-3 rounded-lg bg-surface-subtle border border-border-subtle">
                <span className="w-6 h-6 rounded-full bg-terracotta text-white text-xs font-bold flex items-center justify-center mb-2">1</span>
                <h5 className="font-semibold text-xs text-text-primary mb-1">Share Your Link or Code</h5>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Send your personalized devotee invite code or link to friends, family, and spiritual circles.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-surface-subtle border border-border-subtle">
                <span className="w-6 h-6 rounded-full bg-terracotta text-white text-xs font-bold flex items-center justify-center mb-2">2</span>
                <h5 className="font-semibold text-xs text-text-primary mb-1">They Join Pratha</h5>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  When they register using your code, they are linked as your spiritual companion.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-surface-subtle border border-border-subtle">
                <span className="w-6 h-6 rounded-full bg-terracotta text-white text-xs font-bold flex items-center justify-center mb-2">3</span>
                <h5 className="font-semibold text-xs text-text-primary mb-1">Earn Punya &amp; Merits</h5>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Receive 108 Punya points for every devotee who connects with sacred temple ceremonies and Gau Seva.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="profile-content-panel">
          <div className="activity-item-card appearance-card">
            <div>
              <h4 className="activity-meta-title">Appearance</h4>
              <p className="activity-meta-sub">Light, dark, or follow your device</p>
            </div>
            <div className="appearance-toggle hide-scrollbar">
              {(['light', 'system', 'dark'] as const).map((m) => (
                <button
                  key={m}
                  className={`appearance-btn ${themeMode === m ? 'active' : ''}`}
                  onClick={() => setThemeMode(m)}
                >
                  {m === 'light' && <Sun size={13} />}
                  {m === 'system' && <MonitorSmartphone size={13} />}
                  {m === 'dark' && <Moon size={13} />}
                  <span>{m === 'system' ? 'System' : m === 'light' ? 'Light' : 'Dark'}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="activity-item-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
            <div>
              <h4 className="activity-meta-title">Edit Profile</h4>
              <p className="activity-meta-sub">Your name, photo & identity shown across Pratha</p>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <img
                src={avatarPreview || avatarPublicUrl(profile?.avatarPath) || user?.user_metadata?.avatar_url || IMAGES.profile.defaultAvatar}
                alt="Profile photo"
                className="w-14 h-14 rounded-full object-cover border border-border-subtle"
              />
              <span className="text-xs font-semibold text-terracotta">
                {avatarFile ? avatarFile.name : 'Change photo'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setAvatarFile(f);
                  setAvatarPreview(f ? URL.createObjectURL(f) : null);
                  setProfileSaved(false);
                }}
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  Display Name
                </label>
                <input 
                  type="text" 
                  className="w-full bg-surface-subtle border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 transition-all placeholder:text-text-muted" 
                  placeholder="Your name" 
                  value={editName} 
                  onChange={(e) => { setEditName(e.target.value); setProfileSaved(false); }} 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  Phone
                </label>
                <input 
                  type="tel" 
                  className="w-full bg-surface-subtle border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 transition-all placeholder:text-text-muted" 
                  placeholder="+91 …" 
                  value={editPhone} 
                  onChange={(e) => { setEditPhone(e.target.value); setProfileSaved(false); }} 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  City
                </label>
                <input 
                  type="text" 
                  className="w-full bg-surface-subtle border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 transition-all placeholder:text-text-muted" 
                  placeholder="Varanasi" 
                  value={editCity} 
                  onChange={(e) => { setEditCity(e.target.value); setProfileSaved(false); }} 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  Gotra
                </label>
                <input 
                  type="text" 
                  className="w-full bg-surface-subtle border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 transition-all placeholder:text-text-muted" 
                  placeholder="Bharadwaj" 
                  value={editGotra} 
                  onChange={(e) => { setEditGotra(e.target.value); setProfileSaved(false); }} 
                />
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={async () => {
                let avatarPath = profile?.avatarPath;
                if (avatarFile) {
                  const up = await uploadAvatar(avatarFile);
                  avatarPath = up.path;
                }
                await updateProfile({ displayName: editName, phone: editPhone, city: editCity, gotra: editGotra, avatarPath });
                setAvatarFile(null);
                setProfileSaved(true);
                await refetchProfile();
              }}
            >
              {profileSaved ? 'Saved' : 'Save Profile'}
            </button>
          </div>

          <div className="activity-item-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
            <div>
              <h4 className="activity-meta-title">Janma Details</h4>
              <p className="activity-meta-sub">Date, time &amp; place of birth — used for puja recommendations (India timezone assumed)</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  Date of Birth
                </label>
                <input 
                  type="date" 
                  className="w-full bg-surface-subtle border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 transition-all" 
                  value={birthDate} 
                  onChange={(e) => { setBirthDate(e.target.value); setBirthSaved(false); }} 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  Time of Birth
                </label>
                <input 
                  type="time" 
                  className="w-full bg-surface-subtle border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 transition-all" 
                  value={birthTime} 
                  onChange={(e) => { setBirthTime(e.target.value); setBirthSaved(false); }} 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  Place of Birth
                </label>
                <input 
                  type="text" 
                  className="w-full bg-surface-subtle border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 transition-all placeholder:text-text-muted" 
                  placeholder="Varanasi, India" 
                  value={birthPlace} 
                  onChange={(e) => { setBirthPlace(e.target.value); setBirthSaved(false); }} 
                />
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              disabled={!birthDate}
              onClick={async () => {
                await updateProfile({ birthDate, birthTime, birthPlace });
                setBirthSaved(true);
              }}
            >
              {birthSaved ? 'Saved — see Pujas for your recommendations' : 'Save Birth Details'}
            </button>
          </div>

          <div className="activity-item-card">
            <div>
              <h4 className="activity-meta-title">Sacred Notifications</h4>
              <p className="activity-meta-sub">Daily Panchang, Muhurat & live Aarti updates</p>
            </div>
            <span className="badge-tulsi">Active</span>
          </div>

          <div className="activity-item-card">
            <div>
              <h4 className="activity-meta-title">Offering Records</h4>
              <p className="activity-meta-sub">Digital contribution records and receipts</p>
            </div>
            <span className="badge-gold">Configured</span>
          </div>

          <button className="btn-signout" onClick={signOut}>
            <LogOut size={16} />
            <span>Sign Out of Pratha Sanctuary</span>
          </button>
        </div>
      )}
    </div>
  );
}
