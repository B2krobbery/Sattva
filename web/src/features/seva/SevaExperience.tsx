import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  HeartHandshake,
  Leaf,
  Receipt,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { IMAGES, getSafeImageUrl } from '@/lib/images';
import { getSevaCampaigns, type SevaCampaign } from '@/lib/api/profile';
import { getWelfareStats } from '@/lib/api/gaushala';
import { DonationModal } from './DonationModal';
import './Seva.css';

export function SevaExperience() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<SevaCampaign | null>(null);

  const { data: campaigns } = useQuery({ queryKey: ['seva-campaigns'], queryFn: getSevaCampaigns });
  const { data: welfare } = useQuery({ queryKey: ['welfareStats'], queryFn: getWelfareStats });

  const openSeva = (c?: SevaCampaign) => {
    setActiveCampaign(c ?? null);
    setModalOpen(true);
  };

  return (
    <div className="seva-page">
      {/* ── Hero ── */}
      <section className="seva-hero">
        <img src={IMAGES.seva.fodderMonsoon} alt="" className="seva-hero-img" />
        <div className="seva-hero-veil" />
        <div className="seva-hero-inner">
          <span className="seva-eyebrow"><HeartHandshake size={13} /> Gau Seva</span>
          <h1 className="seva-hero-title">
            Nourish the Divine.<br />Sustain the Sanctuary.
          </h1>
          <p className="seva-hero-sub">
            Every offering becomes green fodder, medicine, and shelter —
            reaching the rescued herd directly, without middlemen.
          </p>
          {!!welfare?.totalRescued && (
            <div className="seva-hero-stat">
              <span className="seva-hero-stat-num">{welfare.totalRescued}</span>
              <span className="seva-hero-stat-cap">souls in sanctuary, each with a name</span>
            </div>
          )}
          <div className="seva-hero-actions">
            <button className="seva-cta-primary" onClick={() => openSeva()}>
              <Sparkles size={16} />
              <span>Offer Seva</span>
            </button>
            <Link to="/gaushala" className="seva-cta-ghost">
              <span>Meet the herd first</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── The journey of an offering ── */}
      <section className="seva-flow">
        {[
          { icon: Sparkles, title: 'You offer', desc: 'Choose a seva and a dedication — a name, a memory, a prayer.' },
          { icon: Receipt, title: 'It is recorded', desc: 'Your contribution enters your devotee profile with a reference and receipt.' },
          { icon: Leaf, title: 'It becomes care', desc: 'Fodder, medicine and shelter reach the herd — directly, without middlemen.' },
        ].map((s, i) => (
          <div key={i} className="seva-flow-step">
            <span className="seva-flow-num">{i + 1}</span>
            <div className="seva-flow-icon"><s.icon size={18} /></div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </section>

      {/* ── Live campaigns ── */}
      <section className="seva-campaigns">
        <div className="seva-campaigns-head">
          <span className="seva-eyebrow-dark">Live Sevas</span>
          <h2>Choose where your devotion lands.</h2>
        </div>

        <div className="seva-campaign-grid">
          {(campaigns ?? []).map((c) => {
            const pct = c.goalRupees && c.goalRupees > 0
              ? Math.min(100, Math.round(((c.raisedRupees ?? 0) / c.goalRupees) * 100))
              : null;
            return (
              <article key={c.id} className="seva-campaign-card">
                <div className="seva-campaign-img">
                  <img src={getSafeImageUrl(c.imageUrl, IMAGES.seva.nourishment)} alt="" loading="lazy" />
                </div>
                <div className="seva-campaign-body">
                  <h3>{c.title}</h3>
                  {c.description && <p>{c.description}</p>}
                  {c.goalRupees ? (
                    <div className="seva-goal">
                      <div className="seva-goal-bar">
                        <div className="seva-goal-fill" style={{ width: `${pct ?? 0}%` }} />
                      </div>
                      <div className="seva-goal-meta">
                        <span>₹{(c.raisedRupees ?? 0).toLocaleString('en-IN')} offered</span>
                        <span>of ₹{c.goalRupees.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ) : null}
                  <button className="seva-card-cta" onClick={() => openSeva(c)}>
                    <span>Offer Seva</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </article>
            );
          })}
          {(!campaigns || campaigns.length === 0) && (
            <p className="seva-empty">New sevas are being prepared. You can still offer a general contribution below.</p>
          )}
        </div>
      </section>

      {/* ── Trust ── */}
      <section className="seva-trust">
        <div className="seva-trust-item">
          <ShieldCheck size={20} />
          <div>
            <b>Direct care allocation</b>
            <span>Offerings fund fodder, medicine and shelter — nothing else.</span>
          </div>
        </div>
        <div className="seva-trust-item">
          <Receipt size={20} />
          <div>
            <b>Every offering recorded</b>
            <span>Reference + dedication stored in your devotee profile.</span>
          </div>
        </div>
        <div className="seva-trust-item">
          <HeartHandshake size={20} />
          <div>
            <b>Meet who you feed</b>
            <span>Each cow has a passport — name, breed, and care story.</span>
          </div>
        </div>
      </section>

      <DonationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultInitiative={activeCampaign?.id}
      />
    </div>
  );
}
