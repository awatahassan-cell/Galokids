import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Search, FileSpreadsheet, Loader2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Pagination } from '../Pagination';
import { downloadXlsx } from '../../utils/exportExcel';

interface LogRow {
  id: number;
  action: string;
  subjectType?: string | null;
  subjectId?: string | null;
  summary?: string | null;
  changes?: Record<string, [any, any]> | null;
  userName?: string | null;
  ip?: string | null;
  createdAt: string;
  user?: { id: number; name: string } | null;
}

interface AdminActivityLogTabProps {
  fetchActivityLogs: (filters?: Record<string, any>) => Promise<any>;
  toast: (msg: string, type?: 'success' | 'error') => void;
}

/** Action prefixes we offer as a filter, with their labels. */
const ACTION_GROUPS: { value: string; ku: string; ar: string; en: string }[] = [
  { value: 'product', ku: 'بەرهەم', ar: 'المنتجات', en: 'Products' },
  { value: 'order',   ku: 'داواکاری', ar: 'الطلبات', en: 'Orders' },
  { value: 'stock',   ku: 'ستۆک', ar: 'المخزون', en: 'Stock' },
  { value: 'user',    ku: 'بەکارهێنەر', ar: 'المستخدمين', en: 'Users' },
  { value: 'setting', ku: 'ڕێکخستن', ar: 'الإعدادات', en: 'Settings' },
  { value: 'shift',   ku: 'شیفت', ar: 'الوردية', en: 'Shifts' },
  { value: 'coupon',  ku: 'کۆپۆن', ar: 'الكوبونات', en: 'Coupons' },
];

/** Colour by what the action does — created / changed / removed. */
const toneFor = (action: string) => {
  if (/(created|opened)$/.test(action)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (/(deleted|cancelled|closed)$/.test(action)) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (/(refund|adjust)/.test(action)) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-sky-50 text-sky-700 border-sky-200';
};

export const AdminActivityLogTab: React.FC<AdminActivityLogTabProps> = ({ fetchActivityLogs, toast }) => {
  const { language } = useLanguage();
  const isKu = language === 'ku';
  const isAr = language === 'ar';
  const L = (ku: string, ar: string, en: string) => (isKu ? ku : isAr ? ar : en);

  const [rows, setRows] = useState<LogRow[]>([]);
  const [meta, setMeta] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchActivityLogs({ page, limit: 50, action, from, to });
      setRows(Array.isArray(data?.data) ? data.data : []);
      setMeta({
        currentPage: Number(data?.currentPage || 1),
        lastPage: Number(data?.lastPage || 1),
        total: Number(data?.total || 0),
      });
    } catch {
      setError(L('نەتوانرا تۆمارەکان بهێنرێن.', 'تعذر تحميل السجل.', 'Could not load the activity log.'));
      setRows([]);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchActivityLogs, page, action, from, to]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [action, from, to]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(row =>
      row.action.toLowerCase().includes(needle) ||
      (row.summary || '').toLowerCase().includes(needle) ||
      (row.user?.name || row.userName || '').toLowerCase().includes(needle)
    );
  }, [rows, search]);

  /** "price: 10000 → 12000, cost: 4000 → 5000" */
  const changesText = (row: LogRow) => {
    if (!row.changes) return '';
    return Object.entries(row.changes)
      .map(([field, pair]) => {
        const [before, after] = Array.isArray(pair) ? pair : [null, null];
        return `${field}: ${before ?? '—'} → ${after ?? '—'}`;
      })
      .join(' · ');
  };

  const exportExcel = () => {
    if (!visible.length) {
      toast(L('هیچ داتایەک نییە بۆ ناردن.', 'لا توجد بيانات للتصدير.', 'Nothing to export.'), 'error');
      return;
    }
    downloadXlsx<LogRow>({
      filename: `activity-log-${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Activity',
      title: [L('تۆماری چالاکییەکان', 'سجل النشاطات', 'Activity log')],
      columns: [
        { header: L('بەروار', 'التاریخ', 'Date'), value: r => new Date(r.createdAt).toLocaleString() },
        { header: L('بەکارهێنەر', 'المستخدم', 'User'), value: r => r.user?.name || r.userName || '' },
        { header: L('کردار', 'الإجراء', 'Action'), value: r => r.action },
        { header: L('پوختە', 'الملخص', 'Summary'), value: r => r.summary || '' },
        { header: L('گۆڕانکارییەکان', 'التغييرات', 'Changes'), value: r => changesText(r) },
        { header: 'IP', value: r => r.ip || '' },
      ],
      rows: visible,
    });
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {L('تۆماری چالاکییەکان', 'سجل النشاطات', 'Activity log')}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {L(
                  'کێ چی گۆڕی — نرخ، ستۆک، داواکاری و ڕێکخستنەکان.',
                  'من غيّر ماذا — الأسعار والمخزون والطلبات والإعدادات.',
                  'Who changed what — prices, stock, orders and settings.'
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
              className="w-full rounded-xl border border-slate-200 bg-slate-50 ps-9 pe-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>

          <select
            value={action}
            onChange={e => setAction(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-200"
          >
            <option value="">{L('هەموو کردارەکان', 'كل الإجراءات', 'All actions')}</option>
            {ACTION_GROUPS.map(group => (
              <option key={group.value} value={group.value}>{L(group.ku, group.ar, group.en)}</option>
            ))}
          </select>

          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-200"
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
            {L('هیچ چالاکییەک نەدۆزرایەوە.', 'لا توجد نشاطات.', 'No activity found.')}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visible.map(row => (
              <div key={row.id} className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
                <span className={`self-start shrink-0 rounded-lg border px-2 py-1 text-[11px] font-black ${toneFor(row.action)}`}>
                  {row.action}
                </span>
                <div className="min-w-0 grow">
                  <p className="font-bold text-slate-800 break-words">{row.summary || '—'}</p>
                  {row.changes && (
                    <p className="text-xs text-slate-500 font-medium mt-0.5 break-words">{changesText(row)}</p>
                  )}
                  <p className="text-[11px] text-slate-400 font-bold mt-1">
                    {row.user?.name || row.userName || L('سیستەم', 'النظام', 'System')}
                    {' · '}
                    {new Date(row.createdAt).toLocaleString()}
                    {row.ip ? ` · ${row.ip}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {meta.lastPage > 1 && (
        <Pagination meta={meta} onPageChange={setPage} />
      )}
    </div>
  );
};
