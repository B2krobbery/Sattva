// Low-precision Vedic panchang — real astronomy, not hardcoded values.
// Positions use Paul Schlyter's low-precision formulae (accurate to ~arcminutes,
// good enough for tithi/nakshatra at display granularity). Ayanamsa: Lahiri approx.

const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami',
  'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
  'Purnima', 'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi',
  'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi',
  'Chaturdashi', 'Amavasya',
];
const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashirsha', 'Ardra', 'Punarvasu',
  'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta',
  'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati',
];
// Vedic month ≈ sidereal solar sign at the start of the lunar month.
const MAAS_NAMES = [
  'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada',
  'Ashwin', 'Kartika', 'Margashirsha', 'Pausha', 'Magha', 'Phalguna',
];

const d2r = Math.PI / 180;
const norm = (x: number) => ((x % 360) + 360) % 360;

function daysSince2000(date: Date): number {
  return date.getTime() / 86400000 - 10957.5; // JD − 2451545.0
}

function sunLongitude(d: number): number {
  const g = norm(357.529 + 0.98560028 * d) * d2r;
  const q = 280.459 + 0.98564736 * d;
  return norm(q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
}

function moonLongitude(d: number): number {
  const N = norm(125.1228 - 0.0529538083 * d);
  const i = 5.1454;
  const w = norm(318.0634 + 0.1643573223 * d);
  const e = 0.0549;
  const M = norm(115.3654 + 13.0649929509 * d);

  const Mr = M * d2r;
  const E = Mr + e * Math.sin(Mr) * (1 + e * Math.cos(Mr));
  const xv = Math.cos(E) - e;
  const yv = Math.sqrt(1 - e * e) * Math.sin(E);
  const v = Math.atan2(yv, xv); // true anomaly, rad
  const r = Math.sqrt(xv * xv + yv * yv);
  const u = v + w * d2r;        // argument of latitude, rad
  const Nr = N * d2r, ir = i * d2r;

  const x = r * (Math.cos(u) * Math.cos(Nr) - Math.sin(u) * Math.sin(Nr) * Math.cos(ir));
  const y = r * (Math.cos(u) * Math.sin(Nr) + Math.sin(u) * Math.cos(Nr) * Math.cos(ir));
  const lon = norm(Math.atan2(y, x) / d2r);

  // Major perturbations (Schlyter). Lm = mean longitude of the Moon.
  const Ms = norm(356.0470 + 0.9856002585 * d);   // Sun mean anomaly
  const Lm = norm(N + w + M);                     // Moon mean longitude
  const sunMean = norm(280.459 + 0.98564736 * d); // Sun mean longitude
  const D = norm(Lm - sunMean);                   // mean elongation
  const F = norm(Lm - N);                         // argument of latitude
  const s = (x: number) => Math.sin(x * d2r);
  const corr =
    -1.274 * s(Lm - 2 * D) + 0.658 * s(2 * D) - 0.186 * s(Ms)
    - 0.059 * s(2 * Lm - 2 * D) - 0.057 * s(Lm - 2 * D + Ms)
    + 0.053 * s(Lm + 2 * D) + 0.046 * s(2 * D - Ms)
    + 0.041 * s(Lm - Ms) - 0.035 * s(D) - 0.031 * s(Lm + Ms)
    - 0.015 * s(2 * F - 2 * D) + 0.011 * s(Lm - 4 * D);
  return norm(lon + corr);
}

// Lahiri ayanamsa approximation (~24.2° near 2026, +50.3″/yr)
function ayanamsa(d: number): number {
  return 23.853 + (d / 365.25) * 0.013969;
}

export interface Panchang {
  tithi: string;
  paksha: 'Shukla' | 'Krishna';
  tithiHint: string;
  nakshatra: string;
  nakshatraHint: string;
  maas: string;
  sunSign: string;
  approxSunrise?: string;
  approxSunset?: string;
}

const TITHI_HINTS: Record<string, string> = {
  Ekadashi: 'Sacred to Vishnu — vrata day', Purnima: 'Full moon — Satyanarayana day',
  Amavasya: 'New moon — ancestral offerings', Ashtami: 'Durga observances',
  Chaturthi: 'Ganesha observances', Trayodashi: 'Shiva pradosham',
  Shashthi: 'Murugan observances', Panchami: 'Naga & Saraswati',
};
const NAKSHATRA_HINTS: Record<string, string> = {
  Rohini: 'Creative & nurturing', Mrigashirsha: 'Gentle seeking', Pushya: 'Most auspicious',
  Hasta: 'Skillful hands', Anuradha: 'Devotion', Shravana: 'Listening & learning',
  Revati: 'Journeys & completion', Ashwini: 'Swift beginnings', Bharani: 'Discipline',
  Krittika: 'Purifying fire', Ardra: 'Storm & renewal', Punarvasu: 'Return of light',
  Ashlesha: 'Embrace', Magha: 'Ancestors', 'Purva Phalguni': 'Rest & joy',
  'Uttara Phalguni': 'Partnership', Chitra: 'Brilliance', Swati: 'Independence',
  Vishakha: 'Determination', Jyeshtha: 'Responsibility', Mula: 'Roots',
  'Purva Ashadha': 'Invincible', 'Uttara Ashadha': 'Victory', Dhanishtha: 'Abundance',
  Shatabhisha: 'Healing', 'Purva Bhadrapada': 'Transformation', 'Uttara Bhadrapada': 'Depth',
};

const RASHI_NAMES = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'];

export function computePanchang(date = new Date()): Panchang {
  const d = daysSince2000(date);
  const sunLon = sunLongitude(d);
  const moonLon = moonLongitude(d);

  const elong = norm(moonLon - sunLon);
  const tithiIdx = Math.floor(elong / 12); // 0..29
  const paksha = tithiIdx < 15 ? 'Shukla' : 'Krishna';

  const siderealMoon = norm(moonLon - ayanamsa(d));
  const nakIdx = Math.floor(siderealMoon / (360 / 27)) % 27;

  const siderealSun = norm(sunLon - ayanamsa(d));
  const rashiIdx = Math.floor(siderealSun / 30) % 12;
  const maas = MAAS_NAMES[(rashiIdx + 1) % 12]; // lunar month named by sign of full-moon sun

  const tithi = TITHI_NAMES[tithiIdx];
  const nakshatra = NAKSHATRA_NAMES[nakIdx];

  return {
    tithi: `${paksha} ${tithi}`,
    paksha,
    tithiHint: TITHI_HINTS[tithi] ?? 'Daily observance',
    nakshatra,
    nakshatraHint: NAKSHATRA_HINTS[nakshatra] ?? 'Guided by the stars',
    maas,
    sunSign: RASHI_NAMES[rashiIdx],
  };
}
