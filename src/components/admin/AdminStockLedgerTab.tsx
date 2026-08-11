import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  History, Search, FileSpreadsheet, ArrowDownCircle, ArrowUpCircle,
  Loader2, AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Pagination } from '../Pagination';
import { downloadXlsx } from '../../utils/exportExcel';

/** One row of the ledger, as the API returns it (camel-cased by the store). */
interface LedgerRow {
  id: number;
  type: string;
  quantityChange: number;
  quantityAfter: number;
  note?: string | null;
  createdAt: string;
  product?: { id: number; name: string; nameKu?: string; nameAr?: string } | null;
  variation?: { id: number; color?: string | null; size?: string | null } | null;
  user?: { id: number; name: string } | null;
}

interface AdminStockLedgerTabProps {
  fetchStockMovements: (filters?: Record<string, any>) => Promise<any>;
  /** Bumped whenever stock changes, so the ledger reloads by itself. */
  productsRevision: number;
  toast: (msg: string, type?: 'success' | 'error') => void;
}

/** Movement types, with a label per language and a colour for the badge. */
const TYPES: Record<string, { ku: string; ar: string; en: string; tone: string }> = {
  sale:       { ku: 'فرۆشتن',        ar: 'بيع',        en: 'Sale',       tone: 'bg-rose-50 text-rose-700 border-rose-200' },
  refund:     { ku: 'گەڕاندنەوە',    ar: 'إرجاع',      en: 'Refund',     tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  purchase:   { ku: 'کڕین',          ar: 'شراء',       en: 'Purchase',   tone: 'bg-sky-50 text-sky-700 border-sky-200' },
  adjustment: { ku: 'ڕاستکردنەوە',   ar: 'تعديل',      en: 'Adjustment', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  count:      { ku: 'ژماردن',        ar: 'جرد',        en: 'Stock count', tone: 'bg-violet-50 text-violet-700 border-violet-200' },
  exchange:   { ku: 'ئاڵوگۆڕ',       ar: 'استبدال',    en: 'Exchange',   tone: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  cancel:     { ku: 'هەڵوەشاندنەوە', ar: 'إلغاء',      en: 'Cancelled',  tone: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export const AdminStockLedgerTab: React.FC<AdminStockLedgerTabProps> = ({
  fetchStockMovements,
  productsRevision,
  toast,
}) => {
  const { language } = useLanguage();
  const isKu = language === 'ku';
  const isAr = language === 'ar';

  const L = (ku: string, ar: string, en: string) => (isKu ? ku : isAr ? ar : en);

  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [meta, setMeta] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const typeLabel = (key: string) => {
    const entry = TYPES[key];
    return entry ? L(entry.ku, entry.ar, entry.en) : key;
  };

  const productName = (row: LedgerRow) => {
    if (!row.product) return '—';
    if (isKu && row.product.nameKu) return row.product.nameKu;
    if (isAr && row.product.nameAr) return row.product.nameAr;
    return row.product.name;
  };

  const variationLabel = (row: LedgerRow) =>
    [row.variation?.color, row.variation?.size].filter(Boolean).join(' / ') || '—';

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchStockMovements({ page, limit: 50, type, from, to });
      setRows(Array.isArray(data?.data) ? data.data : []);
      setMeta({
        currentPage: Number(data?.currentPage || 1),
        lastPage: Number(data?.lastPage || 1),
        total: Number(data?.total || 0),
      });
    } catch (e: any) {
      setError(L('نەتوانرا مێژووی ستۆک بهێنرێت.', 'تعذر تحميل سجل المخزون.', 'Could not load the stock ledger.'));
      setRows([]);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStockMovements, page, type, from, to]);

  useEffect(() => { load(); }, [load, productsRevision]);

  // Filters change the result set, so go back to the first page.
  useEffect(() => { setPage(1); }, [type, from, to]);

  // The search box filters the page in hand; the date/type filters go to the
  // server. Searching every page would mean downloading the whole ledger.
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(row =>
      productName(row).toLowerCase().includes(needle) ||
      variationLabel(row).toLowerCase().includes(needle) ||
      (row.note || '').toLowerCase().includes(needle) ||
      (row.user?.name || '').toLowerCase().includes(needle)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, language]);

  const exportExcel = () => {
    if (!visible.length) {
      toast(L('هیچ داتایەک نییە بۆ ناردن.', 'لا توجد بيانات للتصدير.', 'Nothing to export.'), 'error');
      return;
    }
    downloadXlsx<LedgerRow>({
      filename: `stock-ledger-${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Stock',
      title: [L('مێژووی جوڵەی ستۆک', 'سجل حركة المخزون', 'Stock movement ledger')],
      columns: [
        { header: L('بەروار', 'التاریخ', 'Date'), value: r => new Date(r.createdAt).toLocaleString() },
        { header: L('بەرهەم', 'المنتج', 'Product'), value: r => productName(r) },
        { header: L('جۆر/قەبارە', 'اللون/المقاس', 'Variant'), value: r => variationLabel(r) },
        { header: L('چالاکی', 'النوع', 'Type'), value: r => typeLabel(r.type) },
        { header: L('گۆڕان', 'التغيير', 'Change'), value: r => r.quantityChange },
        { header: L('دوای گۆڕان', 'بعد التغيير', 'After'), value: r => r.quantityAfter },
        { header: L('هۆکار', 'السبب', 'Note'), value: r => r.note || '' },
        { header: L('بەکارهێنەر', 'المستخدم', 'User'), value: r => r.user?.name || '' },
      ],
      rows: visible,
    });
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {L('مێژووی جوڵەی ستۆک', 'سجل حركة المخزون', 'Stock movement ledger')}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {L(
                  'هەموو زیادبوون و کەمبوونەوەیەکی ستۆک لێرە تۆمار دەکرێت.',
                  'كل زيادة أو نقصان في المخزون مسجل هنا.',
                  'Every increase and decrease in stock is recorded here.'
                )}
              </p>
            </div>
          </div>

          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {L('ئیکسل', 'إكسل', 'Excel')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={L('گەڕان لەم لاپەڕەیەدا…', 'بحث في هذه الصفحة…', 'Search this page…')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 ps-9 pe-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">{L('هەموو جۆرەکان', 'كل الأنواع', 'All types')}</option>
            {Object.keys(TYPES).map(key => (
              <option key={key} value={key}>{typeLabel(key)}</option>
            ))}
          </select>

          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500 font-bold text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            {L('بارکردن…', 'جارٍ التحميل…', 'Loading…')}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-slate-500 font-bold text-sm">
            {L('هیچ جوڵەیەکی ستۆک نەدۆزرایەوە.', 'لا توجد حركات مخزون.', 'No stock movements found.')}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr className="text-xs font-black uppercase tracking-wide">
                    <th className="px-4 py-3 text-start">{L('بەروار', 'التاریخ', 'Date')}</th>
                    <th className="px-4 py-3 text-start">{L('بەرهەم', 'المنتج', 'Product')}</th>
                    <th className="px-4 py-3 text-start">{L('جۆر/قەبارە', 'اللون/المقاس', 'Variant')}</th>
                    <th className="px-4 py-3 text-start">{L('چالاکی', 'النوع', 'Type')}</th>
                    <th className="px-4 py-3 text-end">{L('گۆڕان', 'التغيير', 'Change')}</th>
                    <th className="px-4 py-3 text-end">{L('دوای گۆڕان', 'بعد التغيير', 'After')}</th>
                    <th className="px-4 py-3 text-start">{L('هۆکار', 'السبب', 'Note')}</th>
                    <th className="px-4 py-3 text-start">{L('بەکارهێنەر', 'المستخدم', 'User')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 font-medium">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">{productName(row)}</td>
                      <td className="px-4 py-3 text-slate-600">{variationLabel(row)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-lg border px-2 py-1 text-[11px] font-black ${TYPES[row.type]?.tone || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {typeLabel(row.type)}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-end font-black ${row.quantityChange < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        <span className="inline-flex items-center gap-1">
                          {row.quantityChange < 0
                            ? <ArrowDownCircle className="w-3.5 h-3.5" />
                            : <ArrowUpCircle className="w-3.5 h-3.5" />}
                          {row.quantityChange > 0 ? `+${row.quantityChange}` : row.quantityChange}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end font-bold text-slate-700">{row.quantityAfter}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[240px] truncate" title={row.note || ''}>{row.note || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{row.user?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {visible.map(row => (
                <div key={row.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 truncate">{productName(row)}</p>
                      <p className="text-xs text-slate-500 font-medium">{variationLabel(row)}</p>
                    </div>
                    <span className={`shrink-0 font-black ${row.quantityChange < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {row.quantityChange > 0 ? `+${row.quantityChange}` : row.quantityChange}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className={`rounded-lg border px-2 py-0.5 font-black ${TYPES[row.type]?.tone || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {typeLabel(row.type)}
                    </span>
                    <span className="text-slate-500 font-medium">
                      {L('دوای گۆڕان', 'بعد التغيير', 'After')}: {row.quantityAfter}
                    </span>
                    <span className="text-slate-400 font-medium">{new Date(row.createdAt).toLocaleString()}</span>
                  </div>
                  {row.note && <p className="text-xs text-slate-600">{row.note}</p>}
                  {row.user?.name && <p className="text-[11px] text-slate-400 font-bold">{row.user.name}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {meta.lastPage > 1 && (
        <Pagination meta={meta} onPageChange={setPage} />
      )}
    </div>
  );
};
