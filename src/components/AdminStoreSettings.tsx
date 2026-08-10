import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useToast } from './ui/Feedback';
import {
  Save, Store, Phone, Mail, MessageSquare, Facebook, Instagram, Video, Ghost,
  Upload, Trash2, Loader2, Image as ImageIcon,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { adminTr } from '../i18n/adminDict';
import { uploadImages } from '../services/uploadService';

export const AdminStoreSettings: React.FC = () => {
  const { storeSettings, saveSettings } = useStore();
  const { language } = useLanguage();
  const L = (s: string) => adminTr(s, language);
  const toast = useToast();
  
  const [form, setForm] = useState({
    store_name: '',
    store_address: '',
    store_phone: '',
    store_logo: '',
    receipt_footer: '',
    contact_email: '',
    whatsapp_number: '',
    facebook_url: '',
    instagram_url: '',
    tiktok_url: '',
    snapchat_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast(language === 'ku' ? 'تکایە فایلێکی وێنە هەڵبژێرە' : 'Please choose an image file', 'error');
      return;
    }
    // 5 MB is well above any sane logo and matches what the API accepts.
    if (file.size > 5 * 1024 * 1024) {
      toast(language === 'ku' ? 'قەبارەی وێنەکە زۆرە (زۆرترین ٥MB)' : 'Image is too large (max 5MB)', 'error');
      return;
    }

    setUploadingLogo(true);
    try {
      // No JPEG re-encode: a logo is usually a PNG with a transparent
      // background, and compressing it would fill that with black.
      const result = await uploadImages([file], { compress: false });

      if (result.urls.length === 0) {
        toast(result.message || (language === 'ku' ? 'بارکردنی وێنە سەرکەوتوو نەبوو' : 'Logo upload failed'), 'error');
        return;
      }

      setForm(f => ({ ...f, store_logo: result.urls[0] }));
      toast(
        result.uploaded
          ? (language === 'ku' ? 'لۆگۆ بارکرا — پاشەکەوتی بکە ✅' : 'Logo uploaded — remember to save ✅')
          : (language === 'ku' ? 'سێرڤەر بەردەست نەبوو، وێنەکە بە ناوخۆیی زیادکرا' : 'Server unavailable — logo embedded locally'),
        result.uploaded ? 'success' : 'error'
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  useEffect(() => {
    setForm(f => ({
      store_name: storeSettings.store_name ?? f.store_name,
      store_address: storeSettings.store_address ?? f.store_address,
      store_phone: storeSettings.store_phone ?? f.store_phone,
      store_logo: storeSettings.store_logo || '/assets/galo-logo.png',
      receipt_footer: storeSettings.receipt_footer ?? f.receipt_footer,
      contact_email: storeSettings.contact_email ?? f.contact_email,
      whatsapp_number: storeSettings.whatsapp_number ?? f.whatsapp_number,
      facebook_url: storeSettings.facebook_url ?? f.facebook_url,
      instagram_url: storeSettings.instagram_url ?? f.instagram_url,
      tiktok_url: storeSettings.tiktok_url ?? f.tiktok_url,
      snapchat_url: storeSettings.snapchat_url ?? f.snapchat_url,
    }));
  }, [storeSettings]);

  const field = (
    key: keyof typeof form,
    label: string,
    placeholder = '',
    icon?: React.ReactNode,
    helpText?: string
  ) => (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
        {icon} {label}
      </label>
      <input
        value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full bg-slate-100/80 border border-slate-200 rounded-2xl py-2.5 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
      />
      {helpText && <p className="text-xs text-slate-400 mt-1">{helpText}</p>}
    </div>
  );

  const save = async () => {
    setSaving(true);
    const ok = await saveSettings(form);
    setSaving(false);
    toast(
      ok ? L('Store settings saved successfully ✅') : L('Could not save settings'),
      ok ? 'success' : 'error'
    );
  };

  return (
    <div className="space-y-6 font-arabic">
      {/* SECTION 1: Store Info for POS Receipts */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-6 md:p-8 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.4)]">
        <h2 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
          <Store className="w-5 h-5 text-indigo-600" /> {L("Store Info (receipts)")}
        </h2>
        <p className="text-xs text-slate-500 mb-6 font-medium">{L("Shown on the top of every POS receipt.")}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('store_name', L('Store name'), 'Galo Kids')}
          {field('store_phone', L('Phone'), '0770 000 0000', <Phone className="w-4 h-4 text-slate-400" />)}
          <div className="md:col-span-2">
            {field('store_address', L('Address'), L('City, street...'))}
          </div>
          <div className="md:col-span-2">
            {field('receipt_footer', L('Receipt footer'), L('Thank you! ❤️'))}
          </div>
        </div>

        {/* Logo: upload a file, or paste a URL if the image is hosted elsewhere. */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-slate-400" />
            {language === 'ku' ? 'لۆگۆی فرۆشگا' : language === 'ar' ? 'شعار المتجر' : 'Store logo'}
          </label>

          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-28 h-28 rounded-3xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
              {form.store_logo ? (
                <img src={form.store_logo} alt="logo preview" className="w-full h-full object-contain p-2" />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-300" />
              )}
            </div>

            <div className="flex-1 w-full space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm disabled:opacity-60 transition-all cursor-pointer active:scale-95"
                >
                  {uploadingLogo
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Upload className="w-4 h-4" />}
                  <span>
                    {uploadingLogo
                      ? (language === 'ku' ? 'بارکردن...' : language === 'ar' ? 'جاري الرفع...' : 'Uploading...')
                      : (language === 'ku' ? 'هەڵبژاردنی وێنە' : language === 'ar' ? 'اختر صورة' : 'Upload image')}
                  </span>
                </button>

                {form.store_logo && (
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, store_logo: '' }))}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{language === 'ku' ? 'لابردن' : language === 'ar' ? 'إزالة' : 'Remove'}</span>
                  </button>
                )}

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) handleLogoUpload(file);
                  }}
                />
              </div>

              <input
                value={form.store_logo}
                onChange={e => setForm({ ...form, store_logo: e.target.value })}
                placeholder={language === 'ku' ? 'یان بەستەری وێنەکە لێرە دابنێ (https://...)' : 'https://...'}
                className="w-full bg-slate-100/80 border border-slate-200 rounded-2xl py-2.5 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />

              <p className="text-[11px] text-slate-400 font-medium">
                {language === 'ku'
                  ? 'PNG بە پاشبنەمای شەفاف باشترینە. لۆگۆکە لەسەر پسوڵەکان و سەردێڕی سایتەکە دەردەکەوێت.'
                  : language === 'ar'
                  ? 'يفضل PNG بخلفية شفافة. يظهر الشعار على الإيصالات ورأس الموقع.'
                  : 'A transparent PNG works best. The logo appears on receipts and in the site header.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Website Contact Details & Social Media */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-6 md:p-8 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.4)]">
        <h2 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
          <Phone className="w-5 h-5 text-indigo-600" /> {L("Store Contact Details")}
        </h2>
        <p className="text-xs text-slate-500 mb-6 font-medium">{L("Shown on the website contact page and footer.")}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {field(
            'whatsapp_number',
            L('WhatsApp Number'),
            '9647500000000',
            <MessageSquare className="w-4 h-4 text-[#25D366]" />,
            L('E.g. +9647501234567 (with country code, digits only)')
          )}
          {field(
            'contact_email',
            L('Contact Email'),
            'hello@galokids.com',
            <Mail className="w-4 h-4 text-slate-400" />
          )}
        </div>

        <h3 className="text-md font-semibold text-slate-900 mt-8 mb-1 flex items-center gap-2 border-t border-slate-100 pt-6">
          <Facebook className="w-5 h-5 text-indigo-600" /> {L("Social Media Links")}
        </h3>
        <p className="text-sm text-slate-500 mb-6">{L("Manage your public social media channel URLs.")}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field(
            'facebook_url',
            L('Facebook Link'),
            'https://facebook.com/GaloKids',
            <Facebook className="w-4 h-4 text-blue-600" />
          )}
          {field(
            'instagram_url',
            L('Instagram Link'),
            'https://instagram.com/GaloKids',
            <Instagram className="w-4 h-4 text-pink-600" />
          )}
          {field(
            'tiktok_url',
            L('TikTok Link'),
            'https://tiktok.com/@GaloKids',
            <Video className="w-4 h-4 text-slate-900" />
          )}
          {field(
            'snapchat_url',
            L('Snapchat Link'),
            'https://snapchat.com/add/GaloKids',
            <Ghost className="w-4 h-4 text-amber-500" />
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-indigo-700 flex items-center disabled:opacity-60 shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-95"
        >
          <Save className="w-4 h-4 mr-2" /> {saving ? L('Saving...') : L('Save All Settings')}
        </button>
      </div>
    </div>
  );
};
