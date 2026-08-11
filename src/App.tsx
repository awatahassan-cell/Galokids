import React, { useState, useEffect, useLayoutEffect, useRef, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Home } from './pages/Home';
import { Products } from './pages/Products';
// Heavy / less-frequent routes are code-split so the initial bundle stays small.
// The admin dashboard (with recharts) and POS are the biggest wins here.
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const POS = lazy(() => import('./pages/POS').then(m => ({ default: m.POS })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const Cart = lazy(() => import('./pages/Cart').then(m => ({ default: m.Cart })));
const Checkout = lazy(() => import('./pages/Checkout').then(m => ({ default: m.Checkout })));
const Wishlist = lazy(() => import('./pages/Wishlist').then(m => ({ default: m.Wishlist })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const MyOrders = lazy(() => import('./pages/MyOrders').then(m => ({ default: m.MyOrders })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const About = lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Contact = lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const FAQ = lazy(() => import('./pages/FAQ').then(m => ({ default: m.FAQ })));
const ShippingReturns = lazy(() => import('./pages/ShippingReturns').then(m => ({ default: m.ShippingReturns })));
const TrackOrder = lazy(() => import('./pages/TrackOrder').then(m => ({ default: m.TrackOrder })));
const SizeGuide = lazy(() => import('./pages/SizeGuide').then(m => ({ default: m.SizeGuide })));
import { Footer } from './components/Footer';
import { Sidebar } from './components/Sidebar';
import { StoreProvider, useStore } from './store';
import { Menu, Layers, UserCircle, ShoppingBag, Heart, LogOut, Globe, MonitorSmartphone, Package, KeyRound, ChevronDown, ShieldCheck, Search } from 'lucide-react';
import { MobileBottomNav } from './components/MobileBottomNav';
import { FeedbackProvider } from './components/ui/Feedback';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { Language } from './i18n/translations';
import { isAdminRole, isStaffOrAdminRole, getRoleInfo } from './utils/roles';
import { SearchBar } from './components/SearchBar';
import { LanguageDropdown } from './components/LanguageDropdown';
import { AnnouncementTicker } from './components/AnnouncementTicker';
import { KidsIcon } from './components/KidsIcons';
import { StoreLogo } from './components/StoreLogo';
import { HeaderNav } from './components/HeaderNav';
import { InitialLanguageModal } from './components/InitialLanguageModal';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const { cart, wishlist, categories, currentUser, logout, storeSettings } = useStore();
  const { t, language, setLanguage } = useLanguage();
  const isRTL = language === 'ar' || language === 'ku';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /** The shop's name, in the language being read — never two at once. */
  const storeName =
    storeSettings?.store_name ||
    (language === 'ku' ? 'گەلۆ کیدز' : language === 'ar' ? 'غالو كيدز' : 'Galo Kids');

  const cartItemsCount = (cart || []).filter(Boolean).reduce((acc, item) => acc + (item?.quantity || 0), 0);
  const wishlistCount = (wishlist || []).length;

  /** Square action button — the header's shared shape for icons. */
  const iconBtn =
    'relative w-[42px] h-[42px] rounded-2xl border border-slate-200/80 bg-white grid place-items-center ' +
    'text-slate-900 cursor-pointer transition-all hover:bg-candy-50 hover:border-candy-200 hover:-translate-y-0.5 active:translate-y-0 shrink-0';

  /** Count bubble on the wishlist and basket buttons. */
  const bubble =
    'absolute -top-1.5 -start-1.5 min-w-[20px] h-[20px] px-1.5 rounded-full bg-candy-500 text-white ' +
    'text-[11px] font-black grid place-items-center border-2 border-white font-sans';

  const MobileMenuButton = (
    <button
      className={`${iconBtn} lg:hidden`}
      onClick={() => setIsSidebarOpen(true)}
      aria-label="Open Menu"
    >
      <Menu className="w-[19px] h-[19px]" />
    </button>
  );

  useEffect(() => {
    document.documentElement.dir = language === 'ar' || language === 'ku' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Per-route document title for SEO / shareable tabs.
  useEffect(() => {
    const map: Record<string, string> = {
      '/': 'Galo Kids 🎈',
      '/products': 'Shop All — Galo Kids',
      '/about': 'About — Galo Kids',
      '/contact': 'Contact — Galo Kids',
      '/faq': 'FAQ — Galo Kids',
      '/track': 'Track Your Order — Galo Kids',
      '/wishlist': 'Wishlist — Galo Kids',
      '/checkout': 'Checkout — Galo Kids',
    };
    document.title = map[location.pathname] || 'Galo Kids';
  }, [location.pathname]);

  const toggleLanguage = () => {
    const nextLang: Record<Language, Language> = { en: 'ku', ku: 'ar', ar: 'en' };
    setLanguage(nextLang[language]);
  };

  const isPos = location.pathname.startsWith('/pos');
  const isAdmin = location.pathname.startsWith('/admin');
  const isAdminOrPos = isAdmin || isPos;

  return (
    <div className={`min-h-screen bg-gradient-to-b from-bubble-50/50 via-candy-50/30 via-amber-50/10 to-slate-50/80 flex flex-col ${language === 'ar' || language === 'ku' ? 'font-arabic' : 'font-sans'} selection:bg-candy-200 selection:text-candy-800 relative`}>
      {/* The ambient wash. Three fixed divs with blur(64px) used to sit here:
          the same look, but three composited layers the GPU had to re-blur
          against the page on every scrolled frame, which is what made images
          flicker on a phone. Painted radial gradients cost nothing to
          composite and look the same. */}
      <div className="vk-wash pointer-events-none" aria-hidden="true" />

      {isAdminOrPos ? null : (
        <>
          <AnnouncementTicker />

          {/* Main Vastraa-Style Header */}
          <header className="sticky top-0 z-[100] w-full bg-white border-b border-slate-200/80 shadow-sm">
            <div className="max-w-7xl mx-auto h-16 sm:h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
              
              {/* Left: burger (mobile) + wordmark */}
              <div className="flex items-center gap-3 shrink-0">
                {MobileMenuButton}
                <Link to="/" className="flex items-center gap-2.5 group shrink-0" title={storeSettings?.store_name || 'Galo Kids'}>
                  <StoreLogo className="w-[42px] h-[42px] transition-transform group-hover:scale-105" />
                  <b className="text-[15px] sm:text-[19px] font-black tracking-tight text-slate-900 whitespace-nowrap">
                    {storeName}
                  </b>
                </Link>
              </div>

              <HeaderNav />

              {/* Right Column: Search, Wishlist, Cart & Account Action Suite */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <SearchBar 
                  isMobileModalOpen={isMobileSearchOpen} 
                  onOpenMobileModal={() => setIsMobileSearchOpen(true)}
                  onCloseMobileModal={() => setIsMobileSearchOpen(false)} 
                />

                {/* Below md the pill collapses to a button that opens the
                    search sheet — the tab bar no longer carries search. */}
                <button
                  type="button"
                  onClick={() => setIsMobileSearchOpen(true)}
                  className={`${iconBtn} md:hidden`}
                  aria-label={t('search') || 'Search'}
                >
                  <Search className="w-[19px] h-[19px]" />
                </button>

                <LanguageDropdown className="hidden sm:flex h-[42px] rounded-2xl border-slate-200/80 bg-white text-slate-900" />

                <Link to="/wishlist" className={`${iconBtn} hidden sm:grid`} title={t('wishlist')}>
                  <KidsIcon name="heart" className="w-[21px] h-[21px]" />
                  {wishlistCount > 0 && <span className={bubble}>{wishlistCount}</span>}
                </Link>

                <Link
                  to="/cart"
                  className={iconBtn}
                  aria-label={language === 'ku' ? 'سەبەتە' : language === 'ar' ? 'السلة' : 'Basket'}
                >
                  <KidsIcon name="basket" className="w-[21px] h-[21px]" />
                  {cartItemsCount > 0 && <span className={bubble}>{cartItemsCount}</span>}
                </Link>
                
                {/* User Profile Dropdown Menu */}
                {currentUser ? (
                  <div className="relative" ref={userDropdownRef}>
                    <button
                      onClick={() => setIsUserDropdownOpen(prev => !prev)}
                      className={iconBtn}
                      title={currentUser.name}
                      aria-label={currentUser.name}
                    >
                      {currentUser.name
                        ? <span className="w-7 h-7 rounded-xl grid place-items-center bg-gradient-to-br from-candy-500 to-grape-500 text-white text-[13px] font-black">
                            {currentUser.name.charAt(0).toUpperCase()}
                          </span>
                        : <UserCircle className="w-[19px] h-[19px]" />}
                    </button>

                    <AnimatePresence>
                      {isUserDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 overflow-hidden font-arabic`}
                        >
                          {/* Header info */}
                          <div className="p-3 bg-gradient-to-r from-candy-50/70 via-candy-50/50 to-bubble-50/50 rounded-xl mb-1 border border-candy-100/50">
                            <p className="text-xs font-black text-slate-900 truncate">{currentUser.name}</p>
                            <p className="text-[11px] font-bold text-slate-500 truncate">{currentUser.phone || currentUser.email || 'Galo Kids Member'}</p>
                            {(() => {
                              const roleInfo = getRoleInfo(currentUser.role, language);
                              return (
                                <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-black border ${roleInfo.badgeClass}`}>
                                  <ShieldCheck className="w-3 h-3" />
                                  {roleInfo.label} ({roleInfo.id})
                                </span>
                              );
                            })()}
                          </div>

                          <div className="space-y-0.5">
                            {/* View Profile */}
                            <Link
                              to="/profile"
                              onClick={() => setIsUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black text-slate-700 hover:text-candy-700 hover:bg-candy-50 transition-colors"
                            >
                              <UserCircle className="w-4 h-4 text-candy-700" />
                              <span>{language === 'ku' ? 'بینینی پڕۆفایل' : language === 'ar' ? 'عرض الملف الشخصي' : 'View Profile'}</span>
                            </Link>

                            {/* My Orders / ئۆردەرەکانم */}
                            <Link
                              to="/my-orders"
                              onClick={() => setIsUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black text-slate-700 hover:text-grape-700 hover:bg-grape-50 transition-colors"
                            >
                              <Package className="w-4 h-4 text-grape-700" />
                              <span>{language === 'ku' ? 'ئۆردەرەکانم' : language === 'ar' ? 'طلباتي' : 'My Orders'}</span>
                            </Link>

                            {/* Change Password */}
                            <Link
                              to="/profile?tab=security"
                              onClick={() => setIsUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black text-slate-700 hover:text-sunny-700 hover:bg-sunny-50 transition-colors"
                            >
                              <KeyRound className="w-4 h-4 text-sunny-600" />
                              <span>{language === 'ku' ? 'گۆڕینی پاسۆرد' : language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}</span>
                            </Link>

                            {/* POS Link (Admin & Cashier) */}
                            {isStaffOrAdminRole(currentUser.role) && (
                              <>
                                <div className="h-px bg-slate-100 my-1" />
                                <Link
                                  to="/pos"
                                  onClick={() => setIsUserDropdownOpen(false)}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black text-orange-700 hover:bg-orange-50 transition-colors"
                                >
                                  <MonitorSmartphone className="w-4 h-4 text-orange-500" />
                                  <span>{t('pos')}</span>
                                </Link>
                              </>
                            )}

                            {/* Admin Link (Admin ONLY - role 1) */}
                            {isAdminRole(currentUser.role) && (
                              <Link
                                to="/admin"
                                onClick={() => setIsUserDropdownOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black text-candy-800 hover:bg-candy-50 transition-colors"
                              >
                                <ShieldCheck className="w-4 h-4 text-candy-700" />
                                <span>{t('admin')}</span>
                              </Link>
                            )}

                            <div className="h-px bg-slate-100 my-1" />

                            {/* Logout */}
                            <button
                              onClick={() => {
                                setIsUserDropdownOpen(false);
                                logout();
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black text-candy-700 hover:bg-candy-50 transition-colors text-start cursor-pointer"
                            >
                              <LogOut className="w-4 h-4 text-candy-700" />
                              <span>{language === 'ku' ? 'دەرچوون' : language === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link to="/login" className={iconBtn} title={t('login')}>
                    <KidsIcon name="user" className="w-[21px] h-[21px]" />
                  </Link>
                )}
              </div>
            </div>
          </header>
        </>
      )}

      <main className="flex-grow flex flex-col">
        {children}
      </main>

      {!isAdminOrPos && <Footer />}
      {!isAdminOrPos && (
        <MobileBottomNav onOpenSearch={() => setIsMobileSearchOpen(true)} />
      )}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <InitialLanguageModal />
    </div>
  );
};

/**
 * Back-office route guard.
 *
 * `adminOnly` marks the dashboard: only role 1 gets in there. The POS is open
 * to admin, cashier and staff — the same set the API treats as privileged.
 * This is a UX guard; the API enforces the same rules on every request.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly = false }) => {
  const { currentUser } = useStore();

  const activeUser = React.useMemo(() => {
    if (currentUser) return currentUser;
    const savedUser = localStorage.getItem('kidskart_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {}
    }
    return null;
  }, [currentUser]);

  const allowed = Boolean(
    activeUser && (adminOnly ? isAdminRole(activeUser.role) : isStaffOrAdminRole(activeUser.role))
  );

  if (!allowed) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const UserProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useStore();
  const activeUser = currentUser || (() => {
    const saved = localStorage.getItem('kidskart_user');
    return saved ? JSON.parse(saved) : null;
  })();
  const hasToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('kidskart_auth_token'));

  if (!activeUser && !hasToken) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

/**
 * Shown while a code-split route is still downloading.
 *
 * It keeps the page's own height so the header and footer do not jump, and
 * fades in after a beat — a chunk that arrives quickly should show nothing at
 * all rather than a flash of spinner.
 */
const RouteFallback: React.FC = () => (
  <div className="grow grid place-items-center py-32 vk-late">
    <div className="w-9 h-9 border-[3px] border-candy-100 border-t-candy-500 rounded-full animate-spin" />
  </div>
);

/**
 * The wrapper every route animates through.
 *
 * Deliberately plain: opacity and a few pixels of travel, both of which the
 * compositor can do on the GPU. The previous version also animated a blur,
 * which forces a full repaint on every frame and was what made navigation
 * feel heavy on a phone.
 *
 * Scrolling to the top happens here rather than on the pathname changing,
 * because the old page is still on screen while it animates out — moving the
 * viewport then yanks the page the reader is still looking at.
 */
const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const prefersReducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const body = <Suspense fallback={<RouteFallback />}>{children}</Suspense>;

  if (prefersReducedMotion) {
    return <div className="grow flex flex-col w-full">{body}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{
        duration: 0.22,
        ease: [0.22, 1, 0.36, 1],
        exit: { duration: 0.13, ease: 'easeIn' },
      }}
      className="grow flex flex-col w-full"
    >
      {body}
    </motion.div>
  );
};

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  const routeKey = location.pathname;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location}>
        <Route path="/" element={<PageTransition key={routeKey}><Home /></PageTransition>} />
        <Route path="/products" element={<PageTransition key={routeKey}><Products /></PageTransition>} />
        <Route path="/product/:id" element={<PageTransition key={routeKey}><ProductDetail /></PageTransition>} />
        <Route path="/cart" element={<PageTransition key={routeKey}><Cart /></PageTransition>} />
        <Route path="/checkout" element={<PageTransition key={routeKey}><Checkout /></PageTransition>} />
        <Route path="/wishlist" element={<PageTransition key={routeKey}><Wishlist /></PageTransition>} />
        <Route path="/about" element={<PageTransition key={routeKey}><About /></PageTransition>} />
        <Route path="/contact" element={<PageTransition key={routeKey}><Contact /></PageTransition>} />
        <Route path="/faq" element={<PageTransition key={routeKey}><FAQ /></PageTransition>} />
        <Route path="/shipping-returns" element={<PageTransition key={routeKey}><ShippingReturns /></PageTransition>} />
        <Route path="/track" element={<PageTransition key={routeKey}><TrackOrder /></PageTransition>} />
        <Route path="/size-guide" element={<PageTransition key={routeKey}><SizeGuide /></PageTransition>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><PageTransition key={routeKey}><Admin /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/:tab" element={<ProtectedRoute adminOnly><PageTransition key={routeKey}><Admin /></PageTransition></ProtectedRoute>} />
        <Route path="/pos" element={<ProtectedRoute><PageTransition key={routeKey}><POS /></PageTransition></ProtectedRoute>} />
        <Route path="/login" element={<PageTransition key={routeKey}><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition key={routeKey}><Register /></PageTransition>} />
        <Route path="/my-orders" element={<PageTransition key={routeKey}><MyOrders /></PageTransition>} />
        <Route path="/profile" element={<PageTransition key={routeKey}><Profile /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <FeedbackProvider>
      <StoreProvider>
        <BrowserRouter>
          <Layout>
            <AnimatedRoutes />
          </Layout>
        </BrowserRouter>
      </StoreProvider>
      </FeedbackProvider>
    </LanguageProvider>
  );
}
