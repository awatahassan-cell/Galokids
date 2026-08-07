import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';
import { Navigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Lock, Shield, Calendar, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import iraqLocations from '../data/iraq-locations.json';

const pTranslations = {
  en: {
    profileSettings: 'Profile Settings',
    profileSubtitle: 'Manage and update your personal account information.',
    contactInfo: 'Contact Information & Delivery Address',
    phone: 'Phone Number',
    phonePlaceholder: 'Enter your phone number',
    address: 'Street / Neighborhood Address',
    addressPlaceholder: 'Enter neighborhood, main street, or landmark',
    governorate: 'Governorate',
    district: 'District (Qaza)',
    subdistrict: 'Sub-district (Nahiya)',
    selectGovernorate: 'Select Governorate',
    selectDistrict: 'Select District',
    selectSubdistrict: 'Select Sub-district',
    optional: 'Optional',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    passwordConfirmation: 'Confirm New Password',
    newPasswordOptional: 'New Password (leave blank to keep current)',
    profileUpdatedSuccess: 'Your profile and delivery settings updated successfully!',
    role: 'Account Role',
    joinDate: 'Join Date',
    admin: 'Administrator',
    staff: 'Staff Member',
    customer: 'Registered Customer',
    fullName: 'Full Name',
    fullNamePlaceholder: 'Enter your full name',
    emailAddress: 'Email Address (Optional)',
    emailPlaceholder: 'Enter your email address',
    passwordsDoNotMatch: 'Passwords do not match.',
    passwordTooShort: 'Password must be at least 8 characters long.',
    requiredField: 'This field is required.',
    invalidEmail: 'Please enter a valid email address.',
    generalError: 'Failed to update profile. Please check your inputs.',
  },
  ku: {
    profileSettings: 'ڕێکخستنەکانی پرۆفایل',
    profileSubtitle: 'زانیارییە کەسییەکانی ئەکاونتەکەت و ناونیشانی گەیاندن نوێ بکەرەوە.',
    contactInfo: 'زانیاری پەیوەندی و ناونیشانی گەیاندن',
    phone: 'ژمارەی مۆبایل',
    phonePlaceholder: 'ژمارەی مۆبایلەکەت بنووسە',
    address: 'ناونیشانی گەڕەک و کۆڵان',
    addressPlaceholder: 'ناوی گەڕەک، جادەی سەرەکی، یان نیشانەی دیار بنووسە',
    governorate: 'پارێزگا',
    district: 'قەزا',
    subdistrict: 'ناحیە',
    selectGovernorate: 'پارێزگا هەڵبژێرە',
    selectDistrict: 'قەزا هەڵبژێرە',
    selectSubdistrict: 'ناحیە هەڵبژێرە',
    optional: 'ئارەزوومەندانە',
    saveChanges: 'پاشەکەوتکردنی گۆڕانکارییەکان',
    saving: 'پاشەکەوت دەکرێت...',
    passwordConfirmation: 'دوپاتکردنەوەی وشەی تێپەڕی نوێ',
    newPasswordOptional: 'وشەی تێپەڕی نوێ (بە بەتاڵی جێبهێڵە بۆ هێشتنەوەی هەنووکەیی)',
    profileUpdatedSuccess: 'زانیارییەکانت بە سەرکەوتوویی نوێکرانەوە!',
    role: 'ڕۆڵی ئەکاونت',
    joinDate: 'ڕێکەوتی بەشداربوون',
    admin: 'بەڕێوەبەر',
    staff: 'کارمەند',
    customer: 'کڕیاری تۆمارکراو',
    fullName: 'ناوی تەواو',
    fullNamePlaceholder: 'ناوی تەواوت بنووسە',
    emailAddress: 'ناونیشانی ئیمەیڵ (ئارەزوومەندانە)',
    emailPlaceholder: 'ئیمەیڵەکەت بنووسە',
    passwordsDoNotMatch: 'وشە تێپەڕەکان وەک یەک نین.',
    passwordTooShort: 'پێویستە وشەی تێپەڕ لانی کەم ٨ پیت یان ژمارە بێت.',
    requiredField: 'ئەم خانەیە پێویستە.',
    invalidEmail: 'تکایە ئیمەیڵێکی دروست بنووسە.',
    generalError: 'نوێکردنەوەی پرۆفایل سەرکەوتوو نەبوو. تکایە زانیارییەکان تاقیبکەرەوە.',
  },
  ar: {
    profileSettings: 'إعدادات الملف الشخصي',
    profileSubtitle: 'إدارة وتحديث معلومات حسابك الشخصي وعنوان التوصيل.',
    contactInfo: 'معلومات الاتصال وعنوان التوصيل',
    phone: 'رقم الهاتف',
    phonePlaceholder: 'أدخل رقم هاتفك',
    address: 'عنوان الشارع والحي',
    addressPlaceholder: 'أدخل اسم الحي، الشارع الرئيسي، أو معلم بارز',
    governorate: 'المحافظة',
    district: 'القضاء',
    subdistrict: 'الناحية',
    selectGovernorate: 'اختر المحافظة',
    selectDistrict: 'اختر القضاء',
    selectSubdistrict: 'اختر الناحية',
    optional: 'اختياري',
    saveChanges: 'حفظ التغييرات',
    saving: 'جاري الحفظ...',
    passwordConfirmation: 'تأكيد كلمة المرور الجديدة',
    newPasswordOptional: 'كلمة المرور الجديدة (اتركها فارغة للاحتفاظ بالحالية)',
    profileUpdatedSuccess: 'تم تحديث معلوماتك وعنوانك بنجاح!',
    role: 'دور الحساب',
    joinDate: 'تاريخ الانضمام',
    admin: 'مدير النظام',
    staff: 'عضو فريق العمل',
    customer: 'عميل مسجل',
    fullName: 'الاسم الكامل',
    fullNamePlaceholder: 'أدخل اسمك الكامل',
    emailAddress: 'البريد الإلكتروني (اختياري)',
    emailPlaceholder: 'أدخل بريدك الإلكتروني',
    passwordsDoNotMatch: 'كلمات المرور غير متطابقة.',
    passwordTooShort: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.',
    requiredField: 'هذا الحقل مطلوب.',
    invalidEmail: 'يرجى إدخال بريد إلكتروني صالح.',
    generalError: 'فشل تحديث الملف الشخصي. يرجى التحقق من المدخلات.',
  }
};

export const Profile: React.FC = () => {
  const { currentUser, updateProfile } = useStore();
  const { language, dir } = useLanguage();

  // Safely default language
  const activeLang = language === 'ku' || language === 'ar' ? language : 'en';
  const localT = pTranslations[activeLang];

  // Form State
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState((currentUser?.email && !currentUser.email.includes('@phone.user')) ? currentUser.email : '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  
  // Location States
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedSubdistrict, setSelectedSubdistrict] = useState('');
  const [streetAddress, setStreetAddress] = useState('');

  const [availableDistricts, setAvailableDistricts] = useState<any[]>([]);
  const [availableSubdistricts, setAvailableSubdistricts] = useState<{ en: string; ar: string; ku: string }[]>([]);

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Dynamic Governorate update
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

  // Dynamic District update
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

  // Sync state if currentUser updates
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail((currentUser.email && !currentUser.email.includes('@phone.user')) ? currentUser.email : '');
      setPhone(currentUser.phone || '');

      if (currentUser.address) {
        const addrLower = currentUser.address.toLowerCase();
        const matchedGov = iraqLocations.find(l =>
          addrLower.includes(l.governorate.toLowerCase()) ||
          addrLower.includes(l.governorateKu.toLowerCase()) ||
          addrLower.includes(l.governorateAr.toLowerCase())
        );

        if (matchedGov) {
          setSelectedGovernorate(matchedGov.governorate);
          const dists = matchedGov.districts || [];
          setAvailableDistricts(dists);

          const matchedDist = dists.find(d =>
            addrLower.includes(d.name.toLowerCase()) ||
            (d.nameKu && addrLower.includes(d.nameKu.toLowerCase())) ||
            (d.nameAr && addrLower.includes(d.nameAr.toLowerCase()))
          );

          if (matchedDist) {
            setSelectedDistrict(matchedDist.id || matchedDist.name);

            if (matchedDist.subdistricts) {
              const list = matchedDist.subdistricts.map((sub: string, index: number) => ({
                en: sub,
                ar: matchedDist.subdistrictsAr?.[index] || sub,
                ku: matchedDist.subdistrictsKu?.[index] || sub,
              }));
              setAvailableSubdistricts(list);

              const matchedSub = matchedDist.subdistricts.find((sub, idx) => {
                const subAr = matchedDist.subdistrictsAr?.[idx] || '';
                const subKu = matchedDist.subdistrictsKu?.[idx] || '';
                return addrLower.includes(sub.toLowerCase()) ||
                  (subKu && addrLower.includes(subKu.toLowerCase())) ||
                  (subAr && addrLower.includes(subAr.toLowerCase()));
              });
              if (matchedSub) {
                setSelectedSubdistrict(matchedSub);
              }
            }
          }
        }

        const addressMatch = currentUser.address.match(/\(([^)]+)\)/);
        if (addressMatch && addressMatch[1]) {
          setStreetAddress(addressMatch[1]);
        } else {
          setStreetAddress(currentUser.address);
        }
      }
    }
  }, [currentUser]);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Map Roles dynamically
  const getRoleBadge = (role: typeof currentUser.role) => {
    const roleNum = Number(role);
    if (roleNum === 3 || role === 'admin') {
      return { label: localT.admin, color: 'bg-red-50 text-red-700 border-red-200' };
    }
    if (roleNum === 2 || role === 'staff') {
      return { label: localT.staff, color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    return { label: localT.customer, color: 'bg-green-50 text-green-700 border-green-200' };
  };

  const roleInfo = getRoleBadge(currentUser.role);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = localT.requiredField;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = localT.invalidEmail;
    }

    if (password) {
      if (password.length < 8) {
        errors.password = localT.passwordTooShort;
      }
      if (password !== passwordConfirm) {
        errors.passwordConfirm = localT.passwordsDoNotMatch;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Build clean full address string
      let fullAddress = streetAddress;
      if (selectedGovernorate) {
        const govObj = iraqLocations.find(l => l.governorate === selectedGovernorate || l.id === selectedGovernorate);
        const govText = govObj 
          ? (activeLang === 'ku' ? govObj.governorateKu : activeLang === 'ar' ? govObj.governorateAr : govObj.governorate) 
          : selectedGovernorate;
        
        const distObj = availableDistricts.find(d => d.id === selectedDistrict || d.name === selectedDistrict);
        const distText = distObj 
          ? (activeLang === 'ku' ? (distObj.nameKu || distObj.name) : activeLang === 'ar' ? (distObj.nameAr || distObj.name) : distObj.name) 
          : selectedDistrict;

        fullAddress = `${govText}${distText ? ` - ${localT.district}: ${distText}` : ''}${selectedSubdistrict ? ` - ${localT.subdistrict}: ${selectedSubdistrict}` : ''}${streetAddress ? ` (${streetAddress})` : ''}`;
      }

      const finalEmail = email.trim() || currentUser?.email || `${(phone || currentUser?.phone || '0000').replace(/[^\d]/g, '')}@phone.user`;

      const result = await updateProfile(
        name,
        finalEmail,
        phone || undefined,
        fullAddress || undefined,
        password || undefined,
        passwordConfirm || undefined
      );

      if (result.success) {
        setSuccessMessage(result.message);
        setPassword('');
        setPasswordConfirm('');
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      console.warn('Profile submit note:', err);
      setErrorMessage(localT.generalError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-grow max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
      {/* Header section */}
      <div className="mb-8 text-start">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{localT.profileSettings}</h1>
        <p className="text-slate-500 mt-2 text-sm sm:text-base">{localT.profileSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Side: Profile Card summary (ReadOnly Info) */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-4 border border-indigo-100">
              <User className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 line-clamp-1">{currentUser.name}</h2>
            {currentUser.email && !currentUser.email.includes('@phone.user') && (
              <p className="text-slate-500 text-sm mt-1 line-clamp-1">{currentUser.email}</p>
            )}

            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border mt-4 ${roleInfo.color}`}>
              <Shield className="w-3.5 h-3.5 mr-1 ml-1" />
              {roleInfo.label}
            </span>

            <div className="w-full border-t border-slate-100 my-6"></div>

            <div className="w-full space-y-4 text-start text-sm text-slate-600">
              {currentUser.joinDate && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{localT.joinDate}</span>
                  </div>
                  <span className="font-medium text-slate-800">{currentUser.joinDate}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Account Details form (Editable Info) */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
            {/* Notifications */}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 text-start">
              {/* Name & Email Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    {localT.fullName}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (validationErrors.name) {
                        setValidationErrors(prev => ({ ...prev, name: '' }));
                      }
                    }}
                    placeholder={localT.fullNamePlaceholder}
                    className={`w-full border rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 text-sm ${
                      validationErrors.name ? 'border-red-300 focus:ring-red-500' : 'border-slate-300'
                    }`}
                  />
                  {validationErrors.name && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {validationErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {localT.emailAddress}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (validationErrors.email) {
                        setValidationErrors(prev => ({ ...prev, email: '' }));
                      }
                    }}
                    placeholder={localT.emailPlaceholder}
                    className={`w-full border rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 text-sm ${
                      validationErrors.email ? 'border-red-300 focus:ring-red-500' : 'border-slate-300'
                    }`}
                  />
                  {validationErrors.email && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {validationErrors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact Info Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-start">
                  <span className="bg-white pr-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{localT.contactInfo}</span>
                </div>
              </div>

              {/* Phone & Address */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {localT.phone}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={localT.phonePlaceholder}
                    className="w-full border border-slate-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 text-sm dir-ltr text-right"
                  />
                </div>

                {/* Governorate & District Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Governorate */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{localT.governorate}</span>
                    </label>
                    <select
                      value={selectedGovernorate}
                      onChange={(e) => {
                        setSelectedGovernorate(e.target.value);
                        setSelectedDistrict('');
                        setSelectedSubdistrict('');
                      }}
                      className="w-full border border-slate-300 bg-white rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm font-arabic"
                    >
                      <option value="">-- {localT.selectGovernorate} --</option>
                      {iraqLocations.map((loc) => (
                        <option key={loc.id} value={loc.governorate}>
                          {activeLang === 'ku' ? loc.governorateKu : activeLang === 'ar' ? loc.governorateAr : loc.governorate}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* District (Qaza) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <span>{localT.district}</span>
                    </label>
                    <select
                      value={selectedDistrict}
                      onChange={(e) => {
                        setSelectedDistrict(e.target.value);
                        setSelectedSubdistrict('');
                      }}
                      disabled={!selectedGovernorate}
                      className="w-full border border-slate-300 bg-white rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm disabled:bg-slate-100 disabled:text-slate-400 font-arabic"
                    >
                      <option value="">-- {localT.selectDistrict} --</option>
                      {availableDistricts.map((dist) => (
                        <option key={dist.id || dist.name} value={dist.id || dist.name}>
                          {activeLang === 'ku' ? (dist.nameKu || dist.name) : activeLang === 'ar' ? (dist.nameAr || dist.name) : dist.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subdistrict (Nahiya) */}
                {availableSubdistricts.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>{localT.subdistrict}</span>
                      <span className="text-[11px] text-slate-400 font-normal">({localT.optional})</span>
                    </label>
                    <select
                      value={selectedSubdistrict}
                      onChange={(e) => setSelectedSubdistrict(e.target.value)}
                      className="w-full border border-slate-300 bg-white rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm font-arabic"
                    >
                      <option value="">-- {localT.selectSubdistrict} --</option>
                      {availableSubdistricts.map((sub, idx) => {
                        const displayName = activeLang === 'ku' ? sub.ku : activeLang === 'ar' ? sub.ar : sub.en;
                        return (
                          <option key={idx} value={displayName}>
                            {displayName}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Street / Neighborhood */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {localT.address}
                  </label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder={localT.addressPlaceholder}
                    className="w-full border border-slate-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 text-sm font-arabic"
                  />
                </div>
              </div>

              {/* Password Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-start">
                  <span className="bg-white pr-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{localT.newPasswordOptional}</span>
                </div>
              </div>

              {/* Password Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-400" />
                    {localT.newPasswordOptional.split(' ')[0] + ' ' + localT.newPasswordOptional.split(' ')[1]}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (validationErrors.password) {
                        setValidationErrors(prev => ({ ...prev, password: '' }));
                      }
                    }}
                    placeholder="••••••••"
                    className={`w-full border rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 text-sm ${
                      validationErrors.password ? 'border-red-300 focus:ring-red-500' : 'border-slate-300'
                    }`}
                  />
                  {validationErrors.password && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {validationErrors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-400" />
                    {localT.passwordConfirmation}
                  </label>
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => {
                      setPasswordConfirm(e.target.value);
                      if (validationErrors.passwordConfirm) {
                        setValidationErrors(prev => ({ ...prev, passwordConfirm: '' }));
                      }
                    }}
                    placeholder="••••••••"
                    className={`w-full border rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 text-sm ${
                      validationErrors.passwordConfirm ? 'border-red-300 focus:ring-red-500' : 'border-slate-300'
                    }`}
                  />
                  {validationErrors.passwordConfirm && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {validationErrors.passwordConfirm}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className={`pt-4 flex justify-end ${dir === 'rtl' ? 'justify-start' : 'justify-end'}`}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 ml-2 animate-spin" />
                      {localT.saving}
                    </>
                  ) : (
                    localT.saveChanges
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
