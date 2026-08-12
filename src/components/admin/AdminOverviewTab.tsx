import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, ShoppingBag, Package, BarChart3, DollarSign, TrendingDown, TrendingUp, AlertTriangle, Store, Globe, Filter, ArrowUpRight, ArrowDownRight, CreditCard, Sparkles, CheckCircle2, UserPlus, Send, Plus, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminTr } from '../../i18n/adminDict';
import { formatIQD, formatIQDLabel } from '../../utils/currency';
import { Order, Product, Expense } from '../../types';
import { useStore } from '../../store';
import { BarChart, Bar, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export const isPosOrder = (order: any): boolean => {
  if (!order) return false;
  if (order.channel === 'pos' || order.source === 'pos' || order.isPos === true) return true;
  if (order.shippingAddress && (
    order.shippingAddress.includes('POS') || 
    order.shippingAddress.includes('In-Store') || 
    order.shippingAddress.includes('حضوري') ||
    order.shippingAddress.includes('لە فرۆشگا')
  )) return true;
  if (order.customerEmail === 'cashier@galokids.com') return true;
  if (order.userId === 'u1') return true;
  return false;
};

export interface AdminOverviewTabProps {
  orderFilterPeriod: 'today' | 'week' | 'month';
  setOrderFilterPeriod: (period: 'today' | 'week' | 'month') => void;
  orderCounts: {
    total: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    newAndPending: number;
  };
  setActiveTab: (tab: string) => void;
  reportPeriod: 'daily' | 'monthly' | 'yearly';
  setReportPeriod: (period: 'daily' | 'monthly' | 'yearly') => void;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  selectedYear: string;
  setSelectedYear: (y: string) => void;
  reportData: {
    totalRevenue: number;
    totalOrderCount: number;
    totalCogs: number;
    totalExpenseAmt: number;
    filteredExpenses: any[];
    netProfit: number;
    filteredOrders: Order[];
    posRevenue?: number;
    posOrderCount?: number;
    posCogs?: number;
    posGrossProfit?: number;
    webRevenue?: number;
    webOrderCount?: number;
    webCogs?: number;
    webGrossProfit?: number;
  };
  products: Product[];
  orders: Order[];
  expenses: Expense[];
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  orderFilterPeriod,
  setOrderFilterPeriod,
  orderCounts,
  setActiveTab,
  reportPeriod,
  setReportPeriod,
  selectedDate,
  setSelectedDate,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  reportData,
  products,
  orders,
  expenses,
}) => {
  const { language } = useLanguage();
  const { fetchDailyReport } = useStore();
  const L = (key: string) => adminTr(key, language);
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'pos' | 'online'>('all');

  const displayOrders = useMemo(() => {
    if (selectedChannel === 'pos') return reportData.filteredOrders.filter(isPosOrder);
    if (selectedChannel === 'online') return reportData.filteredOrders.filter(o => !isPosOrder(o));
    return reportData.filteredOrders;
  }, [reportData.filteredOrders, selectedChannel]);

  // The last few months, ending with this one. Both charts below used to be
  // hardcoded — fixed month names, a made-up 45,000 bar and a "85%" headline —
  // sitting on the dashboard looking like the shop's actual figures.
  const recentMonths = useMemo(() => {
    const out: { key: string; label: string }[] = [];
    const now = new Date();
    for (let back = 5; back >= 0; back--) {
      const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
      out.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString(language === 'en' ? 'en-GB' : language === 'ar' ? 'ar' : 'en-GB', { month: 'short' }),
      });
    }
    return out;
  }, [language]);

  /**
   * Everything that happened in each of those months, counted by the server.
   *
   * This used to reduce over the orders the panel was holding, which only ever
   * covered a full six months because the orders endpoint returned the whole
   * table. Now that it pages, the chart would have drawn whatever fraction of
   * each month happened to be loaded.
   */
  const [monthlyReport, setMonthlyReport] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!recentMonths.length) return;

    const from = `${recentMonths[0].key}-01`;
    const [lastYear, lastMonth] = recentMonths[recentMonths.length - 1].key.split('-').map(Number);
    const lastDay = new Date(lastYear, lastMonth, 0).getDate();
    const to = `${recentMonths[recentMonths.length - 1].key}-${String(lastDay).padStart(2, '0')}`;

    let cancelled = false;
    fetchDailyReport(from, to)
      .then((data: any) => {
        if (cancelled) return;

        // Roll the days up into the months the chart draws.
        const byMonth: Record<string, any> = {};
        for (const day of (data?.days || [])) {
          const month = String(day.day).slice(0, 7);
          const bucket = byMonth[month] || (byMonth[month] = { revenue: 0, cogs: 0, expenses: 0 });
          bucket.revenue += Number(day.revenue || 0);
          bucket.cogs += Number(day.cogs || 0);
          bucket.expenses += Number(day.expenses || 0);
        }
        setMonthlyReport(byMonth);
      })
      .catch(() => { /* keep the last chart rather than blanking it */ });

    return () => { cancelled = true; };
  }, [recentMonths, fetchDailyReport, orders, expenses]);

  const monthlyFigures = useMemo(() => recentMonths.map(({ key, label }) => {
    const m = monthlyReport[key] || { revenue: 0, cogs: 0, expenses: 0 };
    const netProfit = m.revenue - m.cogs - m.expenses;

    return {
      key,
      month: label,
      expenses: m.expenses,
      revenue: m.revenue,
      netProfit,
      margin: m.revenue > 0 ? (netProfit / m.revenue) * 100 : 0,
    };
  }), [recentMonths, monthlyReport]);

  // The expense chart shows the last five months of real spending.
  const barChartData = useMemo(
    () => monthlyFigures.slice(-5).map(m => ({ month: m.month, value: m.expenses })),
    [monthlyFigures]
  );

  const lineHealthData = useMemo(
    () => monthlyFigures.map(m => ({ name: m.month, val: m.margin })),
    [monthlyFigures]
  );

  // Net profit margin for the month in progress, which is what the big number
  // on the card claims to be.
  const currentMargin = monthlyFigures.length ? monthlyFigures[monthlyFigures.length - 1].margin : 0;

  return (
    <div className="space-y-6 font-arabic text-slate-800">
      {/* 1. TOP CARD: Total Balance & Three Connected Glowing Gradient Pods (1:1 Pinterest Match) */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-6 md:p-8 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.4)]">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
              {L("Total Balance")}
            </span>
            <div className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              {formatIQDLabel(reportData.totalRevenue)}
            </div>
          </div>

          {/* Connected Glowing Pods */}
          <div className="flex items-center gap-2 md:gap-4 overflow-x-auto py-2">
            <div className="bg-white border border-slate-100 p-4 px-6 rounded-3xl shadow-xs flex flex-col items-center min-w-[130px]">
              <span className="text-[11px] font-extrabold text-slate-900">{formatIQD(reportData.posRevenue || 0)}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{L("POS Sales")}</span>
            </div>

            <div className="bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 text-white p-5 px-8 rounded-3xl shadow-xl shadow-purple-500/25 flex flex-col items-center min-w-[150px] scale-105">
              <span className="text-xl font-black">{formatIQD(reportData.webRevenue || 0)}</span>
              <span className="text-[10px] text-purple-200 font-extrabold uppercase mt-0.5">{L("Website Sales")}</span>
            </div>

            <div className="bg-white border border-slate-100 p-4 px-6 rounded-3xl shadow-xs flex flex-col items-center min-w-[130px]">
              <span className="text-[11px] font-extrabold text-slate-900">{formatIQD(reportData.netProfit)}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{L("Net Profit")}</span>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3 self-end xl:self-auto">
            <button
              onClick={() => setActiveTab('orders')}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-full transition-all cursor-pointer"
            >
              {L("Manage Orders")}
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-full shadow-md transition-all cursor-pointer active:scale-95"
            >
              {L("+ Add Product")}
            </button>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE ROW (2 Columns): Expense Statistic + Financial Health Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Expense Statistic Bar Chart */}
        <div className="lg:col-span-7 bg-white/80 backdrop-blur-xl border border-white/80 p-6 md:p-7 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.4)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">{L("Expense Statistic")}</h3>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
              {L("Monthly")}
            </span>
          </div>

          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                <Bar dataKey="value" radius={[12, 12, 12, 12]}>
                  {barChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === barChartData.length - 1 ? 'url(#barGradient)' : '#E2E8F0'} 
                    />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-4 mt-2">
            {barChartData.map((m, i) => (
              <span key={m.month} className={i === barChartData.length - 1 ? 'text-blue-600 font-black' : ''}>
                {m.month}
              </span>
            ))}
          </div>
        </div>

        {/* Right Column (5 cols): Financial Health Card (Blue-violet gradient card with line graph) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white p-6 md:p-7 rounded-[2.5rem] shadow-xl shadow-indigo-500/20 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-100">{L("Financial Health")}</span>
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center cursor-pointer">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="my-4 relative z-10">
            <div className="text-4xl font-black font-sans">{Math.round(currentMargin)}%</div>
            <p className="text-xs text-blue-200 mt-1 font-medium">{L("Net profit margin this month")}</p>
          </div>

          <div className="h-28 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineHealthData}>
                <defs>
                  <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="val" stroke="#ffffff" strokeWidth={3} fill="url(#healthGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM ROW (2 Columns): Recent Orders List + Quick Transfer Widget (1:1 Pinterest Match) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Recent Orders / Upcoming Payments */}
        <div className="lg:col-span-7 bg-white/80 backdrop-blur-xl border border-white/80 p-6 md:p-7 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.4)]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">{L("Recent Orders")}</h3>
            <button 
              onClick={() => setActiveTab('orders')}
              className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-full shadow-xs hover:bg-slate-800 transition-all cursor-pointer"
            >
              {L("View All")}
            </button>
          </div>

          <div className="space-y-3">
            {displayOrders.slice(0, 4).map((order, idx) => (
              <div key={order.id || idx} className="flex items-center justify-between p-3.5 px-4 bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-100/80 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white shadow-2xs border border-slate-100 flex items-center justify-center font-bold text-xs text-indigo-600">
                    🛍️
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {order.customerName ? L(order.customerName) : L('Guest Customer')}
                    </h4>
                    <span className="text-[10px] text-slate-400">{L("Order")} #{order.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {L(order.status || 'delivered')}
                  </span>
                  <span className="text-xs font-black text-slate-900">{formatIQD(Number(order.totalAmount || 0))}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (5 cols): Quick Transfer & Contacts Widget */}
        <div className="lg:col-span-5 bg-white/80 backdrop-blur-xl border border-white/80 p-6 md:p-7 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.4)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">{L("Quick Transfer")}</h3>
            <span className="text-xs font-bold text-slate-400">{L("Contacts")}</span>
          </div>

          {/* Avatar Row */}
          <div className="flex items-center gap-3 overflow-x-auto py-2">
            <button 
              onClick={() => setActiveTab('users')}
              className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 hover:border-indigo-600 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>

            {['F. Alonso', 'C. Leclerc', 'M. Naira'].map((name, i) => (
              <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                  {name[0]}
                </div>
                <span className="text-[10px] font-bold text-slate-600">{name}</span>
              </div>
            ))}
          </div>

          {/* Amount Input & Send Button */}
          <div className="flex items-center justify-between bg-slate-50 p-3 px-5 rounded-2xl border border-slate-100 mt-4">
            <span className="text-xl font-black text-slate-900">$100.00</span>
            <button 
              onClick={() => setActiveTab('orders')}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-full shadow-md transition-all cursor-pointer active:scale-95"
            >
              {L("Send")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
