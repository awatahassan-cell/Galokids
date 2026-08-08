import React from 'react';
import { 
  BarChart3, Calendar, TrendingUp, Package, Tags, ShoppingBag, 
  Users, DollarSign, Star, Ticket, Image as ImageIcon, Settings, 
  Languages, FileText, X 
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminTr } from '../../i18n/adminDict';

export interface AdminNavigationSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  newAndPendingOrdersCount: number;
}

export const AdminNavigationSidebar: React.FC<AdminNavigationSidebarProps> = ({
  activeTab,
  setActiveTab,
  isAdmin,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  newAndPendingOrdersCount,
}) => {
  const { t, language } = useLanguage();
  const L = (key: string) => adminTr(key, language);

  const navItems = [
    { id: 'overview', label: L("Overview & Reports"), icon: BarChart3, adminOnly: true },
    { id: 'calendar', label: L("Calendar Reports"), icon: Calendar, adminOnly: true },
    { id: 'reports', label: L("Profit Report"), icon: TrendingUp, adminOnly: true },
    { id: 'products', label: t('products'), icon: Package, adminOnly: false },
    { id: 'categories', label: t('allCategories'), icon: Tags, adminOnly: false },
    { id: 'orders', label: t('manageOrders'), icon: ShoppingBag, adminOnly: false, badge: newAndPendingOrdersCount },
    { id: 'users', label: t('usersManagement'), icon: Users, adminOnly: false },
    { id: 'expenses', label: t('manageExpenses'), icon: DollarSign, adminOnly: false },
    { id: 'reviews', label: t('customerReviews'), icon: Star, adminOnly: false },
    { id: 'coupons', label: L("Coupons"), icon: Ticket, adminOnly: false },
    { id: 'banner', label: L("Banner"), icon: ImageIcon, adminOnly: false },
    { id: 'settings', label: L("Settings"), icon: Settings, adminOnly: true },
    { id: 'translations', label: L("Translations"), icon: Languages, adminOnly: true },
    { id: 'labels', label: L("Print Labels"), icon: FileText, adminOnly: true },
    { id: 'barcode-stickers', label: L("Barcode Stickers"), icon: Tags, adminOnly: true },
  ];

  return (
    <>
      {/* Mobile Navigation Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div 
        className={`fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col md:hidden`}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100/80">
          <span className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Admin Dashboard
          </span>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4">
          <div className="space-y-1 mb-8">
            <h3 className="px-4 text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{L("Management")}</h3>
            {navItems.map((item) => {
              if (item.adminOnly && !isAdmin) return null;
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={`mobile-${item.id}`}
                  onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                  className={`flex items-center justify-between w-full py-2.5 px-4 text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon className="w-4 h-4 mr-3" /> {item.label}
                  </div>
                  {Boolean(item.badge) && (item.badge || 0) > 0 && (
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-500 text-white rounded-full shadow-sm animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop Vertical Sidebar */}
      <div className="hidden md:flex md:col-span-1 flex-col space-y-1 bg-white p-4 rounded-2xl border border-slate-200 h-fit">
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={`desktop-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center justify-between w-full py-2.5 px-4 text-sm font-medium rounded-xl transition-all ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center">
                <Icon className="w-4 h-4 mr-3" /> {item.label}
              </div>
              {Boolean(item.badge) && (item.badge || 0) > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-500 text-white rounded-full shadow-sm animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
};
