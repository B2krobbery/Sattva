import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAnimals, type Animal } from '@/lib/api/gaushala';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Heart, 
  Calendar, 
  Activity, 
  Utensils, 
  FileText, 
  MapPin
} from 'lucide-react';
import { IMAGES } from '@/lib/images';
import { SponsorModal } from './SponsorModal';
import './AnimalPassport.css';

export function AnimalPassport() {
  const { id } = useParams<{ id: string }>();
  const [sponsorModalOpen, setSponsorModalOpen] = useState(false);

  // Returning from sign-in with ?sponsor=<id> — reopen the sponsor modal.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('sponsor') === id) {
      setSponsorModalOpen(true);
      setSearchParams((prev) => { prev.delete('sponsor'); return prev; }, { replace: true });
    }
  }, [id, searchParams, setSearchParams]);

  const { data } = useQuery({
    queryKey: ['animals'],
    queryFn: () => getAnimals(),
  });

  const defaultAnimal: Animal = {
    id: id || 'nandi_01',
    name: 'Nandi',
    breed: 'Vechur / Indigenous Desi',
    ageStr: '3.5 Years',
    gaushalaName: 'Shri Krishna Gaushala, Vrindavan',
    healthStatus: 'Recovering',
    healthDescription: 'Rescued following a collision on Mathura Highway. Left hind leg fractured, receiving daily ayurvedic Dashamoola oil massage, calcium mineral feed, and peaceful rest.',
    monthlyGoalRupees: 5000,
    raisedRupees: 3250,
    imageUrl: IMAGES.animals.nandi,
    story: 'Nandi was brought to our sanctuary by compassionate local villagers who found him stranded. Within 48 hours, our resident veterinarians stabilized his leg. Today he stands calmly, loves eating organic sugarcane jaggery from visitors, and is on the path to full recovery.',
    needsSupport: true
  };

  const foundAnimal = data?.animals?.find(a => a.id === id);
  const animal: Animal = foundAnimal 
    ? { 
        ...foundAnimal, 
        imageUrl: (foundAnimal.imageUrl?.startsWith('/images') ? foundAnimal.imageUrl : IMAGES.animals.nandi) 
      } 
    : defaultAnimal;

  const raised = animal.raisedRupees || 3250;
  const goal = animal.monthlyGoalRupees || 5000;
  const pct = Math.min(100, Math.round((raised / goal) * 100));

  return (
    <div className="passport-page">
      {/* Top Back Navigation */}
      <nav className="passport-top-nav">
        <Link to="/gaushala" className="btn-back-link">
          <ArrowLeft size={16} />
          <span>Back to Herd</span>
        </Link>
        <span className="badge-gold">
          <ShieldCheck size={13} />
          Sanctuary Resident #{animal.id}
        </span>
      </nav>

      {/* Hero Identity Card */}
      <section className="passport-hero-card">
        <div className="passport-img-box">
          <img 
            src={animal.imageUrl || IMAGES.animals.nandi} 
            alt={animal.name} 
          />
          <div className="passport-badge-tag">
            <Activity size={13} className="text-gold" />
            <span>{animal.healthStatus || 'Recovering'}</span>
          </div>
        </div>

        <div className="passport-body">
          <div className="passport-name-row">
            <div>
              <h1 className="passport-name">{animal.name}</h1>
              <p className="flex items-center gap-1 text-xs text-muted mt-0.5">
                <MapPin size={13} className="text-terracotta" />
                {animal.gaushalaName || 'Shri Krishna Gaushala, Vrindavan'}
              </p>
            </div>

            <button 
              className="btn-primary"
              onClick={() => setSponsorModalOpen(true)}
            >
              <Heart size={16} fill="currentColor" />
              <span>Sponsor Care</span>
            </button>
          </div>

          <div className="passport-attrs-grid">
            <div className="passport-attr-cell">
              <span className="attr-label">Breed</span>
              <span className="attr-value">{animal.breed || 'Indigenous'}</span>
            </div>
            <div className="passport-attr-cell">
              <span className="attr-label">Age</span>
              <span className="attr-value">{animal.ageStr || '3.5 Years'}</span>
            </div>
            <div className="passport-attr-cell">
              <span className="attr-label">Care Status</span>
              <span className="attr-value text-terracotta">{animal.healthStatus || 'Active Care'}</span>
            </div>
          </div>

          {/* Care Goal Progress */}
          <div className="care-goal-card">
            <div className="care-goal-header">
              <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                Monthly Welfare Sponsorship
              </span>
              <span className="font-serif font-bold text-sm text-terracotta">
                ₹{raised} / ₹{goal} ({pct}%)
              </span>
            </div>
            <div className="meter-bar-track">
              <div className="meter-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-text-secondary">
              ₹{goal - raised} remaining to complete this month's veterinary care and special fodder.
            </p>
          </div>
        </div>
      </section>

      {/* Story & Nutrition Grid */}
      <div className="passport-sections-grid">
        {/* Rescue Story */}
        <section className="passport-info-panel">
          <h3 className="panel-title">
            <FileText size={18} className="text-terracotta" />
            <span>Rescue Chronicle</span>
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            {animal.story || animal.healthDescription}
          </p>
        </section>

        {/* Nutrition Regimen */}
        <section className="passport-info-panel">
          <h3 className="panel-title">
            <Utensils size={18} className="text-tulsi" />
            <span>Daily Nutrition Regimen</span>
          </h3>
          <ul className="text-xs text-text-secondary flex flex-col gap-2 list-disc pl-4">
            <li><strong>12 kg</strong> Fresh Napier & Berseem Green Grass</li>
            <li><strong>3 kg</strong> Dry Sorghum Stalks for digestion</li>
            <li><strong>500 g</strong> Ayurvedic Mineral Salt & Organic Jaggery</li>
            <li>Filtered borehole water with calcium supplements</li>
          </ul>
        </section>
      </div>

      {/* Care & Veterinary Recovery Log Timeline */}
      <section className="passport-info-panel">
        <h3 className="panel-title">
          <Calendar size={18} className="text-gold" />
          <span>Care & Veterinary Recovery Log</span>
        </h3>

        <div className="timeline-list">
          <div className="timeline-node">
            <div className="timeline-dot" />
            <span className="timeline-date">Yesterday, 4:30 PM</span>
            <p className="timeline-desc">
              Administered Dashamoola herbal poultice and evening sorghum feeding. Caretaker reported gentle walking without limping.
            </p>
          </div>

          <div className="timeline-node">
            <div className="timeline-dot" />
            <span className="timeline-date">5 Days Ago</span>
            <p className="timeline-desc">
              Weekly veterinary inspection by Dr. R. Sharma. Bone alignment is 80% consolidated. Allowed 30 minutes pasture browsing.
            </p>
          </div>

          <div className="timeline-node">
            <div className="timeline-dot" />
            <span className="timeline-date">2 Weeks Ago</span>
            <p className="timeline-desc">
              Admitted to Shri Krishna Gaushala Recovery Shed after rescue. Deworming and wound cleansing completed.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Sponsorship Drawer */}
      <SponsorModal 
        animal={animal}
        isOpen={sponsorModalOpen}
        onClose={() => setSponsorModalOpen(false)}
      />
    </div>
  );
}
