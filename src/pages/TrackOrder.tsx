import React, { useState } from 'react';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';
import { formatIQDLabel } from '../utils/currency';
import { Package, Search, Loader2 } from 'lucide-react';

export const TrackOrder: React.FC = () => {
  const { trackOrder } = useStore();
  const { t, language } = useLanguage();
  const isRTL = language === 'ar' || language === 'ku';

  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const statusSteps = ['pending', 'processing', 'shipped', 'delivered'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    const res = await trackOrder(orderId.trim(), phone.trim());
    setLoading(false);
    if (res.success) setResult(res.order);
    else setError(res.message || t('orderNotFound') || 'No matching order found.');
  };

  return (
    <div className={`flex-grow max-w-2xl mx-auto w-full px-4 py-12 ${isRTL ? 'font-arabic text-right' : ''}`}>
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Package className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t('trackOrder') || 'Track Your Order'}</h1>
        <p className="text-slate-500 mt-2">{t('trackOrderDesc') || 'Enter your order number and phone to see its status.'}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('orderLabel') || 'Order'} #</label>
          <input value={orderId} onChange={e => setOrderId(e.target.value)} required
            className="w-full border border-slate-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 1024" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('mobileNumber') || 'Mobile Number'}</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} required type="tel"
            className="w-full border border-slate-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="07xx xxx xxxx" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          {t('trackOrder') || 'Track Order'}
        </button>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      </form>

      {result && (
        <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <span className="font-bold text-slate-900">{t('orderLabel') || 'Order'} #{result.id}</span>
            <span className="text-sm font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 capitalize">{t(result.status) || result.status}</span>
          </div>

          {result.status !== 'cancelled' && (
            <div className="flex items-center justify-between mb-8">
              {statusSteps.map((s, i) => {
                const active = statusSteps.indexOf(result.status) >= i;
                return (
                  <React.Fragment key={s}>
                    <div className="flex flex-col items-center gap-1">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</span>
                      <span className={`text-[10px] font-bold ${active ? 'text-indigo-600' : 'text-slate-400'}`}>{t(s) || s}</span>
                    </div>
                    {i < statusSteps.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${statusSteps.indexOf(result.status) > i ? 'bg-indigo-600' : 'bg-slate-100'}`} />}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          <div className="space-y-2 border-t border-slate-100 pt-4">
            {(result.items || []).map((it: any, idx: number) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-slate-700">{it.name || 'Item'} × {it.quantity}</span>
                <span className="font-medium text-slate-900">{formatIQDLabel(Number(it.price) * it.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100">
              <span>{t('total') || 'Total'}</span>
              <span>{formatIQDLabel(Number(result.total_amount || 0))}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
