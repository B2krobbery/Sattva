import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'motion/react';
import { askRishi } from '@/lib/api/ai';
import { ambienceOn, startAmbience } from '@/features/landing/ambience';
import { cn } from '@/lib/utils';

function subscribeAmbience(cb: () => void) {
  window.addEventListener('pratha-ambience', cb);
  return () => window.removeEventListener('pratha-ambience', cb);
}

interface RishiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  link?: { to: string; label: string };
}

// Extract an optional trailing machine line: LINK:/route|Label
function parseReply(text: string): Message {
  const m = text.match(/\n?LINK:(\/[\w\/\?=&-]+)\|([^\n]+)\s*$/);
  if (!m) return { role: 'assistant', content: text };
  return {
    role: 'assistant',
    content: text.slice(0, m.index).trim(),
    link: { to: m[1], label: m[2].trim().slice(0, 40) },
  };
}

export function RishiChatModal({ isOpen, onClose, initialPrompt }: RishiChatModalProps) {
  const navigate = useNavigate();
  const mantraOn = useSyncExternalStore(subscribeAmbience, ambienceOn);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hari Om, Devotee. I am Rishi, your Vedic spiritual guide at Pratha. How may I illuminate your journey of devotion, sanctuary seva, or auspicious timing today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "Which ritual is recommended for family peace & health?",
    "What is the spiritual significance of Gau Seva in the Vedas?",
    "Explain today's Panchang and auspicious Muhurat.",
    "How does Shri Krishna Gaushala protect indigenous cows?"
  ];

  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const text = queryText || input.trim();
    if (!text || loading) return;

    setInput('');
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await askRishi(text);
      setMessages(prev => [...prev, parseReply(res.answer || 'Blessings upon your journey. May peace prevail.')]);
    } catch (e: any) {
      const isAuth = e?.status === 401 || e?.message === 'not_authenticated' || /sign in/i.test(e?.message ?? '');
      setMessages(prev => [
        ...prev,
        isAuth
          ? { role: 'assistant', content: 'This conversation needs your sanctuary sign-in — your questions are personal and I keep them to your account.', link: { to: '/login', label: 'Sign in to continue' } }
          : { role: 'assistant', content: 'The sanctuary winds carry peace. An offline contemplation: In the Atharva Veda, serving Gomata and invoking divine fire brings harmony to hearth and soul.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed z-50 left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-full max-w-lg md:h-[80vh] h-[95vh] md:rounded-3xl rounded-t-3xl rounded-b-none bg-surface flex flex-col shadow-2xl border border-border outline-none overflow-hidden"
              >
                <header className="flex items-center justify-between p-4 border-b border-border-subtle bg-surface/90 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-terracotta flex items-center justify-center text-white font-serif text-xl shadow-inner">
                      ॐ
                    </div>
                    <div>
                      <Dialog.Title className="font-serif text-lg font-semibold text-text-primary m-0">
                        Rishi Companion
                      </Dialog.Title>
                      <Dialog.Description className="text-xs text-text-secondary">
                        Active • Ancient Wisdom & Seva
                      </Dialog.Description>
                      {!mantraOn && (
                        <button
                          className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-gold hover:text-terracotta transition-colors"
                          onClick={startAmbience}
                        >
                          ॐ Begin with the Gayatri Mantra
                        </button>
                      )}
                    </div>
                  </div>
                  <Dialog.Close asChild>
                    <button className="p-2 rounded-full text-text-muted hover:bg-surface-subtle hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta">
                      <X size={20} />
                      <span className="sr-only">Close</span>
                    </button>
                  </Dialog.Close>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar bg-background/50">
                  {messages.map((m, idx) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={idx}
                      className={cn("flex w-full", m.role === 'user' ? "justify-end" : "justify-start")}
                    >
                      <div className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] shadow-sm leading-relaxed",
                        m.role === 'user'
                          ? "bg-terracotta text-white rounded-br-sm"
                          : "bg-surface border border-border text-text-primary rounded-bl-sm"
                      )}>
                        {m.content}
                        {m.link && (
                          <button
                            onClick={() => { onClose(); navigate(m.link!.to); }}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-terracotta/10 text-terracotta text-xs font-semibold hover:bg-terracotta/20 transition-colors"
                          >
                            {m.link.label} →
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3 bg-surface border border-border shadow-sm flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin text-terracotta" />
                        <span className="text-sm text-text-secondary">Invoking Vedic contemplation...</span>
                      </div>
                    </motion.div>
                  )}

                  {messages.length === 1 && !loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-6 flex flex-col gap-2">
                      <p className="text-xs text-text-muted font-medium uppercase tracking-widest pl-1 mb-1">
                        Suggested Inquiries
                      </p>
                      {suggestions.map((sug, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(sug)}
                          className="text-left bg-surface hover:bg-surface-subtle border border-border-subtle hover:border-gold-glow transition-all rounded-xl px-4 py-3 text-sm text-text-secondary flex items-start gap-3 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
                        >
                          <Sparkles size={16} className="text-gold shrink-0 mt-0.5" />
                          <span className="leading-snug">{sug}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="p-4 bg-surface border-t border-border flex gap-3 pb-[calc(16px+env(safe-area-inset-bottom,0px))]"
                >
                  <input
                    type="text"
                    className="flex-1 bg-background border border-border rounded-full px-4 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-terracotta/50 focus:border-terracotta transition-all placeholder:text-text-muted text-text-primary"
                    placeholder="Ask of pujas, panchang, or gau seva..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="flex-shrink-0 w-11 h-11 rounded-full bg-terracotta text-white flex items-center justify-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-terracotta-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-terracotta"
                  >
                    <Send size={18} className="ml-1" />
                  </motion.button>
                </form>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
