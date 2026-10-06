// Sacred ambience — a synthesized tanpura-style drone (Sa–Pa around the
// traditional 136.1 Hz Om tuning). Generated live with WebAudio so the
// landing ships no copyrighted audio; a licensed recording can replace the
// engine later without changing the control.

interface DroneVoice {
  osc: OscillatorNode;
  gain: GainNode;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let voices: DroneVoice[] = [];
let lfo: OscillatorNode | null = null;

export function ambienceOn(): boolean {
  return !!master;
}

export function startAmbience() {
  if (ctx) return;
  ctx = new AudioContext();

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 900;
  lowpass.Q.value = 0.4;

  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(lowpass).connect(ctx.destination);

  const freqs: [number, number][] = [
    [136.1, 0.5],   // Sa — Om
    [204.15, 0.34], // Pa — perfect fifth
    [272.2, 0.12],  // octave shimmer
  ];
  voices = freqs.map(([freq, vol], i) => {
    const osc = ctx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = (i - 1) * 3; // gentle warmth
    const gain = ctx!.createGain();
    gain.gain.value = vol;
    osc.connect(gain).connect(master!);
    osc.start();
    return { osc, gain };
  });

  // Slow breathing swell
  lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.06;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.035;
  lfo.connect(lfoGain).connect(master.gain);
  lfo.start();

  master.gain.linearRampToValueAtTime(0.11, ctx.currentTime + 4);
}

export function stopAmbience() {
  if (!ctx || !master) return;
  const c = ctx;
  const m = master;
  const v = voices;
  const l = lfo;
  ctx = null;
  master = null;
  voices = [];
  lfo = null;

  m.gain.cancelScheduledValues(c.currentTime);
  m.gain.setValueAtTime(m.gain.value, c.currentTime);
  m.gain.linearRampToValueAtTime(0, c.currentTime + 1.5);
  setTimeout(() => {
    v.forEach(({ osc }) => osc.stop());
    l?.stop();
    void c.close();
  }, 1800);
}
