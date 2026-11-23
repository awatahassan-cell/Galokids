import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Crosshair, Eye, EyeOff, ImagePlus, Pencil, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast, useConfirm } from '../ui/Feedback';
import { uploadImages } from '../../services/uploadService';
import {
  deleteLook, fetchLooks, reorderLooks, saveLook, searchProducts, type LookDraft,
} from '../../services/looksService';
import type { Look, LookSlot, Product } from '../../types';

/**
 * Admin → Looks: the outfits shown on /looks and in the shop app.
 *
 * A look is a model picture plus the real products worn in it. The picture is
 * clicked to put each numbered dot where the garment is, so the shopper's
 * numbers line up with the pieces below it.
 */

const SLOTS: LookSlot[] = ['top', 'bottom', 'shoes', 'hat', 'other'];

const blank = (): LookDraft => ({
  title: '', titleKu: '', titleAr: '', subtitle: '', subtitleKu: '', subtitleAr: '',
  gender: 0, ageRange: '', accentColor: '#141518', imageUrl: '', isActive: true, items: [],
});

const toDraft = (l: Look): LookDraft => ({
  title: l.title, titleKu: l.titleKu ?? '', titleAr: l.titleAr ?? '',
  subtitle: l.subtitle ?? '', subtitleKu: l.subtitleKu ?? '', subtitleAr: l.subtitleAr ?? '',
  gender: l.gender, ageRange: l.ageRange ?? '', accentColor: l.accentColor || '#141518',
  imageUrl: l.imageUrl, isActive: l.isActive,
  items: l.items.map(i => ({ productId: i.productId, slot: i.slot, hotspotX: i.hotspotX, hotspotY: i.hotspotY })),
});

const input = 'w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-slate-900';
const label = 'block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1';

export const AdminLooksTab: React.FC = () => {
  const { language } = useLanguage();
  const toast = useToast();
  const confirm = useConfirm();
  const T = (ku: string, ar: string, en: string) => (language === 'ku' ? ku : language === 'ar' ? ar : en);

  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id?: string; draft: LookDraft } | null>(null);

  const load = useCallback(async () => {
    try {
      setLooks(await fetchLooks(true));
    } catch (e: any) {
      toast(e.message || 'Could not load looks', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const move = async (i: number, delta: number) => {
    const next = [...looks];
    const j = i + delta;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setLooks(next);
    try { await reorderLooks(next.map(l => l.id)); } catch (e: any) { toast(e.message, 'error'); load(); }
  };

  const toggle = async (l: Look) => {
    try {
      await saveLook({ ...toDraft(l), isActive: !l.isActive }, l.id);
      load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const remove = async (l: Look) => {
    const ok = await confirm({
      message: T(`ستایلی «${l.title}» بسڕدرێتەوە؟`, `حذف الإطلالة «${l.title}»؟`, `Delete the look “${l.title}”?`),
      danger: true,
    });
    if (!ok) return;
    try { await deleteLook(l.id); toast(T('سڕایەوە', 'تم الحذف', 'Deleted'), 'success'); load(); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="space-y-6" data-testid="admin-looks">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-candy-600" />{T('ستایلەکان', 'الإطلالات', 'Looks')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {T('جلی تەواو لەسەر مۆدێل — لە ماڵپەڕ و ئەپەکاندا دەردەکەون.', 'إطلالات كاملة على عارض — تظهر في الموقع والتطبيقات.', 'Complete outfits on a model — shown on the website and in the apps.')}
          </p>
        </div>
        <button onClick={() => setEditing({ draft: blank() })}
                className="h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-black flex items-center gap-2 hover:bg-slate-700">
          <Plus className="w-4 h-4" />{T('ستایلی نوێ', 'إطلالة جديدة', 'New look')}
        </button>
      </div>

      {loading && <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" />}
      {!loading && looks.length === 0 && (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 text-slate-500 font-bold">
          {T('هێشتا ستایلێک نییە', 'لا توجد إطلالات بعد', 'No looks yet')}
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {looks.map((l, i) => (
          <div key={l.id} className={`rounded-2xl border bg-white overflow-hidden ${l.isActive ? 'border-slate-200' : 'border-slate-200 opacity-70'}`}>
            <div className="flex gap-3 p-3">
              <div className="w-24 h-32 rounded-xl overflow-hidden shrink-0" style={{ background: `${l.accentColor}22` }}>
                <img src={l.imageUrl} alt="" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-black text-slate-900 truncate">{l.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {l.gender === 1 ? T('کوڕان', 'أولاد', 'Boys') : l.gender === 2 ? T('کچان', 'بنات', 'Girls') : T('هەمووی', 'الكل', 'All')}
                  {l.ageRange ? ` · ${l.ageRange}` : ''} · {l.items.length} {T('پارچە', 'قطع', 'pieces')}
                </div>
                <div className="flex -space-x-2 rtl:space-x-reverse mt-2">
                  {l.items.slice(0, 5).map(it => (
                    <img key={it.productId} src={it.product.imageUrl} alt="" className="w-8 h-8 rounded-full border-2 border-white object-cover bg-slate-100" />
                  ))}
                </div>
                {!l.isActive && <div className="mt-2 text-[11px] font-black text-amber-600">{T('شاراوەیە', 'مخفية', 'Hidden')}</div>}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-2 py-1.5">
              <div className="flex">
                <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Up" className="p-2 text-slate-500 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                <button onClick={() => move(i, 1)} disabled={i === looks.length - 1} aria-label="Down" className="p-2 text-slate-500 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
              </div>
              <div className="flex">
                <button onClick={() => toggle(l)} aria-label="Toggle" title={l.isActive ? T('شاردنەوە', 'إخفاء', 'Hide') : T('پیشاندان', 'إظهار', 'Show')} className="p-2 text-slate-500">
                  {l.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => setEditing({ id: l.id, draft: toDraft(l) })} aria-label="Edit" className="p-2 text-slate-500"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove(l)} aria-label="Delete" className="p-2 text-candy-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <LookEditor
          initial={editing.draft}
          id={editing.id}
          knownProducts={looks.flatMap(l => l.items.map(i => i.product))}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ editor */

const LookEditor: React.FC<{
  initial: LookDraft;
  id?: string;
  knownProducts: Product[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ initial, id, knownProducts, onClose, onSaved }) => {
  const { language } = useLanguage();
  const toast = useToast();
  const T = (ku: string, ar: string, en: string) => (language === 'ku' ? ku : language === 'ar' ? ar : en);

  const [draft, setDraft] = useState<LookDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [placing, setPlacing] = useState<number | null>(null);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  // Names/pictures for the pieces already in the draft, so the list can show them.
  const [products, setProducts] = useState<Record<string, Product>>(
    () => Object.fromEntries(knownProducts.map(p => [p.id, p]))
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof LookDraft>(key: K, value: LookDraft[K]) => setDraft(d => ({ ...d, [key]: value }));

  useEffect(() => {
    if (term.trim().length < 2) { setResults([]); return; }
    const handle = window.setTimeout(() => {
      searchProducts(term.trim()).then(rows => {
        setResults(rows);
        setProducts(prev => ({ ...prev, ...Object.fromEntries(rows.map(p => [p.id, p])) }));
      }).catch(() => setResults([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [term]);

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      // No compression: a model cut-out is a PNG, and JPEG would paint its
      // transparent background black.
      const { urls } = await uploadImages([file], { compress: false });
      if (!urls[0]) throw new Error(T('بارکردن سەرکەوتوو نەبوو', 'فشل الرفع', 'Upload failed'));
      set('imageUrl', urls[0]);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const addPiece = (p: Product) => {
    if (draft.items.some(i => i.productId === p.id)) return;
    if (draft.items.length >= 12) { toast(T('زیاتر لە ١٢ پارچە ناکرێت', 'الحد الأقصى 12 قطعة', 'A look holds at most 12 pieces'), 'info'); return; }
    // Start in the middle so the dot is visible; the admin then clicks it into place.
    setDraft(d => ({
      ...d,
      items: [...d.items, { productId: p.id, slot: 'top', hotspotX: 50, hotspotY: 30 + d.items.length * 12 }],
    }));
    setPlacing(draft.items.length);
    setTerm('');
    setResults([]);
  };

  const patchItem = (i: number, patch: Partial<LookDraft['items'][number]>) =>
    setDraft(d => ({ ...d, items: d.items.map((it, k) => (k === i ? { ...it, ...patch } : it)) }));

  const removeItem = (i: number) => {
    setDraft(d => ({ ...d, items: d.items.filter((_, k) => k !== i) }));
    setPlacing(null);
  };

  const place = (e: React.MouseEvent) => {
    if (placing === null || !stageRef.current) return;
    const box = stageRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - box.left) / box.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - box.top) / box.height) * 100));
    patchItem(placing, { hotspotX: x, hotspotY: y });
  };

  const save = async () => {
    if (!draft.title.trim()) return toast(T('ناونیشان پێویستە', 'العنوان مطلوب', 'A title is required'), 'error');
    if (!draft.imageUrl) return toast(T('وێنەی مۆدێل پێویستە', 'صورة العارض مطلوبة', 'Upload the model picture'), 'error');
    if (!draft.items.length) return toast(T('لانی کەم یەک پارچە زیاد بکە', 'أضف قطعة واحدة على الأقل', 'Add at least one piece'), 'error');
    setSaving(true);
    try {
      await saveLook(draft, id);
      toast(T('پاشەکەوت کرا', 'تم الحفظ', 'Saved'), 'success');
      onSaved();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const slotName = (s: LookSlot) => ({
    top: T('سەرەوە', 'علوي', 'Top'), bottom: T('خوارەوە', 'سفلي', 'Bottom'), shoes: T('پێڵاو', 'حذاء', 'Shoes'),
    hat: T('کڵاو', 'قبعة', 'Hat'), other: T('تر', 'آخر', 'Other'),
  }[s]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-stretch sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true">
      <div className="bg-white w-full max-w-5xl sm:rounded-3xl flex flex-col max-h-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-black text-slate-900">{id ? T('دەستکاری ستایل', 'تعديل الإطلالة', 'Edit look') : T('ستایلی نوێ', 'إطلالة جديدة', 'New look')}</h3>
          <button onClick={onClose} aria-label="Close" className="p-2 text-slate-500"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 grid md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-6">
          {/* Picture + dot placement */}
          <div>
            <span className={label}>{T('وێنەی مۆدێل', 'صورة العارض', 'Model picture')}</span>
            <div ref={stageRef} onClick={place}
                 className={`relative aspect-[3/4] rounded-2xl overflow-hidden border border-slate-200 ${placing !== null ? 'cursor-crosshair ring-2 ring-slate-900' : ''}`}
                 style={{ background: `${draft.accentColor}1f` }}>
              {draft.imageUrl
                ? <img src={draft.imageUrl} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                : <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-bold">{T('هیچ وێنەیەک نییە', 'لا صورة', 'No picture')}</div>}
              {draft.items.map((it, i) => (
                <span key={it.productId}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full text-xs font-black flex items-center justify-center border-2 border-white shadow ${placing === i ? 'bg-slate-900 text-white scale-125' : 'bg-white text-slate-900'}`}
                      style={{ left: `${it.hotspotX}%`, top: `${it.hotspotY}%` }}>{i + 1}</span>
              ))}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/webp,image/jpeg" hidden onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="mt-3 w-full h-10 rounded-xl border border-slate-300 text-sm font-black flex items-center justify-center gap-2 hover:bg-slate-50">
              <ImagePlus className="w-4 h-4" />{uploading ? '…' : draft.imageUrl ? T('گۆڕینی وێنە', 'تغيير الصورة', 'Replace picture') : T('بارکردنی وێنە', 'رفع صورة', 'Upload picture')}
            </button>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              {T('باشترین: PNG بێ پاشخان، مۆدێلی تەواو. دوای هەڵبژاردنی پارچەیەک، کرتە لەسەر وێنەکە بکە بۆ دانانی خاڵەکە.',
                 'الأفضل: PNG بخلفية شفافة وعارض كامل. اختر قطعة ثم انقر على الصورة لوضع النقطة.',
                 'Best: a full-length PNG with a transparent background. Pick a piece, then click the picture to put its dot there.')}
            </p>
          </div>

          {/* Details + pieces */}
          <div className="space-y-5 min-w-0">
            <div className="grid sm:grid-cols-3 gap-3">
              <div><span className={label}>Title (EN)</span><input className={input} value={draft.title} onChange={e => set('title', e.target.value)} /></div>
              <div><span className={label}>ناونیشان (کوردی)</span><input className={input} dir="rtl" value={draft.titleKu} onChange={e => set('titleKu', e.target.value)} /></div>
              <div><span className={label}>العنوان (عربي)</span><input className={input} dir="rtl" value={draft.titleAr} onChange={e => set('titleAr', e.target.value)} /></div>
              <div><span className={label}>Subtitle (EN)</span><input className={input} value={draft.subtitle} onChange={e => set('subtitle', e.target.value)} /></div>
              <div><span className={label}>ژێرناونیشان</span><input className={input} dir="rtl" value={draft.subtitleKu} onChange={e => set('subtitleKu', e.target.value)} /></div>
              <div><span className={label}>العنوان الفرعي</span><input className={input} dir="rtl" value={draft.subtitleAr} onChange={e => set('subtitleAr', e.target.value)} /></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className={label}>{T('ڕەگەز', 'الفئة', 'For')}</span>
                <select className={input} value={draft.gender} onChange={e => set('gender', Number(e.target.value) as 0 | 1 | 2)}>
                  <option value={0}>{T('هەمووی', 'الكل', 'Everyone')}</option>
                  <option value={1}>{T('کوڕان', 'أولاد', 'Boys')}</option>
                  <option value={2}>{T('کچان', 'بنات', 'Girls')}</option>
                </select>
              </div>
              <div><span className={label}>{T('تەمەن', 'العمر', 'Age range')}</span><input className={input} placeholder="4-7" value={draft.ageRange} onChange={e => set('ageRange', e.target.value)} /></div>
              <div>
                <span className={label}>{T('ڕەنگی پاشخان', 'لون الخلفية', 'Accent colour')}</span>
                <input type="color" className="w-full h-10 rounded-xl border border-slate-200 bg-white p-1" value={draft.accentColor} onChange={e => set('accentColor', e.target.value)} />
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm font-black text-slate-700 cursor-pointer">
                <input type="checkbox" className="w-5 h-5" checked={draft.isActive} onChange={e => set('isActive', e.target.checked)} />
                {T('چالاک', 'مفعّلة', 'Visible')}
              </label>
            </div>

            <div>
              <span className={label}>{T('پارچەکان', 'القطع', 'Pieces')} ({draft.items.length}/12)</span>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute top-3 start-3" />
                <input className={`${input} ps-9`} placeholder={T('گەڕان بە ناوی کاڵا…', 'ابحث باسم المنتج…', 'Search products to add…')}
                       value={term} onChange={e => setTerm(e.target.value)} />
                {results.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                    {results.map(p => (
                      <button key={p.id} onClick={() => addPiece(p)} disabled={draft.items.some(i => i.productId === p.id)}
                              className="w-full flex items-center gap-3 p-2 text-start hover:bg-slate-50 disabled:opacity-40">
                        <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                        <span className="text-sm font-bold text-slate-800 truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {draft.items.map((it, i) => {
                  const p = products[it.productId];
                  return (
                    <div key={it.productId} className={`flex items-center gap-3 rounded-xl border p-2 ${placing === i ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}>
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                      {p?.imageUrl && <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100" />}
                      <div className="min-w-0 flex-1 text-sm font-bold text-slate-800 truncate">{p?.name ?? `#${it.productId}`}</div>
                      <select className="h-9 rounded-lg border border-slate-200 text-xs font-bold px-2" value={it.slot} onChange={e => patchItem(i, { slot: e.target.value as LookSlot })}>
                        {SLOTS.map(s => <option key={s} value={s}>{slotName(s)}</option>)}
                      </select>
                      <button onClick={() => setPlacing(placing === i ? null : i)} aria-label="Place dot" title={T('دانانی خاڵ', 'وضع النقطة', 'Place dot')}
                              className={`p-2 rounded-lg ${placing === i ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><Crosshair className="w-4 h-4" /></button>
                      <button onClick={() => removeItem(i)} aria-label="Remove" className="p-2 text-candy-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-white">
          <button onClick={onClose} className="h-11 px-5 rounded-xl border border-slate-300 text-sm font-black">{T('پاشگەزبوونەوە', 'إلغاء', 'Cancel')}</button>
          <button onClick={save} disabled={saving} className="h-11 px-6 rounded-xl bg-slate-900 text-white text-sm font-black disabled:opacity-50">
            {saving ? '…' : T('پاشەکەوتکردن', 'حفظ', 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLooksTab;
