import React, { useState, useMemo } from 'react';
import { 
  Trash2, Eye, ChevronDown, ChevronUp, Package, Phone, 
  MapPin, User, Calendar, Tag, ShoppingBag, X, Search, Filter, 
  Store, RefreshCw, DollarSign, CreditCard, Clock, Printer, Percent, Ticket
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminTr } from '../../i18n/adminDict';
import { Order, CartItem } from '../../types';
import { useConfirm, useToast } from '../ui/Feedback';
import { formatIQDLabel } from '../../utils/currency';
import { getColorHex, getLocalizedColorName, getLocalizedSizeName } from '../../utils/colors';
import { printReceiptIframe } from '../../utils/printHelper';
import { useStore } from '../../store';

export const isPosOrder = (order: any): boolean => {
  if (!order) return false;
  if (order.channel === 'pos' || order.source === 'pos' || order.isPos === true) return true;
  const addr = String(order.shippingAddress || '').toLowerCase();
  const email = String(order.customerEmail || '').toLowerCase();
  const name = String(order.customerName || '').toLowerCase();
  if (addr.includes('pos') || addr.includes('in-store') || addr.includes('لە فرۆشگا') || addr.includes('حضوري')) return true;
  if (email.includes('cashier') || email === 'cashier@galokids.com') return true;
  if (name.includes('pos cash sale') || order.userId === 'u1') return true;
  return false;
};

export interface AdminPosSalesTabProps {
  orders: Order[];
  deleteOrder: (orderId: string) => void;
  confirmDialog?: (options: any) => Promise<boolean>;
  toast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AdminPosSalesTab: React.FC<AdminPosSalesTabProps> = ({
  orders,
  deleteOrder,
  confirmDialog: propConfirmDialog,
  toast: propToast,
}) => {
  const { language } = useLanguage();
  const { storeSettings, currentUser } = useStore();
  const L = (key: string) => adminTr(key, language);
  const hookConfirm = useConfirm();
  const hookToast = useToast();
  const confirmDialog = propConfirmDialog || hookConfirm;
  const toast = propToast || hookToast;

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('all');
  const [customDate, setCustomDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Extract POS sales
  const posSales = useMemo(() => {
    return orders.filter(isPosOrder);
  }, [orders]);

  // Filtered POS sales
  const filteredSales = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const searchLower = searchTerm.trim().toLowerCase();

    return posSales.filter(order => {
      // Date filtering
      if (dateFilter === 'today') {
        if (!order.date || !order.date.startsWith(todayStr)) return false;
      } else if (dateFilter === 'yesterday') {
        if (!order.date || !order.date.startsWith(yesterdayStr)) return false;
      } else if (dateFilter === 'this_month') {
        const currentMonthStr = todayStr.slice(0, 7);
        if (!order.date || !order.date.startsWith(currentMonthStr)) return false;
      } else if (dateFilter === 'custom' && customDate) {
        if (!order.date || !order.date.startsWith(customDate)) return false;
      }

      // Search term filtering
      if (searchLower) {
        const idMatch = String(order.id || '').toLowerCase().includes(searchLower);
        const customerMatch = String(order.customerName || '').toLowerCase().includes(searchLower);
        const phoneMatch = String(order.customerPhone || '').toLowerCase().includes(searchLower);
        const addressMatch = String(order.shippingAddress || '').toLowerCase().includes(searchLower);

        let itemsMatch = false;
        const items = safeGetItems(order);
        itemsMatch = items.some(item => {
          const pName = getProductName(item.product).toLowerCase();
          const color = String(item.variation?.color || '').toLowerCase();
          const size = String(item.variation?.size || '').toLowerCase();
          return pName.includes(searchLower) || color.includes(searchLower) || size.includes(searchLower);
        });

        if (!idMatch && !customerMatch && !phoneMatch && !addressMatch && !itemsMatch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime());
  }, [posSales, searchTerm, dateFilter, customDate]);

  // Reset pagination on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, customDate]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalAmount = filteredSales.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const totalCount = filteredSales.length;
    const avgTicket = totalCount > 0 ? totalAmount / totalCount : 0;
    
    // Today's POS sales
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = posSales.filter(o => o.date && o.date.startsWith(todayStr));
    const todayAmount = todaySales.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    return {
      totalAmount,
      totalCount,
      avgTicket,
      todayAmount,
      todayCount: todaySales.length
    };
  }, [filteredSales, posSales]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage) || 1;
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(start, start + itemsPerPage);
  }, [filteredSales, currentPage, itemsPerPage]);

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  function safeGetItems(order: Order): CartItem[] {
    if (!order.items) return [];
    if (typeof order.items === 'string') {
      try {
        const parsed = JSON.parse(order.items);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(order.items) ? order.items : [];
  }

  function getProductName(product: any) {
    if (!product) return language === 'ku' ? 'بەرهەم' : 'Product';
    if (language === 'ku' && product.nameKu) return product.nameKu;
    if (language === 'ar' && product.nameAr) return product.nameAr;
    return product.name || product.title || (language === 'ku' ? 'بەرهەم' : 'Product');
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-4 sm:p-6 md:p-8 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.4)] font-arabic">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100/80">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <Store className="w-6 h-6 text-emerald-600" />
            <span>{language === 'ku' ? 'فرۆشتنەکانی کاشێر (POS)' : language === 'ar' ? 'مبيعات الكاشير (POS)' : 'POS Sales History'}</span>
            <span className="px-3 py-1 text-xs font-black bg-emerald-600 text-white rounded-full shadow-xs">
              {stats.totalCount} {language === 'ku' ? 'داواکاری' : 'Sales'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {language === 'ku'
              ? 'لیستی بەڕێوەبردن و بەدواداچوونی فرۆشتنەکانی ناو فرۆشگا (پۆس) بە وردکاری ڕەنگ و سایز'
              : 'View and manage all in-store POS transactions with detailed item specs'}
          </p>
        </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-200 text-emerald-900 text-xs font-bold shadow-2xs">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>{language === 'ku' ? 'کۆی فرۆشتن:' : 'Total Sales:'}</span>
            <span className="font-black text-emerald-700 text-sm">{formatIQDLabel(stats.totalAmount)}</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-indigo-500/10 border border-indigo-200 text-indigo-900 text-xs font-bold shadow-2xs">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>{language === 'ku' ? 'فرۆشتنی ئەمڕۆ:' : 'Today Sales:'}</span>
            <span className="font-black text-indigo-700">{formatIQDLabel(stats.todayAmount)} ({stats.todayCount})</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
        {/* Search Input */}
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={language === 'ku' ? 'گەڕان بەپێی ئایدی، ناو، ژمارە مۆبایل یان بەرهەم...' : 'Search by ID, Customer name, Phone or Product...'}
            className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date Filter */}
        <div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">{language === 'ku' ? 'هەموو بەروارەکان' : 'All Dates'}</option>
            <option value="today">{language === 'ku' ? 'ئەمڕۆ' : 'Today'}</option>
            <option value="yesterday">{language === 'ku' ? 'دوێنێ' : 'Yesterday'}</option>
            <option value="this_month">{language === 'ku' ? 'ئەم مانگە' : 'This Month'}</option>
            <option value="custom">{language === 'ku' ? 'بەرواری دیاریکراو' : 'Specific Date'}</option>
          </select>
        </div>

        {/* Custom Date Input if selected */}
        {dateFilter === 'custom' ? (
          <div>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        ) : (
          <div className="flex items-center justify-end">
            <span className="text-xs text-slate-500 font-bold">
              {filteredSales.length} {language === 'ku' ? 'ئەنجام دۆزرایەوە' : 'results found'}
            </span>
          </div>
        )}
      </div>

      {/* POS Sales Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-4 py-3 text-left rtl:text-right text-xs font-black text-slate-500 uppercase tracking-wider">{L("Order ID")}</th>
              <th className="px-4 py-3 text-left rtl:text-right text-xs font-black text-slate-500 uppercase tracking-wider">{language === 'ku' ? 'کاشێر' : 'Cashier'}</th>
              <th className="px-4 py-3 text-left rtl:text-right text-xs font-black text-slate-500 uppercase tracking-wider">{L("Customer")}</th>
              <th className="px-4 py-3 text-left rtl:text-right text-xs font-black text-slate-500 uppercase tracking-wider">
                {language === 'ku' ? 'ئایتمەکان (ڕەنگ، سایز، بڕ)' : 'Items (Color, Size, Qty)'}
              </th>
              <th className="px-4 py-3 text-left rtl:text-right text-xs font-black text-slate-500 uppercase tracking-wider">{language === 'ku' ? 'داشکاندن / کۆبۆن' : 'Discount / Coupon'}</th>
              <th className="px-4 py-3 text-left rtl:text-right text-xs font-black text-slate-500 uppercase tracking-wider">{L("Date")}</th>
              <th className="px-4 py-3 text-left rtl:text-right text-xs font-black text-slate-500 uppercase tracking-wider">{L("Amount")}</th>
              <th className="px-4 py-3 text-center text-xs font-black text-slate-500 uppercase tracking-wider">{L("Action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium bg-white">
            {paginatedSales.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-slate-400 font-medium">
                  {language === 'ku' ? 'هیچ فرۆشتنێکی پۆس بەم فلتەرانە نەدۆزرایەوە' : 'No POS sales found with current filters'}
                </td>
              </tr>
            ) : (
              paginatedSales.map((order, index) => {
                const items = safeGetItems(order);
                const isExpanded = expandedOrderId === order.id;
                const cashier = (order as any).cashierName || (order as any).cashier_name || currentUser?.name || 'Awat Hassan (کاشێر)';
                const discountAmt = Number((order as any).discountAmount || (order as any).discount || 0);
                const couponAmt = Number((order as any).couponDiscount || (order as any).coupon_discount || 0);
                const couponCode = (order as any).couponCode || (order as any).coupon_code || '';

                return (
                  <React.Fragment key={order.id || index}>
                    <tr 
                      onClick={() => toggleExpand(order.id)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${isExpanded ? 'bg-emerald-50/30' : ''}`}
                    >
                      {/* Order ID */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(order.id);
                            }}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <span className="font-extrabold text-slate-900">#{order.id}</span>
                        </div>
                      </td>

                      {/* Cashier Name Badge */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-100">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{cashier}</span>
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <p className="font-bold text-slate-900">
                            {order.customerName || (language === 'ku' ? 'کڕیاری ناو فرۆشگا' : 'In-Store Customer')}
                          </p>
                          {order.customerPhone && (
                            <p className="text-[11px] text-slate-500 font-medium dir-ltr text-right rtl:text-right">{order.customerPhone}</p>
                          )}
                        </div>
                      </td>

                      {/* Items Summary Badges */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 flex-wrap max-w-xs">
                          {items.slice(0, 3).map((item, i) => (
                            <div 
                              key={i} 
                              className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] font-bold text-slate-700 shadow-2xs"
                              title={`${getProductName(item.product)} - ${item.variation?.color || ''} / ${item.variation?.size || ''}`}
                            >
                              {item.product?.imageUrl && (
                                <img 
                                  src={item.product.imageUrl} 
                                  alt="" 
                                  className="w-5 h-5 rounded-md object-cover border border-slate-200 shrink-0" 
                                />
                              )}
                              {item.variation?.color && (
                                <span 
                                  className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" 
                                  style={{ backgroundColor: getColorHex(item.variation.color) }} 
                                />
                              )}
                              {item.variation?.size && (
                                <span className="text-emerald-700 font-black">{item.variation.size}</span>
                              )}
                              <span className="text-slate-400">×{item.quantity || 1}</span>
                            </div>
                          ))}
                          {items.length > 3 && (
                            <span className="text-[11px] font-extrabold text-slate-500 px-2 py-0.5 bg-slate-100 rounded-lg">
                              +{items.length - 3}
                            </span>
                          )}
                          {items.length === 0 && (
                            <span className="text-slate-400 text-xs italic">{language === 'ku' ? 'هیچ ئایتمێک نییە' : 'No items'}</span>
                          )}
                        </div>
                      </td>

                      {/* Discount & Coupon Badges */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {discountAmt > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100 w-fit">
                              <Percent className="w-3 h-3" />
                              <span>-{formatIQDLabel(discountAmt)}</span>
                            </span>
                          ) : null}

                          {couponAmt > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 w-fit">
                              <Ticket className="w-3 h-3" />
                              <span>{couponCode || 'کۆبۆن'}: -{formatIQDLabel(couponAmt)}</span>
                            </span>
                          ) : null}

                          {discountAmt === 0 && couponAmt === 0 && (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4 whitespace-nowrap text-slate-500 font-medium">{order.date}</td>

                      {/* Amount */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-black text-slate-900 text-sm">
                          {formatIQDLabel(Number(order.totalAmount || 0))}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          {/* View Modal */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForModal(order)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                            title={language === 'ku' ? 'بینی زانیاری ئایتمەکان' : 'View Item Details'}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Void/Delete POS Sale */}
                          {order.id && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (await confirmDialog({
                                  title: language === 'ku' ? 'سڕینەوەی فرۆشتنی POS؟' : 'Delete POS Sale?',
                                  message: language === 'ku'
                                    ? `فرۆشتنی پۆس #${order.id} دەسڕدرێتەوە و ستۆکی بەرهەمەکان دەگەڕێندرێتەوە بۆ کۆگا.`
                                    : `POS Sale #${order.id} will be deleted and product stock will be restored to catalog.`,
                                  confirmText: L('Delete'),
                                  cancelText: L('Cancel'),
                                  danger: true,
                                })) {
                                  deleteOrder(order.id);
                                  toast(language === 'ku' ? 'فرۆشتنی پۆس سڕدرایەوە و ستۆک گەڕێنرایەوە ✅' : 'POS sale deleted & stock restored ✅');
                                }
                              }}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-2 rounded-xl hover:bg-rose-50 cursor-pointer"
                              title={language === 'ku' ? 'سڕینەوەی فرۆشتنی پۆس' : 'Delete POS Sale'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Accordion Expand Details */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90 border-b-2 border-emerald-100">
                        <td colSpan={8} className="p-4 sm:p-6">
                          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
                            {/* Items List */}
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                              <ShoppingBag className="w-4 h-4 text-emerald-600" />
                              <span>{language === 'ku' ? 'ئایتمەکانی ئەم فرۆشتنەی پۆس' : 'POS Sale Items'}</span>
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black">
                                {items.length} {language === 'ku' ? 'ئایتم' : 'items'}
                              </span>
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {items.map((item, itemIdx) => {
                                const itemPrice = Number(item.product?.discountPrice || item.product?.price || 0);
                                const itemTotal = itemPrice * (item.quantity || 1);

                                return (
                                  <div 
                                    key={itemIdx} 
                                    className="flex items-center gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60 hover:border-slate-300 transition-all"
                                  >
                                    <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                      {item.product?.imageUrl ? (
                                        <img 
                                          src={item.product.imageUrl} 
                                          alt={getProductName(item.product)} 
                                          className="w-full h-full object-cover" 
                                        />
                                      ) : (
                                        <Package className="w-6 h-6 text-slate-300" />
                                      )}
                                    </div>

                                    <div className="grow min-w-0">
                                      <h5 className="font-bold text-slate-900 text-xs line-clamp-1">
                                        {getProductName(item.product)}
                                      </h5>

                                      <div className="flex items-center gap-2 flex-wrap mt-1.5">
                                        {item.variation?.color && (
                                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-bold shadow-2xs">
                                            <span 
                                              className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" 
                                              style={{ backgroundColor: getColorHex(item.variation.color) }} 
                                            />
                                            <span>{getLocalizedColorName(item.variation.color, language)}</span>
                                          </span>
                                        )}

                                        {item.variation?.size && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] font-black">
                                            <Tag className="w-3 h-3" />
                                            <span>{getLocalizedSizeName(item.variation.size, language)}</span>
                                          </span>
                                        )}

                                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-800 text-[11px] font-black">
                                          {language === 'ku' ? `بڕ: ${item.quantity || 1}` : `Qty: ${item.quantity || 1}`}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="text-right rtl:text-left shrink-0">
                                      <p className="font-extrabold text-slate-900 text-xs">
                                        {formatIQDLabel(itemTotal)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Custom Pagination for POS Sales */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 flex-wrap gap-3">
          <span className="text-xs font-bold text-slate-500">
            {language === 'ku' ? `لاپەڕە ${currentPage} لە ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
            >
              {language === 'ku' ? 'پێشوو' : 'Previous'}
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  currentPage === page
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
            >
              {language === 'ku' ? 'داهاتوو' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {/* POS Item Details Modal */}
      {selectedOrderForModal && (
        <div 
          onClick={() => setSelectedOrderForModal(null)}
          className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto font-arabic animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-2xs">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900 text-lg">
                      {language === 'ku' ? 'وردکاری فرۆشتنی پۆس' : 'POS Sale Details'}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono font-black border border-slate-200">
                      {selectedOrderForModal.invoiceNo || selectedOrderForModal.invoice_no || `#${selectedOrderForModal.id}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs font-bold text-slate-500">
                    <span>{selectedOrderForModal.date}</span>
                    <span>•</span>
                    {/* Cashier Name Display */}
                    <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        {language === 'ku' ? 'کاشێر:' : 'Cashier:'} {selectedOrderForModal.cashierName || selectedOrderForModal.cashier_name || currentUser?.name || 'Awat Hassan (کاشێر)'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Reprint Receipt Button */}
                <button
                  type="button"
                  onClick={() => {
                    const items = safeGetItems(selectedOrderForModal);
                    const totalAmt = Number(selectedOrderForModal.totalAmount || 0);
                    const disc = Number(selectedOrderForModal.discountAmount || selectedOrderForModal.discount || 0);
                    const cDisc = Number(selectedOrderForModal.couponDiscount || selectedOrderForModal.coupon_discount || 0);
                    const cCode = selectedOrderForModal.couponCode || selectedOrderForModal.coupon_code || '';
                    const cashier = selectedOrderForModal.cashierName || selectedOrderForModal.cashier_name || currentUser?.name || 'Cashier';

                    printReceiptIframe(
                      items,
                      {
                        subtotal: totalAmt + disc + cDisc,
                        discount: disc,
                        couponDiscount: cDisc,
                        couponCode: cCode,
                        total: totalAmt,
                        paid: totalAmt,
                        change: 0,
                        method: selectedOrderForModal.paymentMethod || 'cash',
                        cashierName: cashier,
                      },
                      selectedOrderForModal.customerName,
                      selectedOrderForModal.invoiceNo || selectedOrderForModal.invoice_no || `INV-${selectedOrderForModal.id}`,
                      storeSettings
                    );
                  }}
                  className="px-3 py-2 bg-slate-900 hover:bg-emerald-600 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  title={language === 'ku' ? 'چاپکردنەوەی پسووڵە' : 'Reprint Receipt'}
                >
                  <Printer className="w-4 h-4 text-emerald-300" />
                  <span>{language === 'ku' ? 'چاپکردنەوەی پسووڵە' : 'Reprint Receipt'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOrderForModal(null)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Item List */}
            <div className="my-4 space-y-2.5 max-h-[42vh] overflow-y-auto pr-1">
              <h4 className="font-black text-xs text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>{language === 'ku' ? 'ئایتمەکانی ناو فاکتەر' : 'Items in Receipt'}</span>
                <span className="text-slate-400 font-normal text-[11px]">
                  {safeGetItems(selectedOrderForModal).length} {language === 'ku' ? 'ئایتم' : 'items'}
                </span>
              </h4>

              {safeGetItems(selectedOrderForModal).map((item, idx) => {
                const itemPrice = Number(item.product?.discountPrice || item.product?.price || 0);
                const itemTotal = itemPrice * (item.quantity || 1);

                return (
                  <div 
                    key={idx}
                    className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white transition-colors"
                  >
                    <div className="w-14 h-14 rounded-xl bg-white overflow-hidden shrink-0 border border-slate-200">
                      {item.product?.imageUrl ? (
                        <img 
                          src={item.product.imageUrl} 
                          alt={getProductName(item.product)} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <Package className="w-7 h-7 text-slate-300 m-auto mt-3.5" />
                      )}
                    </div>

                    <div className="grow min-w-0">
                      <h5 className="font-bold text-slate-900 text-xs truncate">{getProductName(item.product)}</h5>
                      
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        {item.variation?.color && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white text-slate-800 text-[11px] font-bold border border-slate-200">
                            <span 
                              className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0 shadow-2xs" 
                              style={{ backgroundColor: getColorHex(item.variation.color) }} 
                            />
                            <span>{getLocalizedColorName(item.variation.color, language)}</span>
                          </span>
                        )}

                        {item.variation?.size && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-black border border-emerald-100">
                            <Tag className="w-3 h-3" />
                            <span>{getLocalizedSizeName(item.variation.size, language)}</span>
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 text-[11px] font-black border border-indigo-100">
                          {language === 'ku' ? `بڕ: ${item.quantity || 1}` : `Qty: ${item.quantity || 1}`}
                        </span>
                      </div>
                    </div>

                    <div className="text-right rtl:text-left shrink-0">
                      <p className="font-black text-slate-900 text-sm">{formatIQDLabel(itemTotal)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comprehensive Financial Breakdown (Discount, Coupon, Net Total) */}
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 font-arabic">
              {/* Discount Amount Display */}
              {Number(selectedOrderForModal.discountAmount || selectedOrderForModal.discount || 0) > 0 && (
                <div className="flex justify-between items-center text-xs font-bold text-rose-600">
                  <span className="flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5" />
                    <span>{language === 'ku' ? 'داشکاندنی بەرهەم / دەستی:' : 'Product Discount:'}</span>
                  </span>
                  <span className="font-mono font-black">-{formatIQDLabel(Number(selectedOrderForModal.discountAmount || selectedOrderForModal.discount || 0))}</span>
                </div>
              )}

              {/* Coupon Discount Display */}
              {Number(selectedOrderForModal.couponDiscount || selectedOrderForModal.coupon_discount || 0) > 0 && (
                <div className="flex justify-between items-center text-xs font-bold text-indigo-600">
                  <span className="flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5" />
                    <span>
                      {language === 'ku' ? `کۆبۆن (${selectedOrderForModal.couponCode || selectedOrderForModal.coupon_code || 'کۆبۆن'}):` : `Coupon (${selectedOrderForModal.couponCode || 'Coupon'}):`}
                    </span>
                  </span>
                  <span className="font-mono font-black">-{formatIQDLabel(Number(selectedOrderForModal.couponDiscount || selectedOrderForModal.coupon_discount || 0))}</span>
                </div>
              )}

              {/* Net Total Display */}
              <div className="flex items-center justify-between font-black text-slate-900 pt-1">
                <span className="text-sm">{language === 'ku' ? 'کۆی گشتی نێتی فاکتەر:' : 'Net Total:'}</span>
                <span className="text-xl text-emerald-600">{formatIQDLabel(Number(selectedOrderForModal.totalAmount || 0))}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
