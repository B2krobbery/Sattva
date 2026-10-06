import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { getProfile, updateProfile } from '@/lib/api/profile';
import { sendEngagementEmail } from '@/lib/referral';

// "Maybe later" snoozes for 7 days, not forever — profile gaps resurface.
const DISMISS_KEY = 'pratha-janma-dismissed';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function isSnoozed(): boolean {
  const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return ts > 0 && Date.now() - ts < SNOOZE_MS;
}

// Shown once after login when the devotee hasn't saved birth details.
// Feeds the /pujas "For Your Janma" recommendations.
export function BirthDetailsPrompt() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(isSnoozed);
  const [dob, setDob] = useState('');
  const [tob, setTob] = useState('');
  const [pob, setPob] = useState('');
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: !!user,
  });

  if (loading || !user || dismissed || !data || data.profile?.birthDate) return null;

  const name = data.profile?.displayName || user.email?.split('@')[0] || 'Devotee';

  const save = async () => {
    if (!dob) return;
    setSaving(true);
    try {
      await updateProfile({ birthDate: dob, birthTime: tob, birthPlace: pob, displayName: editName.trim() || undefined });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await queryClient.invalidateQueries({ queryKey: ['janma-chart'] });
      // celebrate: in-app inbox + push + email via notify-send
      sendEngagementEmail('janma_ready');
      setDismissed(true);
    } finally {
      setSaving(false);
    }
  };

  const skip = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Birth details">
      <div className="w-full max-w-sm rounded-3xl bg-surface border border-border-subtle p-6 flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gold">
          <Sparkles size={13} /> Namaste, {name}
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">
          Share your birth details once — we'll suggest pujas matched to your <strong className="text-text-primary">janma nakshatra</strong> on the Pujas page.
        </p>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="form-label">What should we call you?</span>
            <input type="text" className="form-input" placeholder="Your name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="form-label">Date of Birth</span>
            <input type="date" className="form-input" value={dob} onChange={(e) => setDob(e.target.value)} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="form-label">Time of Birth</span>
            <input type="time" className="form-input" value={tob} onChange={(e) => setTob(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="form-label">Place of Birth</span>
            <input type="text" className="form-input" placeholder="Varanasi, India" value={pob} onChange={(e) => setPob(e.target.value)} />
          </label>
        </div>
        <button type="button" className="btn-primary" disabled={!dob || saving} onClick={save}>
          {saving ? 'Saving…' : 'Get My Recommendations'}
        </button>
        <button type="button" className="text-xs font-semibold text-text-muted self-center" onClick={skip}>
          Maybe later
        </button>
      </div>
    </div>
  );
}
