import React, { useState, useCallback } from 'react';
import { 
  BarChart3, Calendar, TrendingUp, Package, Tags, ShoppingBag, 
  Users, DollarSign, Star, Ticket, Image as ImageIcon, Settings, 
  Languages, FileText, X, ChevronLeft, ChevronRight
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
  currentUser?: any;
}

export const AdminNavigationSidebar = React.memo<AdminNavigationSidebarProps>(
  ({
    activeTab,
    setActiveTab,
    isAdmin,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    newAndPendingOrdersCount,
    currentUser,
  }) => {
    const { t, language } = useLanguage();
    const L = (key: string) => adminTr(key, language);
    const isRTL = language === 'ar' || language === 'ku';

    // Floating Portal Tooltip State
    const [activeTooltip, setActiveTooltip] = useState<{ label: string; top: number; right?: number; left?: number } | null>(null);

    // Persist Collapsed / Expanded state in localStorage
    const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
      try {
        const saved = localStorage.getItem('admin_sidebar_collapsed');
        return saved ? JSON.parse(saved) : false;
      } catch (e) {
        return false;
      }
    });

    const toggleCollapse = useCallback(() => {
      setIsCollapsed(prev => {
        const next = !prev;
        try {
          localStorage.setItem('admin_sidebar_collapsed', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
      setActiveTooltip(null);
    }, []);

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, label: string) => {
      if (!isCollapsed) return;
      const rect = e.currentTarget.getBoundingClientRect();
      setActiveTooltip({
        label,
        top: rect.top + rect.height / 2,
        right: isRTL ? window.innerWidth - rect.left + 12 : undefined,
        left: !isRTL ? rect.right + 12 : undefined,
      });
    };

    const handleMouseLeave = () => {
      setActiveTooltip(null);
    };

    const navGroups = [
      {
        title: language === 'ku' ? 'ئامار' : language === 'ar' ? 'إحصائيات' : 'ANALYTICS',
        items: [
          { id: 'overview', label: L("Overview & Reports"), icon: BarChart3, adminOnly: true },
          { id: 'calendar', label: L("Calendar Reports"), icon: Calendar, adminOnly: true },
          { id: 'reports', label: L("Profit Report"), icon: TrendingUp, adminOnly: true },
        ]
      },
      {
        title: language === 'ku' ? 'کاتالۆگ' : language === 'ar' ? 'کتالوج' : 'CATALOG',
        items: [
          { id: 'products', label: t('products') || 'Products', icon: Package, adminOnly: false },
          { id: 'categories', label: t('allCategories') || 'Categories', icon: Tags, adminOnly: false },
          { id: 'labels', label: L("Print Labels"), icon: FileText, adminOnly: true },
          { id: 'barcode-stickers', label: L("Barcode Stickers"), icon: Tags, adminOnly: true },
        ]
      },
      {
        title: language === 'ku' ? 'فرۆشتن' : language === 'ar' ? 'مبيعات' : 'SALES',
        items: [
          { id: 'orders', label: t('manageOrders') || 'Manage Orders', icon: ShoppingBag, adminOnly: false, badge: newAndPendingOrdersCount },
          { id: 'expenses', label: t('manageExpenses') || 'Expenses', icon: DollarSign, adminOnly: false },
          { id: 'coupons', label: L("Coupons"), icon: Ticket, adminOnly: false },
          { id: 'banner', label: L("Banner"), icon: ImageIcon, adminOnly: false },
        ]
      },
      {
        title: language === 'ku' ? 'بەکارهێنەران' : language === 'ar' ? 'مستخدمين' : 'USERS',
        items: [
          { id: 'users', label: t('usersManagement') || 'Users Management', icon: Users, adminOnly: false },
          { id: 'reviews', label: t('customerReviews') || 'Customer Reviews', icon: Star, adminOnly: false },
        ]
      },
      {
        title: language === 'ku' ? 'سیستەم' : language === 'ar' ? 'نظام' : 'SYSTEM',
        items: [
          { id: 'settings', label: L("Settings"), icon: Settings, adminOnly: true },
          { id: 'translations', label: L("Translations"), icon: Languages, adminOnly: true },
        ]
      }
    ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-40 transition-opacity md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div 
        className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} w-72 bg-white/95 backdrop-blur-xl shadow-2xl z-50 transform transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'
        } flex flex-col md:hidden font-arabic`}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-900 text-white">
          <span className="text-sm font-black tracking-tight">Galo Kids Admin</span>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {navGroups.map((group, gIdx) => {
            const visibleItems = group.items.filter(item => !item.adminOnly || isAdmin);
            if (visibleItems.length === 0) return null;
            return (
              <div key={gIdx} className="space-y-1">
                <span className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{group.title}</span>
                {visibleItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={`mobile-${item.id}`}
                      onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center justify-between py-2.5 px-4 rounded-2xl text-xs font-bold transition-all ${
                        isActive ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {Boolean(item.badge) && (item.badge || 0) > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-500 text-white">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop Floating Shell Sidebar (Clean Fit Inside Parent Container) */}
      <div 
        className={`hidden lg:flex shrink-0 flex-col bg-white/70 backdrop-blur-xl border border-white/80 shadow-xs rounded-[2.5rem] py-5 h-full font-arabic transition-all duration-300 z-30 overflow-x-hidden ${
          isCollapsed ? 'w-20 items-center px-2' : 'w-60 px-4'
        }`}
      >
        {/* Top Header Label: "لیستی سەرەکی" */}
        {!isCollapsed && (
          <div className="w-full mb-3 px-2 pb-3 border-b border-slate-100/80 flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              {L("Navigation")}
            </span>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto hide-scrollbar overflow-x-hidden w-full space-y-4 transition-all pr-0.5">
          {navGroups.map((group, gIdx) => {
            const visibleItems = group.items.filter(item => !item.adminOnly || isAdmin);
            if (visibleItems.length === 0) return null;

            return (
              <div key={`group-${gIdx}`} className="space-y-1.5 w-full">
                {!isCollapsed && (
                  <h4 className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {group.title}
                  </h4>
                )}

                <div className="space-y-1 w-full">
                  {visibleItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    if (isCollapsed) {
                      return (
                        <div key={`collapsed-${item.id}`} className="relative flex items-center justify-center">
                          <button
                            onClick={() => setActiveTab(item.id)}
                            onMouseEnter={(e) => handleMouseEnter(e, item.label)}
                            onMouseLeave={handleMouseLeave}
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
                              isActive
                                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-105'
                                : 'text-slate-400 hover:bg-white/80 hover:text-slate-900'
                            }`}
                            aria-label={item.label}
                          >
                            <Icon className="w-5 h-5" />
                            {Boolean(item.badge) && (item.badge || 0) > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs animate-pulse">
                                {item.badge}
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={`expanded-${item.id}`}
                        onClick={() => setActiveTab(item.id)}
                        className={`group w-full flex items-center justify-between py-2.5 px-3.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                            : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-indigo-600'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {Boolean(item.badge) && (item.badge || 0) > 0 && (
                          <span className={`px-2 py-0.5 text-[10px] font-black rounded-full shadow-2xs shrink-0 ${
                            isActive ? 'bg-indigo-500 text-white' : 'bg-rose-500 text-white animate-pulse'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Toggle Button (Collapse / Expand) */}
        <div className="pt-3 mt-2 border-t border-slate-100/80 w-full flex items-center justify-center">
          <button
            onClick={toggleCollapse}
            className={`py-2.5 rounded-2xl bg-white/80 hover:bg-slate-900 hover:text-white text-slate-600 border border-white/80 transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center gap-2 w-full ${
              isCollapsed ? 'px-0 justify-center' : 'px-3 justify-between'
            }`}
            title={isCollapsed ? L("Expand Sidebar") : L("Collapse Sidebar")}
          >
            {!isCollapsed && <span className="text-xs font-bold">{language === 'ku' ? 'تەسککردنەوە' : language === 'ar' ? 'تصغير' : 'Collapse'}</span>}
            {isCollapsed ? (
              isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : (
              isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Floating Fixed Portal Tooltip */}
      {activeTooltip && isCollapsed && (
        <div 
          style={{ 
            top: `${activeTooltip.top}px`, 
            left: activeTooltip.left ? `${activeTooltip.left}px` : undefined,
            right: activeTooltip.right ? `${activeTooltip.right}px` : undefined,
          }}
          className="fixed -translate-y-1/2 pointer-events-none bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xl border border-slate-700 font-arabic animate-in fade-in zoom-in-95 duration-100 z-[99999]"
        >
          {activeTooltip.label}
        </div>
      )}
    </>
  );
},
(prevProps, nextProps) => {
  return (
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.isAdmin === nextProps.isAdmin &&
    prevProps.isMobileMenuOpen === nextProps.isMobileMenuOpen &&
    prevProps.newAndPendingOrdersCount === nextProps.newAndPendingOrdersCount &&
    prevProps.currentUser === nextProps.currentUser
  );
});
