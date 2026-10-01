import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAnimals, type Animal } from '@/lib/api/gaushala';
import { HeartHandshake, ShieldCheck, Stethoscope, Search, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IMAGES } from '@/lib/images';
import { CardSkeleton } from '@/components/ui/LoadingScreen';
import { SponsorModal } from './SponsorModal';
import { motion } from 'motion/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function GaushalaDiscovery() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sponsorAnimal, setSponsorAnimal] = useState<Animal | null>(null);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['animals'],
    queryFn: () => getAnimals(),
  });

  const getCuratedCowImage = (name: string) => {
    if (name.toLowerCase().includes('nandi')) return IMAGES.animals.nandi;
    if (name.toLowerCase().includes('kapila')) return IMAGES.animals.gauri;
    if (name.toLowerCase().includes('surabhi')) return IMAGES.animals.nandini;
    return IMAGES.animals.nandi; 
  };

  const defaultAnimals: Animal[] = [
    { id: 'cow_nandi_01', name: 'Nandi (Sahiwal)', breed: 'Sahiwal', ageStr: '4 Years', ageMonths: 48, imageUrl: IMAGES.animals.nandi, story: 'Rescued from highway traffic.'},
    { id: 'cow_surabhi_02', name: 'Surabhi (Gir)', breed: 'Gir', ageStr: '6 Years', ageMonths: 72, imageUrl: IMAGES.animals.nandini, story: 'Abandoned by dairy farmers.'},
    { id: 'calf_kapila_03', name: 'Kapila', breed: 'Tharparkar', ageStr: '3 Months', ageMonths: 3, imageUrl: IMAGES.animals.gauri, story: 'Found wandering near the forest edge.'},
  ];

  const animals = (data?.animals && data.animals.length > 0) ? data.animals : defaultAnimals;
  const filtered = animals.filter((animal) => {
    const matchesSearch = animal.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All'
      || (filter === 'Needs Medical' && Boolean(animal.healthStatus) && animal.healthStatus !== 'healthy')
      || (filter === 'Calves' && animal.ageMonths !== undefined && animal.ageMonths < 12)
      || ((filter === 'Sahiwal' || filter === 'Gir') && animal.breed?.toLowerCase().includes(filter.toLowerCase()));
    return matchesSearch && matchesFilter;
  });

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

  return (
    <motion.div variants={containerVariants} className="flex flex-col gap-6 md:gap-8 pb-10">
      
      <motion.section  className="flex flex-col gap-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5">
            <ShieldCheck size={14} /> Certified Sanctuary
          </div>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold text-text-primary">
          Meet the Rescued Herd
        </h1>
        <p className="text-text-secondary text-base md:text-lg leading-relaxed max-w-2xl">
          Discover the unique stories of indigenous cows at Shri Krishna Gaushala. Sponsor their food, shelter, and medical care.
        </p>
      </motion.section>

      <motion.section  className="sticky top-[72px] md:top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border -mx-4 px-4 md:mx-0 md:px-0 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex overflow-x-auto hide-scrollbar gap-2">
          {['All', 'Needs Medical', 'Calves', 'Sahiwal', 'Gir'].map((f) => (
            <button
              key={f}
              className={cn(
                "px-4 py-2 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-terracotta border",
                filter === f 
                  ? "bg-terracotta text-white border-terracotta " 
                  : "bg-surface border-border text-text-secondary hover:text-text-primary hover:bg-surface-subtle"
              )}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search by name..." 
            className="w-full md:w-64 bg-surface border border-border rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/50 transition-shadow"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </motion.section>

      <motion.section  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mt-2">
        {isLoading && <CardSkeleton count={6} />}
        {!isLoading && filtered.map((animal) => (
          <Card key={animal.id} className="flex flex-col overflow-hidden group hover:bg-surface-subtle transition-colors cursor-pointer" onClick={() => navigate(`/gaushala/animal/${animal.id}`)}>
            <div className="relative w-full aspect-[4/3] overflow-hidden bg-surface-subtle">
              <motion.img 
                layoutId={`img-${animal.id}`}
                src={getCuratedCowImage(animal.name)}
                alt={animal.name} 
                className="w-full h-full object-cover transition-transform duration-700"
              />
              {animal.needsSupport && (
                <div className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full shadow-lg" title="Requires Medical Attention">
                  <Stethoscope size={16} />
                </div>
              )}
            </div>

            <div className="p-5 flex flex-col justify-between flex-1 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-surface-subtle text-text-secondary px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-widest">{animal.breed}</span>
                  <span className="bg-surface-subtle text-text-secondary px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-widest">{animal.ageStr}</span>
                </div>
                
                <motion.h3 layoutId={`name-${animal.id}`} className="font-serif text-xl font-semibold text-text-primary mb-1">
                  {animal.name}
                </motion.h3>
                <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
                  {animal.story}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-border mt-auto">
                <Button 
                  className="flex-1 rounded-xl"
                  onClick={(e) => { e.stopPropagation(); setSponsorAnimal(animal); }}
                >
                  <HeartHandshake size={16} className="mr-1.5" /> Sponsor
                </Button>
                <Button 
                  variant="outline"
                  className="rounded-xl px-4"
                  onClick={(e) => { e.stopPropagation(); navigate(`/gaushala/animal/${animal.id}`); }}
                >
                  <Info size={18} />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </motion.section>

      <SponsorModal isOpen={!!sponsorAnimal} animal={sponsorAnimal} onClose={() => setSponsorAnimal(null)} />
    </motion.div>
  );
}
