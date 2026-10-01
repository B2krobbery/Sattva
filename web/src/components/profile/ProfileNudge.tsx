import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { getProfile } from '@/lib/api/profile';

const FIELDS: { key: string; label: string }[] = [
  { key: 'displayName', label: 'name' },
  { key: 'phone', label: 'phone' },
  { key: 'city', label: 'city' },
  { key: 'gotra', label: 'gotra' },
  { key: 'birthDate', label: 'birth date' },
  { key: 'birthTime', label: 'birth time' },
  { key: 'birthPlace', label: 'birth place' },
];

// Slim completeness nudge shown on Home while the profile has gaps.
export function ProfileNudge() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: !!user,
  });

  if (!user || !data) return null;
  const profile = data.profile;
  const filled = FIELDS.filter((f) => {
    const v = profile?.[f.key as keyof typeof profile];
    return typeof v === 'string' && v.trim().length > 0;
  });
  if (filled.length === FIELDS.length) return null;

  const missing = FIELDS.filter((f) => !filled.includes(f)).map((f) => f.label);
  const pct = Math.round((filled.length / FIELDS.length) * 100);

  return (
    <Link
      to="/profile"
      className="glass-card flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface px-4 py-3 hover:bg-surface-subtle transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-text-primary">Profile {filled.length}/{FIELDS.length}</span>
          <span className="text-xs text-text-muted truncate">add {missing.slice(0, 2).join(', ')}{missing.length > 2 ? ` +${missing.length - 2} more` : ''}</span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-surface-subtle overflow-hidden">
          <div className="h-full rounded-full bg-terracotta transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ArrowRight size={16} className="text-text-muted shrink-0" />
    </Link>
  );
}
