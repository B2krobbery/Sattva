import { useEffect, useState } from 'react';
import { Music, VolumeX } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { RishiChatModal } from '@/features/ai/RishiChatModal';
import { ambienceOn, startAmbience, stopAmbience } from './ambience';

export function LandingFloaters() {
  const [rishiOpen, setRishiOpen] = useState(false);
  const [ambience, setAmbience] = useState(false);
  const reduce = useReducedMotion();

  // If the user navigates away mid-drone, silence it with the page.
  useEffect(() => () => { if (ambienceOn()) stopAmbience(); }, []);

  const toggleAmbience = () => {
    if (ambience) {
      stopAmbience();
      setAmbience(false);
    } else {
      startAmbience();
      setAmbience(true);
    }
  };

  return (
    <>
      <div className="landing-floaters">
        {/* Sacred ambience — off by default, one intentional tap to enable */}
        <motion.button
          className={`landing-floater landing-floater--ambience ${ambience ? 'is-on' : ''}`}
          onClick={toggleAmbience}
          aria-label={ambience ? 'Turn off the Gayatri Mantra' : 'Play the Gayatri Mantra softly'}
          aria-pressed={ambience}
          title={ambience ? 'Silence the Gayatri Mantra' : 'Gayatri Mantra ambience'}
          whileTap={reduce ? {} : { scale: 0.92 }}
        >
          {ambience ? <Music size={16} /> : <VolumeX size={16} />}
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
