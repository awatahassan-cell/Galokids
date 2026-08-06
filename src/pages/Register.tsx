import React, { useState } from 'react';
import { useStore } from '../store';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { User, Mail, Lock, ArrowRight, AlertCircle, RefreshCw, UserPlus, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

const registerTranslations = {
  en: {
    createAccount: 'Create an Account',
    subtitle: 'Sign up to start saving your favorites, tracking orders, and more',
    fullName: 'Full Name',
    fullNamePlaceholder: 'John Doe',
    emailAddress: 'Email Address',
    emailPlaceholder: 'name@example.com',
    password: 'Password',
    passwordPlaceholder: 'At least 8 characters',
    signUp: 'Sign Up',
    alreadyHaveAccount: 'Already have an account?',
    signIn: 'Sign in',
    nameRequired: 'Name is required.',
    invalidEmail: 'Please enter a valid email address.',
    passwordTooShort: 'Password must be at least 8 characters long.',
    loading: 'Creating account...',
    errorTitle: 'Registration Failed',
    backToHome: 'Back to shop',
  },
  ku: {
    createAccount: 'دروستکردنی ئەکاونت',
    subtitle: 'خۆت تۆمار بکە بۆ بینینی بەرهەمە دڵخوازەکانت، شوێنکەوتنی داواکارییەکانت و هیتر',
    fullName: 'ناوی تەواو',
    fullNamePlaceholder: 'ئاوات ئەحمەد',
    emailAddress: 'ناونیشانی ئیمەیڵ',
    emailPlaceholder: 'name@example.com',
    password: 'وشەی تێپەڕ',
    passwordPlaceholder: 'لانی کەم ٨ پیت یان ژمارە',
    signUp: 'خۆت تۆمار بکە',
    alreadyHaveAccount: 'پێشتر ئەکاونتت دروستکردووە؟',
    signIn: 'بچۆ ژوورەوە',
    nameRequired: 'نووسینی ناو پێویستە.',
    invalidEmail: 'تکایە ئیمەیڵێکی دروست بنووسە.',
    passwordTooShort: 'پێویستە وشەی تێپەڕ لانی کەم ٨ پیت یان ژمارە بێت.',
    loading: 'هەژمارەکە دروست دەکرێت...',
    errorTitle: 'تۆمارکردن سەرکەوتوو نەبوو',
    backToHome: 'گەڕانەوە بۆ فرۆشگا',
  },
  ar: {
    createAccount: 'إنشاء حساب جديد',
    subtitle: 'أنشئ حساباً للاحتفاظ بمفضلاتك ومتابعة الطلبات وتفاصيل حسابك',
    fullName: 'الاسم الكامل',
    fullNamePlaceholder: 'محمد علي',
    emailAddress: 'البريد الإلكتروني',
    emailPlaceholder: 'name@example.com',
    password: 'كلمة المرور',
    passwordPlaceholder: '٨ أحرف على الأقل',
    signUp: 'تسجيل حساب جديد',
    alreadyHaveAccount: 'لديك حساب بالفعل؟',
    signIn: 'تسجيل الدخول',
    nameRequired: 'الاسم الكامل مطلوب.',
    invalidEmail: 'يرجى إدخال بريد إلكتروني صالح.',
    passwordTooShort: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.',
    loading: 'جاري إنشاء الحساب...',
    errorTitle: 'فشل إنشاء الحساب',
    backToHome: 'العودة للمتجر',
  }
};

export const Register: React.FC = () => {
  const { register, currentUser } = useStore();
  const navigate = useNavigate();
  const { language, dir } = useLanguage();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Clean redirect to Home if already logged in (using standard JSX Navigate component)
  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  const activeLang = language === 'ku' || language === 'ar' ? language : 'en';
  const localT = registerTranslations[activeLang];

  const validateForm = () => {
    let isValid = true;
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);

    if (!name.trim()) {
      setNameError(localT.nameRequired);
      isValid = false;
    }

    if (!email.trim()) {
      setEmailError(localT.invalidEmail);
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(localT.invalidEmail);
      isValid = false;
    }

    if (!password) {
      setPasswordError(localT.passwordTooShort);
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError(localT.passwordTooShort);
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
      const success = await register(name, email, password);
      if (success) {
        navigate('/');
      } else {
        setErrorMessage(localT.errorTitle);
      }
    } catch (err) {
      console.warn('Registration submit note:', err);
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
              <UserPlus className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{localT.createAccount}</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-2 font-medium leading-relaxed">{localT.subtitle}</p>
          </div>

          {/* Global Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-start">
                <span className="font-semibold block">{errorMessage}</span>
                <span className="text-red-600 text-xs mt-0.5 block">
                  {language === 'ku' ? 'تکایە ئیمەیڵێکی جیاواز تاقیبکەرەوە یان خانەکان پڕ بکەرەوە' : 'An account with this email address may already exist.'}
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 text-start">
            {/* Full Name Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                {localT.fullName}
              </label>
              <input 
                type="text" 
                required 
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(null);
                }}
                className={`w-full border rounded-xl py-3 px-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 text-sm transition-shadow ${
                  nameError ? 'border-red-300 focus:ring-red-500' : 'border-slate-300 shadow-sm'
                }`} 
                placeholder={localT.fullNamePlaceholder}
                disabled={isLoading}
              />
              {nameError && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {nameError}
                </p>
              )}
            </div>

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
                  <span>{localT.signUp}</span>
                  <ArrowRight className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>
          </form>

          {/* Signin Suggestion */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm text-slate-500">
            {localT.alreadyHaveAccount}{' '}
            <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline">
              {localT.signIn}
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
