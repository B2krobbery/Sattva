import { useMemo, useState } from 'react';
import { X, CheckCircle, MapPin, Clock, Flame, User, Sparkles, Loader2, AlertCircle, CalendarDays } from 'lucide-react';
import { createBooking, type Puja } from '@/lib/api/puja';
import { useAuth } from '@/features/auth/AuthContext';
import { redirectToLogin } from '@/lib/auth/redirect';
import { IMAGES } from '@/lib/images';
import './PujaDetailModal.css';

interface PujaDetailModalProps {
  puja: Puja | null;
  onClose: () => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function PujaDetailModal({ puja, onClose }: PujaDetailModalProps) {
  const { user } = useAuth();
  const [sankalpaName, setSankalpaName] = useState(user?.user_metadata?.display_name || '');
  const [gotra, setGotra] = useState('');
  const [nakshatra, setNakshatra] = useState('');
  const [familyMembers, setFamilyMembers] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [prasadam, setPrasadam] = useState<'none' | 'collect' | 'post'>('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<{ ref: string; status?: string } | null>(null);

  const leadDays = puja?.leadTimeDays ?? 0;
  const minDate = useMemo(() => toISODate(new Date(Date.now() + leadDays * 86400000)), [leadDays]);
  const availableDays = puja?.availableDays ?? [0, 1, 2, 3, 4, 5, 6];
  const allDaysAvailable = availableDays.length === 7;
  const availabilityHint = allDaysAvailable
    ? 'Performed every day'
    : `Performed on ${availableDays.map((d) => DAY_NAMES[d]).join(', ')}`;
  // Curated fallback listings are not hosted offerings, so the RPC can't book them.
  const isHostedOffering = puja ? UUID_RE.test(puja.id) : false;

  if (!puja) return null;

  const validateDate = (dateStr: string): string | null => {
    if (!dateStr) return 'Please select a date for the ritual.';
    if (dateStr < minDate) {
      return leadDays > 0
        ? `This offering needs at least ${leadDays} day${leadDays === 1 ? '' : 's'} of advance notice.`
        : 'Please pick a date from today onward.';
    }
    const dow = new Date(`${dateStr}T00:00:00`).getDay();
    if (!availableDays.includes(dow)) {
      return `This offering is not performed on ${DAY_NAMES[dow]}. ${availabilityHint}.`;
    }
    return null;
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!sankalpaName.trim()) {
      setError('Please enter the devotee name for the Sankalpa.');
      return;
    }
    if (puja.requiresNakshatra && !nakshatra.trim()) {
      setError('Please provide the devotee\u2019s Nakshatra (birth star).');
      return;
    }
    const dateError = validateDate(bookingDate);
    if (dateError) {
      setError(dateError);
      return;
    }
    if (!isHostedOffering) {
      setError('Online booking is not enabled for this curated listing yet.');
      return;
    }
    if (!user) {
      onClose();
      redirectToLogin({ book: puja.id });
      return;
    }

    setLoading(true);
    try {
      const res = await createBooking({
        pujaId: puja.id,
        bookingDate,
        sankalpaName: sankalpaName.trim(),
        gotra: gotra.trim() || undefined,
        nakshatra: nakshatra.trim() || undefined,
        quantity,
        prasadam,
        notes: familyMembers.trim() ? `Family: ${familyMembers.trim()}` : undefined,
      });
      setSuccessBooking({ ref: res.confirmationRef || res.bookingId, status: res.status });
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'The booking could not be completed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCuratedPujaImage = (p: Puja) => {
    const title = (p.title || '').toLowerCase();
    const id = (p.id || '').toLowerCase();
    if (id.includes('ganga') || title.includes('ganga')) return IMAGES.rituals.kashiVishwanathAarti;
    if (id.includes('rudra') || title.includes('rudra') || title.includes('shiva')) return IMAGES.pujas.rudraAbhishekam;
    if (id.includes('navgrah') || title.includes('navgrah') || title.includes('sudarshana')) return IMAGES.pujas.mahaSudarshana;
    if (id.includes('tirupati') || title.includes('venkateswara') || title.includes('archana')) return IMAGES.pujas.templeHero;
    return p.imageUrl || IMAGES.pujas.templeHero;
  };

  return (
    <div className="puja-modal-backdrop" onClick={onClose}>
      <div className="puja-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="puja-modal-hero">
          <img 
            src={getCuratedPujaImage(puja)} 
            alt={puja.title} 
          />
          <div className="puja-modal-hero-overlay" />
          <button className="puja-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {successBooking ? (
          <div className="booking-success-box">
            <div className="w-14 h-14 rounded-full bg-tulsi-light flex items-center justify-center text-tulsi text-2xl">
              <CheckCircle size={36} className="text-tulsi" />
            </div>
            <h3 className="typography-headline-md text-text-primary">
              {successBooking.status === 'confirmed' ? 'Sankalpa Accepted' : 'Booking Recorded'}
            </h3>
            <p className="text-sm text-text-secondary max-w-md">
              Your offering for <strong>{puja.title}</strong> at {puja.templeName}
              {bookingDate ? ` on ${new Date(`${bookingDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''} has been received.
              The revered priest will chant your sacred Gotra and Nakshatra.
            </p>
            <div className="badge-gold my-2">
              Booking Ref: {successBooking.ref}
            </div>
            <p className="text-xs text-text-muted">
              {successBooking.status === 'confirmed'
                ? 'Your booking is confirmed. View it any time in your Profile.'
                : 'This booking is awaiting payment. It appears under Pooja bookings in your Profile.'}
            </p>
            <button className="btn-primary mt-4" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="puja-modal-content hide-scrollbar">
              <div className="puja-title-section">
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <MapPin size={14} className="text-terracotta" />
                  <span>{puja.location || puja.templeName}</span>
                  <span>•</span>
                  <Clock size={14} />
                  <span>{puja.dateTimeStr || 'Daily Ritual'}</span>
                </div>
                <h2 className="typography-headline-lg text-text-primary">{puja.title}</h2>
                {puja.specialTag && (
                  <span className="badge-gold self-start">{puja.specialTag}</span>
                )}
              </div>

              {/* Significance */}
              <div className="prose">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-1">
                  Ritual Significance
                </h4>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {puja.significance || puja.description || 'This sacred ceremony invokes divine blessings, removes planetary obstacles, and sanctifies the devotee\'s family hearth.'}
                </p>
              </div>

              {/* Priest Card */}
              {puja.priestName && (
                <div className="puja-priest-card">
                  <div className="priest-avatar-box">
                    <User size={24} />
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-text-primary">{puja.priestName}</h5>
                    <p className="text-xs text-text-muted">{puja.priestTitle}</p>
                    {puja.priestExp && (
                      <p className="text-xs text-gold font-medium mt-0.5">{puja.priestExp}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Interactive Sankalpa Form */}
              <form id="sankalpa-form" onSubmit={handleBooking} className="sankalpa-section">
                <h4 className="sankalpa-title">
                  <Flame size={16} />
                  <span>Sacred Sankalpa Details</span>
                </h4>
                <p className="text-xs text-text-muted">
                  Provide your family details so the Archaka can invoke your name during the holy mantra chanting.
                </p>

                <div className="sankalpa-fields-grid">
                  <div className="form-group">
                    <label className="form-label">Ritual Date *</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      min={minDate}
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                    />
                    <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                      <CalendarDays size={12} />
                      {availabilityHint}
                      {leadDays > 0 ? ` · earliest ${new Date(`${minDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Devotee Full Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="Enter devotee name for Sankalpa"
                      value={sankalpaName}
                      onChange={(e) => setSankalpaName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Gotra (Lineage)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Kashyapa, or Self"
                      value={gotra}
                      onChange={(e) => setGotra(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nakshatra / Birth Star{puja.requiresNakshatra ? ' *' : ''}</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Rohini, Mrigashirsha"
                      required={puja.requiresNakshatra}
                      value={nakshatra}
                      onChange={(e) => setNakshatra(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Devotees</label>
                    <select
                      className="form-input"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n} {n === 1 ? 'devotee' : 'devotees'}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Prasadam</label>
                    <select
                      className="form-input"
                      value={prasadam}
                      onChange={(e) => setPrasadam(e.target.value as 'none' | 'collect' | 'post')}
                    >
                      <option value="none">No prasadam</option>
                      <option value="collect">Collect at temple</option>
                      <option value="post">Send by post</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Family Names (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Spouse, Son, Parents (comma separated)"
                      value={familyMembers}
                      onChange={(e) => setFamilyMembers(e.target.value)}
                    />
                  </div>
                </div>
              </form>
            </div>

            <footer className="puja-footer-bar flex-col items-stretch">
              {error && (
                <div className="alert-error mb-3" role="alert">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-text-muted block">Seva Dakshina</span>
                <span className="text-xl font-bold font-serif text-terracotta">
                  ₹{(puja.priceRupees * quantity).toLocaleString('en-IN')}
                </span>
              </div>

              <button 
                type="submit" 
                form="sankalpa-form" 
                className="btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Recording Sankalpa...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>{user ? 'Confirm Puja Booking' : 'Sign in to Book'}</span>
                  </>
                )}
              </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
