// Sacred ambience — the Gayatri Mantra, streamed from Supabase Storage
// (devotional-audio bucket, public read). Off by default; the control is
// user-initiated so audio never plays unexpectedly. Volume ramps in via
// requestAnimationFrame so toggling never pops.

const AMBIENCE_URL =
  'https://yxwwgynxgihrktwndhep.supabase.co/storage/v1/object/public/devotional-audio/gayatri-mantra.mp3';
const TARGET_VOLUME = 0.45;
const FADE_MS = 2500;

let audio: HTMLAudioElement | null = null;
let fadeRaf = 0;

function fadeTo(target: number, then?: () => void) {
  if (!audio) return;
  cancelAnimationFrame(fadeRaf);
  const start = audio.volume;
  const t0 = performance.now();
  const step = (t: number) => {
    if (!audio) return;
    const k = Math.min((t - t0) / FADE_MS, 1);
    audio.volume = start + (target - start) * k;
    if (k < 1) fadeRaf = requestAnimationFrame(step);
    else then?.();
  };
  fadeRaf = requestAnimationFrame(step);
}

export function ambienceOn(): boolean {
  return !!audio && !audio.paused;
}

export function startAmbience() {
  if (audio) return;
  audio = new Audio(AMBIENCE_URL);
  audio.loop = true;
  audio.volume = 0;
  void audio.play().then(() => fadeTo(TARGET_VOLUME)).catch(() => {
    audio = null;
  });
}

export function stopAmbience() {
  if (!audio) return;
  const el = audio;
  audio = null;
  // Fade out on the element we still hold, then release it.
  cancelAnimationFrame(fadeRaf);
  const start = el.volume;
  const t0 = performance.now();
  const step = (t: number) => {
    const k = Math.min((t - t0) / 1200, 1);
    el.volume = start * (1 - k);
    if (k < 1) requestAnimationFrame(step);
    else { el.pause(); el.src = ''; }
  };
  requestAnimationFrame(step);
}
