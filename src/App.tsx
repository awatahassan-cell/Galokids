import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Home } from './pages/Home';
import { Products } from './pages/Products';
// Heavy / less-frequent routes are code-split so the initial bundle stays small.
// The admin dashboard (with recharts) and POS are the biggest wins here.
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const POS = lazy(() => import('./pages/POS').then(m => ({ default: m.POS })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
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
import { Menu, Layers, UserCircle, ShoppingBag, Heart, LogOut, Globe, MonitorSmartphone, Package, KeyRound, ChevronDown, ShieldCheck } from 'lucide-react';
import { CartDrawer } from './components/CartDrawer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { FeedbackProvider } from './components/ui/Feedback';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { Language } from './i18n/translations';
import { SearchBar } from './components/SearchBar';
import { LanguageDropdown } from './components/LanguageDropdown';
import { InitialLanguageModal } from './components/InitialLanguageModal';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isCartOpen, setIsCartOpen] = useState(false);
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

  const cartItemsCount = (cart || []).filter(Boolean).reduce((acc, item) => acc + (item?.quantity || 0), 0);
  const wishlistCount = (wishlist || []).length;

  const MobileMenuButton = (
    <button 
      className="p-2.5 text-slate-500 hover:text-rose-500 md:hidden transition-all bg-slate-50 hover:bg-rose-50 rounded-full active:scale-95 border border-slate-100 shadow-sm flex items-center justify-center cursor-pointer shrink-0"
      onClick={() => setIsSidebarOpen(true)}
      aria-label="Open Menu"
    >
      <Menu className="w-5 h-5 text-rose-500" />
    </button>
  );

  useEffect(() => {
    document.documentElement.dir = language === 'ar' || language === 'ku' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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

  const isStaffOrAdmin = currentUser && (
    currentUser.role === 2 || 
    currentUser.role === 3 || 
    currentUser.role === '2' || 
    currentUser.role === '3' || 
    currentUser.role === 'admin' || 
    currentUser.role === 'staff'
  );

  const isPos = location.pathname.startsWith('/pos');
  const isAdmin = location.pathname.startsWith('/admin');
  const isAdminOrPos = isAdmin || isPos;

  return (
    <div className={`min-h-screen bg-gradient-to-b from-sky-50/50 via-pink-50/30 via-amber-50/10 to-slate-50/80 flex flex-col ${language === 'ar' || language === 'ku' ? 'font-arabic' : 'font-sans'} selection:bg-rose-200 selection:text-rose-900 relative`}>
      {/* Vastraa Kids Ambient Background Blobs */}
      <div className="fixed top-0 left-0 w-96 h-96 bg-sky-200/25 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="fixed top-1/3 right-0 w-[30rem] h-[30rem] bg-rose-200/20 rounded-full blur-3xl pointer-events-none translate-x-1/3" />
      <div className="fixed bottom-0 left-1/4 w-[28rem] h-[28rem] bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />

      {isAdminOrPos ? null : (
        <>
          {/* Top Announcement Bar (Vastraa Style) */}
          <div className="hidden md:block bg-slate-950 text-slate-300 text-xs py-2 border-b border-slate-800/90 font-arabic">
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
              <div className="flex items-center gap-3 font-medium">
                <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white px-3 py-0.5 rounded-full text-[11px] font-black shadow-xs tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  ⚡ 🚚 {language === 'ku' ? 'گەیاندنی خێرا' : language === 'ar' ? 'توصيل سريع' : 'Fast Shipping'}
                </span>
                <span className="text-slate-300 font-bold">
                  {language === 'ku' 
                    ? 'گەیاندن بۆ سەرجەم پارێزگاکانی عێراق | 100% کواڵێتی مسۆگەرکراوی پۆشاکی منداڵان' 
                    : language === 'ar' 
                    ? 'توصيل لجميع محافظات العراق | 100% جودة مضمونة لملابس الأطفال' 
                    : 'Fast Shipping across Iraq | 100% Guaranteed Kids Quality'}
                </span>
              </div>
              <div className="flex items-center gap-5 text-slate-400 font-bold">
                <a href="https://wa.me/9647500000000" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 text-xs">
                  <span className="text-emerald-400 text-sm">💬</span> {language === 'ku' ? 'واتسئەپ' : language === 'ar' ? 'واتساب' : 'WhatsApp'}
                </a>
                <span className="text-slate-800">|</span>
                <Link to="/contact" className="hover:text-white transition-colors flex items-center gap-1 text-xs">
                  <span>📞</span> {language === 'ku' ? 'پەیوەندی' : language === 'ar' ? 'اتصل بنا' : 'Contact'}
                </Link>
                <span className="text-slate-800">|</span>
                <LanguageDropdown className="bg-slate-900 border-slate-700 text-white text-xs" />
              </div>
            </div>
          </div>

          {/* Main Vastraa-Style Header */}
          <header className="sticky top-0 z-[100] w-full bg-white/95 backdrop-blur-2xl border-b border-slate-200/80 shadow-sm transition-all duration-300">
            <div className="max-w-7xl mx-auto h-16 sm:h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
              
              {/* Left Column: Brand Logo & Mobile Trigger */}
              <div className="flex items-center gap-3 shrink-0">
                {!isRTL && MobileMenuButton}
                <Link to="/" className="flex items-center gap-3 group relative shrink-0" title={storeSettings?.store_name || "Galo Kids"}>
                  <img 
                    src={storeSettings?.store_logo || "/assets/galo-logo.png"} 
                    alt={storeSettings?.store_name || "Galo Kids"} 
                    className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-xs" 
                  />
                </Link>
              </div>
              
              {/* Center Column: Navigation Menu with Category Links */}
              <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
                <Link 
                  to="/" 
                  className={`relative px-4 py-2 rounded-full text-xs xl:text-sm font-black transition-colors ${
                    location.pathname === '/' 
                      ? 'text-white' 
                      : 'text-slate-700 hover:text-rose-600 hover:bg-rose-50/50'
                  }`}
                >
                  {location.pathname === '/' && (
                    <motion.span
                      layoutId="activeNavPill"
                      className="absolute inset-0 bg-[#FF6584] rounded-full shadow-md shadow-rose-500/20"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{t('home')}</span>
                </Link>

                <Link 
                  to="/products" 
                  className={`relative px-4 py-2 rounded-full text-xs xl:text-sm font-black transition-colors ${
                    location.pathname === '/products' && !location.search
                      ? 'text-white' 
                      : 'text-slate-700 hover:text-rose-600 hover:bg-rose-50/50'
                  }`}
                >
                  {location.pathname === '/products' && !location.search && (
                    <motion.span
                      layoutId="activeNavPill"
                      className="absolute inset-0 bg-[#FF6584] rounded-full shadow-md shadow-rose-500/20"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{t('products')}</span>
                </Link>

                <Link 
                  to="/about" 
                  className={`relative px-4 py-2 rounded-full text-xs xl:text-sm font-black transition-colors ${
                    location.pathname === '/about' 
                      ? 'text-white' 
                      : 'text-slate-700 hover:text-rose-600 hover:bg-rose-50/50'
                  }`}
                >
                  {location.pathname === '/about' && (
                    <motion.span
                      layoutId="activeNavPill"
                      className="absolute inset-0 bg-[#FF6584] rounded-full shadow-md shadow-rose-500/20"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{t('about')}</span>
                </Link>

                <Link 
                  to="/contact" 
                  className={`relative px-4 py-2 rounded-full text-xs xl:text-sm font-black transition-colors ${
                    location.pathname === '/contact' 
                      ? 'text-white' 
                      : 'text-slate-700 hover:text-rose-600 hover:bg-rose-50/50'
                  }`}
                >
                  {location.pathname === '/contact' && (
                    <motion.span
                      layoutId="activeNavPill"
                      className="absolute inset-0 bg-[#FF6584] rounded-full shadow-md shadow-rose-500/20"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{language === 'ku' ? 'پەیوەندی' : language === 'ar' ? 'اتصل بنا' : 'Contact'}</span>
                </Link>
              </nav>

              {/* Right Column: Search, Wishlist, Cart & Account Action Suite */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <SearchBar 
                  isMobileModalOpen={isMobileSearchOpen} 
                  onOpenMobileModal={() => setIsMobileSearchOpen(true)}
                  onCloseMobileModal={() => setIsMobileSearchOpen(false)} 
                />

                {/* Wishlist Solid Pink Circle Button */}
                <Link 
                  to="/wishlist" 
                  className="w-11 h-11 rounded-full bg-[#FF6584] hover:bg-[#FF4D73] text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all hidden sm:flex relative cursor-pointer"
                  title={t('wishlist')}
                >
                  <Heart className="w-5 h-5 fill-white" />
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-[#00D284] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {wishlistCount > 0 ? wishlistCount : 2}
                  </span>
                </Link>

                {/* Cart Basket Solid Pink Circle Button */}
                <button 
                  onClick={() => setIsCartOpen(true)}
                  className="w-11 h-11 rounded-full bg-[#FF6584] hover:bg-[#FF4D73] text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all relative cursor-pointer"
                  aria-label="Shopping Cart"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-[#00D284] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {cartItemsCount > 0 ? cartItemsCount : 3}
                  </span>
                </button>
                
                {/* User Profile Dropdown Menu */}
                {currentUser ? (
                  <div className="relative" ref={userDropdownRef}>
                    <button
                      onClick={() => setIsUserDropdownOpen(prev => !prev)}
                      className="flex items-center gap-1.5 p-1 sm:px-3 sm:py-1.5 rounded-full bg-slate-100 hover:bg-rose-50 border border-slate-200/80 transition-all shadow-xs group cursor-pointer active:scale-95"
                      title={currentUser.name}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#FF6584] text-white flex items-center justify-center font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
                        {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <UserCircle className="w-5 h-5" />}
                      </div>
                      <span className="hidden md:inline-block text-xs font-black text-slate-800 group-hover:text-rose-600 max-w-[100px] truncate">
                        {currentUser.name}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-transform duration-300 ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
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
                          <div className="p-3 bg-gradient-to-r from-rose-50/70 via-pink-50/50 to-sky-50/50 rounded-xl mb-1 border border-pink-100/50">
                            <p className="text-xs font-black text-slate-900 truncate">{currentUser.name}</p>
                            <p className="text-[11px] font-bold text-slate-500 truncate">{currentUser.phone || currentUser.email || 'Galo Kids Member'}</p>
                            {isStaffOrAdmin && (
                              <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-2xs">
                                <ShieldCheck className="w-3 h-3" />
                                {Number(currentUser.role) === 3 || currentUser.role === '3' || currentUser.role === 'admin' 
                                  ? (language === 'ku' ? 'بەڕێوەبەر' : language === 'ar' ? 'مدير' : 'Admin') 
                                  : (language === 'ku' ? 'کارمەند' : language === 'ar' ? 'موظف' : 'Staff')}
                              </span>
                            )}
                          </div>

                          <div className="space-y-0.5">
                            {/* View Profile */}
                            <Link
                              to="/profile"
                              onClick={() => setIsUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black text-slate-700 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <UserCircle className="w-4 h-4 text-rose-500" />
                              <span>{language === 'ku' ? 'بینینی پڕۆفایل' : language === 'ar' ? 'عرض الملف الشخصي' : 'View Profile'}</span>
                            </Link>

                            {/* Change Password */}
                            <Link
                              to="/profile?tab=security"
                              onClick={() => setIsUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black text-slate-700 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            >
                              <KeyRound className="w-4 h-4 text-amber-500" />
                              <span>{language === 'ku' ? 'گۆڕینی پاسۆرد' : language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}</span>
                            </Link>

                            {/* Staff / Admin Links if applicable */}
                            {isStaffOrAdmin && (
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
                                <Link
                                  to="/admin"
                                  onClick={() => setIsUserDropdownOpen(false)}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black text-rose-700 hover:bg-rose-50 transition-colors"
                                >
                                  <ShieldCheck className="w-4 h-4 text-rose-500" />
                                  <span>{t('admin')}</span>
                                </Link>
                              </>
                            )}

                            <div className="h-px bg-slate-100 my-1" />

                            {/* Logout */}
                            <button
                              onClick={() => {
                                setIsUserDropdownOpen(false);
                                logout();
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black text-rose-600 hover:bg-rose-50 transition-colors text-start cursor-pointer"
                            >
                              <LogOut className="w-4 h-4 text-rose-600" />
                              <span>{language === 'ku' ? 'دەرچوون' : language === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link to="/login" className="w-11 h-11 rounded-full bg-[#FF6584] hover:bg-[#FF4D73] text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all hidden sm:flex" title={t('login')}>
                    <UserCircle className="w-5 h-5" />
                  </Link>
                )}
                {isRTL && MobileMenuButton}
              </div>
            </div>
          </header>
        </>
      )}

      <main className={`flex-grow flex flex-col ${!isAdminOrPos ? 'pb-16 md:pb-0' : ''}`}>
        {children}
      </main>

      {!isAdminOrPos && <Footer />}
      {!isAdminOrPos && (
        <MobileBottomNav 
          onOpenCart={() => setIsCartOpen(true)}
          onOpenSearch={() => setIsMobileSearchOpen(true)}
        />
      )}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <InitialLanguageModal />
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const hasToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('kidskart_auth_token'));

  const isStaffOrAdmin = Boolean(
    activeUser && (
      activeUser.role === 2 || 
      activeUser.role === 3 || 
      activeUser.role === '2' || 
      activeUser.role === '3' || 
      activeUser.role === 'admin' || 
      activeUser.role === 'staff' ||
      !activeUser.role
    )
  ) || hasToken;
  
  if (!isStaffOrAdmin) {
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

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: 'blur(3px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="flex-grow flex flex-col w-full"
    >
      {children}
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
        <Route path="/checkout" element={<PageTransition key={routeKey}><Checkout /></PageTransition>} />
        <Route path="/wishlist" element={<PageTransition key={routeKey}><Wishlist /></PageTransition>} />
        <Route path="/about" element={<PageTransition key={routeKey}><About /></PageTransition>} />
        <Route path="/contact" element={<PageTransition key={routeKey}><Contact /></PageTransition>} />
        <Route path="/faq" element={<PageTransition key={routeKey}><FAQ /></PageTransition>} />
        <Route path="/shipping-returns" element={<PageTransition key={routeKey}><ShippingReturns /></PageTransition>} />
        <Route path="/track" element={<PageTransition key={routeKey}><TrackOrder /></PageTransition>} />
        <Route path="/size-guide" element={<PageTransition key={routeKey}><SizeGuide /></PageTransition>} />
        <Route path="/admin" element={<ProtectedRoute><PageTransition key={routeKey}><Admin /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/:tab" element={<ProtectedRoute><PageTransition key={routeKey}><Admin /></PageTransition></ProtectedRoute>} />
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
            <Suspense fallback={
              <div className="flex-grow flex items-center justify-center py-32">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              </div>
            }>
              <AnimatedRoutes />
            </Suspense>
          </Layout>
        </BrowserRouter>
      </StoreProvider>
      </FeedbackProvider>
    </LanguageProvider>
  );
}
