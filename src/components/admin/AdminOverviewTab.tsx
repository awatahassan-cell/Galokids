import React, { useState, useMemo } from 'react';
import { Calendar, ShoppingBag, Package, BarChart3, DollarSign, TrendingDown, TrendingUp, AlertTriangle, Store, Globe, Filter } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminTr } from '../../i18n/adminDict';
import { formatIQD, formatIQDLabel } from '../../utils/currency';
import { Order, Product, Expense } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

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
  const L = (key: string) => adminTr(key, language);
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'pos' | 'online'>('all');

  const displayOrders = useMemo(() => {
    if (selectedChannel === 'pos') return reportData.filteredOrders.filter(isPosOrder);
    if (selectedChannel === 'online') return reportData.filteredOrders.filter(o => !isPosOrder(o));
    return reportData.filteredOrders;
  }, [reportData.filteredOrders, selectedChannel]);

  const chartData = useMemo(() => {
    const dataMap = new Map<string, { month: string; revenue: number; expense: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = d.toISOString().substring(0, 7);
      dataMap.set(monthKey, { month: monthKey, revenue: 0, expense: 0 });
    }
    orders.forEach(order => {
      const dateStr = (order.date || order.createdAt || '').substring(0, 7);
      if (dataMap.has(dateStr)) {
        const item = dataMap.get(dateStr)!;
        item.revenue += Number(order.totalAmount || 0);
      }
    });
    expenses.forEach(exp => {
      const dateStr = (exp.date || '').substring(0, 7);
      if (dataMap.has(dateStr)) {
        const item = dataMap.get(dateStr)!;
        item.expense += Number(exp.amount || 0);
      }
    });
    return Array.from(dataMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [orders, expenses]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => {
      const totalStock = (p.variations || []).reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
      return totalStock < 15;
    }).map(p => {
      const totalStock = (p.variations || []).reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
      return { ...p, totalStock };
    });
  }, [products]);

  return (
    <div className="space-y-8">
      {/* Top Order Status KPI Summary Cards with Time Filter */}
      <div className="space-y-4 font-arabic">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-bold text-slate-800">
              {language === 'ku' ? 'خشتەی کاتی داواکارییەکان:' : language === 'ar' ? 'فترة الطلبات:' : 'Orders by Period:'}
            </span>
          </div>

          {/* Time Filter Buttons */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOrderFilterPeriod('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                orderFilterPeriod === 'today'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {language === 'ku' ? 'ئەمڕۆ' : language === 'ar' ? 'اليوم' : 'Today'}
            </button>

            <button
              type="button"
              onClick={() => setOrderFilterPeriod('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                orderFilterPeriod === 'week'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {language === 'ku' ? 'ئەم هەفتەیە' : language === 'ar' ? 'هذا الأسبوع' : 'This Week'}
            </button>

            <button
              type="button"
              onClick={() => setOrderFilterPeriod('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                orderFilterPeriod === 'month'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {language === 'ku' ? 'ئەم مانگە' : language === 'ar' ? 'هذا الشهر' : 'This Month'}
            </button>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div 
            onClick={() => setActiveTab('orders')}
            className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-4 rounded-2xl shadow-sm cursor-pointer hover:scale-[1.02] transition-transform relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-arabic opacity-90">{language === 'ku' ? 'تازە / چاوەڕوان' : language === 'ar' ? 'جديد / قيد الانتظار' : 'New / Pending'}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
            </div>
            <div className="text-3xl font-black font-mono mt-2">{orderCounts.newAndPending}</div>
            <div className="text-[11px] font-arabic opacity-85 mt-1">{language === 'ku' ? 'داواکاری نوێی کڕیاران' : 'New customer orders'}</div>
          </div>

          <div 
            onClick={() => setActiveTab('orders')}
            className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-2xl shadow-sm cursor-pointer hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-arabic opacity-90">{language === 'ku' ? 'نێردراوە' : language === 'ar' ? 'تم الإرسال' : 'Shipped'}</span>
              <ShoppingBag className="w-4 h-4 opacity-80" />
            </div>
            <div className="text-3xl font-black font-mono mt-2">{orderCounts.shipped}</div>
            <div className="text-[11px] font-arabic opacity-85 mt-1">{language === 'ku' ? 'لە ڕێگەی گەیاندنە' : 'In delivery transit'}</div>
          </div>

          <div 
            onClick={() => setActiveTab('orders')}
            className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-4 rounded-2xl shadow-sm cursor-pointer hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-arabic opacity-90">{language === 'ku' ? 'گەیەنراوە' : language === 'ar' ? 'تم التسليم' : 'Delivered'}</span>
              <Package className="w-4 h-4 opacity-80" />
            </div>
            <div className="text-3xl font-black font-mono mt-2">{orderCounts.delivered}</div>
            <div className="text-[11px] font-arabic opacity-85 mt-1">{language === 'ku' ? 'بە سەرکەوتوویی تەسلیمکراوە' : 'Delivered successfully'}</div>
          </div>

          <div 
            onClick={() => setActiveTab('orders')}
            className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm cursor-pointer hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-arabic opacity-90">{language === 'ku' ? 'کۆی گشتی' : language === 'ar' ? 'الإجمالي' : 'Total'}</span>
              <BarChart3 className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-black font-mono mt-2">{orderCounts.total}</div>
            <div className="text-[11px] font-arabic opacity-85 mt-1">{language === 'ku' ? 'گشتی داواکارییەکان' : 'Total recorded orders'}</div>
          </div>
        </div>
      </div>

      {/* Business Reports Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
              {L("Financial Reports & Business Analytics")}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{L("Select reporting interval and date period to view itemized metrics, COGS, and profitability.")}</p>
          </div>

          {/* Toggles & Date Picker */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-100 p-1 rounded-xl flex">
              {(['daily', 'monthly', 'yearly'] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setReportPeriod(period)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                    reportPeriod === period
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {L(period)}
                </button>
              ))}
            </div>

            {/* Date/Period Picker Controls */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Calendar className="w-4 h-4 text-slate-400" />
              {reportPeriod === 'daily' && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none"
                />
              )}
              {reportPeriod === 'monthly' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none"
                />
              )}
              {reportPeriod === 'yearly' && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  {['2024', '2025', '2026', '2027', '2028'].map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Financial Performance KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">{L("Gross Sales")}</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-2">{formatIQDLabel(reportData.totalRevenue)}</p>
            <p className="text-xs text-slate-500 mt-1">{reportData.totalOrderCount} {L("transactions")}</p>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{L("Product Costs (COGS)")}</span>
              <Package className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-2">{formatIQDLabel(reportData.totalCogs)}</p>
            <p className="text-xs text-slate-500 mt-1">{L("Based on catalog costs")}</p>
          </div>

          <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-xl">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">{L("Expenses")}</span>
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-2">{formatIQDLabel(reportData.totalExpenseAmt)}</p>
            <p className="text-xs text-slate-500 mt-1">{reportData.filteredExpenses.length} {L("operating costs")}</p>
          </div>

          <div className={`p-4 rounded-xl border ${reportData.netProfit >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-red-50 border-red-100'}`}>
            <div className="flex justify-between items-start">
              <span className={`text-xs font-bold uppercase tracking-wider ${reportData.netProfit >= 0 ? 'text-indigo-800' : 'text-red-800'}`}>{L("Net Profit")}</span>
              <TrendingUp className={`w-4 h-4 ${reportData.netProfit >= 0 ? 'text-indigo-600' : 'text-red-600'}`} />
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-2">{formatIQDLabel(reportData.netProfit)}</p>
            <p className="text-xs text-slate-500 mt-1">{L("Revenue - COGS - Expenses")}</p>
          </div>
        </div>

        {/* Channel Breakdown Cards (POS vs Website) */}
        <div className="mb-8 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              {L("Separated Channel Breakdown")}
            </h3>
            <span className="text-xs text-slate-500 font-semibold">{L("Summary of order count and money totals for POS and website.")}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* POS Card */}
            <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">{L("POS Sales (In-Store)")}</h4>
                    <p className="text-xs text-slate-500">{L("In-store cashier transactions")}</p>
                  </div>
                </div>
                <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {reportData.posOrderCount ?? 0} {L("Orders")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-indigo-100/80">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">{L("POS Revenue")}</span>
                  <p className="text-lg font-black text-indigo-900 mt-0.5">{formatIQDLabel(reportData.posRevenue ?? 0)}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">{L("Gross Profit")}</span>
                  <p className="text-lg font-black text-emerald-600 mt-0.5">{formatIQDLabel(reportData.posGrossProfit ?? 0)}</p>
                </div>
              </div>
            </div>

            {/* Website Card */}
            <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-200">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">{L("Website Sales (Online)")}</h4>
                    <p className="text-xs text-slate-500">{L("Online website customer orders")}</p>
                  </div>
                </div>
                <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {reportData.webOrderCount ?? 0} {L("Orders")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-emerald-100/80">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">{L("Website Revenue")}</span>
                  <p className="text-lg font-black text-emerald-900 mt-0.5">{formatIQDLabel(reportData.webRevenue ?? 0)}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">{L("Gross Profit")}</span>
                  <p className="text-lg font-black text-indigo-600 mt-0.5">{formatIQDLabel(reportData.webGrossProfit ?? 0)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Period Transactions List */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-600" />
              {L("Transactions / Orders in Period")}
            </h3>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedChannel('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedChannel === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {L("All Channels")}
              </button>
              <button
                type="button"
                onClick={() => setSelectedChannel('pos')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedChannel === 'pos' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏬 {L("In-store (POS)")}
              </button>
              <button
                type="button"
                onClick={() => setSelectedChannel('online')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedChannel === 'online' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🌐 {L("Online (Website)")}
              </button>
            </div>
          </div>

          {displayOrders.length === 0 ? (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center text-slate-400 text-xs">
              {L("No order transactions recorded for this period.")}
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase">{L("Order ID")}</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase">{L("Channel")}</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase">{L("Customer")}</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase">{L("Total")}</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase">{L("Est. Cost")}</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase">{L("Status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {displayOrders.map((order, index) => {
                    let orderCogs = 0;
                    if (order.items && order.items.length > 0) {
                      order.items.forEach(item => {
                        const actualProduct = products.find(p => p.id === item?.product?.id);
                        const itemCost = actualProduct?.cost ?? item.product?.cost ?? ((item.product?.price || 0) * 0.4);
                        orderCogs += itemCost * item.quantity;
                      });
                    } else {
                      orderCogs = Number(order.totalAmount || 0) * 0.4;
                    }

                    const pos = isPosOrder(order);

                    return (
                      <tr key={order.id || index} className="hover:bg-slate-50 text-xs">
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-slate-500">{order.id}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {pos ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-indigo-100 text-indigo-800">
                              <Store className="w-3 h-3" /> POS ({L("In-store")})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                              <Globe className="w-3 h-3" /> Web ({L("Online")})
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-900 font-semibold">{order.customerName}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-900 font-bold">{formatIQDLabel(Number(order.totalAmount || 0))}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-500">{formatIQDLabel(orderCogs)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded-full font-semibold ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {L(order.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Financial Overview Chart & Low Stock Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Financial Overview Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
            {L("Monthly Revenue & Expenses")}
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickMargin={10} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => formatIQD(Number(value || 0))} />
                <RechartsTooltip 
                  formatter={(value: number) => [formatIQDLabel(Number(value || 0)), '']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" name={L("Revenue")} dataKey="revenue" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }} />
                <Line type="monotone" name={L("Expenses")} dataKey="expense" stroke="#ef4444" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
            {L("Low Stock Alerts")}
          </h2>
          {lowStockProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Package className="w-10 h-10 mb-2 text-slate-400" />
              <p>{L("All products are well stocked!")}</p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto pr-2 max-h-72 hide-scrollbar">
              {lowStockProducts.map((product, index) => (
                <div key={product.id || index} className="flex items-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex-shrink-0 border border-amber-200">
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="ml-4 flex-grow">
                    <h4 className="font-medium text-slate-900 text-sm truncate">{product.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{L("Barcode")}: {product.barcode}</p>
                  </div>
                  <div className="text-right ml-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {product.totalStock} {L("in stock")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
