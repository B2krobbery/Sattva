import { useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { RishiChatModal } from '@/features/ai/RishiChatModal';
import {
  ambienceOn,
  getAmbiencePref,
  toggleAmbience,
} from './ambience';

function subscribe(cb: () => void) {
  window.addEventListener('pratha-ambience', cb);
  return () => window.removeEventListener('pratha-ambience', cb);
}

// Tiny animated-equalizer medallion — reads as "sacred sound is breathing"
// rather than a generic speaker toggle.
function MantraBars({ active }: { active: boolean }) {
  return (
    <span className={`landing-mantra-bars ${active ? 'is-on' : ''}`} aria-hidden>
      <i /><i /><i />
    </span>
  );
}

export function LandingFloaters() {
  const [rishiOpen, setRishiOpen] = useState(false);
  const on = useSyncExternalStore(subscribe, ambienceOn);
  const [wasEnabled] = useState(() => getAmbiencePref() === 'on');
  const reduce = useReducedMotion();

  return (
    <>
      <div className="landing-floaters">
        <motion.button
          className={`landing-floater landing-floater--mantra ${on ? 'is-on' : ''} ${wasEnabled && !on ? 'was-on' : ''}`}
          onClick={toggleAmbience}
          aria-label={on ? 'Quiet the Gayatri Mantra' : 'Play the Gayatri Mantra softly'}
          aria-pressed={on}
          title={on ? 'Quiet the mantra' : 'Gayatri Mantra ambience'}
          whileTap={reduce ? {} : { scale: 0.92 }}
        >
          <MantraBars active={on} />
        </motion.button>

        {/* Rishi — the AI Vedic guide */}
        <motion.button
          className="landing-floater landing-floater--rishi"
          onClick={() => setRishiOpen(true)}
          aria-label="Ask Rishi — Vedic guide"
          whileHover={reduce ? {} : { scale: 1.05 }}
          whileTap={reduce ? {} : { scale: 0.94 }}
        >
          <span className="landing-rishi-ring" aria-hidden />
          <span className="landing-rishi-om" aria-hidden>ॐ</span>
        </motion.button>
        <AnimatePresence>
          {!rishiOpen && (
            <motion.button
              className="landing-rishi-hint"
              onClick={() => setRishiOpen(true)}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              Ask Rishi<span className="landing-rishi-hint-sub">your Vedic guide</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <RishiChatModal isOpen={rishiOpen} onClose={() => setRishiOpen(false)} />
    </>
  );
}
