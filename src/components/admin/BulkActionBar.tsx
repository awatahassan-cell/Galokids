import React, { useState } from 'react';
import { Trash2, X, Loader2, AlertTriangle, CheckSquare } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export interface BulkActionBarProps {
  /** How many rows are ticked. The bar hides itself at zero. */
  count: number;
  /** Rows currently visible, so "select all" can target the right set. */
  totalVisible: number;
  onSelectAllVisible: () => void;
  onClear: () => void;
  /** Runs the delete. Resolves with what the server actually did. */
  onDelete: () => Promise<{ success: boolean; deleted: number; skipped: any[]; message?: string }>;
  /**
   * What is being deleted, for the confirmation sentence. `en` is the plural;
   * `enOne` is used when exactly one row is involved, since English is the
   * only one of the three that inflects here.
   */
  noun: { ku: string; ar: string; en: string; enOne?: string };
  /** Extra actions rendered before the delete button (e.g. change status). */
  extra?: React.ReactNode;
  /**
   * Only an admin may bulk-delete. When false the bar explains why instead of
   * offering a button the server would refuse anyway.
   */
  isAdmin: boolean;
}

/**
 * The bar that appears once rows are ticked.
 *
 * Deleting many rows at once is the easiest way to lose a lot of data by
 * accident, so it asks for a typed confirmation and then reports the real
 * outcome — including rows the server refused and why.
 */
export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  count, totalVisible, onSelectAllVisible, onClear, onDelete, noun, extra, isAdmin,
}) => {
  const { language } = useLanguage();
  const L = (ku: string, ar: string, en: string) => (language === 'ku' ? ku : language === 'ar' ? ar : en);

  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ deleted: number; skipped: any[] } | null>(null);

  // A finished action clears the selection, so the bar must stay mounted
  // while there is still an outcome to report — otherwise the skipped rows
  // and their reasons would vanish the moment they became relevant.
  if (count === 0 && !result) return null;

  const enWord = (n: number) => (n === 1 && noun.enOne ? noun.enOne : noun.en);
  const word = L(noun.ku, noun.ar, enWord(count));
  // Typing the count is a small deliberate speed bump, and it doubles as a
  // check that the operator has read how many rows they are about to remove.
  const confirmOk = typed.trim() === String(count);

  const run = async () => {
    setBusy(true);
    const res = await onDelete();
    setBusy(false);
    if (res.success) {
      setResult({ deleted: res.deleted, skipped: res.skipped || [] });
      setConfirming(false);
      setTyped('');
    } else {
      setResult({ deleted: 0, skipped: [{ reason: res.message || 'failed' }] });
    }
  };

  const reasonText = (reason: string) => {
    switch (reason) {
      case 'self': return L('هەژماری خۆت', 'حسابك', 'your own account');
      case 'last_admin': return L('دوا ئەدمین', 'آخر مدير', 'the last admin');
      case 'has_products': return L('بەرهەمی تێدایە', 'يحتوي منتجات', 'still holds products');
      default: return reason;
    }
  };

  return (
    <div className="sticky top-2 z-30 mb-4">
      {count > 0 && (
      <div className="bg-slate-900 text-white rounded-2xl shadow-xl px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 font-black text-sm">
          <CheckSquare className="w-4 h-4 text-candy-400" />
          {count} {word} {L('هەڵبژێردراوە', 'محدد', 'selected')}
        </span>

        {count < totalVisible && (
          <button
            onClick={onSelectAllVisible}
            className="text-xs font-bold text-slate-300 hover:text-white underline cursor-pointer"
          >
            {L(`هەڵبژاردنی هەموو ${totalVisible}`, `تحديد الكل (${totalVisible})`, `Select all ${totalVisible}`)}
          </button>
        )}

        <div className="grow" />

        {extra}

        {isAdmin ? (
          <button
            onClick={() => { setConfirming(true); setResult(null); }}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            {L('سڕینەوە', 'حذف', 'Delete')}
          </button>
        ) : (
          <span className="inline-flex items-center gap-2 text-xs font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4" />
            {L('تەنها ئەدمین دەتوانێت بسڕێتەوە', 'الحذف للمدير فقط', 'Only an admin can delete')}
          </span>
        )}

        <button
          onClick={onClear}
          className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/10 cursor-pointer"
          aria-label={L('لابردنی هەڵبژاردن', 'إلغاء التحديد', 'Clear selection')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      )}

      {/* What actually happened, including anything the server refused. */}
      {result && (
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-lg text-sm">
          <p className="font-black text-slate-900">
            {result.deleted > 0
              ? L(`${result.deleted} ${word} سڕایەوە`, `تم حذف ${result.deleted}`, `${result.deleted} ${enWord(result.deleted)} deleted`)
              : L('هیچ نەسڕایەوە', 'لم يُحذف شيء', 'Nothing was deleted')}
          </p>
          {result.skipped.length > 0 && (
            <ul className="mt-1.5 text-xs text-slate-500 font-bold space-y-0.5">
              {result.skipped.map((sk, i) => (
                <li key={i}>
                  • {sk.name ? `${sk.name} — ` : ''}{reasonText(sk.reason)}
                  {sk.count ? ` (${sk.count})` : ''}
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setResult(null)} className="mt-2 text-xs font-black text-candy-700 cursor-pointer">
            {L('باشە', 'حسناً', 'OK')}
          </button>
        </div>
      )}

      {/* Confirmation. Typing the count is deliberate friction. */}
      {confirming && (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center p-4" onClick={() => setConfirming(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 grid place-items-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">
              {L(`سڕینەوەی ${count} ${word}؟`, `حذف ${count}؟`, `Delete ${count} ${word}?`)}
            </h3>
            <p className="text-sm text-slate-500 font-bold mb-4">
              {L(
                'ئەم کردارە ناگەڕێتەوە. بۆ دڵنیابوون، ژمارەکە بنووسە.',
                'لا يمكن التراجع. اكتب العدد للتأكيد.',
                'This cannot be undone. Type the number to confirm.'
              )}
            </p>
            <input
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder={String(count)}
              inputMode="numeric"
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-mono text-lg font-black text-center focus:border-red-500 outline-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setConfirming(false); setTyped(''); }}
                className="flex-1 py-3 rounded-xl border border-slate-200 font-black text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {L('پاشگەزبوونەوە', 'إلغاء', 'Cancel')}
              </button>
              <button
                onClick={run}
                disabled={!confirmOk || busy}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-sm inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {L('سڕینەوە', 'حذف', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
