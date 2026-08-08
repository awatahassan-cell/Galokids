import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '../store';
import { formatIQDLabel } from '../utils/currency';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Package, Percent, RefreshCcw, Users, Store, Globe } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { adminTr } from '../i18n/adminDict';

const todayStr = () => new Date().toISOString().split('T')[0];
const daysAgoStr = (n: number) => new Date(Date.now() - n * 86400000).toISOString().split('T')[0];
const monthStartStr = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]; };
const yearStartStr = () => { const d = new Date(); return new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0]; };

export const AdminSalesReport: React.FC = () => {
  const { fetchSalesReport, fetchCashierReport } = useStore();
  const { language } = useLanguage();
  const L = (s: string) => adminTr(s, language);
  const [from, setFrom] = useState(daysAgoStr(30));
  const [to, setTo] = useState(todayStr());
  const [channel, setChannel] = useState('');
  const [report, setReport] = useState<any>(null);
  const [cashiers, setCashiers] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([
      fetchSalesReport(from, to, channel || undefined).then(setReport).catch(() => setError(L('Could not load the report. Please try again.'))),
      fetchCashierReport(from, to).then(setCashiers).catch(() => setCashiers(null)),
    ]).finally(() => setLoading(false));
  }, [from, to, channel, fetchSalesReport, fetchCashierReport]);

  const setPreset = (preset: 'today' | 'month' | 'year') => {
    if (preset === 'today') { setFrom(todayStr()); setTo(todayStr()); }
    else if (preset === 'month') { setFrom(monthStartStr()); setTo(todayStr()); }
    else { setFrom(yearStartStr()); setTo(todayStr()); }
  };

  useEffect(() => { load(); }, []); // initial load
  // Reload automatically when a preset changes the dates.
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [from, to]);

  const totalPosSales = useMemo(() => {
    if (cashiers && Array.isArray(cashiers.cashiers)) {
      return cashiers.cashiers.reduce((sum: number, c: any) => sum + Number(c.pos_total || 0), 0);
    }
    return Number(report?.pos_revenue || 0);
  }, [cashiers, report]);

  const totalOnlineSales = useMemo(() => {
    if (cashiers && Array.isArray(cashiers.cashiers)) {
      return cashiers.cashiers.reduce((sum: number, c: any) => sum + Number(c.online_total || 0), 0);
    }
    return Number(report?.online_revenue || 0);
  }, [cashiers, report]);

  const stat = (label: string, value: string, Icon: any, color: string) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-4 h-4" /></span>
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">{L("From")}</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">{L("To")}</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">{L("Channel")}</label>
          <select value={channel} onChange={e => setChannel(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">{L("All")}</option>
            <option value="online">{L("Online (Website)")}</option>
            <option value="pos">{L("In-store (POS)")}</option>
          </select>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {loading ? L('Loading...') : L('Run')}
        </button>
        <div className="flex gap-2 ml-auto">
          {([['today', L('Today')], ['month', L('This Month')], ['year', L('This Year')]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setPreset(k)}
              className="text-xs font-bold px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stat(L('Revenue'), formatIQDLabel(report.revenue), DollarSign, 'bg-emerald-50 text-emerald-600')}
            {stat(L('Gross Profit'), formatIQDLabel(report.gross_profit), TrendingUp, 'bg-indigo-50 text-indigo-600')}
            {stat(L('Net Profit'), formatIQDLabel(report.net_profit), Percent, 'bg-rose-50 text-rose-600')}
            {stat(L('Orders'), String(report.order_count), Package, 'bg-amber-50 text-amber-600')}
          </div>

          {/* POS vs Website Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 p-5 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">{L("POS Sales (In-Store)")}</h4>
                  <p className="text-xs text-slate-500">{L("In-store cashier transactions")}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-indigo-900">{formatIQDLabel(totalPosSales)}</p>
                <span className="inline-block mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  POS ({L("In-store")})
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-5 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-200">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">{L("Website Sales (Online)")}</h4>
                  <p className="text-xs text-slate-500">{L("Online website customer orders")}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-emerald-900">{formatIQDLabel(totalOnlineSales)}</p>
                <span className="inline-block mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Web ({L("Online")})
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stat(L('COGS (est.)'), formatIQDLabel(report.cogs), DollarSign, 'bg-slate-100 text-slate-600')}
            {stat(L('Expenses'), formatIQDLabel(report.expenses), DollarSign, 'bg-slate-100 text-slate-600')}
            {stat(L('Items Sold'), String(report.items_sold), Package, 'bg-slate-100 text-slate-600')}
            {stat(L('Avg. Order'), formatIQDLabel(report.average_order_value), DollarSign, 'bg-slate-100 text-slate-600')}
          </div>

          {Array.isArray(report.daily) && report.daily.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 mb-4">{L("Daily Revenue")}</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={report.daily}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip formatter={(v: any) => formatIQDLabel(Number(v))} />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#rev)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {Array.isArray(report.top_products) && report.top_products.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 mb-4">{L("Top Products")}</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 text-left border-b border-slate-100">
                    <th className="py-2 font-semibold">{L("Product")}</th>
                    <th className="py-2 font-semibold text-center">{L("Qty")}</th>
                    <th className="py-2 font-semibold text-right">{L("Revenue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.top_products.map((p: any) => (
                    <tr key={p.id} className="border-b border-slate-50">
                      <td className="py-2 text-slate-800">{p.name}</td>
                      <td className="py-2 text-center font-bold text-slate-700">{p.qty}</td>
                      <td className="py-2 text-right font-bold text-indigo-600">{formatIQDLabel(Number(p.revenue))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Per-cashier sales */}
      {cashiers && Array.isArray(cashiers.cashiers) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" /> {L("Sales by Cashier")}
            </h3>
            <span className="text-xs text-slate-500">{cashiers.from} → {cashiers.to}</span>
          </div>
          {cashiers.cashiers.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">{L("No sales in this period.")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-left border-b border-slate-100">
                  <th className="py-2 font-semibold">{L("Cashier")}</th>
                  <th className="py-2 font-semibold text-center">{L("Orders")}</th>
                  <th className="py-2 font-semibold text-right">{L("In-store")}</th>
                  <th className="py-2 font-semibold text-right">{L("Online")}</th>
                  <th className="py-2 font-semibold text-right">{L("Total")}</th>
                </tr>
              </thead>
              <tbody>
                {cashiers.cashiers.map((c: any, i: number) => (
                  <tr key={c.user_id ?? i} className="border-b border-slate-50">
                    <td className="py-2 font-bold text-slate-800">{c.name}</td>
                    <td className="py-2 text-center text-slate-600">{c.orders_count}</td>
                    <td className="py-2 text-right text-slate-600">{formatIQDLabel(Number(c.pos_total || 0))}</td>
                    <td className="py-2 text-right text-slate-600">{formatIQDLabel(Number(c.online_total || 0))}</td>
                    <td className="py-2 text-right font-black text-indigo-600">{formatIQDLabel(Number(c.total || 0))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-100">
                  <td className="py-2 font-bold text-slate-900" colSpan={4}>{L("Grand total")}</td>
                  <td className="py-2 text-right font-black text-slate-900">{formatIQDLabel(Number(cashiers.grand_total || 0))}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
