// Sacred ambience — the Gayatri Mantra, streamed from Supabase Storage
// (devotional-audio bucket, public read). The experience is intentional:
// nothing plays until a tap, preference persists in localStorage, and
// playback suspends when the tab hides. Components subscribe via the
// 'pratha-ambience' window event.

const AMBIENCE_URL =
  'https://yxwwgynxgihrktwndhep.supabase.co/storage/v1/object/public/devotional-audio/gayatri-mantra.mp3';
const TARGET_VOLUME = 0.32; // deliberately quiet — supports, never competes
const FADE_IN_MS = 2800;
const FADE_OUT_MS = 1200;

const PREF_KEY = 'pratha:ambience';
export type AmbiencePref = 'on' | 'off' | null;

export function getAmbiencePref(): AmbiencePref {
  try {
    const v = localStorage.getItem(PREF_KEY);
    return v === 'on' || v === 'off' ? v : null;
  } catch {
    return null;
  }
}

function setAmbiencePref(v: 'on' | 'off') {
  try {
    localStorage.setItem(PREF_KEY, v);
  } catch {
    /* private mode etc. — ambience just won't persist */
  }
}

let audio: HTMLAudioElement | null = null;
let fadeRaf = 0;
let playing = false;
let suspendedByVisibility = false;

function emit() {
  window.dispatchEvent(new CustomEvent('pratha-ambience', { detail: { on: playing } }));
}

export function ambienceOn(): boolean {
  return playing;
}

function fade(el: HTMLAudioElement, target: number, ms: number, then?: () => void) {
  cancelAnimationFrame(fadeRaf);
  const start = el.volume;
  const t0 = performance.now();
  const step = (t: number) => {
    const k = Math.min((t - t0) / ms, 1);
    el.volume = start + (target - start) * k;
    if (k < 1) fadeRaf = requestAnimationFrame(step);
    else then?.();
  };
  fadeRaf = requestAnimationFrame(step);
}

export function startAmbience() {
  if (!audio) {
    audio = new Audio(AMBIENCE_URL);
    audio.loop = true;
    audio.preload = 'auto';
  }
  playing = true;
  audio.volume = 0;
  void audio.play().then(() => {
    if (audio) fade(audio, TARGET_VOLUME, FADE_IN_MS);
  }).catch(() => {
    playing = false;
  });
  setAmbiencePref('on');
  emit();
}

export function stopAmbience(persist = true) {
  playing = false;
  suspendedByVisibility = false;
  if (persist) setAmbiencePref('off');
  emit();
  const el = audio;
  if (!el) return;
  fade(el, 0, FADE_OUT_MS, () => el.pause());
}

export function toggleAmbience() {
  if (playing) stopAmbience();
  else startAmbience();
}

// User dismissed the invitation without enabling — never ask again.
export function declineAmbience() {
  setAmbiencePref('off');
  emit();
}

// Suspend/resume with tab visibility — a resume, not an autoplay: the media
// element was already unlocked by the user's tap.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing && audio) {
      suspendedByVisibility = true;
      fade(audio, 0, 600, () => audio?.pause());
    } else if (!document.hidden && suspendedByVisibility && audio) {
      suspendedByVisibility = false;
      void audio.play().then(() => {
        if (audio && playing) fade(audio, TARGET_VOLUME, 1200);
      }).catch(() => { /* browser declined resume — user can re-tap */ });
    }
  });
}
