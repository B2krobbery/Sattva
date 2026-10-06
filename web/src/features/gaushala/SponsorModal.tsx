import { useState } from 'react';
import { X, CheckCircle, Heart, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import type { Animal } from '@/lib/api/gaushala';
import { createDonation } from '@/lib/api/profile';
import { useAuth } from '@/features/auth/AuthContext';
import { redirectToLogin } from '@/lib/auth/redirect';

interface SponsorModalProps {
  animal: Animal | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SponsorModal({ animal, isOpen, onClose }: SponsorModalProps) {
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<number>(1500);
  const [dedication, setDedication] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  if (!isOpen || !animal) return null;

  const tiers = [
    { amount: 500, label: '10-Day Fodder', desc: 'Provides organic green grass & mineral mix' },
    { amount: 1500, label: 'Medical Healing', desc: 'Herbal oils, vet care & bandages' },
    { amount: 5000, label: 'Full Month Sponsorship', desc: 'Complete adoption & holistic sanctuary care' },
  ];

  const handleSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) {
      onClose();
      redirectToLogin({ sponsor: animal.id });
      return;
    }
    setLoading(true);

    try {
      const res = await createDonation({
        amountRupees: selectedTier,
        animalId: animal.id,
        gaushalaId: animal.gaushalaId,
        dedication: dedication.trim() || `Sponsorship for ${animal.name}`,
      });

      setSuccessId(res.donationId);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'The offering could not be recorded. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="puja-modal-backdrop" onClick={onClose}>
      <div className="puja-modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="rishi-header">
          <div className="flex items-center gap-2">
            <Heart size={20} className="text-terracotta" />
            <h3 className="font-serif text-lg font-semibold text-text-primary">
              Sponsor {animal.name}'s Care
            </h3>
          </div>
          <button className="rishi-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        {successId ? (
          <div className="booking-success-box">
            <div className="w-14 h-14 rounded-full bg-tulsi-light flex items-center justify-center text-tulsi text-2xl">
              <CheckCircle size={36} className="text-tulsi" />
            </div>
            <h3 className="typography-headline-md text-text-primary">
              Seva Received with Blessings
            </h3>
            <p className="text-sm text-text-secondary max-w-md">
              Thank you, {user?.user_metadata?.display_name || 'Devotee'}, for sponsoring <strong>{animal.name}</strong>.
              Your compassionate offering flows directly toward daily nourishment and veterinary healing at Shri Krishna Gaushala.
            </p>
            <div className="badge-gold my-2">
              Contribution Ref: {successId}
            </div>
            <button className="btn-primary mt-4" onClick={onClose}>
              Return to Passport
            </button>
          </div>
        ) : (
          <form onSubmit={handleSponsor} className="p-6 flex flex-col gap-5">
            <div>
              <label className="text-xs font-semibold uppercase text-muted tracking-wider block mb-2">
                Choose Sponsorship Tier
              </label>
              <div className="flex flex-col gap-2.5">
                {tiers.map((t) => (
                  <div
                    key={t.amount}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      selectedTier === t.amount 
                        ? 'border-terracotta bg-terracotta-light' 
                        : 'border-border bg-surface hover:border-gold'
                    }`}
                    onClick={() => setSelectedTier(t.amount)}
                  >
                    <div>
                      <div className="font-semibold text-sm text-text-primary">{t.label}</div>
                      <div className="text-xs text-text-secondary">{t.desc}</div>
                    </div>
                    <span className="font-serif font-bold text-base text-terracotta">
                      ₹{t.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Dedication / Sankalpa (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. On behalf of parents for health & longevity"
                value={dedication}
                onChange={(e) => setDedication(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted">
              <Heart size={14} className="text-terracotta" />
              <span>Direct sponsorship dedicated to {animal.name}'s daily feed and care</span>
            </div>

            {error && (
              <div className="alert-error" role="alert">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary w-full mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing Offering...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Offer ₹{selectedTier} for {animal.name}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
