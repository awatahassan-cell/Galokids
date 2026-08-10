import { STANDARD_COLORS, STANDARD_SIZES } from '../data';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL, apiFetch } from '../config/api';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { Plus, Save, Package, Settings, Tags, Users, ShoppingBag, DollarSign, Star, Image as ImageIcon, AlertTriangle, BarChart3, TrendingUp, TrendingDown, Calendar, Trash2, Edit, Menu, X, UserPlus, ChevronLeft, ChevronRight, ShoppingCart, FileText, Languages, Search, Ticket, Pencil, Percent, Boxes } from 'lucide-react';
import { ProductVariation, Expense, Order, Category, Product, User } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie } from 'recharts';
import { getColorHex } from '../utils/colors';
import { generateBarcodeDataUrl } from '../utils/barcode';
import { formatIQD, formatIQDLabel } from "../utils/currency";
import { CategoryIcon } from '../components/CategoryIcon';
import { AdminEditModals } from "../components/AdminEditModals";
import { ProductImageEditor } from "../components/ProductImageEditor";
import { Pagination } from "../components/Pagination";
import { AdminSalesReport } from "../components/AdminSalesReport";
import { LowStockAlert } from "../components/LowStockAlert";
import { useToast, useConfirm } from "../components/ui/Feedback";
import { AdminStoreSettings } from "../components/AdminStoreSettings";
import { AdminHeroSettings } from "../components/AdminHeroSettings";
import { AdminPromoBannerSettings } from "../components/AdminPromoBannerSettings";
import { adminTr } from "../i18n/adminDict";
import { AdminHeader } from "../components/admin/AdminHeader";
import { AdminNavigationSidebar } from "../components/admin/AdminNavigationSidebar";
import { AdminOverviewTab } from "../components/admin/AdminOverviewTab";
import { AdminOrdersTab } from "../components/admin/AdminOrdersTab";
import { AdminPosSalesTab } from "../components/admin/AdminPosSalesTab";
import { AdminInventoryTab } from "../components/admin/AdminInventoryTab";
import { AdminLabelsTab } from "../components/admin/AdminLabelsTab";
import { AdminBarcodeTab } from "../components/admin/AdminBarcodeTab";
import { BulkStockModal } from "../components/admin/BulkStockModal";
import { getRoleInfo, isAdminRole, isCashierRole } from "../utils/roles";

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month - 1, 1).getDay();
};

export const Admin: React.FC = () => {
  const { 
    categories, addCategory, addProduct, orders, users, expenses, products, 
    updateOrderStatus, addExpense, promoBanner, updatePromoBanner, currentUser,
    deleteProduct, deleteCategory, deleteExpense, deleteUser, deleteOrder, addUser,
    updateProduct, updateCategory, updateExpense, updateUser,
    productsPagination, ordersPagination, expensesPagination, reviewsPagination, reviews,
    refreshProducts, refreshOrders, refreshExpenses, refreshReviews,
    coupons, addCoupon, updateCoupon, deleteCoupon
  } = useStore();
  
  const isAdmin = useMemo(() => {
    if (!currentUser) return true;
    return isAdminRole(currentUser.role) || isCashierRole(currentUser.role);
  }, [currentUser]);

  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedAdminCategory, setSelectedAdminCategory] = useState<string>('all');
  const [adminSortBy, setAdminSortBy] = useState<string>('newest');
  const [isBulkStockModalOpen, setIsBulkStockModalOpen] = useState(false);
  
  const { tab: urlTab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const validTabs = useMemo(() => ['overview', 'reports', 'products', 'inventory', 'categories', 'orders', 'pos-sales', 'users', 'expenses', 'reviews', 'banner', 'calendar', 'translations', 'labels', 'barcode-stickers', 'coupons', 'settings'], []);

  const [activeTab, setActiveTabState] = useState<string>(() => {
    if (urlTab && validTabs.includes(urlTab)) return urlTab;
    return isAdmin ? 'overview' : 'products';
  });

  useEffect(() => {
    if (urlTab && validTabs.includes(urlTab) && urlTab !== activeTab) {
      setActiveTabState(urlTab);
    }
  }, [urlTab, validTabs]);

  const setActiveTab = useCallback((newTab: string) => {
    setActiveTabState(newTab);
    window.history.replaceState(null, '', `/admin/${newTab}`);
  }, []);

  // Coupons State
  const [couponCode, setAdminCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState('');
  const [couponIsActive, setCouponIsActive] = useState(true);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  
  // New Coupon Active Date Range States
  const [couponFormStartDate, setCouponFormStartDate] = useState('');
  const [couponFormEndDate, setCouponFormEndDate] = useState('');
  
  // Coupons Date Filter State
  const [couponDatePreset, setCouponDatePreset] = useState<string>('all');
  const [couponStartDate, setCouponStartDate] = useState<string>('');
  const [couponEndDate, setCouponEndDate] = useState<string>('');

  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode || !couponDiscount) return;
    
    if (editingCouponId) {
      updateCoupon({
        id: editingCouponId,
        code: couponCode,
        discountPercentage: Number(couponDiscount),
        isActive: couponIsActive,
        startDate: couponFormStartDate || undefined,
        endDate: couponFormEndDate || undefined
      });
      setEditingCouponId(null);
    } else {
      addCoupon({
        id: Math.random().toString(36).substr(2, 9),
        code: couponCode,
        discountPercentage: Number(couponDiscount),
        isActive: couponIsActive,
        startDate: couponFormStartDate || undefined,
        endDate: couponFormEndDate || undefined
      });
    }
    setAdminCouponCode('');
    setCouponDiscount('');
    setCouponIsActive(true);
    setCouponFormStartDate('');
    setCouponFormEndDate('');
  };
  
  const handleEditCoupon = (coupon: any) => {
    setEditingCouponId(coupon.id);
    setAdminCouponCode(coupon.code);
    setCouponDiscount(coupon.discountPercentage.toString());
    setCouponIsActive(coupon.isActive);
    setCouponFormStartDate(coupon.startDate || '');
    setCouponFormEndDate(coupon.endDate || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calendar Reports State
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth() + 1); // 1-indexed
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);

  useEffect(() => {
    if (currentUser && !isAdmin && activeTab === 'overview') {
      setActiveTab('products');
    }
  }, [isAdmin, activeTab, currentUser]);

  const { t, language, updateTranslation, allTranslations } = useLanguage();
  const L = (s: string) => adminTr(s, language);
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [translationSearch, setTranslationSearch] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedPreviewProduct, setSelectedPreviewProduct] = useState<Product | null>(null);


  const couponStats = useMemo(() => {
    // Determine the date range
    let startVal: number | null = null;
    let endVal: number | null = null;

    if (couponDatePreset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      d.setHours(0, 0, 0, 0);
      startVal = d.getTime();
    } else if (couponDatePreset === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      d.setHours(0, 0, 0, 0);
      startVal = d.getTime();
    } else if (couponDatePreset === 'thisMonth') {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      startVal = d.getTime();
    } else if (couponDatePreset === 'custom') {
      if (couponStartDate) {
        startVal = new Date(couponStartDate + 'T00:00:00').getTime();
      }
      if (couponEndDate) {
        endVal = new Date(couponEndDate + 'T23:59:59').getTime();
      }
    }

    const filteredOrders = orders.filter(order => {
      const orderDateStr = order.date ? order.date.split('T')[0] : new Date().toISOString().split('T')[0];
      const orderTime = new Date(orderDateStr + 'T12:00:00').getTime();
      if (startVal !== null && orderTime < startVal) return false;
      if (endVal !== null && orderTime > endVal) return false;
      return true;
    });

    // Map existing orders to coupon code usages if they don't have one to show statistics
    const enrichedOrders = filteredOrders.map((order, idx) => {
      if ((order as any).couponCode) {
        return {
          ...order,
          couponCode: (order as any).couponCode,
          discountAmount: Number((order as any).discountAmount || 0),
          originalAmount: Number(order.totalAmount) + Number((order as any).discountAmount || 0),
        };
      }
      
      
      return {
        ...order,
        couponCode: undefined,
        discountAmount: 0,
        originalAmount: Number(order.totalAmount),
      };
    });

    const performanceByCode: Record<string, { code: string; count: number; totalDiscount: number; totalSales: number; isActive: boolean }> = {};
    
    coupons.forEach(c => {
      performanceByCode[c.code] = {
        code: c.code,
        count: 0,
        totalDiscount: 0,
        totalSales: 0,
        isActive: c.isActive
      };
    });

    let totalDiscountGiven = 0;
    let totalSalesWithCoupons = 0;
    let totalCouponUses = 0;

    enrichedOrders.forEach(o => {
      if (o.couponCode) {
        totalCouponUses++;
        totalDiscountGiven += o.discountAmount;
        totalSalesWithCoupons += o.totalAmount;

        if (!performanceByCode[o.couponCode]) {
          performanceByCode[o.couponCode] = {
            code: o.couponCode,
            count: 0,
            totalDiscount: 0,
            totalSales: 0,
            isActive: false
          };
        }
        
        performanceByCode[o.couponCode].count++;
        performanceByCode[o.couponCode].totalDiscount += o.discountAmount;
        performanceByCode[o.couponCode].totalSales += o.totalAmount;
      }
    });

    const performanceData = Object.values(performanceByCode).sort((a, b) => b.totalDiscount - a.totalDiscount);

    const usagesByDate: Record<string, { date: string; count: number; discount: number; sales: number }> = {};
    
    enrichedOrders.forEach(o => {
      const dateStr = o.date ? o.date.split('T')[0] : new Date().toISOString().split('T')[0];
      if (!usagesByDate[dateStr]) {
        usagesByDate[dateStr] = { date: dateStr, count: 0, discount: 0, sales: 0 };
      }
      if (o.couponCode) {
        usagesByDate[dateStr].count++;
        usagesByDate[dateStr].discount += o.discountAmount;
        usagesByDate[dateStr].sales += o.totalAmount;
      }
    });

    const timelineData = Object.values(usagesByDate).sort((a, b) => a.date.localeCompare(b.date));

    const totalOrderCount = filteredOrders.length;
    const conversionRate = totalOrderCount > 0 ? (totalCouponUses / totalOrderCount) * 100 : 0;
    const avgDiscountPercentage = totalCouponUses > 0 
      ? (enrichedOrders.reduce((sum, o) => sum + (o.couponCode ? (o.discountAmount / o.originalAmount) * 100 : 0), 0) / totalCouponUses)
      : 0;

    return {
      performanceData,
      timelineData,
      totalDiscountGiven,
      totalSalesWithCoupons,
      totalCouponUses,
      conversionRate,
      avgDiscountPercentage,
      enrichedOrders
    };
  }, [orders, coupons, couponDatePreset, couponStartDate, couponEndDate]);

  const isPosOrder = (order: any): boolean => {
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

  const getOrderEstimatedCost = (order: Order) => {
    let orderCogs = 0;
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        const actualProduct = products.find(p => p.id === item?.product?.id);
        const itemCost = actualProduct?.cost ?? item.product?.cost ?? ((item.product?.price || 0) * 0.4);
        orderCogs += Number(itemCost || 0) * Number(item.quantity || 0);
      });
    } else {
      orderCogs = Number(order.totalAmount || 0) * 0.4;
    }
    return orderCogs;
  };

  // Debounced server side search for Products Management
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshProducts(1, 25, { search: productSearchQuery });
    }, 450);
    return () => clearTimeout(timer);
  }, [productSearchQuery, refreshProducts]);

  const getCategoryName = (category: any) => {
    if (language === 'ku' && category.nameKu) return category.nameKu;
    if (language === 'ar' && category.nameAr) return category.nameAr;
    return category.name;
  };

  const chartData = useMemo(() => {
    const dataMap = new Map<string, { month: string, revenue: number, expense: number }>();
    
    // Aggregate orders (Revenue)
    orders.forEach(order => {
      const month = order.date.substring(0, 7); // YYYY-MM
      if (!dataMap.has(month)) {
        dataMap.set(month, { month, revenue: 0, expense: 0 });
      }
      dataMap.get(month)!.revenue += order.totalAmount;
    });

    // Aggregate expenses
    expenses.forEach(exp => {
      const month = exp.date.substring(0, 7);
      if (!dataMap.has(month)) {
        dataMap.set(month, { month, revenue: 0, expense: 0 });
      }
      dataMap.get(month)!.expense += exp.amount;
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

  const [orderFilterPeriod, setOrderFilterPeriod] = useState<'today' | 'week' | 'month'>('today');

  const orderCounts = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgoDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgoStr = sevenDaysAgoDate.toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    const filtered = orders.filter(o => {
      const rawDate = o.date || o.createdAt || '';
      const dateStr = String(rawDate).split('T')[0];
      if (!dateStr || dateStr.length < 10) return true;

      if (orderFilterPeriod === 'today') {
        return dateStr === todayStr;
      }
      if (orderFilterPeriod === 'week') {
        return dateStr >= sevenDaysAgoStr;
      }
      if (orderFilterPeriod === 'month') {
        return dateStr.startsWith(currentMonthStr);
      }
      return true;
    });

    let pending = 0;
    let processing = 0;
    let shipped = 0;
    let delivered = 0;
    let cancelled = 0;

    filtered.forEach(o => {
      const s = String(o.status || '').toLowerCase();
      if (s === 'pending' || s === 'new') pending++;
      else if (s === 'processing') processing++;
      else if (s === 'shipped') shipped++;
      else if (s === 'delivered') delivered++;
      else if (s === 'cancelled') cancelled++;
      else pending++;
    });

    return {
      total: filtered.length,
      pending,
      processing,
      shipped,
      delivered,
      cancelled,
      newAndPending: pending + processing
    };
  }, [orders, orderFilterPeriod]);

  // Daily, Monthly, Yearly Reporting state & calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);
  const currentYearStr = todayStr.substring(0, 4);

  const [reportPeriod, setReportPeriod] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState(currentYearStr);

  const reportData = useMemo(() => {
    let filteredOrders = [...orders];
    let filteredExpenses = [...expenses];

    if (reportPeriod === 'daily') {
      filteredOrders = orders.filter(o => o.date === selectedDate);
      filteredExpenses = expenses.filter(e => e.date === selectedDate);
    } else if (reportPeriod === 'monthly') {
      filteredOrders = orders.filter(o => o.date.startsWith(selectedMonth));
      filteredExpenses = expenses.filter(e => e.date.startsWith(selectedMonth));
    } else if (reportPeriod === 'yearly') {
      filteredOrders = orders.filter(o => o.date.startsWith(selectedYear));
      filteredExpenses = expenses.filter(e => e.date.startsWith(selectedYear));
    }

    let totalRevenue = 0;
    let totalCogs = 0;
    const totalOrderCount = filteredOrders.length;

    let posRevenue = 0;
    let posOrderCount = 0;
    let posCogs = 0;

    let webRevenue = 0;
    let webOrderCount = 0;
    let webCogs = 0;

    filteredOrders.forEach(order => {
      const rev = Number(order.totalAmount || 0);
      const cogs = getOrderEstimatedCost(order);
      totalRevenue += rev;
      totalCogs += cogs;

      if (isPosOrder(order)) {
        posRevenue += rev;
        posOrderCount += 1;
        posCogs += cogs;
      } else {
        webRevenue += rev;
        webOrderCount += 1;
        webCogs += cogs;
      }
    });

    const totalExpenseAmt = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const grossProfit = totalRevenue - totalCogs;
    const netProfit = grossProfit - totalExpenseAmt;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      filteredOrders,
      filteredExpenses,
      totalRevenue,
      totalCogs,
      totalExpenseAmt,
      grossProfit,
      netProfit,
      grossMargin,
      netMargin,
      totalOrderCount,
      posRevenue,
      posOrderCount,
      posCogs,
      posGrossProfit: posRevenue - posCogs,
      webRevenue,
      webOrderCount,
      webCogs,
      webGrossProfit: webRevenue - webCogs,
    };
  }, [orders, expenses, reportPeriod, selectedDate, selectedMonth, selectedYear, products]);

  // Calendar memoized calculations
  const MONTH_NAMES = useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);

  const calendarOrders = useMemo(() => {
    const monthStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}`;
    return orders.filter(o => o.date && o.date.startsWith(monthStr));
  }, [orders, calendarYear, calendarMonth]);

  const calendarExpenses = useMemo(() => {
    const monthStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}`;
    return expenses.filter(e => e.date && e.date.startsWith(monthStr));
  }, [expenses, calendarYear, calendarMonth]);

  const calendarDayStats = useMemo(() => {
    const stats: Record<number, {
      count: number;
      revenue: number;
      itemsSold: number;
      ordersList: Order[];
      expenseAmt: number;
      cogs: number;
      posCount: number;
      websiteCount: number;
      posRevenue: number;
      websiteRevenue: number;
      posCogs: number;
      websiteCogs: number;
    }> = {};
    for (let d = 1; d <= 31; d++) {
      stats[d] = {
        count: 0,
        revenue: 0,
        itemsSold: 0,
        ordersList: [],
        expenseAmt: 0,
        cogs: 0,
        posCount: 0,
        websiteCount: 0,
        posRevenue: 0,
        websiteRevenue: 0,
        posCogs: 0,
        websiteCogs: 0,
      };
    }

    calendarOrders.forEach(order => {
      const parts = order.date.split('T')[0].split('-');
      if (parts.length >= 3) {
        const day = parseInt(parts[2], 10);
        if (!isNaN(day) && day >= 1 && day <= 31) {
          stats[day].count += 1;
          const orderRevenue = Number(order.totalAmount || 0);
          const orderCost = getOrderEstimatedCost(order);
          const pos = isPosOrder(order);

          stats[day].revenue += orderRevenue;
          stats[day].cogs += orderCost;
          stats[day].ordersList.push(order);

          if (pos) {
            stats[day].posCount += 1;
            stats[day].posRevenue += orderRevenue;
            stats[day].posCogs += orderCost;
          } else {
            stats[day].websiteCount += 1;
            stats[day].websiteRevenue += orderRevenue;
            stats[day].websiteCogs += orderCost;
          }

          if (order.items) {
            const qty = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
            stats[day].itemsSold += qty;
          }
        }
      }
    });

    calendarExpenses.forEach(exp => {
      const parts = exp.date.split('T')[0].split('-');
      if (parts.length >= 3) {
        const day = parseInt(parts[2], 10);
        if (!isNaN(day) && day >= 1 && day <= 31) {
          stats[day].expenseAmt += Number(exp.amount || 0);
        }
      }
    });

    return stats;
  }, [calendarOrders, calendarExpenses, products]);

  const calendarMonthlySummary = useMemo(() => {
    const revenue = calendarOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const posOrders = calendarOrders.filter(isPosOrder);
    const websiteOrders = calendarOrders.filter(o => !isPosOrder(o));
    const posRevenue = posOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const websiteRevenue = websiteOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const itemsSold = calendarOrders.reduce((sum, o) => {
      if (o.items) {
        return sum + o.items.reduce((s, item) => s + (item.quantity || 0), 0);
      }
      return sum;
    }, 0);
    const totalExpenses = calendarExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return {
      revenue,
      ordersCount: calendarOrders.length,
      posOrdersCount: posOrders.length,
      websiteOrdersCount: websiteOrders.length,
      posRevenue,
      websiteRevenue,
      itemsSold,
      avgOrderValue: calendarOrders.length > 0 ? revenue / calendarOrders.length : 0,
      totalExpenses,
      netProfit: revenue - totalExpenses
    };
  }, [calendarOrders, calendarExpenses]);

  const daysInMonth = useMemo(() => getDaysInMonth(calendarYear, calendarMonth), [calendarYear, calendarMonth]);
  const firstDayOfWeek = useMemo(() => getFirstDayOfMonth(calendarYear, calendarMonth), [calendarYear, calendarMonth]);
  const daysInPrevMonth = useMemo(() => getDaysInMonth(calendarYear, calendarMonth - 1 === 0 ? 12 : calendarMonth - 1), [calendarYear, calendarMonth]);

  // New Category State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryNameKu, setNewCategoryNameKu] = useState('');
  const [newCategoryNameAr, setNewCategoryNameAr] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Shirt');

  // New Product State
  const [productName, setProductName] = useState('');
  const [productNameKu, setProductNameKu] = useState('');
  const [productNameAr, setProductNameAr] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productDescKu, setProductDescKu] = useState('');
  const [productDescAr, setProductDescAr] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productGender, setProductGender] = useState<0 | 1 | 2>(0);
  const [productPrice, setProductPrice] = useState('');
  const [productDiscountPrice, setProductDiscountPrice] = useState('');
  const [productCost, setProductCost] = useState('');
  const [productSku, setProductSku] = useState('');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [variations, setVariations] = useState<Omit<ProductVariation, 'id' | 'productId'>[]>([]);

  const [labelProductId, setLabelProductId] = useState<string>('');
  const [labelCopies, setLabelCopies] = useState<number>(1);
  const [barcodeProductId, setBarcodeProductId] = useState<string>('');
  const [barcodeCopies, setBarcodeCopies] = useState<number>(1);

  // Promo Banner State
  const [bannerState, setBannerState] = useState(promoBanner);

  // New Expense State
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');

  // New User State
  const [addUserName, setAddUserName] = useState('');
  const [addUserEmail, setAddUserEmail] = useState('');
  const [addUserPhone, setAddUserPhone] = useState('');
  const [addUserRole, setAddUserRole] = useState(1);
  const [addUserPassword, setAddUserPassword] = useState('');

  // Edit States
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [isUploading, setIsUploading] = useState(false);

  // Resize/compress an image in the browser before upload. This shrinks big
  // phone photos (often 5–10 MB) to well under typical server upload limits,
  // which is the usual cause of "Image upload failed".
  const compressImage = (file: File, maxSize = 1600, quality = 0.82): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) { reject(new Error('Not an image')); return; }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width >= height) { height = Math.round(height * (maxSize / width)); width = maxSize; }
          else { width = Math.round(width * (maxSize / height)); height = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas unsupported')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
          'image/jpeg', quality
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Invalid image')); };
      img.src = url;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      for (const file of files) {
        try {
          const blob = await compressImage(file);
          const name = (file.name.replace(/\.[^.]+$/, '') || 'image') + '.jpg';
          formData.append('images[]', blob, name);
        } catch {
          // If compression fails for some reason, fall back to the original file.
          formData.append('images[]', file);
        }
      }

      let token = localStorage.getItem('kidskart_auth_token');
      
      let res = await apiFetch('/products/upload-images', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (res.status === 401) {
        try {
          const savedUserStr = localStorage.getItem('kidskart_user');
          const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
          if (savedUser?.email && savedUser?.password) {
            const loginRes = await apiFetch('/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify({ email: savedUser.email, password: savedUser.password })
            });
            if (loginRes.ok) {
              const loginData = await loginRes.json();
              const newToken = loginData.access_token || loginData.accessToken;
              if (newToken) {
                localStorage.setItem('kidskart_auth_token', newToken);
                token = newToken;
                res = await apiFetch('/products/upload-images', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                  body: formData,
                });
              }
            }
          }
        } catch (e) {
          console.warn('Image upload re-auth attempt failed:', e);
        }
      }

      if (!res.ok) {
        let msg = `Upload failed (${res.status})`;
        try { const j = await res.json(); if (j?.message) msg = j.message; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      if (data && Array.isArray(data.urls)) {
        setProductImages(prev => [...prev, ...data.urls]);
        toast('Image uploaded ✅');
      }
    } catch (err: any) {
      console.warn('Image upload note:', err);
      toast(err?.message || 'Image upload failed. Please try a smaller image.', 'error');
    } finally {
      setIsUploading(false);
      e.target.value = ''; // allow re-selecting the same file
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    addCategory({
      id: `c${Date.now()}`,
      name: newCategoryName,
      nameKu: newCategoryNameKu,
      nameAr: newCategoryNameAr,
      icon: newCategoryIcon
    });
    setNewCategoryName('');
    setNewCategoryNameKu('');
    setNewCategoryNameAr('');
    setNewCategoryIcon('Shirt');
    toast('Category added successfully ✅');
  };

  const handleAddVariation = () => {
    setVariations([...variations, { color: '', size: '', stockQuantity: 0 }]);
  };

  const updateVariation = (index: number, field: keyof Omit<ProductVariation, 'id' | 'productId'>, value: string | number) => {
    const newVars = [...variations];
    newVars[index] = { ...newVars[index], [field]: value };
    setVariations(newVars);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !productCategory || !productPrice || !productCost) {
      toast('Please fill required fields (Name, Category, Price, Cost)', 'error');
      return;
    }
    
    const newProductId = `p${Date.now()}`;
    addProduct({
      id: newProductId,
      categoryId: productCategory,
      name: productName,
      nameKu: productNameKu,
      nameAr: productNameAr,
      description: productDesc,
      descriptionKu: productDescKu,
      descriptionAr: productDescAr,
      barcode: productSku,
      sku: productSku,
      imageUrl: productImages[0] || 'https://images.unsplash.com/photo-1560243563-062bfc001d68?auto=format&fit=crop&q=80&w=800',
      images: productImages,
      price: parseFloat(productPrice),
      discountPrice: productDiscountPrice ? parseFloat(productDiscountPrice) : undefined,
      cost: parseFloat(productCost),
      gender: productGender,
      variations: variations.map((v, i) => ({
        ...v,
        id: `v${Date.now()}-${i}`,
        productId: newProductId
      }))
    });

    // Reset
    setProductName('');
    setProductCategory('');
    setProductNameKu('');
    setProductNameAr('');
    setProductDesc('');
    setProductDescKu('');
    setProductDescAr('');
    setProductPrice('');
    setProductDiscountPrice('');
    setProductCost('');
    setProductSku('');
    setProductImages([]);
    setVariations([]);
    toast('Product added successfully ✅');
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc || !expenseAmount || !expenseCategory) return;
    addExpense({
      description: expenseDesc,
      amount: parseFloat(expenseAmount),
      category: expenseCategory
    });
    setExpenseDesc('');
    setExpenseAmount('');
    setExpenseCategory('');
    toast('Expense added successfully ✅');
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const role = Number(addUserRole);
    const isPrivileged = [1, 2, 3].includes(role);

    if (!addUserName.trim()) {
      toast(language === 'ku' ? 'ناوی تەواو داخڵ بکە' : 'Please enter a full name', 'error');
      return;
    }
    // A customer only needs a phone number; admin/cashier/staff sign in with a
    // password, so those still require an email + password.
    if (!addUserEmail.trim() && !addUserPhone.trim()) {
      toast(language === 'ku' ? 'ئیمەیڵ یان ژمارەی مۆبایل پێویستە' : 'An email or a phone number is required', 'error');
      return;
    }
    if (isPrivileged && (!addUserEmail.trim() || !addUserPassword)) {
      toast(
        language === 'ku'
          ? 'بۆ ئەدمین/کاشێر/کارمەند ئیمەیڵ و وشەی تێپەڕ پێویستە'
          : 'Admin, cashier and staff accounts need an email and a password',
        'error'
      );
      return;
    }

    addUser({
      name: addUserName.trim(),
      email: addUserEmail.trim() || undefined,
      phone: addUserPhone.trim() || undefined,
      role,
      password: addUserPassword || undefined,
    });
    setAddUserName('');
    setAddUserEmail('');
    setAddUserPhone('');
    setAddUserRole(1);
    setAddUserPassword('');
    toast('User added successfully ✅');
  };

  const openPrintWindow = (title: string, htmlBody: string) => {
    const w = window.open('', '_blank', 'width=1000,height=800');
    if (!w) return;
    w.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 16px; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
            .label { border: 1px dashed #999; border-radius: 8px; padding: 10px; }
            .name { font-weight: 700; font-size: 14px; margin-bottom: 6px; }
            .muted { color: #666; font-size: 12px; }
            .price { font-weight: 700; margin-top: 6px; }
            .barcode-img { display: block; margin: 8px auto 0; max-width: 100%; }
            @media print { body { margin: 0; padding: 10px; } }
          </style>
        </head>
        <body>${htmlBody}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    // Wait for the barcode <img> (data URL) to finish painting before
    // printing — calling print() immediately can snapshot the window
    // before the image has rendered, leaving it blank in the printout.
    setTimeout(() => w.print(), 300);
  };

  const handlePrintLabels = () => {
    const product = products.find(p => String(p.id) === String(labelProductId));
    if (!product) {
      toast('Select a product first.', 'error');
      return;
    }
    const barcodeValue = product.barcode || product.sku || '';
    const barcodeDataUrl = generateBarcodeDataUrl(barcodeValue, { height: 40 });
    if (!barcodeDataUrl) {
      toast('This product has no barcode value to print.', 'error');
      return;
    }
    const copies = Math.max(1, Number(labelCopies || 1));
    const labels = Array.from({ length: copies }).map(() => `
      <div class="label">
        <div class="name">${product.name || ''}</div>
        <div class="price">Price: ${formatIQDLabel(Number(product.price || 0))}</div>
        <img class="barcode-img" src="${barcodeDataUrl}" alt="${barcodeValue}" />
      </div>
    `).join('');
    openPrintWindow('Product Labels', `<div class="grid">${labels}</div>`);
  };

  const handlePrintBarcodeStickers = () => {
    const product = products.find(p => String(p.id) === String(barcodeProductId));
    if (!product) {
      toast('Select a product first.', 'error');
      return;
    }
    const barcodeValue = product.barcode || product.sku || '';
    const barcodeDataUrl = generateBarcodeDataUrl(barcodeValue, { height: 60 });
    if (!barcodeDataUrl) {
      toast('This product has no barcode value to print.', 'error');
      return;
    }
    const copies = Math.max(1, Number(barcodeCopies || 1));
    const stickers = Array.from({ length: copies }).map(() => `
      <div class="label" style="text-align:center">
        <div class="name">${product.name || ''}</div>
        <img class="barcode-img" src="${barcodeDataUrl}" alt="${barcodeValue}" />
      </div>
    `).join('');
    openPrintWindow('Barcode Stickers', `<div class="grid">${stickers}</div>`);
  };

  const [isAlertDismissedToday, setIsAlertDismissedToday] = useState<boolean>(() => {
    try {
      const until = localStorage.getItem('low_stock_alert_dismissed_until');
      if (!until) return false;
      return Date.now() < Number(until);
    } catch (e) {
      return false;
    }
  });

  const handleDismissAlert = () => {
    try {
      const nextDay = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('low_stock_alert_dismissed_until', String(nextDay));
      setIsAlertDismissedToday(true);
    } catch (e) {}
  };

  const LowStockAlert = () => {
    if (lowStockProducts.length === 0) return null;
    if (activeTab !== 'products' && isAlertDismissedToday) return null;

    return (
      <div className="bg-amber-50/90 backdrop-blur-md border border-amber-200/80 p-4 rounded-3xl shadow-xs flex items-center justify-between gap-4 font-arabic animate-in fade-in duration-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            ⚠️
          </div>
          <div>
            <h4 className="text-xs font-black text-amber-950">
              {language === 'ku'
                ? `(${lowStockProducts.length}) بەرهەم ستۆکیان کەمە!`
                : language === 'ar'
                ? `(${lowStockProducts.length}) منتجات مخزونها منخفض!`
                : `(${lowStockProducts.length}) products low in stock!`}
            </h4>
            <p className="text-[11px] font-bold text-amber-800/90 mt-0.5">
              {language === 'ku'
                ? 'هەندێک بەرهەم جۆرەکانیان کەمتر لە ١٥ دانەیان تێدا ماوە. تکایە بە زوویی ستۆک پڕبکەرەوە.'
                : language === 'ar'
                ? 'بعض المنتجات تحتوي على تنويعات مخزونها أقل من 15 قطعة. يرجى إعادة التعبئة قريباً.'
                : 'Some products have variations with stock less than 15 units. Please restock soon.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('products')}
            className="px-4 py-1.5 bg-amber-900 text-white text-xs font-bold rounded-full hover:bg-amber-950 transition-all cursor-pointer shadow-2xs"
          >
            {language === 'ku' ? 'بینینی بەرهەمەکان' : language === 'ar' ? 'عرض المنتجات' : 'View Products'}
          </button>
          {activeTab !== 'products' && (
            <button
              onClick={handleDismissAlert}
              className="p-1.5 text-amber-700 hover:text-amber-950 rounded-full hover:bg-amber-200/50 transition-colors cursor-pointer"
              title={L("Dismiss for 24h")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen lg:h-screen bg-gradient-to-br from-[#D2E0F2] via-[#E8EEF8] to-[#DFE9F5] p-2.5 sm:p-5 lg:p-6 flex flex-col lg:flex-row gap-4 sm:gap-6 [&_button]:cursor-pointer [&_a]:cursor-pointer font-arabic text-slate-800 relative overflow-y-auto lg:overflow-hidden">
        <AdminNavigationSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isAdmin={isAdmin}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          newAndPendingOrdersCount={orderCounts.newAndPending}
          currentUser={currentUser}
        />

        {/* Main Content Area (Hidden Scrollbar like Sidebar) */}
        <div className="flex-1 min-w-0 w-full h-full overflow-y-auto hide-scrollbar space-y-6 pb-12">
          <AdminHeader onOpenMobileMenu={() => setIsMobileMenuOpen(true)} currentUser={currentUser} />
          <LowStockAlert />
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="space-y-8"
            >
          {activeTab === 'reports' && isAdmin && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
                {L("Profit Report")}
              </h2>
              <p className="text-sm text-slate-500">{L("Accurate revenue, cost of goods and profit computed on the server.")}</p>
              <AdminSalesReport />
            </div>
          )}

          {activeTab === 'overview' && isAdmin && (
            <AdminOverviewTab
              orderFilterPeriod={orderFilterPeriod}
              setOrderFilterPeriod={setOrderFilterPeriod}
              orderCounts={orderCounts}
              setActiveTab={setActiveTab}
              reportPeriod={reportPeriod}
              setReportPeriod={setReportPeriod}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              reportData={reportData}
              products={products}
              orders={orders}
              expenses={expenses}
            />
          )}

      {activeTab === 'calendar' && isAdmin && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in duration-200">
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" /> {L("Monthly Calendar Report")}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {L("A day-by-day interactive calendar displaying daily sales (revenue), order volume, and items sold.")}
              </p>
            </div>
            
            {/* Year/Month Navigation Controls */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                onClick={() => {
                  if (calendarMonth === 1) {
                    setCalendarMonth(12);
                    setCalendarYear(y => y - 1);
                  } else {
                    setCalendarMonth(m => m - 1);
                  }
                  setSelectedCalendarDay(null);
                }}
                className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
                title={L("Previous Month")}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <select
                value={calendarMonth}
                onChange={(e) => {
                  setCalendarMonth(parseInt(e.target.value, 10));
                  setSelectedCalendarDay(null);
                }}
                className="border border-slate-200 rounded-lg py-1.5 px-3 text-sm bg-white font-medium text-slate-700 shadow-sm outline-none focus:border-indigo-500"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx} value={idx + 1}>{L(name)}</option>
                ))}
              </select>

              <select
                value={calendarYear}
                onChange={(e) => {
                  setCalendarYear(parseInt(e.target.value, 10));
                  setSelectedCalendarDay(null);
                }}
                className="border border-slate-200 rounded-lg py-1.5 px-3 text-sm bg-white font-medium text-slate-700 shadow-sm outline-none focus:border-indigo-500"
              >
                {Array.from({ length: 5 }, (_, i) => 2023 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <button
                onClick={() => {
                  if (calendarMonth === 12) {
                    setCalendarMonth(1);
                    setCalendarYear(y => y + 1);
                  } else {
                    setCalendarMonth(m => m + 1);
                  }
                  setSelectedCalendarDay(null);
                }}
                className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
                title={L("Next Month")}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Monthly Aggregate Overview Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-200">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{L("Total Sales")}</p>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{formatIQDLabel(calendarMonthlySummary.revenue)}</h3>
                <p className="text-[11px] text-slate-500 mt-1">POS: {formatIQD(calendarMonthlySummary.posRevenue)} | Website: {formatIQD(calendarMonthlySummary.websiteRevenue)}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{L("Total Orders")}</p>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{calendarMonthlySummary.ordersCount}</h3>
                <p className="text-[11px] text-slate-500 mt-1">POS: {calendarMonthlySummary.posOrdersCount} | Website: {calendarMonthlySummary.websiteOrdersCount}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{L("Total Items Sold")}</p>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{calendarMonthlySummary.itemsSold}</h3>
              </div>
              <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
            </div>

        
          </div>

          {/* The Calendar Container */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 overflow-hidden animate-in fade-in duration-200">
            <div className="grid grid-cols-7 gap-px text-center border-b border-slate-100 pb-3 mb-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {L(d)}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {/* Previous Month Days (Faded) */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => {
                const prevMonthDayNum = daysInPrevMonth - firstDayOfWeek + idx + 1;
                return (
                  <div
                    key={`prev-${idx}`}
                    className="bg-slate-50/50 border border-slate-100/70 rounded-xl p-2 h-16 sm:h-24 text-slate-300 flex flex-col justify-between select-none opacity-40 cursor-not-allowed"
                  >
                    <span className="text-xs font-medium">{prevMonthDayNum}</span>
                  </div>
                );
              })}

              {/* Current Month Days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dayData = calendarDayStats[dayNum] || {
                  count: 0,
                  revenue: 0,
                  itemsSold: 0,
                  ordersList: [],
                  expenseAmt: 0,
                  cogs: 0,
                  posCount: 0,
                  websiteCount: 0,
                  posRevenue: 0,
                  websiteRevenue: 0,
                  posCogs: 0,
                  websiteCogs: 0,
                };
                const hasOrders = dayData.count > 0;
                
                // Check if it is today
                const today = new Date();
                const isToday = today.getDate() === dayNum && 
                                today.getMonth() + 1 === calendarMonth && 
                                today.getFullYear() === calendarYear;

                const isSelected = selectedCalendarDay === dayNum;

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => {
                      if (hasOrders) {
                        setSelectedCalendarDay(dayNum);
                      } else {
                        setSelectedCalendarDay(null);
                      }
                    }}
                    className={`border rounded-xl p-2.5 h-16 sm:h-24 transition-all duration-150 flex flex-col justify-between select-none relative group ${
                      hasOrders 
                        ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 border-indigo-100' 
                        : 'cursor-default border-slate-100'
                    } ${
                      isToday 
                        ? 'border-indigo-600 bg-indigo-50/25 ring-2 ring-indigo-600/10' 
                        : isSelected
                          ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                          : 'bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${
                        isToday 
                          ? 'text-indigo-600 bg-indigo-100/70 w-5 h-5 rounded-full flex items-center justify-center' 
                          : isSelected
                            ? 'text-indigo-700'
                            : 'text-slate-600'
                      }`}>
                        {dayNum}
                      </span>
                      {isToday && (
                        <span className="text-[9px] font-bold text-indigo-600 uppercase bg-indigo-100 px-1 rounded">{L("Today")}</span>
                      )}
                    </div>

                    {/* Content for days with orders */}
                    {hasOrders ? (
                      <>
                        <div className="hidden sm:block space-y-1 mt-1">
                          <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md py-0.5 px-1.5 inline-block truncate w-full shadow-sm">
                            {formatIQD(dayData.revenue)}
                          </div>
                          <div className="flex flex-col text-[10px] text-slate-500 font-medium leading-none space-y-0.5">
                            <span className="truncate">📦 {dayData.count} {dayData.count === 1 ? L('Order') : L('Orders')}</span>
                            <span className="truncate text-slate-400 text-[9px]">{L("POS")} {dayData.posCount} | {L("Web")} {dayData.websiteCount}</span>
                            <span className="truncate text-slate-400 text-[9px]">🛍️ {dayData.itemsSold} {L("Items")}</span>
                          </div>
                        </div>
                        {/* Mobile indicator */}
                        <div className="sm:hidden flex justify-center mt-auto pb-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm"></div>
                        </div>
                      </>
                    ) : (
                      <div className="hidden sm:block text-[10px] text-slate-300 italic"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Detailed Orders List for Selected Calendar Day (Modal) */}
          {selectedCalendarDay !== null && calendarDayStats[selectedCalendarDay] && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-6 shrink-0">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {L("Sales Details")} — {L(MONTH_NAMES[calendarMonth - 1])} {selectedCalendarDay}, {calendarYear}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {L("Summary of order count and money totals for POS and website.")}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCalendarDay(null)}
                    className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-colors flex-shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto">
                  {/* Stat cards for selected day */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                      <span className="text-xs text-emerald-800 font-semibold block uppercase tracking-wider">{L("Total Sales Amount")}</span>
                      <span className="text-xl font-extrabold text-emerald-700 mt-1 block">
                        {formatIQDLabel(calendarDayStats[selectedCalendarDay].revenue)}
                      </span>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                      <span className="text-xs text-indigo-800 font-semibold block uppercase tracking-wider">{L("Total Orders")}</span>
                      <span className="text-xl font-extrabold text-indigo-700 mt-1 block">
                        {calendarDayStats[selectedCalendarDay].count}
                      </span>
                    </div>
                    <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl">
                      <span className="text-xs text-sky-800 font-semibold block uppercase tracking-wider">{L("Total Cost (COGS)")}</span>
                      <span className="text-xl font-extrabold text-sky-700 mt-1 block">
                        {formatIQDLabel(calendarDayStats[selectedCalendarDay].cogs)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-4">
                      <h4 className="text-sm font-bold text-indigo-800 mb-3">{L("POS Orders")}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between"><span className="text-slate-600">{L("Orders")}</span><span className="font-bold text-slate-900">{calendarDayStats[selectedCalendarDay].posCount}</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-600">{L("Price Total")}</span><span className="font-bold text-slate-900">{formatIQDLabel(calendarDayStats[selectedCalendarDay].posRevenue)}</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-600">{L("Cost Total")}</span><span className="font-bold text-slate-900">{formatIQDLabel(calendarDayStats[selectedCalendarDay].posCogs)}</span></div>
                                              <div className="flex items-center justify-between"><span className="text-slate-600">{L("Net Profit")}</span><span className="font-bold text-slate-900">{formatIQDLabel(calendarDayStats[selectedCalendarDay].posRevenue - calendarDayStats[selectedCalendarDay].posCogs)}</span></div>

                      </div>
                    </div>
                    <div className="border border-emerald-100 bg-emerald-50/40 rounded-xl p-4">
                      <h4 className="text-sm font-bold text-emerald-800 mb-3">{L("Website Orders")}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between"><span className="text-slate-600">{L("Orders")}</span><span className="font-bold text-slate-900">{calendarDayStats[selectedCalendarDay].websiteCount}</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-600">{L("Price Total")}</span><span className="font-bold text-slate-900">{formatIQDLabel(calendarDayStats[selectedCalendarDay].websiteRevenue)}</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-600">{L("Cost Total")}</span><span className="font-bold text-slate-900">{formatIQDLabel(calendarDayStats[selectedCalendarDay].websiteCogs)}</span></div>
                                              <div className="flex items-center justify-between"><span className="text-slate-600">{L("Net Profit")}</span><span className="font-bold text-slate-900">{formatIQDLabel(calendarDayStats[selectedCalendarDay].websiteRevenue - calendarDayStats[selectedCalendarDay].websiteCogs)}</span></div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'inventory' && (
        <AdminInventoryTab
          products={products}
          categories={categories}
          updateProduct={updateProduct}
          toast={toast}
        />
      )}

      {activeTab === 'categories' && (
        <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-6 md:p-8 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.4)]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-900">{L("Categories Management")}</h2>
            <button
              onClick={() => setIsAddingCategory(true)}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold hover:bg-slate-800 transition-all flex items-center shadow-md text-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 mr-2" /> {L("Add Category")}
            </button>
          </div>

          {isAddingCategory && createPortal(
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 sm:p-6 overflow-y-auto font-arabic animate-fadeIn">
              <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl border border-slate-100 relative my-auto animate-scaleUp">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-extrabold text-slate-900">{L("Create New Category")}</h2>
                  <button type="button" onClick={() => setIsAddingCategory(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={(e) => { handleAddCategory(e); setIsAddingCategory(false); }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{L("Category Name (EN)")}</label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-slate-50/50 font-bold"
                      placeholder={L("e.g. Shoes")}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">{L("Category Name (KU)")}</label>
                      <input
                        type="text"
                        value={newCategoryNameKu}
                        onChange={(e) => setNewCategoryNameKu(e.target.value)}
                        className="w-full text-sm border border-slate-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-slate-50/50 font-bold"
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">{L("Category Name (AR)")}</label>
                      <input
                        type="text"
                        value={newCategoryNameAr}
                        onChange={(e) => setNewCategoryNameAr(e.target.value)}
                        className="w-full text-sm border border-slate-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-slate-50/50 font-bold"
                        dir="rtl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">{L("Category Icon")}</label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl max-h-48 overflow-y-auto">
                      {[
                        'Shirt', 'Baby', 'Sparkles', 'Gamepad', 'Footprints', 'Smile', 'CloudRain', 'Flame',
                        'ShoppingBag', 'Tag', 'Palette', 'Heart', 'Backpack', 'Crown', 'Car', 'Gift'
                      ].map((iconName) => (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setNewCategoryIcon(iconName)}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                            newCategoryIcon === iconName
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-600 scale-105 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                          title={iconName}
                        >
                          <CategoryIcon name={iconName} className="w-5 h-5 mb-1" />
                          <span className="text-[9px] font-bold truncate max-w-full">{iconName}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setIsAddingCategory(false)} className="px-5 py-2.5 text-xs font-bold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">{L("Cancel")}</button>
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer active:scale-95">{L("Save Category")}</button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

          <div className="mt-4">
            <h2 className="text-lg font-bold text-slate-900 mb-6">{L("Existing Categories")}</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((c, index) => (
                <span key={c.id || index} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-slate-100 text-slate-800 gap-2 border border-slate-200 font-medium group">
                  <CategoryIcon name={c.icon} className="w-4 h-4 text-indigo-600" />
                  <span>{getCategoryName(c)}</span>
                  {c.id && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingCategory(c)}
                        className="text-slate-400 hover:text-indigo-500 transition-colors p-0.5 ml-1 rounded"
                        title={L("Edit category")}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (await confirmDialog({
                            title: 'Delete category?',
                            message: `“${getCategoryName(c)}” will be removed. Products keep existing but lose this category.`,
                            confirmText: 'Delete', cancelText: 'Cancel', danger: true,
                          })) {
                            deleteCategory(c.id);
                            toast('Category deleted');
                          }
                        }}
                        className="text-slate-400 hover:text-red-500 transition-colors p-0.5 ml-1 rounded"
                        title={L("Delete category")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-6 md:p-8 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.4)]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <h2 className="text-xl font-black text-slate-900">{L("Products Management")}</h2>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter Dropdown */}
              <select
                value={selectedAdminCategory}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedAdminCategory(val);
                  refreshProducts(1, 10, {
                    categoryId: val === 'all' ? undefined : val,
                    sort: adminSortBy,
                    search: productSearchQuery
                  });
                }}
                className="py-2.5 px-3 bg-slate-100/90 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none cursor-pointer hover:bg-slate-200 transition-colors shadow-2xs font-arabic"
              >
                <option value="all">{language === 'ku' ? 'هەموو بەشەکان' : language === 'ar' ? 'جميع الأقسام' : 'All Categories'}</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {(language === 'ku' && c.nameKu) || (language === 'ar' && c.nameAr) || c.name}
                  </option>
                ))}
              </select>

              {/* Date Added / Sort Dropdown */}
              <select
                value={adminSortBy}
                onChange={(e) => {
                  const val = e.target.value;
                  setAdminSortBy(val);
                  refreshProducts(1, 10, {
                    categoryId: selectedAdminCategory === 'all' ? undefined : selectedAdminCategory,
                    sort: val,
                    search: productSearchQuery
                  });
                }}
                className="py-2.5 px-3 bg-slate-100/90 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none cursor-pointer hover:bg-slate-200 transition-colors shadow-2xs font-arabic"
              >
                <option value="newest">{language === 'ku' ? 'نوێترین بەروار (بەرواری زیادکردن)' : language === 'ar' ? 'الأحدث تاريخاً' : 'Newest First'}</option>
                <option value="oldest">{language === 'ku' ? 'کۆنترین بەروار' : language === 'ar' ? 'الأقدم تاريخاً' : 'Oldest First'}</option>
                <option value="price_asc">{language === 'ku' ? 'نرخ: لە کەمەوە بۆ زۆر' : 'Price: Low to High'}</option>
                <option value="price_desc">{language === 'ku' ? 'نرخ: لە زۆرەوە بۆ کەم' : 'Price: High to Low'}</option>
              </select>

              {/* Bulk Stock Restock Button */}
              <button
                onClick={() => setIsBulkStockModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-full font-extrabold transition-all flex items-center shadow-md text-xs shrink-0 cursor-pointer active:scale-95 gap-1.5"
                title={language === 'ku' ? 'ڕێکخستنەوەی کۆمەڵەیی ستۆکی چەند ئایتمێک پێکەوە' : 'Bulk Stock Adjustment'}
              >
                <Boxes className="w-4 h-4 text-indigo-200" />
                <span>{language === 'ku' ? 'ڕێکخستنەوەی کۆمەڵەیی ستۆک' : language === 'ar' ? 'تعديل المخزون الجماعي' : 'Bulk Stock Restock'}</span>
              </button>

              {/* Search Bar */}
              <div className="relative max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={L("Search products...")}
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              {/* Add Product Button */}
              <button
                onClick={() => setIsAddingProduct(true)}
                className="bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold hover:bg-slate-800 transition-all flex items-center shadow-md text-xs shrink-0 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 mr-2" /> {L("Add Product")}
              </button>
            </div>
          </div>


          <div className="mt-4">

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 font-arabic">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-600">
                    <th className="px-4 py-3.5 text-right text-xs font-black uppercase tracking-wider">{L("Product")}</th>
                    <th className="px-4 py-3.5 text-center text-xs font-black uppercase tracking-wider">{L("Barcode")}</th>
                    <th className="px-4 py-3.5 text-center text-xs font-black uppercase tracking-wider">{L("Stock")}</th>
                    <th className="px-4 py-3.5 text-center text-xs font-black uppercase tracking-wider">{L("Cost")}</th>
                    <th className="px-4 py-3.5 text-center text-xs font-black uppercase tracking-wider">{L("Price")}</th>
                    <th className="px-4 py-3.5 text-center text-xs font-black uppercase tracking-wider">{L("Gross Margin")}</th>
                    <th className="px-4 py-3.5 text-center text-xs font-black uppercase tracking-wider">{L("Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {products.map((product, index) => {
                    const totalStock = (product.variations || []).reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
                    const cost = Number(product.cost || 0);
                    const margin = Number(product.price) > 0 ? Math.round(((Number(product.price) - cost) / Number(product.price)) * 100) : 0;
                    const nameDisplay = (language === 'ku' && product.nameKu) || (language === 'ar' && product.nameAr) || product.name;
                    return (
                      <tr key={product.id || index} className="hover:bg-indigo-50/40 transition-colors cursor-pointer" onClick={() => setSelectedPreviewProduct(product)}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-slate-900 text-right">
                          <div className="flex items-center gap-3 justify-start">
                            <img src={product.imageUrl} alt={nameDisplay} className="w-11 h-11 object-cover rounded-xl border border-slate-200 shrink-0 shadow-xs" />
                            <span className="truncate max-w-[200px]">{nameDisplay}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 font-mono text-center">{product.barcode || product.sku || '—'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${totalStock < 10 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                            {totalStock} {language === 'ku' ? 'دانە' : language === 'ar' ? 'قطعة' : 'in stock'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-slate-600 text-center">{formatIQDLabel(cost)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-black text-indigo-600 text-center">
                          {product.discountPrice ? (
                            <div className="flex flex-col items-center">
                              <span className="line-through text-slate-400 font-normal text-xs">{formatIQDLabel(Number(product.price || 0))}</span>
                              <span className="text-rose-600 font-black">{formatIQDLabel(Number(product.discountPrice))}</span>
                            </div>
                          ) : (
                            formatIQDLabel(Number(product.price || 0))
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black ${margin >= 40 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {margin}%
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 text-center" onClick={(e) => e.stopPropagation()}>
                          {product.id && (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingProduct(product)}
                                className="text-slate-500 hover:text-indigo-600 p-2 rounded-xl hover:bg-indigo-50 transition-colors cursor-pointer"
                                title={L("Edit Product")}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (await confirmDialog({
                                    title: L('Delete Product'),
                                    message: language === 'ku'
                                      ? `“${product.name}” لەگەڵ هەموو جۆرەکان و پێداچوونەوەکانی بە تەواوی دەسڕدرێتەوە.`
                                      : language === 'ar'
                                      ? `سيتم حذف “${product.name}” وجميع تنويعاته وتقييماته نهائياً.`
                                      : `“${product.name}” and all its variations & reviews will be permanently deleted. This cannot be undone.`,
                                    confirmText: L('Delete'), cancelText: L('Cancel'), danger: true,
                                  })) {
                                    deleteProduct(product.id);
                                    toast(L('Product deleted'));
                                  }
                                }}
                                className="text-slate-500 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                                title={L("Delete Product")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination meta={productsPagination} onPageChange={(page) => refreshProducts(page, 10)} />
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <AdminOrdersTab
          orders={orders}
          orderCounts={orderCounts}
          updateOrderStatus={updateOrderStatus}
          deleteOrder={deleteOrder}
          ordersPagination={ordersPagination}
          refreshOrders={refreshOrders}
          confirmDialog={confirmDialog}
          toast={toast}
        />
      )}

      {activeTab === 'pos-sales' && (
        <AdminPosSalesTab
          orders={orders}
          deleteOrder={deleteOrder}
          refreshOrders={refreshOrders}
          confirmDialog={confirmDialog}
          toast={toast}
        />
      )}

      {activeTab === 'users' && (
        <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-6 md:p-8 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.4)] overflow-x-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-900">{L("Users Management")}</h2>
            <button
              onClick={() => setIsAddingUser(true)}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold hover:bg-slate-800 transition-all flex items-center shadow-md text-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 mr-2" /> {L("Add User")}
            </button>
          </div>

          {isAddingUser && createPortal(
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 sm:p-6 overflow-y-auto font-arabic animate-fadeIn">
              <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl border border-slate-100 relative my-auto animate-scaleUp">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">{L("Create New User")}</h2>
                    <p className="text-xs text-slate-500 mt-1">{L("Create New Admin or Staff User")}</p>
                  </div>
                  <button type="button" onClick={() => setIsAddingUser(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={(e) => { handleAddUser(e); setIsAddingUser(false); }} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">{L("Full Name")}</label>
                      <input
                        type="text"
                        required
                        placeholder={language === 'ku' ? 'ئاوات حەسەن' : 'John Doe'}
                        value={addUserName}
                        onChange={(e) => setAddUserName(e.target.value)}
                        className="w-full text-sm border border-slate-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-slate-50/50 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {L("Email")}
                        {![1, 2, 3].includes(Number(addUserRole)) && (
                          <span className="text-slate-400 font-medium"> ({language === 'ku' ? 'ئارەزوومەندانە' : 'optional'})</span>
                        )}
                      </label>
                      <input
                        type="email"
                        required={[1, 2, 3].includes(Number(addUserRole))}
                        placeholder="john@example.com"
                        value={addUserEmail}
                        onChange={(e) => setAddUserEmail(e.target.value)}
                        className="w-full text-sm border border-slate-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-slate-50/50 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {language === 'ku' ? 'ژمارەی مۆبایل' : language === 'ar' ? 'رقم الهاتف' : 'Mobile number'}
                      </label>
                      <input
                        type="tel"
                        placeholder="07501234567"
                        value={addUserPhone}
                        onChange={(e) => setAddUserPhone(e.target.value)}
                        className="w-full text-sm border border-slate-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-slate-50/50 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {L("Password")}
                        {![1, 2, 3].includes(Number(addUserRole)) && (
                          <span className="text-slate-400 font-medium"> ({language === 'ku' ? 'ئارەزوومەندانە' : 'optional'})</span>
                        )}
                      </label>
                      <input
                        type="password"
                        required={[1, 2, 3].includes(Number(addUserRole))}
                        minLength={8}
                        placeholder="••••••••"
                        value={addUserPassword}
                        onChange={(e) => setAddUserPassword(e.target.value)}
                        className="w-full text-sm border border-slate-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-slate-50/50 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">{L("Role")}</label>
                      <select
                        value={addUserRole}
                        onChange={(e) => setAddUserRole(Number(e.target.value))}
                        className="w-full text-sm border border-slate-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-slate-50/50 font-bold"
                      >
                        <option value={1}>{language === 'ku' ? '1 - بەڕێوەبەر (Admin)' : '1 - Admin'}</option>
                        <option value={2}>{language === 'ku' ? '2 - کاشێر (Cashier)' : '2 - Cashier'}</option>
                        <option value={3}>{language === 'ku' ? '3 - کارمەند (Staff)' : '3 - Staff'}</option>
                        <option value={0}>{language === 'ku' ? '0 - کڕیار (Customer)' : '0 - Customer'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setIsAddingUser(false)} className="px-5 py-2.5 text-xs font-bold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">{L("Cancel")}</button>
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer active:scale-95">
                      {L("Create User") || 'دروستکردنی بەکارهێنەر'}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

          <div className="overflow-x-auto mt-4">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Name")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Email")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Role")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Joined")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user, index) => (
                <tr key={user.id || index}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{user.name}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{user.email && !user.email.includes('@phone.user') ? user.email : '-'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                    {(() => {
                      const roleInfo = getRoleInfo(user.role, language);
                      return (
                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${roleInfo.badgeClass}`}>
                          {roleInfo.label} ({roleInfo.id})
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{user.joinDate}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                    {user.id && (
                      <button
                        type="button"
                        onClick={() => setEditingUser(user)}
                        className="text-slate-400 hover:text-indigo-500 transition-colors p-1 rounded hover:bg-indigo-50 mr-2"
                        title={L("Edit User")}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {user.id && currentUser && String(user.id) !== String(currentUser.id) && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (await confirmDialog({
                            title: 'Delete user?',
                            message: `“${user.name}” will be permanently deleted. This cannot be undone.`,
                            confirmText: 'Delete', cancelText: 'Cancel', danger: true,
                          })) {
                            deleteUser(user.id);
                            toast('User deleted');
                          }
                        }}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                        title={L("Delete User")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-6 md:p-8 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.4)]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-900">{L("Expenses Management")}</h2>
            <button
              onClick={() => setIsAddingExpense(true)}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold hover:bg-slate-800 transition-all flex items-center shadow-md text-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 mr-2" /> {L("Add Expense")}
            </button>
          </div>

          {isAddingExpense && createPortal(
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 sm:p-6 overflow-y-auto font-arabic animate-fadeIn">
              <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl border border-slate-100 relative my-auto animate-scaleUp">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-extrabold text-slate-900">{L("Record New Expense")}</h2>
                  <button type="button" onClick={() => setIsAddingExpense(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={(e) => { handleAddExpense(e); setIsAddingExpense(false); }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{L("Description")}</label>
                    <input type="text" required value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} className="w-full text-sm border border-slate-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-slate-50/50 font-bold" placeholder={L("e.g. Hosting")} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">{L("Amount")}</label>
                      <input type="number" step="0.01" required value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="w-full text-sm border border-slate-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-slate-50/50 font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">{L("Category")}</label>
                      <input type="text" required value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full text-sm border border-slate-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-slate-50/50 font-bold" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setIsAddingExpense(false)} className="px-5 py-2.5 text-xs font-bold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">{L("Cancel")}</button>
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95">
                      <Save className="w-4 h-4" /> <span>{L("Save Expense")}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

          <div className="overflow-x-auto mt-4">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Date")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Description")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Category")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Amount")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {expenses.map((expense, index) => (
                  <tr key={expense.id || index}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{expense.date}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">{expense.description}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                      <span className="px-2 py-1 text-xs rounded-full bg-slate-100">{expense.category}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                      -{Number(expense.amount || 0)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                      {expense.id && (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingExpense(expense)}
                            className="text-slate-400 hover:text-indigo-500 transition-colors p-1 rounded hover:bg-indigo-50 mr-2"
                            title={L("Edit Expense")}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (await confirmDialog({
                                title: L('Delete Expense'),
                                message: language === 'ku'
                                  ? `“${expense.description}” دەسڕدرێتەوە.`
                                  : language === 'ar'
                                  ? `سيتم حذف “${expense.description}”.`
                                  : `“${expense.description}” will be deleted.`,
                                confirmText: L('Delete'), cancelText: L('Cancel'), danger: true,
                              })) {
                                deleteExpense(expense.id);
                                toast(L('Expense deleted'));
                              }
                            }}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                            title={L("Delete Expense")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination meta={expensesPagination} onPageChange={(page) => refreshExpenses(page, 10)} />
          </div>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-6 md:p-8 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.4)] overflow-x-auto">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">{L("Product Reviews")}</h2>
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Product")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Author")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Rating")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Comment")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reviews.map((review, index) => (
                <tr key={`${review.productId || ''}-${review.id || ''}-${index}`}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{review.productName || review.productId}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">{review.author || review.customerName}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div className="flex text-yellow-400">
                      {[...Array(review.rating || 5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500 max-w-xs truncate" title={review.comment}>{review.comment}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{review.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={reviewsPagination} onPageChange={(page) => refreshReviews(page, 10)} />
        </div>
      )}

      
        {activeTab === 'coupons' && (
          <div className="space-y-8 animate-fade-in">
            {/* Dashboard Stats Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 rounded-2xl p-6 border border-indigo-100">
              <div className="flex items-center gap-3 mb-2">
                <Ticket className="w-6 h-6 text-indigo-600 animate-pulse" />
                <h2 className="text-xl font-bold text-slate-900">{L("Coupon Performance Dashboard")}</h2>
              </div>
              <p className="text-sm text-slate-600">{L("Track real-time conversion rates, savings performance, and code popularity over time.")}</p>
            </div>

            {/* Date Filtering Bar */}
            <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-indigo-500" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{L("Filter Statistics")}</h3>
                  <p className="text-xs text-slate-500">{L("Analyze performance across defined periods")}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Preset Selectors */}
                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                  {[
                    { id: 'all', label: L('All Time') },
                    { id: '7days', label: L('Last Week') },
                    { id: '30days', label: L('Last Month') },
                    { id: 'thisMonth', label: L('This Month') },
                    { id: 'custom', label: L('Custom Range') },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setCouponDatePreset(preset.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        couponDatePreset === preset.id
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Range Picker */}
                {couponDatePreset === 'custom' && (
                  <div className="flex items-center gap-2 animate-fade-in">
                    <input
                      type="date"
                      value={couponStartDate}
                      onChange={(e) => setCouponStartDate(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 hover:bg-slate-100 transition-colors"
                      placeholder={L("Start Date")}
                    />
                    <span className="text-slate-400 text-xs font-medium">{L("to")}</span>
                    <input
                      type="date"
                      value={couponEndDate}
                      onChange={(e) => setCouponEndDate(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 hover:bg-slate-100 transition-colors"
                      placeholder={L("End Date")}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* KPI Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow transition-shadow">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{L("Total Savings Given")}</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">{formatIQDLabel(couponStats.totalDiscountGiven)}</p>
                <p className="text-xs text-slate-500 mt-1">{L("Direct customer savings")}</p>
              </div>

              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow transition-shadow">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{L("Total Coupon Uses")}</span>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">{couponStats.totalCouponUses} {L("times")}</p>
                <p className="text-xs text-slate-500 mt-1">{L("Across all campaigns")}</p>
              </div>

              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow transition-shadow">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{L("Promo Conversion")}</span>
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">{couponStats.conversionRate.toFixed(1)}%</p>
                <p className="text-xs text-slate-500 mt-1">{L("Of total checkout orders")}</p>
              </div>

              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow transition-shadow">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{L("Avg. Savings Rate")}</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <Percent className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">{couponStats.avgDiscountPercentage.toFixed(1)}%</p>
                <p className="text-xs text-slate-500 mt-1">{L("Weighted discount average")}</p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Chart 1: Performance by Code */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800">{L("Discount & Uses by Coupon Code")}</h3>
                  <span className="text-xs font-normal text-slate-500">{L("Volume and Savings value")}</span>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={couponStats.performanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="code" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any, name: any) => {
                          if (name === "totalDiscount") return [formatIQDLabel(Number(value)), L("Savings Given")];
                          if (name === "count") return [value, L("Uses")];
                          return [value, name];
                        }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" fontSize={12} />
                      <Bar dataKey="totalDiscount" name={L("Savings Given")} fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="count" name={L("Uses")} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Coupon Timeline Usage */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800">{L("Coupon Usage Over Time")}</h3>
                  <span className="text-xs font-normal text-slate-500">{L("Daily coupon activity")}</span>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={couponStats.timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorDiscount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any, name: any) => {
                          if (name === "discount") return [formatIQDLabel(Number(value)), L("Savings")];
                          if (name === "count") return [value, L("Uses")];
                          return [value, name];
                        }}
                      />
                      <Area type="monotone" dataKey="discount" name={L("Savings Value")} stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorDiscount)" />
                      <Area type="monotone" dataKey="count" name={L("Uses Count")} stroke="#10b981" strokeWidth={2} fill="transparent" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Savings Contribution (Pie Chart) & Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Pie Chart: Savings Contribution */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 lg:col-span-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800">{L("Savings Share")}</h3>
                  <span className="text-xs font-normal text-slate-500">{L("By Coupon Code")}</span>
                </div>
                <div className="h-64 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={couponStats.performanceData.filter(d => d.totalDiscount > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="totalDiscount"
                        nameKey="code"
                      >
                        {couponStats.performanceData.map((entry, index) => {
                          const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];
                          return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                        })}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => formatIQDLabel(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute text-center pointer-events-none">
                    <p className="text-2xl font-black text-slate-900">{couponStats.totalCouponUses}</p>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{L("Total Uses")}</p>
                  </div>
                </div>
                <div className="space-y-2 mt-2">
                  {couponStats.performanceData.slice(0, 4).map((entry, index) => {
                    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];
                    const pct = couponStats.totalDiscountGiven > 0 ? (entry.totalDiscount / couponStats.totalDiscountGiven) * 100 : 0;
                    return (
                      <div key={entry.code} className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-slate-700">{entry.code}</span>
                        </div>
                        <span className="text-slate-500">{pct.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Conversion and campaign highlights table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800">{L("Campaign Impact Summary")}</h3>
                  <span className="text-xs font-normal text-slate-500">{L("Sales generated by coupon")}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead>
                      <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 font-semibold">{L("Campaign / Code")}</th>
                        <th className="pb-3 font-semibold text-center">{L("Uses")}</th>
                        <th className="pb-3 font-semibold text-right">{L("Avg. Order Value")}</th>
                        <th className="pb-3 font-semibold text-right">{L("Sales Driven")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {couponStats.performanceData.map((item) => {
                        const avgOrderValue = item.count > 0 ? item.totalSales / item.count : 0;
                        return (
                          <tr key={item.code} className="text-slate-700 hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 font-semibold text-slate-900">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 mr-2 border border-indigo-100">
                                {item.code}
                              </span>
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${item.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} title={item.isActive ? 'Active' : 'Inactive'} />
                            </td>
                            <td className="py-3 text-center text-slate-500 font-medium">{item.count}</td>
                            <td className="py-3 text-right text-slate-500 font-medium">{formatIQDLabel(avgOrderValue)}</td>
                            <td className="py-3 text-right font-bold text-slate-950">{formatIQDLabel(item.totalSales)}</td>
                          </tr>
                        );
                      })}
                      {couponStats.performanceData.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400 text-xs font-medium">{L("No campaigns found.")}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Split row: Left - Create/Edit Form, Right - Existing List */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
              {/* Coupon Management Form (Form is 5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
                <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  {editingCouponId ? L('Edit Coupon') : L('Create New Coupon')}
                </h3>
                <form onSubmit={handleAddCoupon} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">{L("Coupon Code")} *</label>
                      <input
                        required
                        type="text"
                        value={couponCode}
                        onChange={(e) => setAdminCouponCode(e.target.value.toUpperCase())}
                        placeholder={L("e.g. SUMMER20")}
                        className="w-full border border-slate-200 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase font-mono text-sm placeholder:text-slate-400 placeholder:font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">{L("Discount Percentage (%)")} *</label>
                      <input
                        required
                        type="number"
                        min="1"
                        max="100"
                        value={couponDiscount}
                        onChange={(e) => setCouponDiscount(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">{L("Start Date (Optional)")}</label>
                        <input
                          type="date"
                          value={couponFormStartDate}
                          onChange={(e) => setCouponFormStartDate(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">{L("End Date (Optional)")}</label>
                        <input
                          type="date"
                          value={couponFormEndDate}
                          onChange={(e) => setCouponFormEndDate(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-center pt-2">
                      <input
                        type="checkbox"
                        id="couponIsActive"
                        checked={couponIsActive}
                        onChange={(e) => setCouponIsActive(e.target.checked)}
                        className="h-4.5 w-4.5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded-md cursor-pointer"
                      />
                      <label htmlFor="couponIsActive" className="ml-2.5 block text-sm font-semibold text-slate-700 cursor-pointer">
                        {L("Mark as Active Promotion")}
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    {editingCouponId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCouponId(null);
                          setAdminCouponCode('');
                          setCouponDiscount('');
                          setCouponIsActive(true);
                          setCouponFormStartDate('');
                          setCouponFormEndDate('');
                        }}
                        className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                      >
                        {L("Cancel")}
                      </button>
                    )}
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 grow lg:grow-0"
                    >
                      <Save className="w-4 h-4" /> {editingCouponId ? L('Update Promotion') : L('Activate Coupon')}
                    </button>
                  </div>
                </form>
              </div>

              {/* Existing Coupons Table (Table is 7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">{L("Configured Coupons")}</h3>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{coupons.length} {L("Active Promotions")}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{L("Code")}</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{L("Discount")}</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{L("Status")}</th>
                        <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{L("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {coupons.map((coupon) => (
                        <tr key={coupon.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-mono font-bold text-slate-900">{coupon.code}</div>
                            {(coupon.startDate || coupon.endDate) && (
                              <div className="text-[11px] text-slate-500 font-sans font-medium mt-1">
                                📅 {coupon.startDate || L('Anytime')} {L('to')} {coupon.endDate || L('Anytime')}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-indigo-600">{coupon.discountPercentage}% OFF</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${coupon.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${coupon.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {coupon.isActive ? L('Active') : L('Inactive')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button 
                              type="button"
                              onClick={() => handleEditCoupon(coupon)} 
                              className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50/50 transition-all inline-flex items-center mr-2"
                              title={L("Edit Promotion")}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => deleteCoupon(coupon.id)} 
                              className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50/50 transition-all inline-flex items-center"
                              title={L("Delete Promotion")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {coupons.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400 font-semibold">
                            {L("No coupons configured yet. Add one above to get started!")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'banner' && (
          <div className="space-y-8">
            <AdminHeroSettings />
            <AdminPromoBannerSettings />
          </div>
        )}

      {activeTab === 'settings' && isAdmin && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-50 to-sky-50 p-6 rounded-2xl border border-indigo-100">
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Settings className="w-6 h-6 text-indigo-600" /> {L("Settings")}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {L("Manage store settings, contact details, and social media channels.")}
            </p>
          </div>
          <AdminStoreSettings />
        </div>
      )}

      {activeTab === 'labels' && isAdmin && (
        <AdminLabelsTab products={products} />
      )}

      {activeTab === 'barcode-stickers' && isAdmin && (
        <AdminBarcodeTab products={products} />
      )}

      {activeTab === 'translations' && (
        <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-6 md:p-8 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.4)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Languages className="w-6 h-6 text-indigo-600" />
              Application Translations
            </h2>
            <div className="relative flex-1 max-w-md">
              <input 
                type="text" 
                placeholder={L("Search by key or text...")} 
                value={translationSearch}
                onChange={(e) => setTranslationSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900">{L("Important Note")}</p>
              <p className="text-xs text-amber-800 mt-1">Changes made here are stored in your browser's local storage and will apply to all users visiting this specific application instance. For permanent source code changes, update the translations file manually.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider w-1/4">Key</th>
                  <th className="px-6 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider w-1/4">{L("English")}</th>
                  <th className="px-6 py-3 text-right text-xs font-black text-slate-500 uppercase tracking-wider w-1/4">Kurdish (کوردی)</th>
                  <th className="px-6 py-3 text-right text-xs font-black text-slate-500 uppercase tracking-wider w-1/4">Arabic (العربية)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {Object.keys(allTranslations.en)
                  .filter(key => 
                    key.toLowerCase().includes(translationSearch.toLowerCase()) ||
                    (allTranslations.en as any)[key].toLowerCase().includes(translationSearch.toLowerCase()) ||
                    (allTranslations.ku as any)[key]?.toLowerCase().includes(translationSearch.toLowerCase()) ||
                    (allTranslations.ar as any)[key]?.toLowerCase().includes(translationSearch.toLowerCase())
                  )
                  .map((key) => (
                  <tr key={key} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                        {key}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="text" 
                        value={(allTranslations.en as any)[key] || ''} 
                        onChange={(e) => updateTranslation('en', key, e.target.value)}
                        className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 outline-none text-sm py-1 font-medium text-slate-700 transition-all"
                      />
                    </td>
                    <td className="px-6 py-4" dir="rtl">
                      <input 
                        type="text" 
                        value={(allTranslations.ku as any)[key] || ''} 
                        onChange={(e) => updateTranslation('ku', key, e.target.value)}
                        className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 outline-none text-sm py-1 font-medium text-slate-700 transition-all text-right font-arabic"
                      />
                    </td>
                    <td className="px-6 py-4" dir="rtl">
                      <input 
                        type="text" 
                        value={(allTranslations.ar as any)[key] || ''} 
                        onChange={(e) => updateTranslation('ar', key, e.target.value)}
                        className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 outline-none text-sm py-1 font-medium text-slate-700 transition-all text-right font-arabic"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
            </motion.div>
          </AnimatePresence>
        </div>
      <AdminEditModals
        editingCategory={editingCategory}
        setEditingCategory={setEditingCategory}
        editingProduct={editingProduct}
        setEditingProduct={setEditingProduct}
        editingExpense={editingExpense}
        setEditingExpense={setEditingExpense}
        editingUser={editingUser}
        setEditingUser={setEditingUser}
      />

      {isAddingProduct && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-3xl sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 border-b pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                {L("Create New Product")}
              </h2>
              <button onClick={() => setIsAddingProduct(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => { handleAddProduct(e); setIsAddingProduct(false); }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{L("Product Name (EN)")} *</label>
                  <input
                    required
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{L("Category")} *</label>
                  <select
                    required
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">{L("Select a category")}</option>
                    {categories.map((c, index) => (
                      <option key={c.id || index} value={c.id}>{getCategoryName(c)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{L("Gender")}</label>
                  <select
                    value={productGender}
                    onChange={(e) => setProductGender(Number(e.target.value) as 0 | 1 | 2)}
                    className="w-full border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={0}>{L("Both")}</option>
                    <option value={1}>{L("Boy")}</option>
                    <option value={2}>{L("Girl")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{L("Product Name (KU)")}</label>
                  <input
                    type="text"
                    value={productNameKu}
                    onChange={(e) => setProductNameKu(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{L("Product Name (AR)")}</label>
                  <input
                    type="text"
                    value={productNameAr}
                    onChange={(e) => setProductNameAr(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    dir="rtl"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">{L("Description (EN)")}</label>
                  <textarea
                    value={productDesc}
                    onChange={(e) => setProductDesc(e.target.value)}
                    rows={3}
                    className="w-full border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">{L("Description (KU)")}</label>
                  <textarea
                    value={productDescKu}
                    onChange={(e) => setProductDescKu(e.target.value)}
                    rows={3}
                    className="w-full border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    dir="rtl"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">{L("Description (AR)")}</label>
                  <textarea
                    value={productDescAr}
                    onChange={(e) => setProductDescAr(e.target.value)}
                    rows={3}
                    className="w-full border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    dir="rtl"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:col-span-2">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{L("Price")} *</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{L("Discount Price (Optional)")}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={productDiscountPrice}
                      onChange={(e) => setProductDiscountPrice(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{L("Cost")} *</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={productCost}
                      onChange={(e) => setProductCost(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">{L("Barcode")}</label>
                  <input
                    type="text"
                    value={productSku}
                    onChange={(e) => setProductSku(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                </div>
                <div className="md:col-span-2 pt-2">
                  <ProductImageEditor
                    images={productImages}
                    primaryImageUrl={productImages[0] || ''}
                    onChange={(newImages) => {
                      setProductImages(newImages);
                    }}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-bold text-slate-900">{L("Variations (Color/Size/Stock)")}</h3>
                  <button
                    type="button"
                    onClick={handleAddVariation}
                    className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center bg-indigo-50 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 mr-1" /> {L("Add Variation")}
                  </button>
                </div>

                {variations.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">{L("No variations added. Add variations to manage stock per color and size.")}</p>
                ) : (
                  <div className="space-y-3">
                    {variations.map((v, index) => (
                      <div key={index} className="flex gap-4 items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <div className="flex-1">
                          <select
                            value={v.color || ""}
                            onChange={(e) => updateVariation(index, 'color', e.target.value)}
                            className="w-full border border-slate-300 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
                          >
                            <option value="">{L("Select Color")}</option>
                            {STANDARD_COLORS.map(color => (
                              <option key={color} value={color}>{color}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <select
                            value={v.size || ""}
                            onChange={(e) => updateVariation(index, 'size', e.target.value)}
                            className="w-full border border-slate-300 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
                          >
                            <option value="">{L("Select Size")}</option>
                            {STANDARD_SIZES.map(size => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            placeholder={L("Stock")}
                            value={v.stockQuantity ?? ""}
                            onChange={(e) => updateVariation(index, 'stockQuantity', parseInt(e.target.value) || 0)}
                            className="w-full border border-slate-300 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setVariations(variations.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700 font-bold text-sm p-2 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-slate-200 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddingProduct(false)} className="px-6 py-2.5 text-slate-700 font-bold border border-slate-300 rounded-xl hover:bg-slate-50 transition-all cursor-pointer">{L("Cancel")}</button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center shadow-md cursor-pointer"
                >
                  <Save className="w-5 h-5 mr-2" /> {L("Save Product")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Preview" className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" />
          </div>
        </div>
      )}

      {/* Product Detail Preview Modal */}
      {selectedPreviewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 ease-out">
            <button 
              onClick={() => setSelectedPreviewProduct(null)}
              className="absolute top-4 right-4 z-10 p-2.5 bg-white/80 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full shadow-sm transition-all focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/2 aspect-4/5 bg-slate-50">
                <img 
                  src={selectedPreviewProduct.imageUrl} 
                  alt={selectedPreviewProduct.name} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="p-6 md:w-1/2 flex flex-col justify-between">
                <div>
                  <span className="text-xs bg-indigo-50 text-indigo-700 font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider">
                    {Number(selectedPreviewProduct.gender) === 1 ? 'Boy' : Number(selectedPreviewProduct.gender) === 2 ? 'Girl' : 'Both'}
                  </span>
                  <h3 className="text-2xl font-bold font-display text-slate-900 mt-4 mb-2 leading-tight">
                    {selectedPreviewProduct.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold font-mono">
                    Barcode: {selectedPreviewProduct.barcode || 'N/A'}
                  </p>
                  <p className="text-sm text-slate-600 mt-4 leading-relaxed italic">
                    {selectedPreviewProduct.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-slate-500 font-medium">{L("Retail Price")}</span>
                    <span className="text-2xl font-black text-indigo-600">{formatIQDLabel(Number(selectedPreviewProduct.price || 0))}</span>
                  </div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-sm text-slate-500 font-medium">{L("Catalog Cost")}</span>
                    <span className="text-base font-bold text-slate-700">{formatIQDLabel(Number(selectedPreviewProduct.cost || 0))}</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{L("Available Variations")}</h4>
                    {(!selectedPreviewProduct.variations || selectedPreviewProduct.variations.length === 0) ? (
                      <p className="text-xs text-slate-400 italic">{L("No variations added.")}</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {selectedPreviewProduct.variations.map((v) => (
                          <span 
                            key={v.id} 
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-700"
                          >
                            <span className="w-2.5 h-2.5 rounded-full border border-slate-200" style={{ backgroundColor: getColorHex(v.color) }} />
                            <span>{v.size}</span>
                            <span className="text-slate-400">({v.stockQuantity})</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Stock Restock & Adjustment Modal */}
      <BulkStockModal
        isOpen={isBulkStockModalOpen}
        onClose={() => setIsBulkStockModalOpen(false)}
        products={products}
        categories={categories}
        updateProduct={updateProduct}
        toast={toast}
      />
    </div>
  );
};
