import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const FAQ: React.FC = () => {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  const faqs = [
    { q: t('faqQ1'), a: t('faqA1') },
    { q: t('faqQ2'), a: t('faqA2') },
    { q: t('faqQ3'), a: t('faqA3') },
    { q: t('faqQ4'), a: t('faqA4') },
    { q: t('faqQ5'), a: t('faqA5') },
  ];

  return (
    <div className="flex-grow max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 md:py-20">
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-100 text-indigo-600 rounded-2xl mb-6">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
          {t('faq')}
        </h1>
        <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
          {t('faqSubtitle')}
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div 
            key={index} 
            className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all hover:shadow-md"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex items-center justify-between p-5 md:p-6 text-left focus:outline-none"
            >
              <span className="text-lg font-bold text-slate-800 pr-8">{faq.q}</span>
              {openIndex === index ? (
                <ChevronUp className="w-5 h-5 text-indigo-500 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
              )}
            </button>
            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <div className="px-5 pb-5 md:px-6 md:pb-6 text-slate-600 leading-relaxed text-base border-t border-slate-50 pt-4">
                    {faq.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className="mt-20 bg-gradient-to-tr from-indigo-600 to-sky-500 rounded-[2.5rem] p-8 md:p-12 text-center text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-4">{t('needMoreHelp')}</h2>
          <p className="text-indigo-50 text-lg mb-8 max-w-xl mx-auto">
            {t('needMoreHelpDesc')}
          </p>
          <a 
            href="/contact" 
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-indigo-600 font-black rounded-full hover:bg-indigo-50 transition-all hover:scale-105 shadow-lg"
          >
            {t('contactUs')}
          </a>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-sky-400/20 rounded-full blur-3xl translate-x-1/4 translate-y-1/4"></div>
      </div>
    </div>
  );
};
