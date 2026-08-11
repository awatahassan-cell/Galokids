import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Truck, RefreshCcw, ShieldCheck, Globe, Clock, CreditCard } from 'lucide-react';

export const ShippingReturns: React.FC = () => {
  const { t } = useLanguage();

  const sections = [
    {
      title: t('shippingInfoTitle'),
      icon: Truck,
      color: 'bg-bubble-100 text-bubble-700',
      items: [
        { label: t('freeShipping'), desc: t('freeShippingDesc'), icon: Globe },
        { label: t('quickPrep'), desc: t('quickPrepDesc'), icon: Clock },
        { label: t('globalDelivery'), desc: t('globalDeliveryDesc'), icon: Truck },
      ]
    },
    {
      title: t('easyReturns'),
      icon: RefreshCcw,
      color: 'bg-candy-100 text-candy-700',
      items: [
        { label: t('thirtyDayWindow'), desc: t('thirtyDayWindowDesc'), icon: Clock },
        { label: t('fullRefund'), desc: t('fullRefundDesc'), icon: CreditCard },
        { label: t('simpleProcess'), desc: t('simpleProcessDesc'), icon: ShieldCheck },
      ]
    }
  ];

  return (
    <div className="flex-grow max-w-6xl mx-auto w-full px-4 sm:px-6 py-12 md:py-20">
      <div className="text-center mb-20">
        <div className="inline-flex items-center justify-center p-3 bg-bubble-100 text-bubble-700 rounded-2xl mb-6">
          <Truck className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
          {t('shippingReturns')}
        </h1>
        <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
          {t('shippingReturnsSubtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className={`p-8 md:p-10 ${section.color === 'bg-bubble-100 text-bubble-700' ? 'bg-gradient-to-br from-bubble-50 to-indigo-50/30' : 'bg-gradient-to-br from-candy-50 to-candy-50/30'}`}>
              <div className={`inline-flex p-3 rounded-2xl ${section.color} mb-6 shadow-sm`}>
                <section.icon className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">{section.title}</h2>
              <div className="h-1.5 w-20 bg-current opacity-20 rounded-full"></div>
            </div>
            
            <div className="p-8 md:p-10 space-y-10 flex-grow">
              {section.items.map((item, itemIdx) => (
                <div key={itemIdx} className="flex gap-5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">{item.label}</h3>
                    <p className="text-slate-500 leading-relaxed font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Trust Badge */}
      <div className="mt-20 py-12 px-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center justify-center gap-12 text-center md:text-left">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-500 border border-slate-100">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-xl font-black text-slate-900">{t('safeToys')}</h4>
            <p className="text-slate-500 font-medium">{t('safeToysDesc')}</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-12 bg-slate-200"></div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-bubble-700 border border-slate-100">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-xl font-black text-slate-900">{t('fastDelivery')}</h4>
            <p className="text-slate-500 font-medium">{t('fastDeliveryDesc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
