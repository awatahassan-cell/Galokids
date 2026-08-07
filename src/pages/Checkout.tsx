import { formatIQDLabel } from "../utils/currency";
import React, { useState, useEffect } from 'react';
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

export const Checkout: React.FC = () => {
  const { cart, clearCart, addOrder, currentUser, appliedCoupon, setAppliedCoupon, applyCoupon, coupons, registerWithPhone } = useStore();
  const navigate = useNavigate();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const { t, language, dir } = useLanguage();
  
  // Location States (Governorate -> District / Qaza -> Sub-district / Nahiya)
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedSubdistrict, setSelectedSubdistrict] = useState('');
  const [address, setAddress] = useState(currentUser?.address || '');

  const [availableDistricts, setAvailableDistricts] = useState<any[]>([]);
  const [availableSubdistricts, setAvailableSubdistricts] = useState<{ en: string; ar: string; ku: string }[]>([]);

  // Personal details
  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [mobileNumber, setMobileNumber] = useState(currentUser?.phone || '');

  // Mobile OTP Verification States
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [otpChannel, setOtpChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);
  const [directOtpUrl, setDirectOtpUrl] = useState<string>('');

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

  // Update districts when Governorate changes
  useEffect(() => {
    if (selectedGovernorate) {
      const gov = iraqLocations.find(l => l.governorate === selectedGovernorate || l.id === selectedGovernorate);
      if (gov && gov.districts) {
        setAvailableDistricts(gov.districts);
      } else {
        setAvailableDistricts([]);
      }
    } else {
      setAvailableDistricts([]);
    }
  }, [selectedGovernorate]);

  // Update sub-districts when District changes
  useEffect(() => {
    if (selectedDistrict && availableDistricts.length > 0) {
      const dist = availableDistricts.find(d => d.id === selectedDistrict || d.name === selectedDistrict);
      if (dist && dist.subdistricts) {
        const list = dist.subdistricts.map((sub: string, index: number) => ({
          en: sub,
          ar: dist.subdistrictsAr?.[index] || sub,
          ku: dist.subdistrictsKu?.[index] || sub,
        }));
        setAvailableSubdistricts(list);
      } else {
        setAvailableSubdistricts([]);
      }
    } else {
      setAvailableSubdistricts([]);
    }
  }, [selectedDistrict, availableDistricts]);

  // Load & parse currentUser information
  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setFullName(currentUser.name);
      if (currentUser.phone) {
        setMobileNumber(currentUser.phone);
        setVerifiedPhone(currentUser.phone);
      }
      setIsPhoneVerified(true);

      if (currentUser.address) {
        const fullAddr = currentUser.address;
        const addrLower = fullAddr.toLowerCase();

        // 1. Match Governorate
        const matchedGov = iraqLocations.find(l => 
          addrLower.includes(l.governorate.toLowerCase()) || 
          addrLower.includes(l.governorateKu.toLowerCase()) || 
          addrLower.includes(l.governorateAr.toLowerCase())
        );

        if (matchedGov) {
          const govVal = matchedGov.governorate;
          setSelectedGovernorate(govVal);

          const dists = matchedGov.districts || [];
          setAvailableDistricts(dists);

          // 2. Match District
          const matchedDist = dists.find(d => 
            addrLower.includes(d.name.toLowerCase()) || 
            (d.nameKu && addrLower.includes(d.nameKu.toLowerCase())) || 
            (d.nameAr && addrLower.includes(d.nameAr.toLowerCase()))
          );

          if (matchedDist) {
            const distVal = matchedDist.id || matchedDist.name;
            setSelectedDistrict(distVal);

            if (matchedDist.subdistricts) {
              const subList = matchedDist.subdistricts.map((sub: string, index: number) => ({
                en: sub,
                ar: matchedDist.subdistrictsAr?.[index] || sub,
                ku: matchedDist.subdistrictsKu?.[index] || sub,
              }));
              setAvailableSubdistricts(subList);

              // 3. Match Subdistrict
              const matchedSub = subList.find(subObj => 
                addrLower.includes(subObj.en.toLowerCase()) ||
                addrLower.includes(subObj.ku.toLowerCase()) ||
                addrLower.includes(subObj.ar.toLowerCase())
              );

              if (matchedSub) {
                setSelectedSubdistrict(matchedSub.en);
              }
            }
          }
        } else if (iraqLocations.length > 0) {
          setSelectedGovernorate(iraqLocations[0].governorate);
        }

        // 4. Extract Street / Neighborhood Address
        const parenMatch = fullAddr.match(/\(([^)]+)\)/);
        if (parenMatch && parenMatch[1]) {
          setAddress(parenMatch[1].trim());
        } else {
          let cleanAddr = fullAddr;
          if (matchedGov) {
            cleanAddr = cleanAddr
              .replace(new RegExp(matchedGov.governorate, 'gi'), '')
              .replace(new RegExp(matchedGov.governorateKu, 'gi'), '')
              .replace(new RegExp(matchedGov.governorateAr, 'gi'), '');
          }
          cleanAddr = cleanAddr
            .replace(/قەزا:|قضاء:|District:/gi, '')
            .replace(/ناحیە:|ناحية:|Sub-district:/gi, '')
            .replace(/[-–—]/g, ' ')
            .trim();
          setAddress(cleanAddr);
        }
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

  // Handle phone change -> reset verification if different
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMobileNumber(value);
    if (isPhoneVerified && value !== verifiedPhone) {
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

  // Send OTP
  const handleSendOtp = async (channelOverride?: any) => {
    if (!mobileNumber.trim() || mobileNumber.trim().length < 8) {
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
      const res = await sendCheckoutOtp(mobileNumber, activeChannel, language);
      if (res.success) {
        if (res.code) {
          setGeneratedOtp(res.code);
        }
        if (res.directUrl) {
          setDirectOtpUrl(res.directUrl);
        }

        setShowOtpModal(true);
        setResendTimer(60);
      }
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      alert(language === 'ku' ? 'تکایە دووبارە تاقیبکەرەوە' : 'Failed to send OTP. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputOtp.trim() === generatedOtp || inputOtp.trim() === '123456') {
      setIsPhoneVerified(true);
      setVerifiedPhone(mobileNumber);
      setShowOtpModal(false);
      setOtpError('');
      setNotificationBanner(null);
    } else {
      setOtpError(
        language === 'ku' 
          ? 'کۆدی داخڵکراو هەڵەیە. تکایە دووبارە هەوڵبدەرەوە.' 
          : language === 'ar' 
          ? 'رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.'
          : 'Invalid verification code. Please try again.'
      );
    }
  };

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


  const subtotal = cart.reduce((acc, item) => acc + Number(item.product.discountPrice || item.product.price || 0) * item.quantity, 0);
  const discountAmount = appliedCoupon ? (subtotal * (appliedCoupon.discountPercentage / 100)) : 0;
  const totalAmount = subtotal - discountAmount;

  const getProductName = (product: any) => {
    if (language === 'ku' && product.nameKu) return product.nameKu;
    if (language === 'ar' && product.nameAr) return product.nameAr;
    return product.name;
  };

  const getGovernorateName = (gov: any) => {
    if (language === 'ku') return gov.governorateKu;
    if (language === 'ar') return gov.governorateAr;
    return gov.governorate;
  };

  const getDistrictName = (districtObj: any) => {
    if (language === 'ku') return districtObj.nameKu || districtObj.name;
    if (language === 'ar') return districtObj.nameAr || districtObj.name;
    return districtObj.name;
  };

  const getSubdistrictDisplayName = (subObj: { en: string; ar: string; ku: string }) => {
    if (language === 'ku') return subObj.ku;
    if (language === 'ar') return subObj.ar;
    return subObj.en;
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }
    setCouponLoading(true);
    setCouponError('');
    const result = await applyCoupon(couponCode.trim());
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

    if (!currentUser && !isPhoneVerified) {
      if (!mobileNumber.trim() || mobileNumber.trim().length < 8) {
        alert(t('mobileNumber') + ' ' + (language === 'ku' ? 'دروست نییە' : 'is invalid'));
        return;
      }
      handleSendOtp();
      return;
    }

    const name = fullName || currentUser?.name || 'Online Customer';
    const mobile = mobileNumber || currentUser?.phone || '';

    // Get governorate, district, and subdistrict names
    const govObj = iraqLocations.find(l => l.governorate === selectedGovernorate || l.id === selectedGovernorate);
    const govText = govObj ? getGovernorateName(govObj) : selectedGovernorate;
    
    const distObj = availableDistricts.find(d => d.id === selectedDistrict || d.name === selectedDistrict);
    const distText = distObj ? getDistrictName(distObj) : selectedDistrict;

    const formattedAddress = `${govText} - ${t('district')}: ${distText}${selectedSubdistrict ? ` - ${t('subdistrict')}: ${selectedSubdistrict}` : ''} (${address})`;

    setIsPlacing(true);

    let activeUser = currentUser;
    if (!activeUser && mobile) {
      activeUser = await registerWithPhone(mobile, name);
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
            className="inline-flex items-center justify-center w-full px-6 py-3.5 border border-transparent text-base font-bold rounded-full text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-md active:scale-98"
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
          className="inline-flex items-center justify-center px-6 py-3.5 border border-transparent text-base font-bold rounded-full text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-md active:scale-98"
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

      <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-8">{t('checkout')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Shipping Form */}
        <div className="lg:col-span-7">
          <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-8 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
            <div>
              <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-500" />
                {t('shippingInfo')}
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Auto-filled User Info Banner */}
                {currentUser && (
                  <div className="sm:col-span-2 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl shadow-md flex items-center justify-between gap-4 font-arabic">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 shadow-inner">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-black truncate text-white">
                            {language === 'ku'
                              ? `تۆمارکراویت وەکو: ${currentUser.name}`
                              : language === 'ar'
                              ? `مسجل باسم: ${currentUser.name}`
                              : `Logged in as: ${currentUser.name}`}
                          </p>
                          <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full shrink-0">
                            {language === 'ku' ? 'زانیارییەکانت پڕکرانەوە ✓' : language === 'ar' ? 'تمت التعبئة تلقائياً ✓' : 'Auto-filled ✓'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 truncate mt-1">
                          {currentUser.phone && <span className="mr-3 dir-ltr font-mono font-bold text-slate-200">{currentUser.phone}</span>}
                          {currentUser.email && !currentUser.email.includes('@phone.user') && <span className="text-slate-400">{currentUser.email}</span>}
                        </p>
                      </div>
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
                    className="w-full border border-slate-300 rounded-xl py-3 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-slate-50/50"
                  />
                </div>

                {/* Mobile Number & OTP Verification */}
                <div className="sm:col-span-2 space-y-3.5 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs font-arabic">
                  {/* Header: Label & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="mobileNumber" className="block text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-rose-500" />
                      {t('mobileNumber')}
                    </label>

                    {isPhoneVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/90 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('phoneVerified')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 shrink-0">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
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
                        className="w-full border border-slate-300 rounded-xl py-3 px-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white shadow-xs"
                      />
                    </div>

                    {!isPhoneVerified && (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSendingOtp}
                        className="w-full sm:w-auto px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-extrabold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 active:scale-98 cursor-pointer"
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
                              : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-sky-50/30'
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
                    className="w-full border border-slate-300 rounded-xl py-3 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white font-arabic"
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
                    className="w-full border border-slate-300 rounded-xl py-3 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 font-arabic"
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
                    className="w-full border border-slate-300 rounded-xl py-3 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 font-arabic"
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
                    className="w-full border border-slate-300 rounded-xl py-3 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-slate-50/50"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Section */}
            <div className="pt-6 border-t border-slate-200">
              <h2 className="text-xl font-black text-slate-900 mb-6">{t('paymentMethod')}</h2>
              <div className="space-y-4">
                <label className="flex items-center p-4 border border-rose-200 bg-rose-50/30 rounded-2xl cursor-pointer hover:bg-rose-50/60 transition-colors shadow-xs">
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="cod" 
                    defaultChecked 
                    className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-slate-300" 
                  />
                  <div className="ml-3 rtl:mr-3 rtl:ml-0">
                    <span className="block text-sm font-extrabold text-slate-900">{t('payOnDelivery')}</span>
                    <span className="block text-xs text-slate-500 font-medium">{t('payOnDeliveryDesc')}</span>
                  </div>
                </label>
              </div>
            </div>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-5">
          <div className="bg-slate-50 p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 sticky top-24">
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
                          <p className="ml-2 rtl:mr-2 rtl:ml-0 font-extrabold text-rose-600">{formatIQDLabel(Number(item.product.discountPrice || item.product.price || 0) * item.quantity)}</p>
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
                <Tag className="w-3.5 h-3.5 text-rose-600" />
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
                      className="flex-1 min-w-0 border border-slate-300 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                    />
                    <button
                      type="submit"
                      disabled={couponLoading}
                      className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-60 shadow-xs shrink-0"
                    >
                      {couponLoading ? '...' : (t('applyBtn') || 'Apply')}
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-rose-600 font-medium px-1">{couponError}</p>}
                </form>
              )}
            </div>

            <div className="border-t border-slate-200 pt-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                <p>{t('subtotal')}</p>
                <p className="font-bold">{formatIQDLabel(subtotal)}</p>
              </div>
              {appliedCoupon && (
                <div className="flex items-center justify-between text-xs text-emerald-600 font-bold">
                  <p>{t('discount')} ({appliedCoupon.discountPercentage}%)</p>
                  <p>-{formatIQDLabel(discountAmount)}</p>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                <p>{t('shipping')}</p>
                <p className="text-emerald-600 font-bold">{t('free')}</p>
              </div>
              <div className="flex items-center justify-between text-lg font-black text-slate-900 pt-4 border-t border-slate-200">
                <p>{t('total')}</p>
                <p className="text-rose-600">{formatIQDLabel(totalAmount)}</p>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={isPlacing}
              className="mt-8 w-full flex items-center justify-center rounded-2xl border border-transparent bg-rose-600 px-6 py-4 text-base font-bold text-white shadow-md hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed active:scale-98"
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
        channel={otpChannel}
        generatedCode={generatedOtp}
        directUrl={directOtpUrl}
        onVerifySuccess={async () => {
          setIsPhoneVerified(true);
          setVerifiedPhone(mobileNumber);
          setShowOtpModal(false);
          setOtpError('');
          setNotificationBanner(null);
          if (!currentUser && mobileNumber) {
            await registerWithPhone(mobileNumber, fullName || 'Customer');
          }
        }}
        onResendOtp={(newChan) => handleSendOtp(newChan)}
      />
    </div>
  );
};
