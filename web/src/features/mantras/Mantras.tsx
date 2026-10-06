import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Flame, CheckCircle2 } from 'lucide-react';
import { getMantras } from '@/lib/api/learn';
import { getSadhanaStreak, checkinSadhana } from '@/lib/api/profile';
import { useAuth } from '@/features/auth/AuthContext';
import { redirectToLogin } from '@/lib/auth/redirect';
import './Mantras.css';

export function Mantras() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: mantras, isLoading, isError } = useQuery({ queryKey: ['mantras'], queryFn: getMantras });
  const { data: sadhana } = useQuery({
    queryKey: ['sadhana-streak'],
    queryFn: getSadhanaStreak,
    enabled: !!user,
  });

  const checkin = async () => {
    if (!user) { redirectToLogin(); return; }
    await checkinSadhana().catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['sadhana-streak'] });
  };

  return (
    <div className="mantras-page">
      <section className="mantras-hero">
        <span className="badge-gold">Sacred Sound</span>
        <h1 className="typography-headline-lg">Mantra Library</h1>
        <p>The sounds at the heart of practice — rendered correctly, with meaning, not shuffled audio.</p>
      </section>

      <button className={`sadhana-checkin ${sadhana?.todayDone ? 'done' : ''}`} onClick={checkin} disabled={sadhana?.todayDone}>
        {sadhana?.todayDone
          ? <><CheckCircle2 size={17} /> Today's japa recorded · {sadhana.streak} day streak</>
          : <><Flame size={17} /> Chanted today? Mark your sadhana{sadhana?.streak ? ` · ${sadhana.streak} day streak` : ''}</>}
      </button>

      {isLoading && <div className="discover-state">Preparing the mantras…</div>}
      {isError && <div className="discover-state discover-error">Could not load the mantra library.</div>}

      <div className="mantra-list">
        {(mantras ?? []).map((m) => (
          <article key={m.id} className="mantra-card">
            <div className="mantra-card-head">
              <h3 className="mantra-name">{m.name}</h3>
              {m.deity && <span className="mantra-deity">{m.deity}</span>}
            </div>
            {m.devanagari && <p className="mantra-devanagari" lang="sa">{m.devanagari}</p>}
            {m.transliteration && <p className="mantra-translit">{m.transliteration}</p>}
            {m.meaning && <p className="mantra-meaning">{m.meaning}</p>}
          </article>
        ))}
        {!isLoading && !isError && (mantras ?? []).length === 0 && (
          <div className="discover-empty"><Flame size={20} style={{ marginBottom: 6 }} /><br />The library is being curated.</div>
        )}
      </div>
    </div>
  );
}
