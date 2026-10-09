import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/utils';

interface InboxRow {
  id: string;
  title: string;
  body: string;
  cta: string | null;
  readAt: string | null;
  createdAt: string;
}

async function fetchInbox(): Promise<InboxRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title_i18n, body_i18n, data, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(15);
  if (error) return [];
  return (data || []).map((n) => ({
    id: n.id,
    title: (n.title_i18n as Record<string, string>)?.en || '',
    body: (n.body_i18n as Record<string, string>)?.en || '',
    cta: (n.data as { cta?: string; route?: string })?.cta
      || (n.data as { route?: string })?.route || null,
    readAt: n.read_at,
    createdAt: n.created_at,
  }));
}

export function NotificationBell({ openUp = false }: { openUp?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: inbox } = useQuery({
    queryKey: ['notifications-inbox'],
    queryFn: fetchInbox,
    enabled: !!user,
    refetchInterval: 60_000,
  });
  const unread = inbox?.filter((n) => !n.readAt) ?? [];

  if (!user) return null;

  const markRead = async (n: InboxRow) => {
    if (!n.readAt) {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id);
      queryClient.invalidateQueries({ queryKey: ['notifications-inbox'] });
    }
    if (n.cta) {
      setOpen(false);
      navigate(n.cta);
    }
  };

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-full bg-surface-subtle text-text-primary"
        aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ''}`}
      >
        <Bell size={15} />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-terracotta text-white text-[9px] font-bold flex items-center justify-center border-2 border-surface">
            {unread.length}
          </span>
        )}
      </motion.button>

      {/* Portal to body — the mobile header uses backdrop-blur, which makes
          it a containing block for `fixed` descendants and clips off-screen. */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <button
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
            />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              className={cn(
                // Mobile: fixed bottom sheet, viewport-safe. sm+: anchored dropdown.
                'fixed inset-x-4 bottom-4 top-auto z-50 max-h-[60dvh] overflow-y-auto rounded-2xl bg-surface border border-border-subtle shadow-xl',
                'sm:absolute sm:inset-auto sm:right-0 sm:w-80 sm:max-h-[420px]',
                openUp ? 'sm:bottom-10' : 'sm:top-10'
              )}
            >
              <div className="sticky top-0 bg-surface/95 backdrop-blur px-4 py-3 border-b border-border-subtle flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">Notifications</span>
                {unread.length > 0 && (
                  <button
                    onClick={async () => {
                      const ids = unread.map((n) => n.id);
                      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids);
                      queryClient.invalidateQueries({ queryKey: ['notifications-inbox'] });
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-tulsi"
                  >
                    <Check size={11} /> Mark all read
                  </button>
                )}
              </div>
              {(inbox ?? []).length === 0 && (
                <p className="text-xs text-text-muted p-6 text-center">Nothing yet — sacred updates will appear here.</p>
              )}
              {(inbox ?? []).map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-border-subtle/50 hover:bg-surface-subtle transition-colors',
                    !n.readAt && 'bg-terracotta-light/40'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!n.readAt && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-terracotta shrink-0" />}
                    <div className={cn(!n.readAt ? '' : 'pl-3.5')}>
                      <div className="text-[13px] font-semibold text-text-primary leading-snug">{n.title}</div>
                      {n.body && <div className="text-xs text-text-muted mt-0.5 leading-relaxed line-clamp-2">{n.body}</div>}
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
