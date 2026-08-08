import React, { useState, useEffect, Suspense, lazy } from 'react';
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
import { Menu, Layers, UserCircle, ShoppingBag, Heart, LogOut, Globe, MonitorSmartphone, Package } from 'lucide-react';
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
  const { cart, currentUser, logout, storeSettings } = useStore();
  const { t, language, setLanguage } = useLanguage();
  const isRTL = language === 'ar' || language === 'ku';

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

  const cartItemsCount = (cart || []).filter(item => item).reduce((acc, item) => acc + item?.quantity, 0);

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
    <div className={`min-h-screen bg-white flex flex-col ${language === 'ar' || language === 'ku' ? 'font-arabic' : 'font-sans'} selection:bg-rose-200 selection:text-rose-900`}>
      {isAdminOrPos ? null : (
        <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
            {/* Left: Mobile Menu & Logo */}
            <div className="flex items-center gap-3 shrink-0">
              {!isRTL && MobileMenuButton}
              <Link to="/" className="flex items-center group relative shrink-0" title={storeSettings?.store_name || "Galo Kids"}>
                <img 
                  src={storeSettings?.store_logo || "/assets/galo-logo.png"} 
                  alt={storeSettings?.store_name || "Galo Kids"} 
                  className="h-10 md:h-12 w-auto object-contain transition-transform group-hover:scale-105" 
                />
              </Link>
            </div>
            
            {/* Center: Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              <Link to="/" className={`px-4 lg:px-5 py-2.5 rounded-full text-sm lg:text-base font-black transition-all duration-300 transform hover:scale-105 active:scale-95 ${location.pathname === '/' ? 'bg-rose-100 text-rose-700 shadow-sm border border-rose-200/50' : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50/50'}`}>
                {t('home')}
              </Link>
              <Link to="/products" className={`px-4 lg:px-5 py-2.5 rounded-full text-sm lg:text-base font-black transition-all duration-300 transform hover:scale-105 active:scale-95 ${location.pathname === '/products' ? 'bg-sky-100 text-sky-700 shadow-sm border border-sky-200/50' : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50/50'}`}>
                {t('products')}
              </Link>
              <Link to="/about" className={`px-4 lg:px-5 py-2.5 rounded-full text-sm lg:text-base font-black transition-all duration-300 transform hover:scale-105 active:scale-95 ${location.pathname === '/about' ? 'bg-emerald-100 text-emerald-700 shadow-sm border border-emerald-200/50' : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/50'}`}>
                {t('about')}
              </Link>
              <Link to="/contact" className={`px-4 lg:px-5 py-2.5 rounded-full text-sm lg:text-base font-black transition-all duration-300 transform hover:scale-105 active:scale-95 ${location.pathname === '/contact' ? 'bg-amber-100 text-amber-700 shadow-sm border border-amber-200/50' : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50/50'}`}>
                {t('contact')}
              </Link>
            </nav>

            {/* Right: Actions (Search, Language, Wishlist, Cart, Profile) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <SearchBar 
                isMobileModalOpen={isMobileSearchOpen} 
                onCloseMobileModal={() => setIsMobileSearchOpen(false)} 
              />

              {/* Language Dropdown (Desktop Only) */}
              <LanguageDropdown className="mx-1 hidden md:block" />

              <Link to="/wishlist" className="p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all hidden sm:block group active:scale-95 border border-transparent hover:border-rose-100">
                <Heart className="w-6 h-6 group-hover:scale-120 group-hover:rotate-6 transition-all" />
              </Link>
              <button 
                onClick={() => setIsCartOpen(true)}
                className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all relative group active:scale-95 border border-transparent hover:border-indigo-100 cursor-pointer"
                aria-label="Shopping Cart"
              >
                <ShoppingBag className="w-6 h-6 group-hover:scale-120 group-hover:-rotate-6 transition-all" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[22px] h-[22px] px-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce">
                    {cartItemsCount}
                  </span>
                )}
              </button>
              
              {currentUser ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {isStaffOrAdmin && (
                    <>
                      <Link to="/pos" className="hidden sm:inline-flex items-center justify-center px-3.5 py-2 border-2 border-orange-100 rounded-full text-xs font-black text-orange-700 bg-orange-50 hover:bg-orange-100 hover:scale-105 transition-all shadow-sm">
                        <MonitorSmartphone className="w-4 h-4 mr-1 text-orange-500 animate-pulse" /> {t('pos')}
                      </Link>
                      <Link to="/admin" className="hidden sm:inline-flex items-center justify-center px-3.5 py-2 border-2 border-rose-100 rounded-full text-xs font-black text-rose-700 bg-rose-50 hover:bg-rose-100 hover:scale-105 transition-all shadow-sm">
                        🌟 {t('admin')}
                      </Link>
                    </>
                  )}
                  <Link to="/profile" className="hidden sm:inline-flex items-center justify-center p-2.5 border-2 border-indigo-100 rounded-full text-indigo-500 bg-indigo-50 hover:bg-indigo-100 hover:scale-110 transition-all shadow-sm" title="My Profile">
                    <UserCircle className="w-4 h-4" />
                  </Link>
                  <Link to="/my-orders" className="hidden sm:inline-flex items-center justify-center p-2.5 border-2 border-violet-100 rounded-full text-violet-500 bg-violet-50 hover:bg-violet-100 hover:scale-110 transition-all shadow-sm" title="My Orders">
                    <Package className="w-4 h-4" />
                  </Link>
                  <button 
                    onClick={logout}
                    className="hidden sm:inline-flex items-center justify-center p-2.5 border-2 border-red-100 rounded-full text-red-500 bg-red-50 hover:bg-red-100 hover:scale-110 transition-all shadow-sm cursor-pointer"
                    title={t('logout')}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link to="/login" className="hidden sm:inline-flex items-center justify-center px-4 py-2 border-2 border-emerald-100 rounded-full text-xs font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:scale-105 transition-all shadow-sm">
                  <UserCircle className="w-4 h-4 mr-1 text-emerald-500" /> {t('signIn')}
                </Link>
              )}
              {isRTL && MobileMenuButton}
            </div>
          </div>
        </header>
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex-grow flex flex-col w-full"
    >
      {children}
    </motion.div>
  );
};

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location}>
        <Route path="/" element={<PageTransition key={location.pathname}><Home /></PageTransition>} />
        <Route path="/products" element={<PageTransition key={location.pathname}><Products /></PageTransition>} />
        <Route path="/product/:id" element={<PageTransition key={location.pathname}><ProductDetail /></PageTransition>} />
        <Route path="/checkout" element={<PageTransition key={location.pathname}><Checkout /></PageTransition>} />
        <Route path="/wishlist" element={<PageTransition key={location.pathname}><Wishlist /></PageTransition>} />
        <Route path="/about" element={<PageTransition key={location.pathname}><About /></PageTransition>} />
        <Route path="/contact" element={<PageTransition key={location.pathname}><Contact /></PageTransition>} />
        <Route path="/faq" element={<PageTransition key={location.pathname}><FAQ /></PageTransition>} />
        <Route path="/shipping-returns" element={<PageTransition key={location.pathname}><ShippingReturns /></PageTransition>} />
        <Route path="/track" element={<PageTransition key={location.pathname}><TrackOrder /></PageTransition>} />
        <Route path="/size-guide" element={<PageTransition key={location.pathname}><SizeGuide /></PageTransition>} />
        <Route path="/admin" element={<ProtectedRoute><PageTransition key={location.pathname}><Admin /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/:tab" element={<ProtectedRoute><PageTransition key={location.pathname}><Admin /></PageTransition></ProtectedRoute>} />
        <Route path="/pos" element={<ProtectedRoute><PageTransition key={location.pathname}><POS /></PageTransition></ProtectedRoute>} />
        <Route path="/login" element={<PageTransition key={location.pathname}><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition key={location.pathname}><Register /></PageTransition>} />
        <Route path="/my-orders" element={<PageTransition key={location.pathname}><MyOrders /></PageTransition>} />
        <Route path="/profile" element={<PageTransition key={location.pathname}><Profile /></PageTransition>} />
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
