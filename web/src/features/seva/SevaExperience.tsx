import { useState } from 'react';
import { HeartHandshake, Leaf, ShieldCheck, Activity, Users, ArrowRight } from 'lucide-react';
import { IMAGES } from '@/lib/images';
import { DonationModal } from './DonationModal';
import { motion } from 'motion/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function SevaExperience() {
  const [modalOpen, setModalOpen] = useState(false);

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  return (
    <motion.div variants={containerVariants} className="flex flex-col gap-8 md:gap-12 pb-10">
      
      {/* Hero Section */}
      <motion.section  className="relative rounded-[2rem] overflow-hidden bg-deep text-white p-8 md:p-12 shadow-2xl">
        <div className="absolute inset-0">
          <img src={IMAGES.animals.gauri} alt="Kapila Calf" className="w-full h-full object-cover opacity-40" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/75 to-deep/20" />
        
        <div className="relative z-10 flex flex-col items-start gap-4">
          <div className="bg-white/20 border border-white/20 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5">
            <HeartHandshake size={14} /> Sanctuary Seva
          </div>
          
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold max-w-2xl leading-tight">
            Nourish the Divine. Sustain the Sanctuary.
          </h1>
          <p className="text-white/80 text-lg max-w-xl leading-relaxed mb-4">
            Your monthly contribution directly provides green fodder, medical supplies, and shelter for over 450 rescued indigenous cows at our Vrindavan sanctum.
          </p>
          
          <Button onClick={() => setModalOpen(true)} className="bg-white text-deep hover:bg-white/90 rounded-full px-8 py-6 text-[15px] font-bold  flex items-center gap-2 group">
            Sponsor Green Fodder <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </motion.section>

      {/* Impact Stats */}
      <motion.section  className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Leaf, title: 'Fresh Green Fodder', desc: 'Sourced daily from local organic farmers to ensure optimal nutrition.', val: '1,200kg Daily' },
          { icon: Activity, title: 'Medical Care', desc: '24/7 on-site veterinary support for injured and elderly cows.', val: '45+ Treated/Wk' },
          { icon: Users, title: 'Community', desc: 'Providing livelihood to local Brajwasi caretakers and farmers.', val: '12 Caretakers' },
        ].map((stat, i) => (
          <Card key={i} className="p-6 md:p-8 flex flex-col gap-4 border border-border shadow-none bg-surface">
            <div className="w-12 h-12 rounded-full bg-tulsi-light text-tulsi flex items-center justify-center">
              <stat.icon size={24} />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-bold text-text-primary mb-1">{stat.val}</h3>
              <h4 className="font-semibold text-[15px] text-text-primary mb-2">{stat.title}</h4>
              <p className="text-sm text-text-secondary leading-relaxed">{stat.desc}</p>
            </div>
          </Card>
        ))}
      </motion.section>

      {/* Seva Packages */}
      <motion.section  className="flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-2 mb-2">
          <h2 className="font-serif text-3xl font-semibold text-text-primary">Choose Your Seva</h2>
          <p className="text-text-secondary">Select a contribution that resonates with your devotion.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: '1 Day Fodder Seva', price: 1100, desc: 'Provide fresh green fodder and jaggery to 11 cows for a day.', icon: Leaf },
            { name: 'Medical Seva', price: 2100, desc: 'Support the medical treatment of injured or elderly cows.', icon: Activity },
            { name: '1 Month Adoption', price: 5100, desc: 'Take complete responsibility for one cow for an entire month.', icon: ShieldCheck, featured: true },
          ].map((pkg, i) => (
            <Card key={i} className={`relative flex flex-col p-6 md:p-8 transition-transform hover:-translate-y-1 hover: ${pkg.featured ? 'border-terracotta shadow-lg ring-1 ring-terracotta' : 'border-border'}`}>
              {pkg.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-terracotta text-white px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest">
                  Most Preferred
                </div>
              )}
              <div className={`w-12 h-12 rounded-full mb-4 flex items-center justify-center ${pkg.featured ? 'bg-terracotta-light text-terracotta' : 'bg-surface-subtle text-text-secondary'}`}>
                <pkg.icon size={24} />
              </div>
              <h3 className="font-serif text-xl font-semibold text-text-primary mb-2">{pkg.name}</h3>
              <p className="text-sm text-text-secondary leading-relaxed flex-1 mb-6">{pkg.desc}</p>
              
              <div className="flex items-center justify-between mt-auto">
                <span className="font-serif font-bold text-2xl text-text-primary">₹{pkg.price}</span>
                <Button onClick={() => setModalOpen(true)} variant={pkg.featured ? 'default' : 'outline'} className="rounded-full">
                  Donate
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </motion.section>

      <DonationModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </motion.div>
  );
}
