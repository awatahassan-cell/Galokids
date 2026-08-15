import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useToast } from './ui/Feedback';
import {
  Save, Store, Phone, Mail, MessageSquare, Facebook, Instagram, Video, Ghost,
  Upload, Trash2, Loader2, Image as ImageIcon, Truck, Bell,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { adminTr } from '../i18n/adminDict';
import { uploadImages } from '../services/uploadService';
import iraqLocations from '../data/iraq-locations.json';

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
    instagram_access_token: '',
    tiktok_url: '',
    snapchat_url: '',
  });
  // Delivery charges. Kept out of `form` because the value saved is a JSON
  // map of governorate -> fee, not a plain string field.
  const [shippingRates, setShippingRates] = useState<Record<string, string>>({});
  const [shippingDefaultFee, setShippingDefaultFee] = useState('');
  const [shippingFreeOver, setShippingFreeOver] = useState('');
  const [notifyOrderStatus, setNotifyOrderStatus] = useState(false);

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
      // The token is never sent back from the server, so there is nothing to
      // prefill. Left blank it keeps whatever is stored; typing one replaces it.
      instagram_access_token: f.instagram_access_token,
      tiktok_url: storeSettings.tiktok_url ?? f.tiktok_url,
      snapchat_url: storeSettings.snapchat_url ?? f.snapchat_url,
    }));

    // `shipping_rates` arrives already JSON-decoded by the settings endpoint,
    // but tolerate a raw string in case it was written by hand.
    let rates = storeSettings.shipping_rates;
    if (typeof rates === 'string') {
      try { rates = JSON.parse(rates); } catch { rates = {}; }
    }
    if (rates && typeof rates === 'object') {
      const asText: Record<string, string> = {};
      Object.entries(rates as Record<string, unknown>).forEach(([key, value]) => {
        asText[key] = value == null ? '' : String(value);
      });
      setShippingRates(asText);
    }

    setShippingDefaultFee(storeSettings.shipping_default_fee != null ? String(storeSettings.shipping_default_fee) : '');
    setShippingFreeOver(storeSettings.shipping_free_over != null ? String(storeSettings.shipping_free_over) : '');
    setNotifyOrderStatus(storeSettings.notify_order_status === true || storeSettings.notify_order_status === 'true');
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

    // Blank rows mean "use the default", so they are dropped rather than saved
    // as a zero — a stored 0 would mean free delivery to that governorate.
    const cleanedRates: Record<string, number> = {};
    Object.entries(shippingRates).forEach(([key, raw]) => {
      const value = String(raw ?? '');
      if (value.trim() === '') return;
      cleanedRates[key] = Math.max(0, Math.round(parseFloat(value) || 0));
    });

    const ok = await saveSettings({
      ...form,
      shipping_rates: cleanedRates,
      shipping_default_fee: Math.max(0, Math.round(parseFloat(shippingDefaultFee) || 0)),
      shipping_free_over: Math.max(0, Math.round(parseFloat(shippingFreeOver) || 0)),
      notify_order_status: notifyOrderStatus,
    });
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
            'https://instagram.com/galokids.iq',
            <Instagram className="w-4 h-4 text-pink-600" />
          )}
          {field(
            'instagram_access_token',
            L('Instagram Access Token (Meta API)'),
            storeSettings.instagram_access_token_set
              ? (language === 'ku' ? '•••••••• (تۆکنێک پاشەکەوتکراوە)' : '•••••••• (a token is saved)')
              : 'IGQJ...',
            <Instagram className="w-4 h-4 text-purple-600" />,
            // The token is a credential, so it is stored but never read back —
            // it used to be served to every visitor along with the shop's
            // address and phone number.
            storeSettings.instagram_access_token_set
              ? (language === 'ku'
                  ? 'تۆکنێک پاشەکەوتکراوە. بەتاڵی جێبهێڵە بۆ هێشتنەوەی، یان تۆکنێکی نوێ بنووسە بۆ گۆڕینی.'
                  : 'A token is saved. Leave blank to keep it, or paste a new one to replace it.')
              : (language === 'ku'
                  ? 'تۆکنی Meta Instagram Display API بنووسە بۆ نیشاندانی پۆستە ڕاستەقینەکانت لە هۆم پەیج'
                  : 'Paste Meta Instagram Display API access token to render live posts')
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

      {/* SECTION 3: Delivery charges */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-6 md:p-8 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.4)]">
        <h2 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
          <Truck className="w-5 h-5 text-indigo-600" />
          {language === 'ku' ? 'کرێی گەیاندن' : language === 'ar' ? 'رسوم التوصيل' : 'Delivery charges'}
        </h2>
        <p className="text-xs text-slate-500 mb-6 font-medium">
          {language === 'ku'
            ? 'کرێی گەیاندن بۆ هەر پارێزگایەک. ئەو پارێزگایانەی بەتاڵ بن نرخی بنەڕەتی بەکاردەهێنن.'
            : language === 'ar'
            ? 'رسوم التوصيل لكل محافظة. المحافظات الفارغة تستخدم الرسوم الافتراضية.'
            : 'What delivery costs per governorate. Blank rows fall back to the default fee.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {language === 'ku' ? 'نرخی بنەڕەتی (دینار)' : language === 'ar' ? 'الرسوم الافتراضية (دينار)' : 'Default fee (IQD)'}
            </label>
            <input
              type="number"
              min="0"
              value={shippingDefaultFee}
              onChange={e => setShippingDefaultFee(e.target.value)}
              placeholder="0"
              className="w-full bg-slate-100/80 border border-slate-200 rounded-2xl py-2.5 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {language === 'ku' ? 'گەیاندنی بێ بەرامبەر لە سەرووی (دینار)' : language === 'ar' ? 'توصيل مجاني فوق (دينار)' : 'Free delivery over (IQD)'}
            </label>
            <input
              type="number"
              min="0"
              value={shippingFreeOver}
              onChange={e => setShippingFreeOver(e.target.value)}
              placeholder="0"
              className="w-full bg-slate-100/80 border border-slate-200 rounded-2xl py-2.5 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              {language === 'ku' ? '٠ = ناچالاک' : language === 'ar' ? '٠ = معطل' : '0 disables it'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(iraqLocations as any[]).map(gov => (
            <div key={gov.id} className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 w-28 shrink-0 truncate">
                {language === 'ku' ? gov.governorateKu : language === 'ar' ? gov.governorateAr : gov.governorate}
              </span>
              <input
                type="number"
                min="0"
                value={shippingRates[gov.governorate] ?? ''}
                onChange={e => setShippingRates(prev => ({ ...prev, [gov.governorate]: e.target.value }))}
                placeholder={shippingDefaultFee || '0'}
                className="flex-1 min-w-0 bg-slate-100/80 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: Customer notifications */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-6 md:p-8 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.4)]">
        <h2 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-600" />
          {language === 'ku' ? 'ئاگادارکردنەوەی کڕیار' : language === 'ar' ? 'إشعارات العملاء' : 'Customer notifications'}
        </h2>
        <p className="text-xs text-slate-500 mb-5 font-medium">
          {language === 'ku'
            ? 'بە کارخستنی ئەمە نامەی SMS بۆ کڕیار دەنێرێت هەر کاتێک دۆخی داواکارییەکەی بگۆڕێت. هەر نامەیەک تێچووی هەیە.'
            : language === 'ar'
            ? 'عند التفعيل تُرسل رسالة SMS للعميل عند تغيّر حالة طلبه. كل رسالة لها تكلفة.'
            : 'When on, the customer gets an SMS whenever their order status changes. Each message costs credit.'}
        </p>

        <button
          type="button"
          onClick={() => setNotifyOrderStatus(v => !v)}
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-black transition-all ${
            notifyOrderStatus
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}
        >
          <span className={`w-10 h-6 rounded-full p-1 transition-colors ${notifyOrderStatus ? 'bg-emerald-500' : 'bg-slate-300'}`}>
            <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${notifyOrderStatus ? 'translate-x-4' : ''}`} />
          </span>
          {notifyOrderStatus
            ? (language === 'ku' ? 'چالاکە' : language === 'ar' ? 'مفعّل' : 'Enabled')
            : (language === 'ku' ? 'ناچالاکە' : language === 'ar' ? 'معطّل' : 'Disabled')}
        </button>
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
