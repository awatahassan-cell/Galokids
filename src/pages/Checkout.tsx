import { formatIQDLabel } from "../utils/currency";
import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle, CheckCircle2, Loader2, Tag, 
  Phone, ShieldCheck, MessageSquare, Send, RefreshCw, X, AlertCircle, MapPin, UserCheck
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { getColorHex } from '../utils/colors';
import iraqLocations from '../data/iraq-locations.json';
import { OtpModal } from '../components/OtpModal';
import { sendCheckoutOtp } from '../services/otpService';
import { isSamePhone } from '../utils/phone';
import { getLineTotal, roundIQD } from '../utils/pricing';
import { KidsIcon } from '../components/KidsIcons';
import { useScrollLock } from '../utils/useScrollLock';
import {
  buildAddress, parseAddress, getDistricts, getSubdistricts, findGovernorate, findDistrict,
  getGovernorateLabel, getDistrictLabel, getSubdistrictLabel,
  type Lang, type SubdistrictOption,
} from '../utils/address';

export const Checkout: React.FC = () => {
  const { 
    cart, clearCart, addOrder, currentUser, users, appliedCoupon, 
    setAppliedCoupon, applyCoupon, coupons, registerWithPhone, 
    login, updateProfile, fetchShippingQuote
  } = useStore();
  const navigate = useNavigate();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const { t, language, dir } = useLanguage();

  // Quick Login Modal State on Checkout
  const [showQuickLogin, setShowQuickLogin] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [quickLoginError, setQuickLoginError] = useState('');
  
  // Location States (Governorate -> District / Qaza -> Sub-district / Nahiya)
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedSubdistrict, setSelectedSubdistrict] = useState('');
  const [address, setAddress] = useState(currentUser?.address || '');


  // Personal details
  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [mobileNumber, setMobileNumber] = useState(currentUser?.phone || '');

  // Mobile OTP Verification States
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [otpChannel, setOtpChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);
  const [directOtpUrl, setDirectOtpUrl] = useState<string>('');

  // Delivery charge. Quoted by the server for the selected governorate so the
  // total shown here is the total the order will charge.
  const [shippingFee, setShippingFee] = useState(0);
  const [freeShippingOver, setFreeShippingOver] = useState(0);

  // Helper to format Iraqi mobile numbers to international format (e.g., 07501234567 -> 9647501234567)
  const formatIraqiPhone = (phone: string): string => {
    let clean = phone.replace(/[^\d]/g, '');
    if (clean.startsWith('0')) {
      clean = '964' + clean.substring(1);
    } else if (!clean.startsWith('964')) {
      clean = '964' + clean;
    }
    return clean;
  };

  // Districts / sub-districts follow the current selection. Their values are
  // the canonical English names from `utils/address`, never the translated
  // labels, so a selection survives a reload and a language switch.
  const availableDistricts = useMemo(
    () => getDistricts(selectedGovernorate),
    [selectedGovernorate]
  );
  const availableSubdistricts = useMemo(
    () => getSubdistricts(selectedGovernorate, selectedDistrict),
    [selectedGovernorate, selectedDistrict]
  );

  // Load & parse currentUser information
  const savedUserStr = localStorage.getItem('kidskart_user');
  const userToUse = currentUser || (savedUserStr ? (() => { try { return JSON.parse(savedUserStr); } catch { return null; } })() : null);

  // Check if unauthenticated mobile number matches a registered user
  const existingUserForPhone = !userToUse && mobileNumber && mobileNumber.replace(/[^\d]/g, '').length >= 7 
    ? users.find(u => u.phone && isSamePhone(mobileNumber, u.phone)) 
    : null;
  useEffect(() => {
    if (userToUse) {
      if (userToUse.name) setFullName(userToUse.name);
      if (userToUse.phone) {
        setMobileNumber(userToUse.phone);
        setVerifiedPhone(userToUse.phone);
      }
      setIsPhoneVerified(true);

      if (userToUse.address) {
        const parts = parseAddress(userToUse.address);
        setSelectedGovernorate(parts.governorate);
        setSelectedDistrict(parts.district);
        setSelectedSubdistrict(parts.subdistrict);
        setAddress(parts.street);
      }
    }
  }, [currentUser]);

  // User manual selection handlers
  const handleGovernorateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGovernorate(e.target.value);
    setSelectedDistrict('');
    setSelectedSubdistrict('');
  };

  const handleDistrictSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDistrict(e.target.value);
    setSelectedSubdistrict('');
  };

  // Handle phone change -> check if phone matches logged-in user or verified phone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMobileNumber(value);

    // Check if typed phone matches userToUse phone or previously verifiedPhone
    const matchesUser = !!(userToUse?.phone && isSamePhone(value, userToUse.phone));
    const matchesVerified = !!(verifiedPhone && isSamePhone(value, verifiedPhone));

    if (matchesUser || matchesVerified) {
      setIsPhoneVerified(true);
    } else {
      setIsPhoneVerified(false);
    }
  };

  // Timer countdown for OTP resend
  useEffect(() => {
    let interval: any = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Send OTP. `phoneOverride` lets the quick-login modal verify a number that
  // has not been written into the checkout form state yet.
  const handleSendOtp = async (channelOverride?: any, phoneOverride?: string) => {
    const targetPhone = (phoneOverride ?? mobileNumber).trim();

    if (!targetPhone || targetPhone.length < 8) {
      alert(t('mobileNumber') + ' ' + (language === 'ku' ? 'دروست نییە' : 'is invalid'));
      return;
    }

    const activeChannel: 'whatsapp' | 'sms' =
      typeof channelOverride === 'string' && (channelOverride === 'whatsapp' || channelOverride === 'sms')
        ? channelOverride
        : otpChannel;

    if (typeof channelOverride === 'string') setOtpChannel(activeChannel);

    setIsSendingOtp(true);
    setOtpError('');

    try {
      const res = await sendCheckoutOtp(targetPhone, activeChannel, language);
      if (res.success) {
        if (res.code) {
          setGeneratedOtp(res.code);
        }
        if (res.directUrl) {
          setDirectOtpUrl(res.directUrl);
        }

        setShowOtpModal(true);
        setResendTimer(60);
      } else {
        alert(res.message || (language === 'ku' ? 'تکایە دووبارە تاقیبکەرەوە' : 'Failed to send OTP. Please try again.'));
      }
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      alert(language === 'ku' ? 'تکایە دووبارە تاقیبکەرەوە' : 'Failed to send OTP. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Quick Login Handler on Checkout
  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim()) return;
    setIsLoggingIn(true);
    setQuickLoginError('');

    try {
      // Without a password the only way in is an OTP: typing somebody else's
      // mobile number must never be enough to open their account.
      if (!loginPassword.trim()) {
        const phone = loginInput.trim();
        setShowQuickLogin(false);
        setLoginInput('');
        setMobileNumber(phone);
        setIsPhoneVerified(false);
        await handleSendOtp(undefined, phone);
        return;
      }

      const success = await login(loginInput.trim(), loginPassword);

      if (success) {
        setShowQuickLogin(false);
        setLoginInput('');
        setLoginPassword('');
      } else {
        setQuickLoginError(
          language === 'ku' 
            ? 'ژمارەی مۆبایل/ئیمەیڵ یان پاسۆردەکە هەڵەیە' 
            : language === 'ar' 
            ? 'رقم الهاتف أو كلمة المرور غير صحيحة' 
            : 'Invalid login credentials.'
        );
      }
    } catch (err) {
      setQuickLoginError(
        language === 'ku' 
          ? 'هەڵەیەک ڕوویدا لە کاتی چوونە ژوورەوە' 
          : 'An error occurred during login.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Hold the page still behind either overlay. `overflow: hidden` on <body>
  // alone does not do it — the page scrolls on <html>, so a flick over the
  // backdrop moved the checkout underneath and left you somewhere else when
  // the modal closed.
  useScrollLock(showQuickLogin || showOtpModal);

  useEffect(() => {
    if (appliedCoupon && coupons.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const knownCoupon = coupons.find(c => c.id === appliedCoupon.id || c.code === appliedCoupon.code);
      if (knownCoupon) {
        const stillValid = knownCoupon.isActive
          && (!knownCoupon.startDate || todayStr >= knownCoupon.startDate)
          && (!knownCoupon.endDate || todayStr <= knownCoupon.endDate);
        if (!stillValid) setAppliedCoupon(null);
      }
    }
  }, [appliedCoupon, coupons, setAppliedCoupon]);


  const subtotal = roundIQD(cart.reduce((acc, item) => acc + getLineTotal(item.product, item.variation, item.quantity), 0));
  const discountAmount = roundIQD(appliedCoupon ? (subtotal * (appliedCoupon.discountPercentage / 100)) : 0);
  const goodsTotal = Math.max(0, subtotal - discountAmount);
  const totalAmount = goodsTotal + shippingFee;

  // Ask the server what delivery costs for the chosen governorate. The server
  // is the authority — it recalculates the same figure when the order is
  // placed, so the customer can never be shown a cheaper total than they pay.
  useEffect(() => {
    let cancelled = false;

    fetchShippingQuote(selectedGovernorate || undefined, goodsTotal).then(quote => {
      if (cancelled) return;
      setShippingFee(quote.fee);
      setFreeShippingOver(quote.freeOver);
    }).catch(() => { /* keep the last known fee */ });

    return () => { cancelled = true; };
  }, [selectedGovernorate, goodsTotal, fetchShippingQuote]);

  const getProductName = (product: any) => {
    if (language === 'ku' && product.nameKu) return product.nameKu;
    if (language === 'ar' && product.nameAr) return product.nameAr;
    return product.name;
  };

  const addrLang: Lang = language === 'ku' || language === 'ar' ? language : 'en';
  const getGovernorateName = (gov: any) => getGovernorateLabel(gov, addrLang);
  const getDistrictName = (districtObj: any) => getDistrictLabel(districtObj, addrLang);
  const getSubdistrictDisplayName = (subObj: SubdistrictOption) => getSubdistrictLabel(subObj, addrLang);

  /** The delivery address exactly as it will be stored on the order. */
  const composeAddress = () => buildAddress(
    {
      governorate: selectedGovernorate,
      district: selectedDistrict,
      subdistrict: selectedSubdistrict,
      street: address,
    },
    addrLang,
    { district: t('district'), subdistrict: t('subdistrict') }
  );

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }
    setCouponLoading(true);
    setCouponError('');
    const result = await applyCoupon(couponCode.trim(), { subtotal, phone: mobileNumber || undefined });
    setCouponLoading(false);
    if (result.success) {
      setCouponCode('');
    } else {
      setCouponError(t('invalidCoupon') || result.message || 'Invalid or expired coupon code');
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPlacing) return;

    const savedUserStr = localStorage.getItem('kidskart_user');
    const userToUse = currentUser || (savedUserStr ? (() => { try { return JSON.parse(savedUserStr); } catch { return null; } })() : null);

    const isUserPhone = !!(userToUse?.phone && isSamePhone(mobileNumber, userToUse.phone));
    const isVerified = isPhoneVerified || (verifiedPhone && isSamePhone(mobileNumber, verifiedPhone)) || isUserPhone;

    if (!userToUse && !isVerified) {
      if (!mobileNumber.trim() || mobileNumber.trim().length < 8) {
        alert(t('mobileNumber') + ' ' + (language === 'ku' ? 'دروست نییە' : 'is invalid'));
        return;
      }
      handleSendOtp();
      return;
    }

    const name = fullName || userToUse?.name || 'Online Customer';
    const mobile = mobileNumber || userToUse?.phone || '';

    const govObj = findGovernorate(selectedGovernorate);
    const govText = govObj ? getGovernorateName(govObj) : selectedGovernorate;
    const distObj = findDistrict(selectedGovernorate, selectedDistrict);
    const distText = distObj ? getDistrictName(distObj) : selectedDistrict;

    // Governorate + district + sub-district (ناحیە) + street, in one place.
    const formattedAddress = composeAddress();

    setIsPlacing(true);

    let activeUser = userToUse;
    if (!activeUser && mobile) {
      activeUser = await registerWithPhone(mobile, name, { address: formattedAddress, governorate: govText, district: distText });
    }

    if (activeUser) {
      const finalName = name && name !== 'Customer' && name !== 'کڕیار' ? name : activeUser.name;
      const updatedUser = {
        ...activeUser,
        name: finalName,
        phone: mobile,
        address: formattedAddress,
      };
      try {
        await updateProfile(
          finalName,
          activeUser.email || `${mobile.replace(/[^\d]/g, '')}@phone.user`,
          mobile,
          formattedAddress
        );
      } catch (e) {
        console.warn('Failed to update local user address', e);
      }
    }

    setTimeout(() => {
      addOrder({
        userId: activeUser?.id || 'u-guest',
        customerName: name,
        customerEmail: activeUser?.email || `${mobile.replace(/[^\d]/g, '')}@phone.user`,
        customerPhone: mobile,
        items: [...cart],
        totalAmount: totalAmount,
        status: 'pending',
        shippingAddress: formattedAddress,
        paymentMethod: 'cod',
        couponCode: appliedCoupon?.code,
        governorate: selectedGovernorate,
        channel: 'online',
        source: 'online',
      } as any);

      setIsPlacing(false);
      setIsSuccess(true);
      clearCart();
      setAppliedCoupon(null);
    }, 1200);
  };

  if (isSuccess) {
    return (
      <div className="grow flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">{t('orderConfirmedTitle')}</h2>
          <p className="text-slate-600 mb-8 text-sm leading-relaxed">
            {t('orderConfirmedMessage')}
          </p>
          <Link 
            to="/"
            className="inline-flex items-center justify-center w-full px-6 py-3.5 border border-transparent text-base font-bold rounded-full text-white bg-candy-600 hover:bg-candy-700 transition-all shadow-md active:scale-98"
          >
            {t('continueShopping')}
          </Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="grow flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-black text-slate-900 mb-4">{t('emptyCart')}</h2>
        <p className="text-slate-600 mb-8">{t('emptyCart')}</p>
        <Link 
          to="/products"
          className="inline-flex items-center justify-center px-6 py-3.5 border border-transparent text-base font-bold rounded-full text-white bg-candy-600 hover:bg-candy-700 transition-all shadow-md active:scale-98"
        >
          {t('continueShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className="grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Dynamic OTP Notification Banner */}
      {notificationBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] bg-slate-900 text-white px-5 py-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <p className="text-sm font-bold leading-tight">{notificationBanner}</p>
          </div>
          <button onClick={() => setNotificationBanner(null)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Link to="/products" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-slate-900 mb-8 transition-colors">
        <ArrowLeft className={`w-4 h-4 ${dir === 'rtl' ? 'ml-2 rotate-180' : 'mr-2'}`} /> {t('continueShopping')}
      </Link>

      <div className="relative mb-8">
        <div className="vk-blob w-72 h-72 bg-candy-300 -top-24 -start-24" />
        <div className="relative z-10">
          <span className="vk-sub">
            {language === 'ku' ? 'دوا هەنگاو' : language === 'ar' ? 'الخطوة الأخيرة' : 'Last step'}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {language === 'ku' ? <>تەواوکردنی <span className="vk-hi">داواکاری</span></>
              : language === 'ar' ? <>إتمام <span className="vk-hi">الطلب</span></>
              : <>Complete your <span className="vk-hi">order</span></>}
          </h1>
        </div>
      </div>

      {/* Where the shopper is in the flow. The basket is behind them, the
          confirmation is ahead — this is the middle step. */}
      <div className="flex items-center gap-0 mb-8">
        {[
          { n: '✓', label: language === 'ku' ? 'سەبەتە' : language === 'ar' ? 'السلة' : 'Basket', done: true },
          { n: '٢', label: language === 'ku' ? 'ناونیشان و پارەدان' : language === 'ar' ? 'العنوان والدفع' : 'Address & payment', now: true },
          { n: '٣', label: language === 'ku' ? 'پشتڕاستکردنەوە' : language === 'ar' ? 'التأكيد' : 'Confirmation' },
        ].map((st, i) => (
          <React.Fragment key={st.label}>
            {i > 0 && <span className={`flex-1 h-0.5 mx-2 ${st.done || st.now ? 'bg-candy-500' : 'bg-slate-200'}`} />}
            <span className="flex items-center gap-2 shrink-0">
              <span className={`w-8 h-8 rounded-full grid place-items-center text-xs font-black ${
                st.done || st.now ? 'bg-candy-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>{st.n}</span>
              <span className={`text-xs font-black hidden sm:inline ${st.done || st.now ? 'text-slate-900' : 'text-slate-400'}`}>
                {st.label}
              </span>
            </span>
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        {/* Shipping Form */}
        <div className="lg:col-span-7">
          <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-8 bg-white p-5 sm:p-7 rounded-[1.75rem] shadow-2xs border border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-candy-700" />
                {t('shippingInfo')}
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Auto-filled User Info Banner */}
                {userToUse ? (
                  <div className="sm:col-span-2 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl shadow-md flex items-center justify-between gap-4 font-arabic">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-candy-500/20 border border-candy-500/30 text-candy-600 flex items-center justify-center shrink-0 shadow-inner">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-black truncate text-white">
                            {language === 'ku'
                              ? `تۆمارکراویت وەکو: ${userToUse.name}`
                              : language === 'ar'
                              ? `مسجل باسم: ${userToUse.name}`
                              : `Logged in as: ${userToUse.name}`}
                          </p>
                          <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full shrink-0">
                            {language === 'ku' ? 'زانیارییەکانت بە خۆکارانە پڕکرانەوە ✓' : language === 'ar' ? 'تمت التعبئة تلقائياً ✓' : 'Auto-filled ✓'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 truncate mt-1">
                          {userToUse.phone && <span className="mr-3 dir-ltr font-mono font-bold text-slate-200">{userToUse.phone}</span>}
                          {userToUse.email && !userToUse.email.includes('@phone.user') && <span className="text-slate-400">{userToUse.email}</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="sm:col-span-2 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 rounded-2xl shadow-md border border-slate-700/80 space-y-3 font-arabic">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-candy-500/20 text-candy-600 border border-candy-500/30 flex items-center justify-center shrink-0 shadow-inner">
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-white">
                            {language === 'ku' ? 'ئایا پێشتر ئەکاونتت هەیە؟' : language === 'ar' ? 'هل لديك حساب بالفعل؟' : 'Do you have an account?'}
                          </h3>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {language === 'ku'
                              ? 'چوونە ژوورەوە بکە بۆ ئەوەی ناونیشان و زانیارییە خەزنکراوەکانت بە خۆکارانە پڕببنەوە.'
                              : language === 'ar'
                              ? 'سجل الدخول لتعبئة عنوانك ومعلوماتك المحفوظة تلقائياً.'
                              : 'Log in to auto-fill your saved address and details.'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowQuickLogin(true)}
                        className="px-4 py-2.5 bg-candy-600 hover:bg-candy-500 text-white text-xs font-black rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>{language === 'ku' ? 'چوونە ژوورەوە' : language === 'ar' ? 'تسجيل الدخول' : 'Sign In / Login'}</span>
                      </button>
                    </div>

                    <div className="pt-2.5 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-emerald-300 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                      <span>
                        {language === 'ku'
                          ? 'ئەگەر ئەکاونتت نییە: ناوی تەواو، مۆبایل و ناونیشانەکەت تەنها لە خوارەوە پڕبکەرەوە، زانیارییەکان بە خۆکارانە بۆ پرۆفایلەکەت دەپارێزرێن.'
                          : language === 'ar'
                          ? 'إذا لم يكن لديك حساب: أدخل بياناتك أدناه، وسنقوم بحفظ معلومات التوصيل في ملفك الشخصي تلقائياً.'
                          : 'No account? Enter details below and your delivery info will automatically be saved to your profile.'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label htmlFor="fullName" className="block text-sm font-bold text-slate-700 mb-1">{t('fullName')}</label>
                  <input
                    type="text"
                    id="fullName"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl py-3 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-candy-500 focus:border-candy-500 bg-slate-50/50"
                  />
                </div>

                {/* Mobile Number & OTP Verification */}
                <div className="sm:col-span-2 space-y-3.5 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs font-arabic">
                  {/* Header: Label & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="mobileNumber" className="block text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-candy-700" />
                      {t('mobileNumber')}
                    </label>

                    {isPhoneVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/90 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('phoneVerified')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-sunny-50 px-2.5 py-1 rounded-full border border-sunny-200 shrink-0">
                        <AlertCircle className="w-3 h-3 text-sunny-700" />
                        {language === 'ku' ? 'پشتڕاست نەکراوەتەوە' : 'Not verified'}
                      </span>
                    )}
                  </div>

                  {/* Phone Input & Send OTP Button */}
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <input
                        type="tel"
                        id="mobileNumber"
                        required
                        placeholder="0750 xxx xxxx"
                        value={mobileNumber}
                        onChange={handlePhoneChange}
                        className="w-full border border-slate-300 rounded-xl py-3 px-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-candy-500 focus:border-candy-500 bg-white shadow-xs"
                      />
                    </div>

                    {!isPhoneVerified && (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSendingOtp}
                        className="w-full sm:w-auto px-5 py-3 bg-candy-600 hover:bg-candy-700 text-white text-xs sm:text-sm font-extrabold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 active:scale-98 cursor-pointer"
                      >
                        {isSendingOtp ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>{t('sendOtp')}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Registered Account Prompt if Guest types a registered phone */}
                  {!userToUse && existingUserForPhone && (
                    <div className="p-3 bg-sunny-50 border border-sunny-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-bold text-amber-900 shadow-xs animate-fadeIn">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-sunny-700 shrink-0" />
                        <span>
                          {language === 'ku'
                            ? `ئەم ژمارەیە تۆمارکراوە بە ناوی (${existingUserForPhone.name})`
                            : language === 'ar'
                            ? `هذا الرقم مسجل باسم (${existingUserForPhone.name})`
                            : `This phone is registered under (${existingUserForPhone.name})`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginInput(mobileNumber);
                          setShowQuickLogin(true);
                        }}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                      >
                        {language === 'ku' ? 'چوونە ژوورەوە' : language === 'ar' ? 'تسجيل الدخول' : 'Log In'}
                      </button>
                    </div>
                  )}
                  {/* Channel Selection Options */}
                  {!isPhoneVerified && (
                    <div className="pt-3 border-t border-slate-200/80 space-y-2">
                      <span className="block text-xs font-bold text-slate-500">
                        {language === 'ku' ? 'شێوازی ناردنی کۆد:' : language === 'ar' ? 'طريقة إرسال الرمز:' : 'Send code via:'}
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setOtpChannel('whatsapp')}
                          className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
                            otpChannel === 'whatsapp'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                          }`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>{t('viaWhatsApp')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setOtpChannel('sms')}
                          className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
                            otpChannel === 'sms'
                              ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-bubble-50/30'
                          }`}
                        >
                          <Send className="w-4 h-4" />
                          <span>{t('viaSms')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Governorate Select */}
                <div>
                  <label htmlFor="governorate" className="block text-sm font-bold text-slate-700 mb-1">{t('governorate')}</label>
                  <select 
                    id="governorate" 
                    required 
                    value={selectedGovernorate}
                    onChange={handleGovernorateSelect}
                    className="w-full border border-slate-300 rounded-xl py-3 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-candy-500 focus:border-candy-500 bg-white font-arabic"
                  >
                    <option value="">{t('selectGovernorate')}</option>
                    {iraqLocations.map((gov) => (
                      <option key={gov.id} value={gov.governorate}>
                        {getGovernorateName(gov)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* District (قەزا) Select */}
                <div>
                  <label htmlFor="district" className="block text-sm font-bold text-slate-700 mb-1">{t('district')}</label>
                  <select 
                    id="district" 
                    required 
                    value={selectedDistrict}
                    onChange={handleDistrictSelect}
                    disabled={!selectedGovernorate || availableDistricts.length === 0}
                    className="w-full border border-slate-300 rounded-xl py-3 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-candy-500 focus:border-candy-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 font-arabic"
                  >
                    <option value="">{t('selectDistrict')}</option>
                    {availableDistricts.map((dist) => (
                      <option key={dist.id || dist.name} value={dist.id || dist.name}>
                        {getDistrictName(dist)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-district (ناحیە) Select */}
                <div className="sm:col-span-2">
                  <label htmlFor="subdistrict" className="block text-sm font-bold text-slate-700 mb-1">
                    {t('subdistrict')} <span className="text-slate-400 font-normal">({language === 'ku' ? 'ئارەزوومەندانە' : 'Optional'})</span>
                  </label>
                  <select 
                    id="subdistrict" 
                    value={selectedSubdistrict}
                    onChange={(e) => setSelectedSubdistrict(e.target.value)}
                    disabled={!selectedDistrict || availableSubdistricts.length === 0}
                    className="w-full border border-slate-300 rounded-xl py-3 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-candy-500 focus:border-candy-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 font-arabic"
                  >
                    <option value="">{t('selectSubdistrict')}</option>
                    {availableSubdistricts.map((sub, idx) => (
                      <option key={idx} value={sub.en}>
                        {getSubdistrictDisplayName(sub)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Detailed Street / Neighborhood Address */}
                <div className="sm:col-span-2">
                  <label htmlFor="address" className="block text-sm font-bold text-slate-700 mb-1">{t('address')}</label>
                  <input
                    type="text"
                    id="address"
                    required
                    placeholder={language === 'ku' ? 'ناوی گەڕەک، جادەی سەرەکی، یان نیشانەی دیار' : 'Neighborhood, main street, or landmark'}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl py-3 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-candy-500 focus:border-candy-500 bg-slate-50/50"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Section */}
            <div className="pt-6 border-t border-slate-200">
              <h2 className="text-xl font-black text-slate-900 mb-6">{t('paymentMethod')}</h2>
              <div className="space-y-4">
                <label className="flex items-start gap-3 p-4 border-2 border-candy-500 bg-candy-50 rounded-2xl cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    defaultChecked
                    className="h-[18px] w-[18px] mt-0.5 accent-candy-500 shrink-0"
                  />
                  <span className="flex items-start gap-3 grow">
                    <span className="w-10 h-10 rounded-xl bg-white grid place-items-center shrink-0"><KidsIcon name="cash" className="w-6 h-6" /></span>
                    <span>
                      <span className="block text-sm font-black text-slate-900">{t('payOnDelivery')}</span>
                      <span className="block text-xs text-slate-500 font-bold">{t('payOnDeliveryDesc')}</span>
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-5">
          <div className="bg-white p-5 sm:p-7 rounded-[1.75rem] shadow-2xs border border-slate-100 sticky top-24">
            <h2 className="text-xl font-black text-slate-900 mb-6">{t('orderSummary')}</h2>
            
            <div className="flow-root mb-6">
              <ul className="-my-6 divide-y divide-slate-200/80">
                {cart.map((item) => (
                  <li key={item.id} className="py-5 flex">
                    <div className="h-18 w-18 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                      <img src={item.product.imageUrl} alt={getProductName(item.product)} className="h-full w-full object-cover object-center" />
                    </div>
                    <div className="ml-4 rtl:mr-4 rtl:ml-0 flex flex-1 flex-col">
                      <div>
                        <div className="flex justify-between text-sm font-bold text-slate-900">
                          <h3>{getProductName(item.product)}</h3>
                          <p className="ml-2 rtl:mr-2 rtl:ml-0 font-extrabold text-candy-700">{formatIQDLabel(getLineTotal(item.product, item.variation, item.quantity))}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border border-slate-200" style={{ backgroundColor: getColorHex(item.variation.color) }} title={item.variation.color} /> {item.variation.size}</span></p>
                      </div>
                      <div className="flex flex-1 items-end justify-between text-xs font-semibold text-slate-500">
                        <p>{t('quantity')} {item.quantity}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Coupon Code Section */}
            <div className="mb-6 pt-4 border-t border-slate-200">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-candy-700" />
                {t('discountCode') || 'Discount Code'}
              </label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 px-3.5 py-2.5 rounded-xl border border-emerald-200 text-xs font-bold shadow-xs">
                  <span className="flex items-center gap-2 min-w-0">
                    <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{t('couponApplied') || 'Coupon applied'}: <strong>{appliedCoupon.code}</strong> ({appliedCoupon.discountPercentage}% OFF)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setAppliedCoupon(null)}
                    className="text-emerald-800 hover:bg-emerald-100 rounded-lg p-1 text-base font-extrabold leading-none shrink-0"
                    title="Remove coupon"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={t("discountCode") || "Discount code"}
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 min-w-0 border border-slate-300 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-candy-500 bg-white"
                    />
                    <button
                      type="submit"
                      disabled={couponLoading}
                      className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-60 shadow-xs shrink-0"
                    >
                      {couponLoading ? '...' : (t('applyBtn') || 'Apply')}
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-candy-700 font-medium px-1">{couponError}</p>}
                </form>
              )}
            </div>

            {/* How close the basket is to free delivery — a bar reads faster
                than a sentence, and it is the same figure the server charges. */}
            {shippingFee > 0 && freeShippingOver > 0 && goodsTotal < freeShippingOver && (
              <div className="bg-sunny-50 border border-sunny-200 rounded-2xl px-4 py-3 mb-4">
                <p className="text-xs font-black text-slate-700 mb-2">
                  🎉 <span className="font-mono">{formatIQDLabel(freeShippingOver - goodsTotal)}</span>{' '}
                  {t('moreForFreeShipping')}
                </p>
                <div className="h-2 rounded-full bg-sunny-200 overflow-hidden">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-sunny-500 to-mint-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((goodsTotal / freeShippingOver) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            <div className="border-t border-dashed border-slate-200 pt-5 space-y-2.5">
              <div className="flex items-center justify-between text-sm text-slate-500 font-bold">
                <p>{t('subtotal')}</p>
                <p className="font-mono text-slate-900">{formatIQDLabel(subtotal)}</p>
              </div>
              {appliedCoupon && (
                <div className="flex items-center justify-between text-sm text-slate-500 font-bold">
                  <p>{t('discount')} ({appliedCoupon.discountPercentage}%)</p>
                  <p className="font-mono text-mint-700">−{formatIQDLabel(discountAmount)}</p>
                </div>
              )}
              <div className="flex items-center justify-between text-sm text-slate-500 font-bold">
                <p>{t('shipping')}</p>
                {shippingFee > 0 ? (
                  <p className="font-mono text-slate-900">{formatIQDLabel(shippingFee)}</p>
                ) : (
                  <p className="text-mint-700">{t('free')}</p>
                )}
              </div>
              <div className="flex items-center justify-between pt-4 mt-2 border-t-2 border-dashed border-slate-200">
                <p className="text-base font-black text-slate-900">{t('total')}</p>
                <p className="font-mono text-2xl font-black text-candy-700">{formatIQDLabel(totalAmount)}</p>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={isPlacing}
              className="mt-8 w-full flex items-center justify-center rounded-2xl border border-transparent bg-candy-600 px-6 py-4 text-base font-bold text-white shadow-md hover:bg-candy-700 focus:outline-none focus:ring-2 focus:ring-candy-500 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed active:scale-98"
            >
              {isPlacing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  {t('loading')}
                </>
              ) : (
                t('placeOrder')
              )}
            </button>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      <OtpModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        mobileNumber={mobileNumber}
        customerName={fullName}
        channel={otpChannel}
        generatedCode={generatedOtp}
        directUrl={directOtpUrl}
        onVerifySuccess={async (verificationToken) => {
          setIsPhoneVerified(true);
          setVerifiedPhone(mobileNumber);
          setShowOtpModal(false);
          setOtpError('');
          setNotificationBanner(null);

          const govObj = findGovernorate(selectedGovernorate);
          const distObj = findDistrict(selectedGovernorate, selectedDistrict);

          await registerWithPhone(
            mobileNumber,
            fullName && fullName.trim() !== 'Customer' ? fullName.trim() : undefined,
            {
              address: composeAddress(),
              governorate: govObj ? getGovernorateName(govObj) : selectedGovernorate,
              district: distObj ? getDistrictName(distObj) : selectedDistrict,
              verificationToken,
            }
          );
        }}
        onResendOtp={(newChan) => handleSendOtp(newChan)}
      />
      {/* Quick Login Modal for Checkout */}
      {showQuickLogin && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto h-screen h-[100dvh] font-arabic animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl border border-slate-100 relative max-h-[85vh] overflow-y-auto my-auto animate-scaleUp">
            <button 
              type="button"
              onClick={() => { setShowQuickLogin(false); setQuickLoginError(''); }}
              className={`absolute top-4 ${dir === 'rtl' ? 'left-4' : 'right-4'} text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer`}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5 pt-2">
              <div className="w-12 h-12 bg-candy-100 text-candy-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                {language === 'ku' ? 'چوونە ژوورەوە بۆ ئەکاونتەکەت' : language === 'ar' ? 'تسجيل الدخول إلى حسابك' : 'Log in to your account'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ku' ? 'زانیارییەکانت پڕبکەرەوە بۆ پڕکردنەوەی خۆکارانەی زانیاری گەیاندن' : language === 'ar' ? 'أدخل معلوماتك لتعبئة بيانات التوصيل تلقائياً' : 'Enter your details to auto-fill shipping info'}
              </p>
            </div>

            {quickLoginError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{quickLoginError}</span>
              </div>
            )}

            <form onSubmit={handleQuickLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  {language === 'ku' ? 'ژمارەی مۆبایل یان ئیمەیڵ' : language === 'ar' ? 'رقم الهاتف أو البريد' : 'Phone Number or Email'}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="0750 xxx xxxx"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-candy-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  {language === 'ku' ? 'وشەی تێپەڕ (ئەگەر هەتە)' : language === 'ar' ? 'كلمة المرور (إن وجدت)' : 'Password (optional)'}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-candy-500 bg-slate-50/50"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {language === 'ku' ? 'ئەگەر پاسۆردت نییە بە بەتاڵی جێی بهێڵە (چوونە ژوورەوەی خێرا بە مۆبایل)' : language === 'ar' ? 'اتركه فارغاً للدخول السريع برقم الهاتف' : 'Leave empty to log in instantly with phone number.'}
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 bg-candy-600 hover:bg-candy-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
              >
                {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{language === 'ku' ? 'چوونە ژوورەوە' : language === 'ar' ? 'تسجيل الدخول' : 'Log In'}</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
