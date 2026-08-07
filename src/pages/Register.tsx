import React, { useState } from 'react';
import { useStore } from '../store';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { User, Phone, Mail, Lock, ArrowRight, AlertCircle, RefreshCw, UserPlus, ArrowLeft, Send, MessageSquare, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { OtpModal } from '../components/OtpModal';
import { sendCheckoutOtp } from '../services/otpService';

const registerTranslations = {
  en: {
    createAccount: 'Create an Account',
    subtitle: 'Sign up with your mobile number and OTP to start tracking orders',
    fullName: 'Full Name',
    fullNamePlaceholder: 'John Doe',
    mobileNumber: 'Mobile Number',
    mobilePlaceholder: '0750 xxx xxxx',
    emailAddress: 'Email Address (Optional)',
    emailPlaceholder: 'name@example.com',
    password: 'Password (Optional)',
    passwordPlaceholder: 'At least 8 characters',
    signUp: 'Send OTP & Register',
    alreadyHaveAccount: 'Already have an account?',
    signIn: 'Sign in',
    nameRequired: 'Name is required.',
    phoneRequired: 'Please enter a valid mobile number.',
    invalidEmail: 'Please enter a valid email address.',
    passwordTooShort: 'Password must be at least 8 characters long.',
    loading: 'Sending OTP...',
    errorTitle: 'Registration Failed',
    backToHome: 'Back to shop',
    registerWithPhone: 'Phone & OTP',
    registerWithEmail: 'Email & Password',
  },
  ku: {
    createAccount: 'دروستکردنی ئەکاونت',
    subtitle: 'خۆت تۆمار بکە بە ژمارەی مۆبایل و کۆدی OTP بۆ شوێنکەوتنی داواکارییەکانت',
    fullName: 'ناوی تەواو',
    fullNamePlaceholder: 'ئاوات ئەحمەد',
    mobileNumber: 'ژمارەی مۆبایل',
    mobilePlaceholder: '٠٧٥٠xxx xxxx',
    emailAddress: 'ئیمەیڵ (ئارەزوومەندانە)',
    emailPlaceholder: 'name@example.com',
    password: 'وشەی تێپەڕ (ئارەزوومەندانە)',
    passwordPlaceholder: 'لانی کەم ٨ پیت یان ژمارە',
    signUp: 'ناردنی OTP و تۆماربوون',
    alreadyHaveAccount: 'پێشتر ئەکاونتت دروستکردووە؟',
    signIn: 'بچۆ ژوورەوە',
    nameRequired: 'نووسینی ناو پێویستە.',
    phoneRequired: 'تکایە ژمارەی مۆبایل بە دروستی بنووسە.',
    invalidEmail: 'تکایە ئیمەیڵێکی دروست بنووسە.',
    passwordTooShort: 'پێویستە وشەی تێپەڕ لانی کەم ٨ پیت یان ژمارە بێت.',
    loading: 'ناردنی کۆد...',
    errorTitle: 'تۆمارکردن سەرکەوتوو نەبوو',
    backToHome: 'گەڕانەوە بۆ فرۆشگا',
    registerWithPhone: 'ژمارەی مۆبایل و OTP',
    registerWithEmail: 'ئیمەیڵ و وشەی تێپەڕ',
  },
  ar: {
    createAccount: 'إنشاء حساب جديد',
    subtitle: 'سجل حسابك بواسطة رقم الهاتف ورمز OTP لمتابعة الطلبات',
    fullName: 'الاسم الكامل',
    fullNamePlaceholder: 'محمد علي',
    mobileNumber: 'رقم الهاتف',
    mobilePlaceholder: '0750 xxx xxxx',
    emailAddress: 'البريد الإلكتروني (اختياري)',
    emailPlaceholder: 'name@example.com',
    password: 'كلمة المرور (اختياري)',
    passwordPlaceholder: '٨ أحرف على الأقل',
    signUp: 'إرسال OTP وإنشاء حساب',
    alreadyHaveAccount: 'لديك حساب بالفعل؟',
    signIn: 'تسجيل الدخول',
    nameRequired: 'الاسم الكامل مطلوب.',
    phoneRequired: 'يرجى إدخال رقم هاتف صالح.',
    invalidEmail: 'يرجى إدخال بريد إلكتروني صالح.',
    passwordTooShort: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.',
    loading: 'جاري إرسال الرمز...',
    errorTitle: 'فشل إنشاء الحساب',
    backToHome: 'العودة للمتجر',
    registerWithPhone: 'رقم الهاتف و OTP',
    registerWithEmail: 'البريد وكلمة المرور',
  }
};

export const Register: React.FC = () => {
  const { register, registerWithPhone, currentUser } = useStore();
  const navigate = useNavigate();
  const { language, dir } = useLanguage();

  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpChannel, setOtpChannel] = useState<'whatsapp' | 'sms'>('whatsapp');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [directOtpUrl, setDirectOtpUrl] = useState('');

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  const activeLang = language === 'ku' || language === 'ar' ? language : 'en';
  const localT = registerTranslations[activeLang];

  const validatePhoneForm = () => {
    let isValid = true;
    setNameError(null);
    setPhoneError(null);

    if (!name.trim()) {
      setNameError(localT.nameRequired);
      isValid = false;
    }

    if (!phone.trim() || phone.trim().length < 8) {
      setPhoneError(localT.phoneRequired);
      isValid = false;
    }

    return isValid;
  };

  const validateEmailForm = () => {
    let isValid = true;
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);

    if (!name.trim()) {
      setNameError(localT.nameRequired);
      isValid = false;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(localT.invalidEmail);
      isValid = false;
    }

    if (!password || password.length < 8) {
      setPasswordError(localT.passwordTooShort);
      isValid = false;
    }

    return isValid;
  };

  const handleSendOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (authMethod === 'phone') {
      if (!validatePhoneForm()) return;

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
        console.warn('Registration OTP error:', err);
        setErrorMessage(localT.errorTitle);
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!validateEmailForm()) return;

      setIsLoading(true);
      try {
        const success = await register(name, email, password);
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
      const user = await registerWithPhone(phone, name);
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
              <UserPlus className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{localT.createAccount}</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-2 font-medium leading-relaxed">{localT.subtitle}</p>
          </div>

          {/* Registration Mode Switch */}
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
              {localT.registerWithPhone}
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
              {localT.registerWithEmail}
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

          <form onSubmit={handleSendOtpAndRegister} className="space-y-5 text-start">
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

            {authMethod === 'phone' ? (
              <>
                {/* Phone Field */}
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
                  {phoneError && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {phoneError}
                    </p>
                  )}
                </div>

                {/* Channel Selection Options */}
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
                  <span>{authMethod === 'phone' ? localT.signUp : localT.signUp}</span>
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

      {/* OTP Verification Modal */}
      <OtpModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        mobileNumber={phone}
        channel={otpChannel}
        generatedCode={generatedOtp}
        directUrl={directOtpUrl}
        onVerifySuccess={handleOtpSuccess}
        onResendOtp={() => handleSendOtpAndRegister({ preventDefault: () => {} } as any)}
      />
    </div>
  );
};
