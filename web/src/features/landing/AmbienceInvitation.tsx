import { useState, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ambienceOn, declineAmbience, getAmbiencePref, startAmbience } from './ambience';

function subscribe(cb: () => void) {
  window.addEventListener('pratha-ambience', cb);
  return () => window.removeEventListener('pratha-ambience', cb);
}

// The threshold ritual — a whisper-quiet invitation in the hero that appears
// once, asks for an intentional tap, and either blooms into ambience or
// dissolves forever if declined. Never autoplays, never nags.
export function AmbienceInvitation() {
  const on = useSyncExternalStore(subscribe, ambienceOn);
  const [pref] = useState(() => getAmbiencePref());
  const [dismissed, setDismissed] = useState(false);
  const reduce = useReducedMotion();

  const visible = !dismissed && !on && pref === null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="landing-invite"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8, transition: { duration: 0.4 } }}
          transition={reduce ? { duration: 0.2 } : { delay: 1.6, duration: 0.8, ease: 'easeOut' }}
        >
          <button
            className="landing-invite-main"
            onClick={startAmbience}
            aria-label="Enter with the Gayatri Mantra playing softly"
          >
            <span className="landing-invite-om" aria-hidden>ॐ</span>
            <span className="landing-invite-text">
              Enter with the <b>Gayatri Mantra</b>
              <span className="landing-invite-sub">a soft chant beneath your journey</span>
            </span>
          </button>
          <button
            className="landing-invite-close"
            onClick={() => { declineAmbience(); setDismissed(true); }}
            aria-label="No, continue in silence"
            title="Continue in silence"
          >
            <X size={13} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
