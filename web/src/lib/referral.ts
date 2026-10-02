import { type User } from '@supabase/supabase-js';

const REFERRAL_STORAGE_KEY = 'pratha_inbound_ref_code';
const REFERRALS_COUNT_KEY = 'pratha_invited_count';

/**
 * Deterministically generates a clean, memorable referral code for a devotee.
 * e.g. "PRATHA-RAJESH-A8B2"
 */
export function generateReferralCode(user?: User | null, displayName?: string | null): string {
  if (!user) return 'PRATHA-DEVOTEE-108';

  const rawName = (displayName || user.user_metadata?.display_name || user.email?.split('@')[0] || 'BHAKT')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);

  const cleanName = rawName.length > 0 ? rawName : 'BHAKT';
  const idHash = user.id.replace(/-/g, '').slice(0, 4).toUpperCase();

  return `PRATHA-${cleanName}-${idHash}`;
}

/**
 * Returns the shareable referral link for the web and mobile app.
 */
export function getReferralLink(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pratha-two.vercel.app';
  return `${origin}/?ref=${encodeURIComponent(code)}`;
}

/**
 * Generates an auspicious, culturally tailored invitation message for WhatsApp and SMS.
 */
export function getReferralShareMessage(code: string, link: string): string {
  return (
    `🪷 *Namaste!* I invite you to join *Pratha (उत्सवम्)* — a sacred sanctuary for authentic temple Pujas, daily Vedic Panchang, and Gaushala animal seva.\n\n` +
    `Use my Devotee Referral Code: *${code}*\n` +
    `Or join directly here: ${link}\n\n` +
    `May divine blessings be upon you and your family! 🙏`
  );
}

/**
 * Captures any inbound referral code from the URL (?ref=CODE) and stores it in localStorage.
 * Returns the currently active inbound code if any.
 */
export function captureInboundReferral(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref');

    if (refParam && refParam.trim().length > 0) {
      const cleanCode = refParam.trim().toUpperCase();
      localStorage.setItem(REFERRAL_STORAGE_KEY, cleanCode);
      return cleanCode;
    }

    return localStorage.getItem(REFERRAL_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Returns the stored inbound referral code if the user was invited by someone.
 */
export function getStoredInboundReferral(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(REFERRAL_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Clears the inbound referral code after successful sign up.
 */
export function clearInboundReferral(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    // Ignore error
  }
}

/**
 * Returns referral points/stats (Punya points).
 * Each invited devotee earns 108 Punya points (sacred Vedic number).
 */
export function getReferralStats(user?: User | null): {
  invitedCount: number;
  punyaPoints: number;
  tierName: string;
} {
  let count = 0;
  if (typeof window !== 'undefined') {
    try {
      const savedCount = localStorage.getItem(`${REFERRALS_COUNT_KEY}_${user?.id || 'guest'}`);
      count = savedCount ? parseInt(savedCount, 10) : 0;
    } catch {
      count = 0;
    }
  }

  // 108 Punya points per referral
  const punyaPoints = count * 108;

  let tierName = 'Dharma Pratham (Seeker)';
  if (count >= 10) {
    tierName = 'Param Bhakt (Guardian)';
  } else if (count >= 5) {
    tierName = 'Dharma Mitra (Companion)';
  } else if (count >= 1) {
    tierName = 'Seva Sahay (Helper)';
  }

  return {
    invitedCount: count,
    punyaPoints,
    tierName,
  };
}
