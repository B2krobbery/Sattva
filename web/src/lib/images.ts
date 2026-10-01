export const IMAGES = {
  rituals: {
    kashiVishwanathAarti: '/images/rituals/kashi-vishwanath-aarti.jpg',
  },
  animals: {
    nandini: '/images/animals/nandini.jpg',
    gauri: '/images/animals/gauri.jpg',
    nandi: '/images/animals/nandi.jpg',
  },
  pujas: {
    templeHero: '/images/pujas/temple-hero.jpg',
    mahaSudarshana: '/images/pujas/maha-sudarshana.jpg',
    rudraAbhishekam: '/images/pujas/rudra-abhishekam.jpg',
  },
  seva: {
    fodderMonsoon: '/images/seva/fodder-monsoon.jpg',
    nourishment: '/images/seva/nourishment.jpg',
    healing: '/images/seva/healing.jpg',
    sanctuary: '/images/seva/sanctuary.jpg',
  },
  profile: {
    defaultAvatar: '/images/profile/default-avatar.jpg',
  },
  backgrounds: {
    authBg: '/images/backgrounds/auth-bg.jpg',
    impactBg: '/images/backgrounds/impact-bg.jpg',
  },
} as const;

export function getSafeImageUrl(url: string | undefined, fallback: string): string {
  if (!url) return fallback;
  return url;
}
