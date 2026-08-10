import React, { useState } from 'react';
import { useStore } from '../store';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { Mail, Phone, Lock, ArrowRight, AlertCircle, RefreshCw, KeyRound, ArrowLeft, Send, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { OtpModal } from '../components/OtpModal';
import { sendCheckoutOtp } from '../services/otpService';

const loginTranslations = {
  en: {
    welcomeBack: 'Welcome Back',
    subtitle: 'Sign in to manage your orders, wishlist, and profile details',
    mobileNumber: 'Mobile Number',
    emailAddress: 'Mobile Number or Email',
    emailPlaceholder: '0750 xxx xxxx or name@example.com',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    signIn: 'Sign In',
    sendOtp: 'Send OTP & Login',
    dontHaveAccount: "Don't have an account?",
    signUp: 'Sign up',
    invalidEmail: 'Please enter a valid mobile number or email address.',
    invalidPhone: 'Please enter a valid mobile number.',
    passwordRequired: 'Password is required.',
    loading: 'Processing...',
    errorTitle: 'Authentication Failed',
    backToHome: 'Back to shop',
    loginWithPhone: 'Phone & OTP',
    loginWithEmail: 'Phone/Email & Password',
    hasPassword: 'Have a password? Login with password',
    hasOtp: 'Prefer OTP? Login with OTP',
  },
  ku: {
    welcomeBack: 'خێربێیتەوە',
    subtitle: 'بچۆ ژوورەوە بۆ بەڕێوەبردنی داواکارییەکان، دڵخوازەکان و پرۆفایلەکەت',
    mobileNumber: 'ژمارەی مۆبایل',
    emailAddress: 'ژمارەی مۆبایل یان ئیمەیڵ',
    emailPlaceholder: '٠٧٥٠xxx xxxx یان name@example.com',
    password: 'وشەی تێپەڕ',
    passwordPlaceholder: '••••••••',
    signIn: 'چوونە ژوورەوە',
    sendOtp: 'ناردنی OTP و چوونە ژوورەوە',
    dontHaveAccount: 'ئەکاونتت نییە؟',
    signUp: 'تۆماربە',
    invalidEmail: 'تکایە ژمارەی مۆبایل یان ئیمەیڵێکی دروست بنووسە.',
    invalidPhone: 'تکایە ژمارەی مۆبایل بە دروستی بنووسە.',
    passwordRequired: 'تکایە وشەی تێپەڕ بنووسە.',
    loading: 'چوونە ژوورەوە...',
    errorTitle: 'چوونە ژوورەوە سەرکەوتوو نەبوو. مۆبایل/ئیمەیڵ یان پاسۆردەکە هەڵەیە.',
    backToHome: 'گەڕانەوە بۆ فرۆشگا',
    loginWithPhone: 'ژمارەی مۆبایل و OTP',
    loginWithEmail: 'مۆبایل/ئیمەیڵ و پاسۆرد',
    hasPassword: 'پاسۆردت هەیە؟ چوونە ژوورەوە بە پاسۆرد',
    hasOtp: 'دەتەوێت بە کۆدی OTP بچیتە ژوورەوە؟',
  },
  ar: {
    welcomeBack: 'مرحباً بعودتك',
    subtitle: 'سجل الدخول لإدارة طلباتك، قائمة الرغبات وتفاصيل حسابك',
    mobileNumber: 'رقم الهاتف',
    mobilePlaceholder: '0750 xxx xxxx',
    emailAddress: 'رقم الهاتف أو البريد الإلكتروني',
    emailPlaceholder: '0750 xxx xxxx أو name@example.com',
    password: 'كلمة المرور',
    passwordPlaceholder: '••••••••',
    signIn: 'تسجيل الدخول',
    sendOtp: 'إرسال OTP والدخول',
    dontHaveAccount: 'ليس لديك حساب؟',
    signUp: 'إنشاء حساب',
    invalidEmail: 'يرجى إدخال رقم هاتف أو بريد إلكتروني صالح.',
    invalidPhone: 'يرجى إدخال رقم هاتف صالح.',
    passwordRequired: 'كلمة المرور مطلوبة.',
    loading: 'جاري تسجيل الدخول...',
    errorTitle: 'فشل تسجيل الدخول. يرجى التحقق من المعلومات.',
    backToHome: 'العودة للمتجر',
    loginWithPhone: 'رقم الهاتف و OTP',
    loginWithEmail: 'الهاتف/البريد وكلمة المرور',
    hasPassword: 'لديك كلمة مرور؟ الدخول بكلمة المرور',
    hasOtp: 'تفضل رمز OTP؟ الدخول برمز OTP',
  }
};

export const Login: React.FC = () => {
  const { login, loginWithPhone, currentUser } = useStore();
  const navigate = useNavigate();
  const { language, dir } = useLanguage();

  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpChannel, setOtpChannel] = useState<'whatsapp' | 'sms'>('whatsapp');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // OTP Modal
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [directOtpUrl, setDirectOtpUrl] = useState('');

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  const activeLang = language === 'ku' || language === 'ar' ? language : 'en';
  const localT = loginTranslations[activeLang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (authMethod === 'phone') {
      if (!phone.trim() || phone.trim().length < 8) {
        setPhoneError(localT.invalidPhone);
        return;
      }
      setIsLoading(true);
      try {
        const res = await sendCheckoutOtp(phone, otpChannel, language);
        if (res.success) {
          if (res.code) setGeneratedOtp(res.code);
          if (res.directUrl) setDirectOtpUrl(res.directUrl);
          setShowOtpModal(true);
        } else {
          setErrorMessage(localT.errorTitle);
        }
      } catch (err) {
        setErrorMessage(localT.errorTitle);
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!email.trim()) {
        setEmailError(localT.invalidEmail);
        return;
      }
      if (!password) {
        setPasswordError(localT.passwordRequired);
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
        setErrorMessage(localT.errorTitle);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleOtpSuccess = async () => {
    setShowOtpModal(false);
    setIsLoading(true);
    try {
      const user = await loginWithPhone(phone);
      if (user) {
        navigate('/');
      } else {
        setErrorMessage(localT.errorTitle);
      }
    } catch (err) {
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
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-4 border border-indigo-100">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{localT.welcomeBack}</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-2 font-medium leading-relaxed">{localT.subtitle}</p>
          </div>

          {/* Login Method Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setAuthMethod('phone')}
              className={`py-2 px-3 text-xs sm:text-sm font-extrabold rounded-lg transition-all cursor-pointer ${
                authMethod === 'phone'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {localT.loginWithPhone}
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod('email')}
              className={`py-2 px-3 text-xs sm:text-sm font-extrabold rounded-lg transition-all cursor-pointer ${
                authMethod === 'email'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {localT.loginWithEmail}
            </button>
          </div>

          {/* Global Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-start">
                <span className="font-semibold block">{errorMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 text-start">
            {authMethod === 'phone' ? (
              <>
                {/* Phone Number Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {localT.mobileNumber}
                  </label>
                  <input 
                    type="tel" 
                    required 
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (phoneError) setPhoneError(null);
                    }}
                    className={`w-full border rounded-xl py-3 px-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 text-sm transition-shadow ${
                      phoneError ? 'border-red-300 focus:ring-red-500' : 'border-slate-300 shadow-sm'
                    }`} 
                    placeholder={localT.mobilePlaceholder}
                    disabled={isLoading}
                  />
                  {phoneError ? (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {phoneError}
                    </p>
                  ) : (
                    <div className="flex justify-end items-center mt-1.5">
                      <button 
                        type="button" 
                        onClick={() => {
                          setAuthMethod('email');
                          if (phone.trim()) setEmail(phone.trim());
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                      >
                        {localT.hasPassword}
                      </button>
                    </div>
                  )}
                </div>

                {/* Channel Options */}
                <div className="pt-2 space-y-2">
                  <span className="block text-xs font-bold text-slate-500">
                    {language === 'ku' ? 'شێوازی ناردنی کۆد:' : language === 'ar' ? 'طريقة إرسال الرمز:' : 'Send code via:'}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOtpChannel('whatsapp')}
                      className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        otpChannel === 'whatsapp'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOtpChannel('sms')}
                      className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        otpChannel === 'sms'
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                      <span>SMS</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Email or Phone Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {localT.emailAddress}
                  </label>
                  <input 
                    type="text" 
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
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-400" />
                      {localT.password}
                    </label>
                    <button 
                      type="button" 
                      onClick={() => {
                        setAuthMethod('phone');
                        if (email.trim() && email.replace(/[^\d]/g, '').length >= 7) {
                          setPhone(email.trim());
                        }
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                    >
                      {localT.hasOtp}
                    </button>
                  </div>
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
              </>
            )}

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
                  <span>{authMethod === 'phone' ? localT.sendOtp : localT.signIn}</span>
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

      {/* OTP Verification Modal */}
      <OtpModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        mobileNumber={phone}
        channel={otpChannel}
        generatedCode={generatedOtp}
        directUrl={directOtpUrl}
        onVerifySuccess={handleOtpSuccess}
        onResendOtp={() => handleSubmit({ preventDefault: () => {} } as any)}
      />
    </div>
  );
};
