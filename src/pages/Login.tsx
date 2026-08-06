import React, { useState } from 'react';
import { useStore } from '../store';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { Mail, Lock, ArrowRight, AlertCircle, RefreshCw, KeyRound, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

const loginTranslations = {
  en: {
    welcomeBack: 'Welcome Back',
    subtitle: 'Sign in to manage your orders, wishlist, and profile details',
    emailAddress: 'Email Address',
    emailPlaceholder: 'name@example.com',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    signIn: 'Sign In',
    dontHaveAccount: "Don't have an account?",
    signUp: 'Sign up',
    invalidEmail: 'Please enter a valid email address.',
    passwordRequired: 'Password is required.',
    loading: 'Signing in...',
    errorTitle: 'Authentication Failed',
    backToHome: 'Back to shop',
  },
  ku: {
    welcomeBack: 'خێربێیتەوە',
    subtitle: 'بچۆ ژوورەوە بۆ بەڕێوەبردنی داواکارییەکان، دڵخوازەکان و پرۆفایلەکەت',
    emailAddress: 'ناونیشانی ئیمەیڵ',
    emailPlaceholder: 'name@example.com',
    password: 'وشەی تێپەڕ',
    passwordPlaceholder: '••••••••',
    signIn: 'چوونە ژوورەوە',
    dontHaveAccount: 'ئەکاونتت نییە؟',
    signUp: 'تۆماربە',
    invalidEmail: 'تکایە ئیمەیڵێکی دروست بنووسە.',
    passwordRequired: 'تکایە وشەی تێپەڕ بنووسە.',
    loading: 'چوونە ژوورەوە...',
    errorTitle: 'چوونە ژوورەوە سەرکەوتوو نەبوو',
    backToHome: 'گەڕانەوە بۆ فرۆشگا',
  },
  ar: {
    welcomeBack: 'مرحباً بعودتك',
    subtitle: 'سجل الدخول لإدارة طلباتك، قائمة الرغبات وتفاصيل حسابك',
    emailAddress: 'البريد الإلكتروني',
    emailPlaceholder: 'name@example.com',
    password: 'كلمة المرور',
    passwordPlaceholder: '••••••••',
    signIn: 'تسجيل الدخول',
    dontHaveAccount: 'ليس لديك حساب؟',
    signUp: 'إنشاء حساب',
    invalidEmail: 'يرجى إدخال بريد إلكتروني صالح.',
    passwordRequired: 'كلمة المرور مطلوبة.',
    loading: 'جاري تسجيل الدخول...',
    errorTitle: 'فشل تسجيل الدخول',
    backToHome: 'العودة للمتجر',
  }
};

export const Login: React.FC = () => {
  const { login, currentUser } = useStore();
  const navigate = useNavigate();
  const { language, dir } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Clean redirect to Home if already logged in (using standard JSX Navigate component)
  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  const activeLang = language === 'ku' || language === 'ar' ? language : 'en';
  const localT = loginTranslations[activeLang];

  const validateForm = () => {
    let isValid = true;
    setEmailError(null);
    setPasswordError(null);

    if (!email.trim()) {
      setEmailError(localT.invalidEmail);
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(localT.invalidEmail);
      isValid = false;
    }

    if (!password) {
      setPasswordError(localT.passwordRequired);
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/');
      } else {
        setErrorMessage(localT.errorTitle);
      }
    } catch (err) {
      console.warn('Login submit note:', err);
      setErrorMessage(localT.errorTitle);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-grow min-h-[80vh] flex items-center justify-center px-4 sm:px-6 py-12 bg-slate-50/50">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="max-w-md w-full"
      >
        {/* Back Link */}
        <div className="mb-6 flex justify-start">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors"
          >
            <ArrowLeft className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
            <span>{localT.backToHome}</span>
          </Link>
        </div>

        {/* Card Form */}
        <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-md">
          {/* Logo & Headline */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-4 border border-indigo-100">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{localT.welcomeBack}</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-2 font-medium leading-relaxed">{localT.subtitle}</p>
          </div>

          {/* Global Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-start">
                <span className="font-semibold block">{errorMessage}</span>
                <span className="text-red-600 text-xs mt-0.5 block">
                  {language === 'ku' ? 'تکایە دڵنیابەرەوە لە ئیمەیڵ یان وشەی تێپەڕی دروست' : 'Please verify your email and password credentials.'}
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 text-start">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                {localT.emailAddress}
              </label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                className={`w-full border rounded-xl py-3 px-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 text-sm transition-shadow ${
                  emailError ? 'border-red-300 focus:ring-red-500' : 'border-slate-300 shadow-sm'
                }`} 
                placeholder={localT.emailPlaceholder}
                disabled={isLoading}
              />
              {emailError && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {emailError}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400" />
                {localT.password}
              </label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                className={`w-full border rounded-xl py-3 px-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 text-sm transition-shadow ${
                  passwordError ? 'border-red-300 focus:ring-red-500' : 'border-slate-300 shadow-sm'
                }`} 
                placeholder={localT.passwordPlaceholder}
                disabled={isLoading}
              />
              {passwordError && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {passwordError}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm sm:text-base rounded-xl py-3 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>{localT.loading}</span>
                </>
              ) : (
                <>
                  <span>{localT.signIn}</span>
                  <ArrowRight className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>
          </form>

          {/* Signup Suggestion */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm text-slate-500">
            {localT.dontHaveAccount}{' '}
            <Link to="/register" className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline">
              {localT.signUp}
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
