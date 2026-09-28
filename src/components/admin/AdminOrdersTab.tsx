import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Trash2, Eye, ChevronDown, ChevronUp, Package, Phone, 
  MapPin, User, Calendar, Tag, ShoppingBag, X, MessageCircle,
  Search, Filter, Clock, CheckCircle2, Truck, AlertCircle, RefreshCw,
  Copy, ExternalLink, Check, Send
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminTr } from '../../i18n/adminDict';
import { Order, PaginationMeta, CartItem } from '../../types';
import { useConfirm, useToast } from '../ui/Feedback';
import { formatIQDLabel } from '../../utils/currency';
import { getColorHex, getLocalizedColorName, getLocalizedSizeName } from '../../utils/colors';
import { useStore, type OrderQuery } from '../../store';
import { Pagination } from '../Pagination';
import { BulkActionBar } from './BulkActionBar';
import { BulkCheckbox } from './BulkCheckbox';
import { useBulkSelection } from './useBulkSelection';
import { isAdminRole } from '../../utils/roles';
import { orderItemName } from '../../utils/orderItems';
import { OrderReturnBadge, OrderItemReturnNote } from '../OrderReturnBadge';
import { shopToday, shopDaysAgo } from '../../utils/shopTime';

/**
 * Builds a friendly, complete WhatsApp invoice / order confirmation message
 * without any OTP code to send to the customer when the order is approved/processing.
 */
export const buildOrderWhatsAppMessage = (order: Order, language: string): string => {
  const o = order as any;
  const invoice = o.invoiceNo || o.invoice_no || (`#${order.id}`);
  const items = (Array.isArray(order.items) ? order.items : (() => {
    try { return JSON.parse(String(order.items || '[]')); } catch { return []; }
  })()) as CartItem[];

  const itemLines = items.map(it => {
    const name = (language === 'ku' && it.product?.nameKu) ? it.product.nameKu : (language === 'ar' && it.product?.nameAr) ? it.product.nameAr : (it.product?.name || 'کالای گەلۆ');
    const varText = [it.variation?.color, it.variation?.size].filter(Boolean).join(' - ');
    const price = formatIQDLabel(Number(it.product?.discountPrice || it.product?.price || 0) * (it.quantity || 1));
    return `• ${name}${varText ? ` (${varText})` : ''} × ${it.quantity || 1} = ${price}`;
  });

  const customerGreeting = language === 'ku'
    ? `سڵاو بەڕێز ${order.customerName || 'کڕیاری خۆشەویست'}، سوپاس بۆ کڕینت لە گەلۆ کیدس (Galo Kids) 🎈`
    : language === 'ar'
    ? `مرحباً ${order.customerName || 'عميلنا العزيز'}، شكراً لتسوقك من قالو كيدز (Galo Kids) 🎈`
    : `Hello ${order.customerName || 'Valued Customer'}, thank you for shopping at Galo Kids 🎈`;

  const statusText = language === 'ku'
    ? `✅ داواکارییەکەت ژمارە ${invoice} پەسەندکرا و ئێستا لە پرۆسەی ئامادەکردندایە.`
    : language === 'ar'
    ? `✅ تم تأكيد طلبك رقم ${invoice} وهو الآن قيد التجهيز.`
    : `✅ Your order ${invoice} is confirmed and is now being processed.`;

  const shippingCost = Number(o.shippingFee ?? o.delivery_fee ?? o.shipping_fee ?? 0);
  const totalAmount = Number(order.totalAmount || 0);
  const subtotal = o.subtotal ?? Math.max(0, totalAmount - shippingCost);

  const subtotalLine = language === 'ku' ? `🏷️ کۆی کاڵاکان: ${formatIQDLabel(subtotal)}` : `🏷️ Items: ${formatIQDLabel(subtotal)}`;
  const shippingLine = shippingCost > 0
    ? (language === 'ku' ? `🚚 کرێی گەیاندن: ${formatIQDLabel(shippingCost)}` : `🚚 Delivery: ${formatIQDLabel(shippingCost)}`)
    : (language === 'ku' ? `🚚 کرێی گەیاندن: بێ بەرامبەر (خۆڕایی)` : `🚚 Delivery: Free`);
  const totalLine = language === 'ku' ? `💰 کۆی گشتی پارەدان: ${formatIQDLabel(totalAmount)}` : `💰 Total: ${formatIQDLabel(totalAmount)}`;

  const addressLine = order.shippingAddress ? (language === 'ku' ? `📍 ناونیشان: ${order.shippingAddress}` : `📍 Address: ${order.shippingAddress}`) : '';

  const closing = language === 'ku'
    ? `سوپاس بۆ متمانەت بە گەلۆ کیدس! بۆ هەر پرسیارێک دەتوانیت وەڵامی ئەم نامەیە بدەیتەوە. 🛍️✨`
    : language === 'ar'
    ? `شكراً لثقتك بنا! إذا كان لديك أي استفسار يمكنك الرد على هذه الرسالة. 🛍️✨`
    : `Thank you for your trust in Galo Kids! Feel free to reply if you have any questions. 🛍️✨`;

  return [
    customerGreeting,
    '',
    statusText,
    '',
    language === 'ku' ? '📦 کاڵاکانی داواکاری:' : '📦 Order items:',
    ...itemLines,
    '--------------------------',
    subtotalLine,
    shippingLine,
    totalLine,
    ...(addressLine ? [addressLine] : []),
    '',
    closing,
  ].join('\n');
};

export const isPosOrder = (order: any): boolean => {
  if (!order) return false;
  if (order.channel === 'pos' || order.source === 'pos' || order.isPos === true) return true;
  if (order.channel === 'online' || order.source === 'online' || order.channel === 'web' || order.channel === 'social' || order.source === 'social') return false;
  const addr = String(order.shippingAddress || '').toLowerCase();
  const email = String(order.customerEmail || '').toLowerCase();
  const name = String(order.customerName || '').toLowerCase();
  if (addr.includes('pos') || addr.includes('in-store') || addr.includes('لە فرۆشگا') || addr.includes('حضوري')) return true;
  if (email.includes('cashier') || email === 'cashier@galokids.com') return true;
  if (name.includes('pos cash sale')) return true;
  return false;
};

export const isPageOrder = (order: any): boolean => {
  if (!order) return false;
  if (order.channel === 'social' || order.source === 'social') return true;
  const email = String(order.customerEmail || '').toLowerCase();
  if (email.includes('@galokids.orders') || email.includes('social@')) return true;
  const addr = String(order.shippingAddress || '').toLowerCase();
  if (addr.includes('source: social') || addr.includes('source:') || addr.includes('پەیج')) return true;
  return false;
};

export const isWebsiteOrder = (order: any): boolean => {
  if (!order) return false;
  if (isPosOrder(order)) return false;
  if (isPageOrder(order)) return false;
  return true;
};

export interface AdminOrdersTabProps {
  orders: Order[];
  orderCounts: {
    total: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    newAndPending: number;
  };
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  deleteOrder: (orderId: string) => void;
  ordersPagination: PaginationMeta;
  refreshOrders?: (page?: number, limit?: number) => void;
  confirmDialog?: (options: any) => Promise<boolean>;
  toast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  defaultChannel?: 'all' | 'online' | 'social';
  tabTitle?: string;
}

export const AdminOrdersTab: React.FC<AdminOrdersTabProps> = ({
  orders,
  updateOrderStatus,
  deleteOrder,
  confirmDialog: propConfirmDialog,
  toast: propToast,
  defaultChannel,
  tabTitle,
}) => {
  const { language } = useLanguage();
  const { refreshOrders, bulkDelete, bulkOrderStatus, currentUser, fetchOrderCounts, ordersPagination } = useStore();
  const L = (key: string) => adminTr(key, language);
  const hookConfirm = useConfirm();
  const hookToast = useToast();
  const confirmDialog = propConfirmDialog || hookConfirm;
  const toast = propToast || hookToast;

  const [channelFilter, setChannelFilter] = useState<'all' | 'online' | 'social'>(defaultChannel || 'all');

  useEffect(() => {
    if (defaultChannel) {
      setChannelFilter(defaultChannel);
    }
  }, [defaultChannel]);

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Multi-Language & Editable WhatsApp Modal State
  const [whatsappModalOrder, setWhatsappModalOrder] = useState<Order | null>(null);
  const [whatsappModalLang, setWhatsappModalLang] = useState<'ku' | 'ar' | 'en'>((language === 'ar' ? 'ar' : language === 'en' ? 'en' : 'ku'));
  const [whatsappCustomPhone, setWhatsappCustomPhone] = useState('');
  const [whatsappCustomText, setWhatsappCustomText] = useState('');
  const [hasCopiedWhatsApp, setHasCopiedWhatsApp] = useState(false);

  const openWhatsAppModal = (order: Order, preferredLang?: 'ku' | 'ar' | 'en') => {
    const lang = preferredLang || (language === 'ar' ? 'ar' : language === 'en' ? 'en' : 'ku');
    setWhatsappModalOrder(order);
    setWhatsappModalLang(lang);
    setWhatsappCustomPhone(order.customerPhone || '');
    setWhatsappCustomText(buildOrderWhatsAppMessage(order, lang));
    setHasCopiedWhatsApp(false);
  };

  const handleLanguageSwitch = (newLang: 'ku' | 'ar' | 'en') => {
    setWhatsappModalLang(newLang);
    if (whatsappModalOrder) {
      setWhatsappCustomText(buildOrderWhatsAppMessage(whatsappModalOrder, newLang));
    }
  };

  const handleResetTemplate = () => {
    if (whatsappModalOrder) {
      setWhatsappCustomText(buildOrderWhatsAppMessage(whatsappModalOrder, whatsappModalLang));
      toast(language === 'ku' ? 'دەقەکە گەڕێندرایەوە بۆ بنەڕەتی ↺' : 'Template reset ↺');
    }
  };

  const handleSendWhatsAppNow = () => {
    const cleanPhone = String(whatsappCustomPhone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      toast(language === 'ku' ? 'تکایە ژمارەی مۆبایل بنووسە' : 'Please enter a valid phone number', 'warning');
      return;
    }
    const formatted = cleanPhone.startsWith('0') ? '964' + cleanPhone.substring(1) : cleanPhone.startsWith('964') ? cleanPhone : '964' + cleanPhone;
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(whatsappCustomText)}`, '_blank');
    setWhatsappModalOrder(null);
  };

  const handleStatusChange = (order: Order, newStatus: Order['status']) => {
    const oldStatus = order.status;
    updateOrderStatus(order.id, newStatus);

    // When status changes from pending to processing and customer has a phone number, prompt multi-language WhatsApp modal
    if (oldStatus === 'pending' && newStatus === 'processing' && order.customerPhone) {
      openWhatsAppModal({ ...order, status: newStatus });
    }
  };

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'this_month' | 'custom'>('all');
  const [customDate, setCustomDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Typing should not fire a request per keystroke, and the server is the one
  // searching now.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // The filters the server is being asked for. Every one of them used to be
  // applied in the browser over the whole order table; now that the list
  // arrives a page at a time, filtering here would search one page and present
  // it as the whole shop.
  const query = useMemo(() => {
    const today = shopToday();
    const q: OrderQuery = { page: currentPage, limit: itemsPerPage };

    if (channelFilter !== 'all') {
      q.channel = channelFilter;
    }

    if (statusFilter !== 'all') q.status = statusFilter;
    if (debouncedSearch) q.search = debouncedSearch;

    if (dateFilter === 'today') {
      q.from = today; q.to = today;
    } else if (dateFilter === 'yesterday') {
      const yesterday = shopDaysAgo(1);
      q.from = yesterday; q.to = yesterday;
    } else if (dateFilter === 'this_month') {
      q.from = `${today.slice(0, 7)}-01`; q.to = today;
    } else if (dateFilter === 'custom' && customDate) {
      q.from = customDate; q.to = customDate;
    }

    return q;
  }, [currentPage, channelFilter, statusFilter, dateFilter, customDate, debouncedSearch, itemsPerPage]);

  useEffect(() => {
    if (refreshOrders) refreshOrders(query);
  }, [query, refreshOrders]);

  // The summary chips describe the whole filtered set, not the page on screen.
  const [counts, setCounts] = useState({
    total: 0, pending: 0, processing: 0, shipped: 0,
    delivered: 0, cancelled: 0, returned: 0, newAndPending: 0,
  });

  useEffect(() => {
    let cancelled = false;
    const countQuery: OrderQuery = {
      from: query.from,
      to: query.to,
      search: query.search
    };
    if (channelFilter !== 'all') {
      countQuery.channel = channelFilter;
    }

    fetchOrderCounts(countQuery)
      .then(data => {
        if (cancelled) return;
        if (channelFilter === 'social') {
          // Strictly count from page orders so website orders never bleed into page orders counts
          const socialOrders = orders.filter(isPageOrder);
          setCounts({
            total: socialOrders.length,
            pending: socialOrders.filter(o => o.status === 'pending' || !o.status).length,
            processing: socialOrders.filter(o => o.status === 'processing').length,
            shipped: socialOrders.filter(o => o.status === 'shipped').length,
            delivered: socialOrders.filter(o => o.status === 'delivered').length,
            cancelled: socialOrders.filter(o => o.status === 'cancelled').length,
            returned: socialOrders.filter(o => o.status === 'returned').length,
            newAndPending: socialOrders.filter(o => o.status === 'pending' || !o.status).length,
          });
        } else if (channelFilter === 'online') {
          const socialCount = orders.filter(isPageOrder).length;
          if (socialCount > 0 && data.total) {
            const webOrders = orders.filter(isWebsiteOrder);
            setCounts({
              total: webOrders.length,
              pending: webOrders.filter(o => o.status === 'pending' || !o.status).length,
              processing: webOrders.filter(o => o.status === 'processing').length,
              shipped: webOrders.filter(o => o.status === 'shipped').length,
              delivered: webOrders.filter(o => o.status === 'delivered').length,
              cancelled: webOrders.filter(o => o.status === 'cancelled').length,
              returned: webOrders.filter(o => o.status === 'returned').length,
              newAndPending: webOrders.filter(o => o.status === 'pending' || !o.status).length,
            });
          } else {
            setCounts(prev => ({ ...prev, ...data }));
          }
        } else {
          setCounts(prev => ({ ...prev, ...data }));
        }
      })
      .catch(() => {
        if (channelFilter === 'social') {
          const socialOrders = orders.filter(isPageOrder);
          setCounts({
            total: socialOrders.length,
            pending: socialOrders.filter(o => o.status === 'pending' || !o.status).length,
            processing: socialOrders.filter(o => o.status === 'processing').length,
            shipped: socialOrders.filter(o => o.status === 'shipped').length,
            delivered: socialOrders.filter(o => o.status === 'delivered').length,
            cancelled: socialOrders.filter(o => o.status === 'cancelled').length,
            returned: socialOrders.filter(o => o.status === 'returned').length,
            newAndPending: socialOrders.filter(o => o.status === 'pending' || !o.status).length,
          });
        }
      });
    return () => { cancelled = true; };
  }, [query.from, query.to, query.search, channelFilter, fetchOrderCounts, orders]);

  const handleManualRefresh = async () => {
    if (isRefreshing || !refreshOrders) return;
    setIsRefreshing(true);
    try {
      await refreshOrders(query);
      toast(language === 'ku' ? 'داواکارییەکان نوێکرانەوە 🔄' : 'Orders refreshed 🔄');
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Strictly ensure only non-pos orders appear in this tab, matching channel filter.
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (isPosOrder(o)) return false;
      if (channelFilter === 'social') return isPageOrder(o);
      if (channelFilter === 'online') return isWebsiteOrder(o);
      return true;
    });
  }, [orders, channelFilter]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter, customDate, channelFilter]);

  // Paging is the server's answer too, so a page is never a slice of a slice.
  const totalPages = ordersPagination?.lastPage || 1;
  const paginatedOrders = filteredOrders;

  // Bulk actions on the orders currently listed. Only a true admin may run
  // them. The router already keeps everyone else out of this panel, so this
  // check is a second line rather than the only one — and the server refuses
  // non-admins whatever the panel decides to show.
  const orderSelection = useBulkSelection(
    useMemo(() => paginatedOrders.map(o => o.id!).filter(Boolean), [paginatedOrders])
  );
  const canBulkDelete = !!currentUser && isAdminRole(currentUser.role);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkStatusBusy, setBulkStatusBusy] = useState(false);

  const applyBulkStatus = async (status: string) => {
    if (!status) return;
    setBulkStatusBusy(true);
    const res = await bulkOrderStatus(orderSelection.ids, status);
    setBulkStatusBusy(false);
    setBulkStatus('');
    if (res.success) {
      orderSelection.clear();
      toast(language === 'ku'
        ? `${res.updated} داواکاری نوێ کرایەوە`
        : language === 'ar'
        ? `تم تحديث ${res.updated} طلب`
        : `${res.updated} orders updated`);
    } else {
      toast(res.message || L('Something went wrong'), 'error');
    }
  };

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

  /**
   * The line's own recorded name, falling back to the live product.
   *
   * A function declaration, not a const: the filter memo above calls it while
   * the component body is still being evaluated, so it has to be hoisted.
   */
  function lineName(item: any) {
    return orderItemName(item, language);
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-4 sm:p-6 md:p-8 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.4)] font-arabic">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100/80">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-indigo-600" />
            <span>
              {tabTitle || (
                channelFilter === 'social'
                  ? (language === 'ku' ? 'فرۆشتنەکانى پەیج' : language === 'ar' ? 'مبيعات البيجات' : 'Page Sales')
                  : channelFilter === 'online'
                  ? (language === 'ku' ? 'داواکارییەکانی وێبسایت' : language === 'ar' ? 'طلبات الموقع الإلكتروني' : 'Website Orders')
                  : (language === 'ku' ? 'داواکارییەکان' : language === 'ar' ? 'الطلبات' : 'Orders')
              )}
            </span>
            {counts.pending > 0 ? (
              <span className="px-3 py-1 text-xs font-black bg-amber-500 text-white rounded-full shadow-xs animate-pulse">
                {counts.pending} {language === 'ku' ? 'داواکاری چاوەڕوان' : language === 'ar' ? 'طلب معلق' : 'Pending'}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-500 rounded-full border border-slate-200">
                0 {language === 'ku' ? 'چاوەڕوان' : language === 'ar' ? 'معلق' : 'Pending'}
              </span>
            )}
          </h2>

          <p className="text-xs text-slate-500 mt-1 font-medium">
            {channelFilter === 'social'
              ? (language === 'ku'
                ? 'بینین، گەڕان و بەڕێوەبردنی فرۆشتنەکانی پەیج و دۆخی ناردنیان'
                : 'Filter, search and manage orders placed through social media pages and their shipping status')
              : (language === 'ku'
                ? 'بینین، گەڕان و نوێکردنەوەی داواکارییە ئۆنلاینەکانی کڕیارانی وێبسایت بە زانیاری ئایتمەکان'
                : 'Filter, search and update online website customer orders')}
          </p>
        </div>

        {/* Status Counter Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'pending' ? 'bg-amber-500 text-white border-amber-600 shadow-md' : 'bg-amber-500/10 border-amber-200 text-amber-900 hover:bg-amber-500/20'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            <span>{language === 'ku' ? 'چاوەڕوان' : 'Pending'}:</span>
            <span className="px-2 py-0.5 bg-amber-600 text-white rounded-lg text-xs font-black">{counts.pending}</span>
          </button>

          <button 
            onClick={() => setStatusFilter(statusFilter === 'shipped' ? 'all' : 'shipped')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'shipped' ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-blue-500/10 border-blue-200 text-blue-900 hover:bg-blue-500/20'
            }`}
          >
            <span>{language === 'ku' ? 'نێردراوە' : 'Shipped'}:</span>
            <span className="px-2 py-0.5 bg-blue-700 text-white rounded-lg text-xs font-bold">{counts.shipped}</span>
          </button>

          <button 
            onClick={() => setStatusFilter(statusFilter === 'delivered' ? 'all' : 'delivered')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'delivered' ? 'bg-emerald-600 text-white border-emerald-700 shadow-md' : 'bg-emerald-500/10 border-emerald-200 text-emerald-900 hover:bg-emerald-500/20'
            }`}
          >
            <span>{language === 'ku' ? 'گەیەنراوە' : 'Delivered'}:</span>
            <span className="px-2 py-0.5 bg-emerald-700 text-white rounded-lg text-xs font-bold">{counts.delivered}</span>
          </button>
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
            placeholder={language === 'ku' ? 'گەڕان بەپێی ئایدی، ناو، ژمارە مۆبایل یان شوێن...' : 'Search by ID, Customer name, Phone, Address...'}
            className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">{language === 'ku' ? 'هەموو باری داواکارییەکان' : 'All Statuses'}</option>
            <option value="pending">{L("Pending")}</option>
            <option value="processing">{L("Processing")}</option>
            <option value="shipped">{L("Shipped")}</option>
            <option value="delivered">{L("Delivered")}</option>
            <option value="cancelled">{L("Cancelled")}</option>
            <option value="returned">{L("Returned")}</option>
          </select>
        </div>

        {/* Date Filter & Refresh Button */}
        <div className="flex items-center gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="grow py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">{language === 'ku' ? 'هەموو بەروارەکان' : 'All Dates'}</option>
            <option value="today">{language === 'ku' ? 'ئەمڕۆ' : 'Today'}</option>
            <option value="yesterday">{language === 'ku' ? 'دوێنێ' : 'Yesterday'}</option>
            <option value="this_month">{language === 'ku' ? 'ئەم مانگە' : 'This Month'}</option>
            <option value="custom">{language === 'ku' ? 'بەرواری دیاریکراو' : 'Specific Date'}</option>
          </select>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 shrink-0"
            title={language === 'ku' ? 'نوێکردنەوەی داتای داواکارییەکان' : 'Refresh web orders'}
          >
            <RefreshCw className={`w-4 h-4 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Custom Date Picker */}
        {dateFilter === 'custom' && (
          <div className="sm:col-span-2 md:col-span-1">
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      <BulkActionBar
        count={orderSelection.count}
        totalVisible={orderSelection.totalVisible}
        onSelectAllVisible={orderSelection.selectAllVisible}
        onClear={orderSelection.clear}
        onDelete={async () => {
          const res = await bulkDelete('orders', orderSelection.ids);
          if (res.success) orderSelection.clear();
          return res;
        }}
        noun={{ ku: 'داواکاری', ar: 'طلب', en: 'orders', enOne: 'order' }}
        isAdmin={canBulkDelete}
        extra={canBulkDelete ? (
          <select
            value={bulkStatus}
            disabled={bulkStatusBusy}
            onChange={(e) => { setBulkStatus(e.target.value); applyBulkStatus(e.target.value); }}
            className="bg-white/10 border border-white/20 text-white text-xs font-black rounded-xl px-3 py-2 outline-none cursor-pointer disabled:opacity-50"
          >
            <option value="" className="text-slate-900">
              {language === 'ku' ? 'گۆڕینی دۆخ…' : language === 'ar' ? 'تغيير الحالة…' : 'Change status…'}
            </option>
            {['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'].map(st => (
              <option key={st} value={st} className="text-slate-900">{L(st.charAt(0).toUpperCase() + st.slice(1))}</option>
            ))}
          </select>
        ) : undefined}
      />

      {/* Orders Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-4 py-3 w-10">
                <BulkCheckbox
                  checked={orderSelection.allVisibleSelected}
                  indeterminate={orderSelection.count > 0 && !orderSelection.allVisibleSelected}
                  onChange={orderSelection.toggleAllVisible}
                  label={L("Select all")}
                />
              </th>
              <th className="px-4 py-3 text-left rtl:text-right text-xs font-black text-slate-500 uppercase tracking-wider">{L("Order ID")}</th>
              <th className="px-4 py-3 text-left rtl:text-right text-xs font-black text-slate-500 uppercase tracking-wider">{L("Customer")}</th>
              <th className="px-4 py-3 text-left rtl:text-right text-xs font-black text-slate-500 uppercase tracking-wider">
                {language === 'ku' ? 'ئایتمەکان (ڕەنگ، سایز، بڕ)' : 'Items (Color, Size, Qty)'}
              </th>
              <th className="px-4 py-3 text-left rtl:text-right text-xs font-black text-slate-500 uppercase tracking-wider">{L("Date")}</th>
              <th className="px-4 py-3 text-left rtl:text-right text-xs font-black text-slate-500 uppercase tracking-wider">{L("Amount")}</th>
              <th className="px-4 py-3 text-left rtl:text-right text-xs font-black text-slate-500 uppercase tracking-wider">{L("Status")}</th>
              <th className="px-4 py-3 text-center text-xs font-black text-slate-500 uppercase tracking-wider">{L("Action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium bg-white">
            {paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-slate-400 font-medium">
                  {language === 'ku' ? 'هیچ داواکارییەک بەم فلتەرانە نەدۆزرایەوە' : 'No orders found with current filters'}
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order, index) => {
                const items = safeGetItems(order);
                const isExpanded = expandedOrderId === order.id;

                return (
                  <React.Fragment key={order.id || index}>
                    <tr 
                      onClick={() => toggleExpand(order.id)}
                      className={`transition-colors cursor-pointer ${orderSelection.isSelected(order.id) ? 'bg-indigo-50/70' : isExpanded ? 'bg-indigo-50/30' : 'hover:bg-slate-50/80'}`}
                    >
                      <td className="px-4 py-4">
                        {order.id && (
                          <BulkCheckbox
                            checked={orderSelection.isSelected(order.id)}
                            onChange={() => orderSelection.toggle(order.id)}
                            label={String(order.id)}
                          />
                        )}
                      </td>

                      {/* Order ID */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(order.id);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-slate-900">#{order.id}</span>
                            {order.channel === 'social' || (order as any).source === 'social' ? (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-pink-50 text-pink-700 border border-pink-200 inline-flex items-center gap-1 shadow-2xs">
                                📱 {language === 'ku' ? 'پەیج' : language === 'ar' ? 'بيج' : 'Page'}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1 shadow-2xs">
                                🌐 {language === 'ku' ? 'وێبسایت' : language === 'ar' ? 'موقع' : 'Web'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <p className="font-bold text-slate-900">{order.customerName || (language === 'ku' ? 'میوان' : 'Guest')}</p>
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
                              title={`${lineName(item)} - ${item.variation?.color || ''} / ${item.variation?.size || ''}`}
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
                                <span className="text-indigo-600 font-black">{item.variation.size}</span>
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

                      {/* Date */}
                      <td className="px-4 py-4 whitespace-nowrap text-slate-500 font-medium">{order.date}</td>

                      {/* Amount */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-black text-slate-900 text-sm">
                          {formatIQDLabel(Number(order.totalAmount || 0))}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-start gap-1">
                          <span className={`px-3 py-1 inline-flex text-[11px] font-black rounded-full
                            ${order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              order.status === 'processing' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              order.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                              order.status === 'returned' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                              'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                            {L(String(order.status || 'pending').charAt(0).toUpperCase() + String(order.status || 'pending').slice(1))}
                          </span>
                          {/* Cancelled and returned are different endings, and a
                              return can be for part of the receipt only. */}
                          <OrderReturnBadge order={order} />
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order, e.target.value as Order['status'])}
                            className="bg-slate-100/90 border border-slate-200 rounded-xl text-xs py-1.5 px-2 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="pending">{L("Pending")}</option>
                            <option value="processing">{L("Processing")}</option>
                            <option value="shipped">{L("Shipped")}</option>
                            <option value="delivered">{L("Delivered")}</option>
                            <option value="cancelled">{L("Cancelled")}</option>
                            <option value="returned">{L("Returned")}</option>
                          </select>

                          {order.customerPhone && (
                            <button
                              type="button"
                              onClick={() => openWhatsAppModal(order)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                              title={language === 'ku' ? 'ناردنی پسوولە بە وەتسەپ' : 'Send invoice via WhatsApp'}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedOrderForModal(order)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                            title={language === 'ku' ? 'بینی زانیاری تەواو' : 'View Full Details'}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {order.id && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (await confirmDialog({
                                  title: L('Delete order?'),
                                  message: language === 'ku'
                                    ? `داواکاری #${order.id} دەسڕدرێتەوە و ستۆکەکەی دەگەڕێندرێتەوە بۆ کۆگا.`
                                    : language === 'ar'
                                    ? `سيتم حذف الطلب #${order.id} وإعادة مخزونه إلى الكتالوج.`
                                    : `Order #${order.id} will be deleted and its stock returned to inventory.`,
                                  confirmText: L('Delete'),
                                  cancelText: L('Cancel'),
                                  danger: true,
                                })) {
                                  deleteOrder(order.id);
                                  toast(L('Order deleted and stock restored ✅'));
                                }
                              }}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-xl hover:bg-rose-50 cursor-pointer"
                              title={L("Delete Order")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Accordion Expand Details */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90 border-b-2 border-indigo-100">
                        <td colSpan={8} className="p-4 sm:p-6">
                          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
                            {/* Top Info Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
                              <div className="flex items-center gap-4 flex-wrap text-slate-600">
                                <span className="flex items-center gap-1.5 font-bold text-slate-800">
                                  <User className="w-4 h-4 text-indigo-500" />
                                  {order.customerName}
                                </span>
                                {order.customerPhone && (
                                  <a 
                                    href={`tel:${order.customerPhone}`}
                                    className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-indigo-600 dir-ltr"
                                  >
                                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                    {order.customerPhone}
                                  </a>
                                )}
                                {order.shippingAddress && (
                                  <span className="flex items-center gap-1.5 font-medium text-slate-600">
                                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    {order.shippingAddress}
                                  </span>
                                )}
                              </div>
                              <span className="text-slate-400 text-xs flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" /> {order.date}
                              </span>
                            </div>

                            {/* Items Grid */}
                            <div>
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                                <span>{language === 'ku' ? 'ئایتمەکانی ناو داواکاری' : 'Order Items'}</span>
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black">
                                  {items.length} {language === 'ku' ? 'ئایتم' : 'items'}
                                </span>
                              </h4>

                              {items.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-2">
                                  {language === 'ku' ? 'هیچ زانیارییەکی ئایتم لەم داواکارییەدا بەردەست نییە' : 'No items found'}
                                </p>
                              ) : (
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
                                              alt={lineName(item)} 
                                              className="w-full h-full object-cover" 
                                            />
                                          ) : (
                                            <Package className="w-6 h-6 text-slate-300" />
                                          )}
                                        </div>

                                        <div className="grow min-w-0">
                                          <h5 className="font-bold text-slate-900 text-xs line-clamp-1">
                                            {lineName(item)}
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
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-black">
                                                <Tag className="w-3 h-3" />
                                                <span>{getLocalizedSizeName(item.variation.size, language)}</span>
                                              </span>
                                            )}

                                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] font-black">
                                              {language === 'ku' ? `بڕ: ${item.quantity || 1}` : `Qty: ${item.quantity || 1}`}
                                            </span>
                                            {/* Which of the receipt's lines came back, so the shop
                                                knows what to put back on the shelf. */}
                                            <OrderItemReturnNote item={item} />
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
                              )}
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

      {/* Standard Unified Pagination Component */}
      <Pagination
        meta={{
          currentPage,
          lastPage: totalPages,
          // The whole filtered set, not the rows on screen — the server counts
          // it, and the footer is meant to say how many there are in total.
          total: ordersPagination?.total ?? filteredOrders.length,
        }}
        onPageChange={(page) => setCurrentPage(page)}
      />

      {/* Modal */}
      {selectedOrderForModal && createPortal(
        <div 
          onClick={() => setSelectedOrderForModal(null)}
          className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200 font-arabic"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-slate-900 text-lg">
                      {language === 'ku' ? 'زانیاری داواکاری' : 'Order Details'} #{selectedOrderForModal.id}
                    </h3>
                    {selectedOrderForModal.channel === 'social' || (selectedOrderForModal as any).source === 'social' ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-pink-100 text-pink-700 border border-pink-200 inline-flex items-center gap-1">
                        📱 {language === 'ku' ? 'ئۆردەری پەیج' : language === 'ar' ? 'طلب بيج' : 'Page Order'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-100 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                        🌐 {language === 'ku' ? 'وێبسایت' : language === 'ar' ? 'الموقع' : 'Website'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{selectedOrderForModal.date}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-500" />
                  {selectedOrderForModal.customerName}
                </span>
                {selectedOrderForModal.customerPhone && (
                  <div className="flex items-center gap-2">
                    <a 
                      href={`tel:${selectedOrderForModal.customerPhone}`}
                      className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {selectedOrderForModal.customerPhone}
                    </a>
                    <a 
                      href={`https://wa.me/${selectedOrderForModal.customerPhone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  </div>
                )}
              </div>
              {selectedOrderForModal.shippingAddress && (
                <p className="text-slate-600 flex items-center gap-1.5 font-medium pt-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  {selectedOrderForModal.shippingAddress}
                </p>
              )}
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              <h4 className="font-black text-xs text-slate-700 uppercase tracking-wider">
                {language === 'ku' ? 'ئایتمەکانی ناو داواکاری' : 'Order Items'}
              </h4>

              {safeGetItems(selectedOrderForModal).map((item, idx) => {
                const itemPrice = Number(item.product?.discountPrice || item.product?.price || 0);
                const itemTotal = itemPrice * (item.quantity || 1);

                return (
                  <div 
                    key={idx}
                    className="flex items-center gap-4 p-3 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                      {item.product?.imageUrl ? (
                        <img 
                          src={item.product.imageUrl} 
                          alt={lineName(item)} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <Package className="w-8 h-8 text-slate-300 m-auto mt-4" />
                      )}
                    </div>

                    <div className="grow min-w-0">
                      <h5 className="font-bold text-slate-900 text-sm">{lineName(item)}</h5>
                      
                      <div className="flex items-center gap-2 flex-wrap mt-1.5">
                        {item.variation?.color && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200">
                            <span 
                              className="w-3 h-3 rounded-full border border-black/10 shrink-0 shadow-2xs" 
                              style={{ backgroundColor: getColorHex(item.variation.color) }} 
                            />
                            <span>{getLocalizedColorName(item.variation.color, language)}</span>
                          </span>
                        )}

                        {item.variation?.size && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-black border border-indigo-100">
                            <Tag className="w-3.5 h-3.5" />
                            <span>{getLocalizedSizeName(item.variation.size, language)}</span>
                          </span>
                        )}

                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-black border border-emerald-100">
                          {language === 'ku' ? `بڕ: ${item.quantity || 1}` : `Qty: ${item.quantity || 1}`}
                        </span>
                        {/* Which of the receipt's lines came back, so the shop
                            knows what to put back on the shelf. */}
                        <OrderItemReturnNote item={item} />
                      </div>
                    </div>

                    <div className="text-right rtl:text-left shrink-0">
                      <p className="font-black text-slate-900 text-sm">{formatIQDLabel(itemTotal)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between font-black text-slate-900 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                {selectedOrderForModal.customerPhone && (
                  <button
                    type="button"
                    onClick={() => openWhatsAppModal(selectedOrderForModal)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{language === 'ku' ? 'ناردنی پسوولە بە وەتسەپ' : language === 'ar' ? 'إرسال الفاتورة عبر واتساب' : 'Send Invoice via WhatsApp'}</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">{language === 'ku' ? 'کۆی گشتی داواکاری:' : 'Total Amount:'}</span>
                <span className="text-xl text-indigo-600">{formatIQDLabel(Number(selectedOrderForModal.totalAmount || 0))}</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Multi-Language & Editable WhatsApp Order Invoice Modal */}
      {whatsappModalOrder && createPortal(
        <div 
          onClick={() => setWhatsappModalOrder(null)}
          className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-arabic"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-xs border border-emerald-100">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg">
                    {language === 'ku' ? 'ناردنی پسوولەی داواکاری بە وەتسەپ' : language === 'ar' ? 'إرسال تفاصيل الطلب عبر واتساب' : 'Send Order Details via WhatsApp'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {language === 'ku' 
                      ? `داواکاری #${whatsappModalOrder.id} • ${whatsappModalOrder.customerName || 'کڕیار'}` 
                      : `Order #${whatsappModalOrder.id} • ${whatsappModalOrder.customerName || 'Customer'}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhatsappModalOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language Switcher Bar */}
            <div className="pt-4 pb-2 shrink-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-600">
                  {language === 'ku' ? 'زمانی دەقی پسوولەکە:' : language === 'ar' ? 'لغة نص الفاتورة:' : 'Invoice Language:'}
                </span>

                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => handleLanguageSwitch('ku')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      whatsappModalLang === 'ku'
                        ? 'bg-candy-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    ☀️ کوردی
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageSwitch('ar')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      whatsappModalLang === 'ar'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    🌙 العربية
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageSwitch('en')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      whatsappModalLang === 'en'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    🌐 English
                  </button>
                </div>
              </div>
            </div>

            {/* Body (Phone & Editable Message Textarea) */}
            <div className="py-2 overflow-y-auto space-y-3 flex-1 pr-0.5">
              {/* Target Phone Input */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  {language === 'ku' ? 'ژمارەی مۆبایل / وەتسەپی کڕیار:' : language === 'ar' ? 'رقم هاتف / واتساب العميل:' : 'Customer WhatsApp Number:'}
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-4 h-4 text-emerald-600 absolute right-3 rtl:right-3 rtl:left-auto left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={whatsappCustomPhone}
                    onChange={(e) => setWhatsappCustomPhone(e.target.value)}
                    dir="ltr"
                    placeholder="0750XXXXXXX"
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-9 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Editable Message Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    {language === 'ku' ? 'دەقی پەیام (دەتوانیت دەستکاری بکەیت):' : language === 'ar' ? 'نص الرسالة (قابل للتعديل):' : 'Message Text (Editable):'}
                  </label>
                  <button
                    type="button"
                    onClick={handleResetTemplate}
                    className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{language === 'ku' ? 'گەڕاندنەوە بۆ دەقی بنەڕەتی' : language === 'ar' ? 'استعادة النص الأصلي' : 'Reset Template'}</span>
                  </button>
                </div>

                <textarea
                  value={whatsappCustomText}
                  onChange={(e) => setWhatsappCustomText(e.target.value)}
                  dir={whatsappModalLang === 'en' ? 'ltr' : 'rtl'}
                  rows={9}
                  className="w-full p-3.5 bg-slate-50 hover:bg-white focus:bg-white rounded-2xl border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-y shadow-2xs"
                />
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(whatsappCustomText);
                  setHasCopiedWhatsApp(true);
                  setTimeout(() => setHasCopiedWhatsApp(false), 2500);
                  toast(language === 'ku' ? 'دەقەکە کۆپیکرا ✅' : 'Text copied ✅');
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {hasCopiedWhatsApp ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{hasCopiedWhatsApp ? (language === 'ku' ? 'کۆپیکرا' : 'Copied') : (language === 'ku' ? 'کۆپیکردنی دەق' : 'Copy Text')}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setWhatsappModalOrder(null)}
                  className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  {language === 'ku' ? 'داخستن' : language === 'ar' ? 'إلغاء' : 'Close'}
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsAppNow}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{language === 'ku' ? 'ناردن لە وەتسەپ 💬' : language === 'ar' ? 'إرسال عبر واتساب 💬' : 'Send in WhatsApp 💬'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
