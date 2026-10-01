// Kundali-based puja recommendation. JWT-gated (verify_jwt at gateway +
// in-function getUser). Computes janma nakshatra / rashi / tithi / lagna
// from DOB+TOB+POB using low-precision geocentric ephemeris (Schlyter),
// sidereal via Lahiri ayanamsa. Nakshatra/rashi/tithi do not depend on
// place of birth; lagna does (geocoded via Nominatim when coords absent).
// Gemini (vault key) narrates the "why" in Rishi's voice.
import { createClient } from "npm:@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const DEG = Math.PI / 180;
const NAKSHATRA_SPAN = 360 / 27;
const RASHI_SPAN = 30;

// Lahiri ayanamsa, degrees — 23.853° at J2000, ~1.3968°/century precession.
function lahiriAyanamsa(jd: number): number {
  const centuries = (jd - 2451545.0) / 36525;
  return 23.853 + centuries * 1.3968;
}

function norm(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

// Days since J2000.0 (2000-01-01 12:00 UT).
function dayNumber(jd: number): number {
  return jd - 2451545.0;
}

function julianDay(y: number, m: number, d: number, utHours: number): number {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) +
    d + utHours / 24 + B - 1524.5;
}

function sunLongitude(d: number): number {
  const w = 282.9404 + 4.70935e-5 * d;
  const e = 0.016709 - 1.151e-9 * d;
  const M = norm(356.0470 + 0.9856002585 * d);
  const E = M + e * (1 / DEG) * Math.sin(M * DEG) * (1 + e * Math.cos(M * DEG));
  const xv = Math.cos(E * DEG) - e;
  const yv = Math.sqrt(1 - e * e) * Math.sin(E * DEG);
  const v = Math.atan2(yv, xv) / DEG;
  return norm(v + w);
}

function moonLongitude(d: number): number {
  const N = norm(125.1228 - 0.0529538083 * d);
  const i = 5.1454;
  const w = norm(318.0634 + 0.1643573223 * d);
  const a = 60.2666;
  const e = 0.054900;
  const M = norm(115.3654 + 13.0649929509 * d);

  let E = M + e * (1 / DEG) * Math.sin(M * DEG) * (1 + e * Math.cos(M * DEG));
  for (let k = 0; k < 3; k++) {
    E = E - (E - e * (1 / DEG) * Math.sin(E * DEG) - M) /
      (1 - e * Math.cos(E * DEG));
  }
  const xv = a * (Math.cos(E * DEG) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E * DEG);
  const r = Math.sqrt(xv * xv + yv * yv);
  const v = Math.atan2(yv, xv) / DEG;
  const vw = (v + w) * DEG;

  const xeclip = r * (Math.cos(N * DEG) * Math.cos(vw) - Math.sin(N * DEG) * Math.sin(vw) * Math.cos(i * DEG));
  const yeclip = r * (Math.sin(N * DEG) * Math.cos(vw) + Math.cos(N * DEG) * Math.sin(vw) * Math.cos(i * DEG));
  let lon = norm(Math.atan2(yeclip, xeclip) / DEG);

  // Longitude perturbations (major terms).
  const Ms = norm(356.0470 + 0.9856002585 * d);
  const Lm = norm(N + w + M);
  const Ls = norm(282.9404 + 4.70935e-5 * d + Ms);
  const D = norm(Lm - Ls);
  const F = norm(Lm - N);
  const s = (x: number) => Math.sin(x * DEG);
  lon += -1.274 * s(M - 2 * D) + 0.658 * s(2 * D) - 0.186 * s(Ms) -
    0.059 * s(2 * M - 2 * D) - 0.057 * s(M - 2 * D + Ms) +
    0.053 * s(M + 2 * D) + 0.046 * s(2 * D - Ms) + 0.041 * s(M - Ms) -
    0.035 * s(D) - 0.031 * s(M + Ms) - 0.015 * s(2 * F - 2 * D) +
    0.011 * s(M - 4 * D);
  return norm(lon);
}

// Lagna: scan the ecliptic for the point crossing the eastern
// horizon (alt 0, hour angle < 0). Avoids closed-form quadrant errors.
function ascendantScan(jd: number, lat: number, lon: number): number | null {
  const T = (jd - 2451545.0) / 36525;
  const eps = (23.4392911 - 0.0130042 * T) * DEG;
  const gmst = norm(280.46061837 + 360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T);
  const lst = norm(gmst + lon) * DEG;
  const phi = lat * DEG;
  let prevAlt: number | null = null;
  for (let i = 0; i <= 3600; i++) {
    const lam = (i / 10) * DEG;
    const ra = Math.atan2(Math.sin(lam) * Math.cos(eps), Math.cos(lam));
    const dec = Math.asin(Math.sin(lam) * Math.sin(eps));
    const H = lst - ra;
    const alt = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H);
    // Any zero crossing with sin(H)<0 is the eastern horizon (ascendant);
    // altitude decreases through it as ecliptic longitude increases.
    if (prevAlt !== null && (prevAlt < 0) !== (alt < 0) && Math.sin(H) < 0) {
      return i / 10;
    }
    prevAlt = alt;
  }
  return null;
}

// Offline coordinates for major Indian cities (fallback before Nominatim).
const CITY_COORDS: Record<string, [number, number]> = {
  "varanasi": [25.3176, 82.9739], "kashi": [25.3176, 82.9739],
  "delhi": [28.6139, 77.209], "new delhi": [28.6139, 77.209],
  "mumbai": [19.076, 72.8777], "kolkata": [22.5726, 88.3639],
  "chennai": [13.0827, 80.2707], "bengaluru": [12.9716, 77.5946],
  "bangalore": [12.9716, 77.5946], "hyderabad": [17.385, 78.4867],
  "pune": [18.5204, 73.8567], "ahmedabad": [23.0225, 72.5714],
  "jaipur": [26.9124, 75.7873], "lucknow": [26.8467, 80.9462],
  "vrindavan": [27.581, 77.7006], "mathura": [27.4924, 77.6737],
  "ujjain": [23.1765, 75.7885], "tirupati": [13.6288, 79.4192],
  "haridwar": [29.9457, 78.1642], "rishikesh": [30.0869, 78.2676],
  "prayagraj": [25.4358, 81.8463], "allahabad": [25.4358, 81.8463],
  "ayodhya": [26.7922, 82.1998], "puri": [19.8135, 85.8312],
  "madurai": [9.9252, 78.1198], "kochi": [9.9312, 76.2673],
  "nagpur": [21.1458, 79.0882], "indore": [22.7196, 75.8577],
  "patna": [25.5941, 85.1376], "surat": [21.1702, 72.8311],
  "nashik": [19.9975, 73.7898], "goa": [15.2993, 74.124],
};

function lookupPlace(place: string): { lat: number; lon: number } | null {
  const q = place.toLowerCase();
  for (const [name, [lat, lon]] of Object.entries(CITY_COORDS)) {
    if (q.includes(name)) return { lat, lon };
  }
  return null;
}

// Rough timezone estimate: IST inside India's bounding box, otherwise
// longitude-based (nearest half-hour zone per 7.5°).
function estimateTzOffsetMin(lat: number, lon: number): number {
  if (lat >= 6 && lat <= 37.5 && lon >= 68 && lon <= 97.5) return 330;
  return Math.round(lon / 7.5) * 30;
}

const NAKSHATRAS: { name: string; deity: string; lord: string; worship: string }[] = [
  { name: "Ashwini", deity: "Ashwini Kumaras", lord: "Ketu", worship: "Ketu shanti japa; healing prayers; Ganesha puja" },
  { name: "Bharani", deity: "Yama", lord: "Venus", worship: "Lakshmi puja; Shukra japa; honouring ancestors" },
  { name: "Krittika", deity: "Agni", lord: "Sun", worship: "Surya namaskar; Aditya Hridaya; Agni homa" },
  { name: "Rohini", deity: "Brahma", lord: "Moon", worship: "Chandra japa; Shiva puja; Somvar vrat" },
  { name: "Mrigashira", deity: "Soma (Chandra)", lord: "Mars", worship: "Hanuman puja; Mangal shanti; Shiva abhishekam" },
  { name: "Ardra", deity: "Rudra", lord: "Rahu", worship: "Rudra abhishekam; Rahu-Ketu shanti puja" },
  { name: "Punarvasu", deity: "Aditi", lord: "Jupiter", worship: "Guru puja; Vishnu sahasranama; Brihaspati japa" },
  { name: "Pushya", deity: "Brihaspati", lord: "Saturn", worship: "Shani puja; Guru puja; feeding Brahmins/cows" },
  { name: "Ashlesha", deity: "Naga devatas", lord: "Mercury", worship: "Naga puja; Ganesh puja; Budha japa" },
  { name: "Magha", deity: "Pitris (ancestors)", lord: "Ketu", worship: "Tarpana / Pitru puja; Ketu japa" },
  { name: "Purva Phalguni", deity: "Bhaga", lord: "Venus", worship: "Lakshmi puja; Shukra japa; seva through charity" },
  { name: "Uttara Phalguni", deity: "Aryaman", lord: "Sun", worship: "Surya puja; Aditya Hridaya; charity on Sundays" },
  { name: "Hasta", deity: "Savitar", lord: "Moon", worship: "Chandra japa; Shiva puja; meditation on Mondays" },
  { name: "Chitra", deity: "Vishwakarma", lord: "Mars", worship: "Hanuman puja; Mangal shanti; Hanuman Chalisa" },
  { name: "Swati", deity: "Vayu", lord: "Rahu", worship: "Rahu shanti; Saraswati puja; pranayama sadhana" },
  { name: "Vishakha", deity: "Indra-Agni", lord: "Jupiter", worship: "Guru puja; Vishnu puja; Brihaspati japa" },
  { name: "Anuradha", deity: "Mitra", lord: "Saturn", worship: "Shani shanti; Vishnu puja; seva and discipline" },
  { name: "Jyeshtha", deity: "Indra", lord: "Mercury", worship: "Ganesh puja; Budha japa; Vishnu sahasranama" },
  { name: "Mula", deity: "Nirriti", lord: "Ketu", worship: "Mula shanti puja; Ketu japa; Ganesha worship" },
  { name: "Purva Ashadha", deity: "Apas (water)", lord: "Venus", worship: "Lakshmi puja; jal abhishekam; Shukra japa" },
  { name: "Uttara Ashadha", deity: "Vishvadevas", lord: "Sun", worship: "Surya puja; Gayatri japa; Aditya Hridaya" },
  { name: "Shravana", deity: "Vishnu", lord: "Moon", worship: "Vishnu sahasranama; Chandra japa; Somvar vrat" },
  { name: "Dhanishta", deity: "Vasus", lord: "Mars", worship: "Hanuman puja; Mangal shanti; Shiva damaru worship" },
  { name: "Shatabhisha", deity: "Varuna", lord: "Rahu", worship: "Rahu shanti; Varuna/Neela Devi puja; sadhana" },
  { name: "Purva Bhadrapada", deity: "Ajaikapada", lord: "Jupiter", worship: "Guru puja; Rudra puja; Brihaspati japa" },
  { name: "Uttara Bhadrapada", deity: "Ahirbudhnya", lord: "Saturn", worship: "Shani puja; Shiva puja; disciplined sadhana" },
  { name: "Revati", deity: "Pushan", lord: "Mercury", worship: "Vishnu/Ganesh puja; Budha japa; cow seva" },
];

const RASHIS = ["Mesha (Aries)", "Vrishabha (Taurus)", "Mithuna (Gemini)", "Karka (Cancer)",
  "Simha (Leo)", "Kanya (Virgo)", "Tula (Libra)", "Vrishchika (Scorpio)",
  "Dhanu (Sagittarius)", "Makara (Capricorn)", "Kumbha (Aquarius)", "Meena (Pisces)"];

const TITHIS = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi",
  "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi",
  "Chaturdashi", "Purnima"];

async function geocode(place: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`,
      { headers: { "User-Agent": "Pratha-App/1.0 (kundali lookup)" } },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows?.[0]) return null;
    return { lat: parseFloat(rows[0].lat), lon: parseFloat(rows[0].lon) };
  } catch {
    return null;
  }
}

let cachedGeminiKey: string | null = null;
async function getGeminiKey(): Promise<string | null> {
  const envKey = Deno.env.get("GEMINI_API_KEY");
  if (envKey) return envKey;
  if (cachedGeminiKey) return cachedGeminiKey;
  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await serviceClient.rpc("get_edge_secret", { p_name: "gemini_api_key" });
    if (error || !data) return null;
    cachedGeminiKey = data as string;
    return cachedGeminiKey;
  } catch {
    return null;
  }
}

async function narrate(facts: string): Promise<string | null> {
  const key = await getGeminiKey();
  if (!key) return null;
  const model = Deno.env.get("AI_MODEL") || "gemini-2.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are Rishi, a warm Vedic guide in the Pratha app. Given a devotee's computed janma chart facts, explain in 2–3 warm sentences why these puja suggestions suit them. No predictions, no fear language." }] },
        contents: [{ parts: [{ text: facts }] }],
        // gemini-2.5 spends output tokens on thinking; disable it.
        generationConfig: { maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
      }),
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const { data: authData, error: authError } = await createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  }).auth.getUser(token);
  if (authError || !authData.user) return jsonResponse({ error: "Sign in required" }, 401);

  let body: { dob?: string; tob?: string; pob?: string; tzOffsetMin?: number };
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON body" }, 400); }

  let { dob, tob, pob } = body;
  let tzOffsetMin: number | null = typeof body.tzOffsetMin === "number" ? body.tzOffsetMin : null;

  // Fall back to saved profile fields.
  if (!dob) {
    const svc = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile } = await svc
      .from("profiles")
      .select("birth_date, birth_time, birth_place")
      .eq("id", authData.user.id)
      .single();
    dob = profile?.birth_date ?? undefined;
    tob = tob ?? (profile?.birth_time ?? undefined);
    pob = pob ?? (profile?.birth_place ?? undefined);
  }
  if (!dob) return jsonResponse({ error: "Birth date required" }, 400);

  const [y, m, d] = dob.split("-").map(Number);
  if (!y || !m || !d) return jsonResponse({ error: "Invalid dob (YYYY-MM-DD)" }, 400);
  const [hh, mm] = (tob || "12:00").split(":").map(Number);

  // Resolve birth place: offline city table first, Nominatim as fallback.
  const geo = pob ? (lookupPlace(pob) ?? await geocode(pob)) : null;
  if (tzOffsetMin === null) {
    tzOffsetMin = geo ? estimateTzOffsetMin(geo.lat, geo.lon) : 330; // default IST
  }

  const localHours = (isNaN(hh) ? 12 : hh) + (isNaN(mm) ? 0 : mm) / 60;
  const utHours = localHours - tzOffsetMin / 60;
  const jd = julianDay(y, m, d, utHours);
  const dn = dayNumber(jd);
  const ayan = lahiriAyanamsa(jd);

  const sunTrop = sunLongitude(dn);
  const moonTrop = moonLongitude(dn);
  const moonSid = norm(moonTrop - ayan);
  const sunSid = norm(sunTrop - ayan);

  const nakIdx = Math.min(26, Math.floor(moonSid / NAKSHATRA_SPAN));
  const pada = Math.floor((moonSid % NAKSHATRA_SPAN) / (NAKSHATRA_SPAN / 4)) + 1;
  const nak = NAKSHATRAS[nakIdx];
  const rashi = RASHIS[Math.min(11, Math.floor(moonSid / RASHI_SPAN))];
  const sunRashi = RASHIS[Math.min(11, Math.floor(sunSid / RASHI_SPAN))];

  const tithiNum = Math.floor(norm(moonTrop - sunTrop) / 12);
  const paksha = tithiNum < 15 ? "Shukla" : "Krishna";
  const tithiName = `${paksha} ${tithiNum === 29 ? "Amavasya" : TITHIS[tithiNum % 15]}`;

  // Lagna needs coordinates; geocode place of birth if provided.
  let lagna: string | null = null;
  if (geo) {
    const ascTrop = ascendantScan(jd, geo.lat, geo.lon);
    if (ascTrop !== null) {
      const ascSid = norm(ascTrop - ayan);
      lagna = RASHIS[Math.min(11, Math.floor(ascSid / RASHI_SPAN))];
    }
  }

  const chart = {
    janmaNakshatra: nak.name, pada, nakshatraDeity: nak.deity, nakshatraLord: nak.lord,
    moonRashi: rashi, sunRashi, tithi: tithiName, lagna,
    suggestedWorship: nak.worship,
    note: "Low-precision sidereal computation (Lahiri ayanamsa); timezone auto-derived from birthplace (IST within India).",
  };

  const narration = await narrate(
    `Birth chart: janma nakshatra ${nak.name} pada ${pada} (deity ${nak.deity}, lord ${nak.lord}), moon rashi ${rashi}, tithi ${tithiName}${lagna ? `, lagna ${lagna}` : ""}. Suggested worship: ${nak.worship}.`,
  );

  return jsonResponse({ chart, narration });
});
