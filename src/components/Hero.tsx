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
      className="relative bg-gradient-to-r from-rose-500 via-pink-500 to-sky-500 text-white overflow-hidden rounded-[2.5rem] mx-4 mt-6 lg:mx-8 shadow-xl shadow-rose-100/50"
    >
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?auto=format&fit=crop&q=80&w=2000"
          alt="Kids playing"
          className="w-full h-full object-cover opacity-40 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-rose-600/90 via-pink-500/80 to-sky-500/80"></div>
      </div>
      <div className="relative px-6 py-12 sm:px-16 sm:py-24 lg:py-32 max-w-4xl">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-display tracking-tight text-balance leading-tight drop-shadow-md"
        >
          {t('heroTitle')}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 text-base sm:text-xl text-rose-50 max-w-xl text-balance font-bold leading-relaxed drop-shadow-sm"
        >
          {t('heroDesc')}
        </motion.p>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 flex gap-4"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/products" className="inline-flex items-center justify-center px-6 py-3.5 sm:px-8 sm:py-4 border-2 sm:border-4 border-white text-base sm:text-lg font-black rounded-full text-rose-600 bg-white hover:bg-rose-50 transition-all shadow-lg active:scale-95">
              <ShoppingBag className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('shopNow')}
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

