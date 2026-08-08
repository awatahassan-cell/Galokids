import React from 'react';
import { Menu } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminTr } from '../../i18n/adminDict';

export interface AdminHeaderProps {
  onOpenMobileMenu: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onOpenMobileMenu }) => {
  const { t, language } = useLanguage();
  const L = (key: string) => adminTr(key, language);

  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('adminDashboard')}</h1>
        <p className="text-slate-500 mt-2 hidden sm:block">
          {L("Manage your inventory, products, orders, users, and finances.")}
        </p>
      </div>
      <button
        onClick={onOpenMobileMenu}
        className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        aria-label="Open Admin Menu"
      >
        <Menu className="w-6 h-6" />
      </button>
    </div>
  );
};
