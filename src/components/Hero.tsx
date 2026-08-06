import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export const Hero: React.FC = () => {
  const { t } = useLanguage();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative bg-sky-400 text-white overflow-hidden rounded-[2.5rem] mx-4 mt-6 lg:mx-8 shadow-xl"
    >
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?auto=format&fit=crop&q=80&w=2000"
          alt="Kids playing"
          className="w-full h-full object-cover opacity-60 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500/90 via-sky-400/80 to-indigo-400/50"></div>
      </div>
      <div className="relative px-8 py-20 sm:px-16 sm:py-28 lg:py-36 max-w-4xl">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl font-extrabold font-display tracking-tight sm:text-6xl lg:text-7xl text-balance leading-[1.1] drop-shadow-md"
        >
          {t('heroTitle')}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 text-xl sm:text-2xl text-sky-50 max-w-xl text-balance font-bold leading-relaxed drop-shadow-sm"
        >
          {t('heroDesc')}
        </motion.p>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex gap-4"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/products" className="inline-flex items-center justify-center px-8 py-4 border-4 border-white text-lg font-bold rounded-full text-indigo-600 bg-white hover:bg-indigo-50 transition-all shadow-lg">
              <ShoppingBag className="w-5 h-5 mr-2" />
              {t('shopNow')}
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

