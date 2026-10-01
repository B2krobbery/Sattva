import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPujas, type Puja } from '@/lib/api/puja';
import { getProfile } from '@/lib/api/profile';
import { getJanmaChart } from '@/lib/api/kundali';
import { useAuth } from '@/features/auth/AuthContext';
import { MapPin, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { IMAGES } from '@/lib/images';
import { CardSkeleton } from '@/components/ui/LoadingScreen';
import { PujaDetailModal } from './PujaDetailModal';
import { motion } from 'motion/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function PujaDiscovery() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activePuja, setActivePuja] = useState<Puja | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pujas', selectedCategory],
    queryFn: () => getPujas(selectedCategory),
  });

  const { user } = useAuth();
  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: !!user,
  });
  const hasBirthDetails = !!profileData?.profile?.birthDate;
  const { data: kundali } = useQuery({
    queryKey: ['janma-chart'],
    queryFn: () => getJanmaChart(),
    enabled: !!user && hasBirthDetails,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const categories = ['All', 'Popular', 'Upcoming', 'Special', 'By Temple'];

  const defaultPujas: Puja[] = [
    {
      id: 'ganga_aarti_varanasi',
      title: 'Maha Ganga Aarti & Deep Daan',
      templeName: 'Dashashwamedh Ghat, Varanasi',
      location: 'Dashashwamedh Ghat, Varanasi',
      devoteesCount: '45.2k Devotees attending',
      priestTitle: 'Chief Archaka, Ganga Seva Nidhi',
      priestName: 'Pt. Jagannath Mishra',
      priestExp: '25+ Years Experience in Ganga Aradhana',
      significance: 'The Grand Ganga Aarti at Dashashwamedh Ghat is a mesmerizing ritual of lights, chants, and devotion invoking the blessings of Maa Ganga.',
      imageUrl: IMAGES.rituals.kashiVishwanathAarti,
      isFeatured: true,
      dateTimeStr: 'Daily, 6:45 PM IST',
      durationStr: '1.5 Hours',
      category: 'Popular',
      priceRupees: 1101,
      specialTag: 'Daily Mahapuja'
    },
    {
      id: 'maha_rudrabhishek',
      title: 'Maha Rudrabhishek',
      templeName: 'Kashi Vishwanath Temple, Varanasi',
      location: 'Kashi Vishwanath Temple, Varanasi',
      devoteesCount: '12.5k Devotees attending',
      priestTitle: 'Chief Priest, Kashi Vishwanath Mandir Trust',
      priestName: 'Pt. Rameshwar Shastri',
      priestExp: '30+ Years in Vedic Shiva Rituals',
      significance: 'Potent Vedic ritual dedicated to Lord Shiva to dispel darkness, heal illnesses, and awaken inner serenity.',
      imageUrl: IMAGES.pujas.rudraAbhishekam,
      isFeatured: true,
      dateTimeStr: 'Daily, 5:30 AM IST',
      durationStr: '2.5 Hours',
      category: 'Upcoming',
      priceRupees: 2501,
      specialTag: 'Maha Shivratri Special'
    },
    {
      id: 'navgrah_shanti_mahayajna',
      title: 'Navgrah Shanti Mahayajna',
      templeName: 'Navgrah Shanti Kshetra, Ujjain',
      location: 'Navgrah Mandir, Ujjain',
      devoteesCount: '8.9k Devotees attending',
      priestTitle: 'Head Astrologer & Yajna Master',
      priestName: 'Acharya Somnath Dixit',
      priestExp: '35+ Years in Vedic Astrology & Havans',
      significance: 'Powerful Vedic Yajna designed to pacify planetary afflictions and bestow peace, health, and prosperity upon the devotee family.',
      imageUrl: IMAGES.pujas.mahaSudarshana,
      isFeatured: false,
      dateTimeStr: 'Every Saturday, 8:00 AM IST',
      durationStr: '3.0 Hours',
      category: 'Special',
      priceRupees: 3100,
      specialTag: 'Graha Dosha Nivaran'
    },
    {
      id: 'tirupati_venkateshwara_archana',
      title: 'Special Sahasranama Archana',
      templeName: 'Sri Venkateswara Swamy Temple, Tirumala',
      location: 'Tirumala, Andhra Pradesh',
      devoteesCount: '28.4k Devotees attending',
      priestTitle: 'Senior Archaka, Tirumala Tirupati Devasthanams',
      priestName: 'Archaka Srinivasa Bhattacharya',
      priestExp: '20+ Years in Vaikhanasa Agama',
      significance: 'Sacred 1008 Holy Names recitation and lotus offering to Lord Venkateshwara for prosperity and divine protection.',
      imageUrl: IMAGES.pujas.templeHero,
      isFeatured: false,
      dateTimeStr: 'Every Friday, 6:00 AM IST',
      durationStr: '2.0 Hours',
      category: 'By Temple',
      priceRupees: 1501,
      specialTag: 'Balaji Blessings'
    }
  ];

  const pujas = (data?.pujas && data.pujas.length > 0) ? data.pujas : defaultPujas;
  const filteredPujas = selectedCategory === 'All' 
    ? pujas 
    : pujas.filter(p => p.category === selectedCategory || p.specialTag?.includes(selectedCategory));

  const getCuratedPujaImage = (p: Puja) => {
    const title = (p.title || '').toLowerCase();
    const id = (p.id || '').toLowerCase();
    if (id.includes('ganga') || title.includes('ganga')) return IMAGES.rituals.kashiVishwanathAarti;
    if (id.includes('rudra') || title.includes('rudra') || title.includes('shiva')) return IMAGES.pujas.rudraAbhishekam;
    if (id.includes('navgrah') || title.includes('navgrah') || title.includes('sudarshana')) return IMAGES.pujas.mahaSudarshana;
    if (id.includes('tirupati') || title.includes('venkateswara') || title.includes('archana')) return IMAGES.pujas.templeHero;
    return p.imageUrl || IMAGES.pujas.templeHero;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  return (
    <motion.div variants={containerVariants} className="flex flex-col gap-6 md:gap-8 pb-10">
      
      {/* Editorial Sanctuary Header Banner */}
      <motion.section  className="flex flex-col gap-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="bg-gold-light text-gold px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 border border-border-subtle">
            <ShieldCheck size={14} /> Vedic Rituals & Archana
          </div>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold text-text-primary">
          Sacred Pujas & Rituals
        </h1>
        <p className="text-text-secondary text-base md:text-lg leading-relaxed max-w-2xl">
          Invoke divine grace through authentic temple ceremonies performed in your name and Gotra by revered priests across sacred sanctums.
        </p>
      </motion.section>

      {/* Janma-based recommendations */}
      {user && hasBirthDetails && kundali && (
        <motion.section className="rounded-2xl border border-border-subtle bg-surface p-5 md:p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gold">
            <Sparkles size={13} /> For Your Janma
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-secondary">
            <span><strong className="text-text-primary">{kundali.chart.janmaNakshatra}</strong> nakshatra (pada {kundali.chart.pada})</span>
            <span>Moon in <strong className="text-text-primary">{kundali.chart.moonRashi}</strong></span>
            <span><strong className="text-text-primary">{kundali.chart.tithi}</strong> tithi</span>
            {kundali.chart.lagna && <span><strong className="text-text-primary">{kundali.chart.lagna}</strong> lagna</span>}
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            Suggested worship: {kundali.chart.suggestedWorship}.
          </p>
          {kundali.narration && (
            <p className="text-sm text-text-muted leading-relaxed italic border-l-2 border-gold/40 pl-3">
              {kundali.narration.replace(/\*\*/g, '')}
            </p>
          )}
        </motion.section>
      )}
      {user && !hasBirthDetails && (
        <motion.section className="rounded-2xl border border-dashed border-border bg-surface-subtle p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <p className="text-sm text-text-secondary leading-relaxed">
            Want pujas matched to your <strong className="text-text-primary">janma nakshatra</strong>? Add your birth details once.
          </p>
          <Link to="/profile" className="btn-secondary whitespace-nowrap inline-flex items-center gap-2">
            Add Birth Details <ArrowRight size={14} />
          </Link>
        </motion.section>
      )}

      {/* Category Filter Pills */}
      <motion.section  className="sticky top-[72px] md:top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border -mx-4 px-4 md:mx-0 md:px-0 py-2">
        <div className="flex overflow-x-auto hide-scrollbar gap-2 md:gap-3">
          {categories.map((cat) => (
            <button
              key={cat}
              className={cn(
                "px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-terracotta border",
                selectedCategory === cat 
                  ? "bg-terracotta text-white border-terracotta " 
                  : "bg-surface border-border text-text-secondary hover:text-text-primary hover:bg-surface-subtle"
              )}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </motion.section>

      {/* Pujas List */}
      <motion.section  className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 mt-2">
        {isLoading && <CardSkeleton count={4} />}

        {!isLoading && filteredPujas.map((puja) => (
          <Card 
            key={puja.id} 
            className="flex flex-col overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-border-subtle"
            onClick={() => setActivePuja(puja)}
          >
            <div className="relative w-full aspect-[16/10] overflow-hidden bg-surface-subtle">
              <motion.img 
                layoutId={`image-${puja.id}`}
                src={getCuratedPujaImage(puja)} 
                alt={puja.title} 
                className="w-full h-full object-cover transition-transform duration-700"
              />
              {puja.specialTag && (
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-widest">{puja.specialTag}</span>
                </div>
              )}
            </div>

            <div className="p-5 md:p-6 flex flex-col justify-between flex-1 gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2.5">
                  <MapPin size={13} className="text-terracotta" />
                  <span>{puja.templeName}</span>
                </div>

                <motion.h3 layoutId={`title-${puja.id}`} className="font-serif text-xl font-semibold text-text-primary mb-2 line-clamp-2">
                  {puja.title}
                </motion.h3>

                {puja.priestName && (
                  <p className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                    <Sparkles size={14} className="text-gold shrink-0" />
                    <span className="truncate">{puja.priestName} ({puja.priestTitle || 'Archaka'})</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                <div>
                  <span className="text-[11px] uppercase font-bold tracking-widest text-text-muted block mb-0.5">Sankalpa Dakshina</span>
                  <span className="font-serif font-bold text-xl text-text-primary">₹{puja.priceRupees}</span>
                </div>

                <Button 
                  onClick={(e) => { e.stopPropagation(); setActivePuja(puja); }}
                  className="rounded-full px-5 gap-2"
                >
                  <span>Book Puja</span>
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </motion.section>

      {/* Interactive Puja Details & Sankalpa Modal */}
      <PujaDetailModal 
        puja={activePuja} 
        onClose={() => setActivePuja(null)} 
      />
    </motion.div>
  );
}
