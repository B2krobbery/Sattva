import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, CheckCircle, Heart, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { createDonation, getSevaCampaigns } from '@/lib/api/profile';
import { useAuth } from '@/features/auth/AuthContext';
import { redirectToLogin } from '@/lib/auth/redirect';
import './DonationModal.css';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultInitiative?: string;
  defaultAmount?: number;
}

export function DonationModal({
  isOpen,
  onClose,
  defaultInitiative,
  defaultAmount = 1100
}: DonationModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [customAmount, setCustomAmount] = useState('');
  const [campaignId, setCampaignId] = useState<string>(defaultInitiative || '');
  const [dedication, setDedication] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [confirmedAmount, setConfirmedAmount] = useState<number | null>(null);

  const { data: campaigns } = useQuery({
    queryKey: ['seva-campaigns'],
    queryFn: () => getSevaCampaigns(),
    enabled: isOpen,
  });
  const activeCampaign = (campaigns ?? []).find((c) => c.id === campaignId) || campaigns?.[0];
  const initiative = activeCampaign?.title || 'Gaushala Seva';

  // Reopening after a successful donation must show a fresh form, not the
  // stale receipt — the component stays mounted, so reset on each open.
  useEffect(() => {
    if (isOpen) {
      setReceiptId(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const presetAmounts = [501, 1100, 2100, 5100, 11000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const finalAmount = customAmount ? parseInt(customAmount, 10) : amount;
    if (!finalAmount || isNaN(finalAmount) || finalAmount < 10) {
      setError('The minimum offering is ₹10.');
      return;
    }

    if (!user) {
      onClose();
      redirectToLogin(activeCampaign?.id ? { campaign: activeCampaign.id } : undefined);
      return;
    }
    setLoading(true);
    try {
      const res = await createDonation({
        amountRupees: finalAmount,
        campaignId: activeCampaign?.id,
        dedication: dedication.trim() || undefined,
      });

      setConfirmedAmount(finalAmount);
      setReceiptId(res.donationId);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'The offering could not be recorded. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="donation-modal-backdrop" onClick={onClose}>
      <div className="donation-modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="rishi-header">
          <div className="flex items-center gap-2">
            <Heart size={20} className="text-terracotta" />
            <h3 className="font-serif text-lg font-semibold text-text-primary">
              Sacred Gau Seva Contribution
            </h3>
          </div>
          <button className="rishi-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        {receiptId ? (
          <div className="booking-success-box">
            <div className="w-14 h-14 rounded-full bg-tulsi-light flex items-center justify-center text-tulsi text-2xl">
              <CheckCircle size={36} className="text-tulsi" />
            </div>
            <h3 className="typography-headline-md text-text-primary">
              Seva Recorded with Gratitude
            </h3>
            <p className="text-sm text-text-secondary max-w-md">
              Devotee {user?.user_metadata?.display_name || 'Seeker'}, your contribution of <strong>₹{confirmedAmount ?? amount}</strong> for <em>{initiative}</em> has been offered to Shri Krishna Gaushala.
            </p>
            <div className="badge-gold my-2">
              Contribution Ref: {receiptId}
            </div>
            <p className="text-xs text-text-muted">
              Your contribution is recorded in your Devotee Profile. A receipt is issued once payment is confirmed.
            </p>
            <button className="btn-primary mt-4" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto">
            <div>
              <label className="text-xs font-semibold uppercase text-muted tracking-wider block mb-1">
                Select Initiative
              </label>
              <select
                className="form-input w-full"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              >
                {(campaigns ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
                {(!campaigns || campaigns.length === 0) && (
                  <option value="">General Gaushala Seva</option>
                )}
              </select>
              {activeCampaign?.description && (
                <p className="text-xs text-text-muted mt-1.5">{activeCampaign.description}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-muted tracking-wider block mb-1">
                Select Contribution Amount (₹)
              </label>
              <div className="donation-amount-grid">
                {presetAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`amount-chip ${amount === amt && !customAmount ? 'active' : ''}`}
                    onClick={() => { setAmount(amt); setCustomAmount(''); }}
                  >
                    ₹{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <input
                type="number"
                placeholder="Or enter custom amount in Rupees"
                className="form-input w-full mt-2"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Dedication / Sankalpa Note (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. In memory of Late Sh. Ram Lal, or for family wellbeing"
                value={dedication}
                onChange={(e) => setDedication(e.target.value)}
              />
            </div>

            {error && (
              <div className="alert-error" role="alert">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary w-full mt-3"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Offering Seva...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Offer Seva (₹{customAmount || amount})</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
