import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Boxes, Package, DollarSign, TrendingUp, AlertTriangle, Search, 
  Filter, ArrowUpDown, Edit3, Printer, Check, X, ShieldAlert, 
  Sparkles, Layers, RefreshCw, BarChart2, PieChart as PieChartIcon
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatIQD, formatIQDLabel } from '../../utils/currency';
import { getColorHex } from '../../utils/colors';
import { Product, Category } from '../../types';
import { LOW_STOCK_THRESHOLD } from '../../utils/inventory';
import { Pagination } from '../Pagination';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Legend, Cell, PieChart, Pie
} from 'recharts';

/** Page sizes offered for the detail table. */
const ROWS_PER_PAGE_OPTIONS = [25, 50, 100, 250];

interface AdminInventoryTabProps {
  /** Products already in the store — used only until the full list arrives. */
  products: Product[];
  categories: Category[];
  updateProduct: (product: Product) => void;
  toast: (msg: string, type?: 'success' | 'error') => void;
  /** Loads every product across all pages. */
  fetchAllProducts: () => Promise<Product[]>;
  /** Bumped by the store after any product create/update/delete. */
  productsRevision: number;
}

export const AdminInventoryTab: React.FC<AdminInventoryTabProps> = ({
  products,
  categories,
  updateProduct,
  toast,
  fetchAllProducts,
  productsRevision,
}) => {
  const { language } = useLanguage();

  /**
   * An audit has to cover the WHOLE warehouse.
   *
   * This tab used to read the store's `products`, which is one page of the
   * paginated catalogue — so "capital invested", "retail value" and "expected
   * profit" only added up the handful of products that happened to be loaded,
   * and the numbers changed every time someone paged the products screen.
   */
  const [allProducts, setAllProducts] = useState<Product[] | null>(null);
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadAll = useCallback(async () => {
    setIsLoadingAll(true);
    setLoadFailed(false);
    try {
      const list = await fetchAllProducts();
      setAllProducts(list);
    } catch (err) {
      console.warn('Inventory audit could not load the full catalogue:', err);
      setLoadFailed(true);
    } finally {
      setIsLoadingAll(false);
    }
  }, [fetchAllProducts]);

  useEffect(() => {
    loadAll();
  }, [loadAll, productsRevision]);

  // Fall back to the paginated list only while the full one is loading.
  const auditProducts = allProducts ?? products;
  const isPartialData = allProducts === null;

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'missingCost'>('all');
  const [sortBy, setSortBy] = useState<'highestCost' | 'highestRetail' | 'highestProfit' | 'highestStock' | 'lowestStock'>('highestCost');

  // Table paging. The KPI cards and charts above still cover the ENTIRE
  // warehouse — only the detail table is paged, because a shop with a thousand
  // products cannot render (or scroll) a thousand rows at once.
  const [tablePage, setTablePage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);
  // Turning the page from the bottom should bring the table header back into
  // view instead of leaving the admin stranded at the end of the new page.
  const tableTopRef = useRef<HTMLDivElement | null>(null);
  // Set only while the print dialog is open, so the printout is not paged.
  const [printingAll, setPrintingAll] = useState(false);

  // Edit Cost Modal State
  const [editingCostProduct, setEditingCostProduct] = useState<Product | null>(null);
  const [newCostInput, setNewCostInput] = useState<string>('');

  // Translations helper
  const L = (ku: string, ar: string, en: string) => {
    if (language === 'ku') return ku;
    if (language === 'ar') return ar;
    return en;
  };

  // Helper map for Category Name
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(c => {
      const name = language === 'ku' ? (c.nameKu || c.name) : language === 'ar' ? (c.nameAr || c.name) : c.name;
      map.set(String(c.id), name);
    });
    return map;
  }, [categories, language]);

  // Calculated inventory data per product
  const processedProducts = useMemo(() => {
    return auditProducts.map(product => {
      const variations = product.variations || [];
      const variationsCount = variations.length;
      const stockPieces = variations.reduce((sum, v) => sum + (Number(v.stockQuantity) || 0), 0);
      const unitCost = Number(product.cost || 0);
      const unitPrice = Number(product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.price);
      
      const totalCostValue = stockPieces * unitCost;
      const totalRetailValue = stockPieces * unitPrice;
      const expectedProfit = totalRetailValue - totalCostValue;
      const profitMargin = totalRetailValue > 0 ? Math.round((expectedProfit / totalRetailValue) * 100) : 0;

      // Extract unique colors for display
      const rawColors = variations
        .map(v => v.color)
        .filter((c): c is string => Boolean(c && typeof c === 'string' && c.trim().length > 0));
      const uniqueColors = Array.from(new Set(rawColors.map(c => c.trim())));

      return {
        product,
        variationsCount,
        stockPieces,
        unitCost,
        unitPrice,
        totalCostValue,
        totalRetailValue,
        expectedProfit,
        profitMargin,
        uniqueColors,
        categoryName: categoryMap.get(String(product.categoryId)) || L('پۆل نادیارە', 'فئة غير معروفة', 'Unknown Category'),
        hasMissingCost: unitCost === 0,
        isLowStock: stockPieces > 0 && stockPieces <= LOW_STOCK_THRESHOLD,
        isOutOfStock: stockPieces === 0,
      };
    });
  }, [auditProducts, categoryMap, language]);

  // Overall Global Inventory Audit Stats
  const globalStats = useMemo(() => {
    let totalPieces = 0;
    let totalVariationsCount = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let missingCostCount = 0;

    processedProducts.forEach(item => {
      totalPieces += item.stockPieces;
      totalVariationsCount += item.variationsCount;
      totalCostValue += item.totalCostValue;
      totalRetailValue += item.totalRetailValue;
      if (item.isLowStock) lowStockCount++;
      if (item.isOutOfStock) outOfStockCount++;
      if (item.hasMissingCost) missingCostCount++;
    });

    const expectedProfit = totalRetailValue - totalCostValue;
    const profitMargin = totalRetailValue > 0 ? ((expectedProfit / totalRetailValue) * 100).toFixed(1) : '0';

    return {
      totalProductsCount: auditProducts.length,
      totalVariationsCount,
      totalPieces,
      totalCostValue,
      totalRetailValue,
      expectedProfit,
      profitMargin,
      lowStockCount,
      outOfStockCount,
      missingCostCount,
    };
  }, [processedProducts, auditProducts.length]);

  // Category Breakdown for Charts
  const categoryChartData = useMemo(() => {
    const map = new Map<string, { categoryName: string; totalCost: number; totalRetail: number; totalPieces: number; productCount: number }>();

    processedProducts.forEach(item => {
      const catId = String(item.product.categoryId ?? 'other');
      const catName = item.categoryName;
      const current = map.get(catId) || { categoryName: catName, totalCost: 0, totalRetail: 0, totalPieces: 0, productCount: 0 };
      
      current.totalCost += item.totalCostValue;
      current.totalRetail += item.totalRetailValue;
      current.totalPieces += item.stockPieces;
      current.productCount += 1;
      
      map.set(catId, current);
    });

    return Array.from(map.values())
      .filter(c => c.totalPieces > 0 || c.totalRetail > 0)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 8);
  }, [processedProducts]);

  // Top 5 Valued Products Chart Data
  const topValuedProductsChart = useMemo(() => {
    return [...processedProducts]
      .sort((a, b) => b.totalCostValue - a.totalCostValue)
      .slice(0, 6)
      .map(p => ({
        name: (() => {
          const full = (language === 'ku' ? p.product.nameKu : language === 'ar' ? p.product.nameAr : p.product.name)
            || p.product.name || '';
          return full.length > 16 ? full.slice(0, 16) + '…' : full;
        })(),
        totalCost: p.totalCostValue,
        totalRetail: p.totalRetailValue,
        pieces: p.stockPieces,
      }));
  }, [processedProducts, language]);

  // Filtered and Sorted Table Products
  const filteredProducts = useMemo(() => {
    let result = [...processedProducts];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => {
        const name = (item.product.name || '').toLowerCase();
        const nameKu = (item.product.nameKu || '').toLowerCase();
        const nameAr = (item.product.nameAr || '').toLowerCase();
        const barcode = (item.product.barcode || '').toLowerCase();
        const sku = (item.product.sku || '').toLowerCase();
        return name.includes(q) || nameKu.includes(q) || nameAr.includes(q) || barcode.includes(q) || sku.includes(q);
      });
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(item => item.product.categoryId === selectedCategory);
    }

    // Stock Status filter
    if (stockFilter === 'low') {
      result = result.filter(item => item.isLowStock);
    } else if (stockFilter === 'out') {
      result = result.filter(item => item.isOutOfStock);
    } else if (stockFilter === 'missingCost') {
      result = result.filter(item => item.hasMissingCost);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'highestCost') return b.totalCostValue - a.totalCostValue;
      if (sortBy === 'highestRetail') return b.totalRetailValue - a.totalRetailValue;
      if (sortBy === 'highestProfit') return b.expectedProfit - a.expectedProfit;
      if (sortBy === 'highestStock') return b.stockPieces - a.stockPieces;
      if (sortBy === 'lowestStock') return a.stockPieces - b.stockPieces;
      return 0;
    });

    return result;
  }, [processedProducts, searchQuery, selectedCategory, stockFilter, sortBy]);

  /** Totals for the current filter — computed over every matching row, not just the visible page. */
  const filteredTotals = useMemo(() => filteredProducts.reduce(
    (acc, item) => ({
      variations: acc.variations + item.variationsCount,
      pieces: acc.pieces + item.stockPieces,
      cost: acc.cost + item.totalCostValue,
      retail: acc.retail + item.totalRetailValue,
    }),
    { variations: 0, pieces: 0, cost: 0, retail: 0 }
  ), [filteredProducts]);

  const totalTablePages = Math.max(1, Math.ceil(filteredProducts.length / rowsPerPage));

  // Filters changed (or the list shrank): go back to a page that exists.
  useEffect(() => {
    setTablePage(1);
  }, [searchQuery, selectedCategory, stockFilter, sortBy, rowsPerPage]);

  const safePage = Math.min(tablePage, totalTablePages);

  const visibleProducts = useMemo(
    () => (printingAll
      ? filteredProducts
      : filteredProducts.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)),
    [filteredProducts, safePage, rowsPerPage, printingAll]
  );

  const rangeStart = filteredProducts.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const rangeEnd = Math.min(safePage * rowsPerPage, filteredProducts.length);

  // Handle Save Cost Edit
  const handleSaveCost = () => {
    if (!editingCostProduct) return;
    const costNum = parseFloat(newCostInput);
    if (isNaN(costNum) || costNum < 0) {
      toast(L('تکایە بڕی تێچووی دروست بنووسە', 'يرجى إدخال تكلفة صالحة', 'Please enter a valid cost amount'), 'error');
      return;
    }

    const updated = {
      ...editingCostProduct,
      cost: costNum,
    };

    updateProduct(updated);
    toast(L('تێچووی پرۆدەکت نوێکرایەوە ✅', 'تم تحديث تكلفة المنتج ✅', 'Product cost updated successfully ✅'), 'success');
    setEditingCostProduct(null);
  };

  /**
   * Print the audit. Paging is a screen concern — a printed stock-take has to
   * list every filtered row, so expand the table first and restore it after.
   */
  const handlePrintAudit = () => {
    setPrintingAll(true);
    // Give React a frame to render the full table before the print dialog
    // snapshots the page.
    setTimeout(() => {
      window.print();
      setPrintingAll(false);
    }, 150);
  };

  // Color Palette for Pie/Bar charts
  const CHART_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'];

  return (
    <div className="space-y-8 font-arabic pb-12">
      {/* Top Header & Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-rose-500 to-emerald-500 opacity-80" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold mb-3">
              <Boxes className="w-4 h-4 text-indigo-400" />
              <span>{L('سیستەمی جەردی کۆگا و بەهای سەرمایە', 'نظام جرد المستودع وتقييم المخزون', 'Inventory Valuation & Warehouse Audit')}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {L('جەردی کۆگا (Inventory Audit)', 'جرد المستودع', 'Warehouse Inventory Audit')}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              {L(
                'ئاماری ڕاستەوخۆی بەهای تێچوو، بەهای فرۆشتن، ژمارەی کاڵاکان لە کۆگا و پێشبینی قازانجی گشتی.',
                'إحصائيات مباشرة لتكلفة المخزون، قيمة البيع، عدد القطع في المستودع والأرباح المتوقعة.',
                'Live stock valuations, total cost vs retail value, item counts, and projected gross profit.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 print:hidden">
            <button
              onClick={loadAll}
              disabled={isLoadingAll}
              title={L('نوێکردنەوەی داتای جەرد', 'تحديث بيانات الجرد', 'Reload audit data')}
              className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/20 flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 text-indigo-300 ${isLoadingAll ? 'animate-spin' : ''}`} />
              <span>{L('نوێکردنەوە', 'تحديث', 'Refresh')}</span>
            </button>
            <button
              onClick={handlePrintAudit}
              className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/20 flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4 text-rose-300" />
              <span>{L('چاپکردنی ڕاپۆرت', 'طباعة التقرير', 'Print Audit Report')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* The totals below are only meaningful once every product is loaded. */}
      {(isPartialData || loadFailed) && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-bold print:hidden ${
          loadFailed ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-slate-100 border-slate-200 text-slate-700'
        }`}>
          {loadFailed ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <RefreshCw className="w-5 h-5 shrink-0 animate-spin" />}
          <span>
            {loadFailed
              ? L(
                  'هێنانی هەموو بەرهەمەکان سەرکەوتوو نەبوو — ئەم ژمارانە تەواو نین. تکایە نوێی بکەرەوە.',
                  'تعذر تحميل جميع المنتجات — هذه الأرقام غير كاملة. يرجى التحديث.',
                  'Could not load the full catalogue — these totals are incomplete. Please refresh.'
                )
              : L(
                  'هێنانی هەموو بەرهەمەکانی کۆگا... ژمارەکان هێشتا تەواو نین.',
                  'جاري تحميل جميع منتجات المستودع... الأرقام ليست نهائية بعد.',
                  'Loading the whole warehouse… these totals are not final yet.'
                )}
          </span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Card 1: Total Physical Stock & Item Variations */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
              {L('ژمارەی پارچە و ئایتمەکانی کۆگا', 'إجمالي القطع والأنواع', 'Total Physical Stock & Items')}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-slate-900 dir-ltr">
              {globalStats.totalPieces.toLocaleString()}
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {L('پارچە کاڵا (Physical Pieces)', 'قطعة', 'pieces')}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span>{L('جۆری جیاوازی ئایتم (SKUs / Variations):', 'أنواع الأصناف المتنوعة:', 'Item Variations (SKUs):')}</span>
              <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                {globalStats.totalVariationsCount.toLocaleString()} {L('ئایتم', 'صنف', 'items')}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>{L('مۆدێلی سەرەکیی پرۆدەکت:', 'المنتجات الرئيسية:', 'Product Models:')}</span>
              <span className="font-bold text-slate-700">{globalStats.totalProductsCount} {L('مۆدێل', 'موديل', 'models')}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Cost Value */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
              {L('کۆی بەهای تێچوو (Cost)', 'إجمالي قيمة التكلفة', 'Total Inventory Cost')}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            {formatIQDLabel(globalStats.totalCostValue)}
          </h3>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{L('سەرمایەی وەستاو لە کۆگا', 'رأس المال في المستودع', 'Capital Invested')}</span>
            <span className="font-extrabold text-amber-600">
              {globalStats.missingCostCount > 0 
                ? L(`${globalStats.missingCostCount} بێ تێچوو!`, `${globalStats.missingCostCount} بدون تكلفة!`, `${globalStats.missingCostCount} no cost`)
                : '✓ ' + L('تەواوە', 'مكتمل', 'Complete')}
            </span>
          </div>
        </div>

        {/* Card 3: Total Selling Retail Value */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
              {L('کۆی بەهای فرۆشتن (Retail)', 'إجمالي قيمة البيع', 'Total Retail Selling Value')}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              <BarChart2 className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            {formatIQDLabel(globalStats.totalRetailValue)}
          </h3>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{L('بەهای بڕیارلێدراو بۆ فرۆشتن', 'القيمة الإجمالية للبيع', 'Total Retail Price')}</span>
            <span className="font-bold text-emerald-600">100%</span>
          </div>
        </div>

        {/* Card 4: Expected Profit & Margin */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-3xl shadow-md hover:shadow-lg transition-all relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-xs font-black text-emerald-100 uppercase tracking-wider">
              {L('پێشبینی قازانجی کۆگا', 'الأرباح المتوقعة', 'Expected Gross Profit')}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 text-white flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white relative z-10">
            {formatIQDLabel(globalStats.expectedProfit)}
          </h3>
          <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-emerald-100 relative z-10">
            <span>{L('ڕێژەی قازانج (Profit Margin):', 'نسبة هامش الربح:', 'Profit Margin:')}</span>
            <span className="font-black text-white text-sm bg-white/20 px-2 py-0.5 rounded-full">
              {globalStats.profitMargin}%
            </span>
          </div>
        </div>
      </div>

      {/* Warnings & Alerts Banner if Low Stock or Missing Cost */}
      {(globalStats.lowStockCount > 0 || globalStats.missingCostCount > 0 || globalStats.outOfStockCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {globalStats.outOfStockCount > 0 && (
            <button
              onClick={() => setStockFilter('out')}
              className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold hover:bg-rose-100 transition-all text-right cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>
                  {L(
                    `${globalStats.outOfStockCount} پرۆدەکت تەواوبووە (ڕەسید ٠)`,
                    `${globalStats.outOfStockCount} منتجات منتهية من المخزون`,
                    `${globalStats.outOfStockCount} Out of stock products`
                  )}
                </span>
              </div>
              <span className="text-xs bg-rose-600 text-white px-2.5 py-1 rounded-full font-black">
                {L('بینین', 'عرض', 'View')}
              </span>
            </button>
          )}

          {globalStats.lowStockCount > 0 && (
            <button
              onClick={() => setStockFilter('low')}
              className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold hover:bg-amber-100 transition-all text-right cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  {L(
                    `${globalStats.lowStockCount} پرۆدەکت کەمیی کۆگای هەیە (${LOW_STOCK_THRESHOLD} یان کەمتر)`,
                    `${globalStats.lowStockCount} منتجات بنسبة مخزون منخفضة`,
                    `${globalStats.lowStockCount} Low stock items`
                  )}
                </span>
              </div>
              <span className="text-xs bg-amber-600 text-white px-2.5 py-1 rounded-full font-black">
                {L('بینین', 'عرض', 'View')}
              </span>
            </button>
          )}

          {globalStats.missingCostCount > 0 && (
            <button
              onClick={() => setStockFilter('missingCost')}
              className="flex items-center justify-between p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-800 text-sm font-bold hover:bg-purple-100 transition-all text-right cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-purple-600 shrink-0" />
                <span>
                  {L(
                    `${globalStats.missingCostCount} پرۆدەکت بێ چەسپاندنی تێچووە!`,
                    `${globalStats.missingCostCount} منتجات بدون تحديد سعر التكلفة`,
                    `${globalStats.missingCostCount} Products missing cost price`
                  )}
                </span>
              </div>
              <span className="text-xs bg-purple-600 text-white px-2.5 py-1 rounded-full font-black">
                {L('ڕاستکردنەوە', 'تصحيح', 'Fix')}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
        {/* Chart 1: Inventory Valuation by Category (Cost vs Retail) */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-6 rounded-[2rem] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {L('بەهای تێچوو و فرۆشتن بەپێی پۆلەکان', 'قيمة التكلفة والبيع حسب الفئات', 'Valuation Comparison by Category')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {L('بەراوردی بڕی سەرمایە لە بەرامبەر بەهای فرۆشتن', 'مقارنة التكلفة ورأس المال بمقابل قيمة البيع', 'Cost investment vs retail return per category')}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <BarChart2 className="w-5 h-5" />
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="categoryName" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                <RechartsTooltip 
                  formatter={(value: any) => [formatIQDLabel(Number(value)), '']}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontFamily: 'sans-serif' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="totalCost" name={L('کۆی تێچوو', 'إجمالي التكلفة', 'Total Cost')} fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="totalRetail" name={L('کۆی فرۆشتن', 'إجمالي البيع', 'Total Retail')} fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Top Valued Products in Stock */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-6 rounded-[2rem] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {L('بەرزترین پرۆدەکتەکان لە بەهای سەرمایە', 'أعلى المنتجات في قيمة المخزون', 'Top Products by Total Cost Value')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {L('ئەو کاڵایانەی زۆرترین سەرمایەیان تێدا قەتیس بووە', 'المنتجات التي تحتوي على أعلى رأس مال', 'Products absorbing the highest inventory capital')}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={topValuedProductsChart} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={120} />
                <RechartsTooltip 
                  formatter={(value: any) => [formatIQDLabel(Number(value)), '']}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontFamily: 'sans-serif' }}
                />
                <Bar dataKey="totalCost" name={L('بەهای تێچوو', 'قيمة التكلفة', 'Cost Value')} fill="#ec4899" radius={[0, 6, 6, 0]}>
                  {topValuedProductsChart.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Table Controls & Filters */}
      <div ref={tableTopRef} className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-6 rounded-[2.5rem] shadow-sm space-y-6 scroll-mt-24">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={L('گەڕان بەپێی ناو، بارکۆد یان SKU...', 'البحث حسب الاسم أو الباركود...', 'Search by name, barcode, SKU...')}
              className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
            >
              <option value="all">{L('هەموو پۆلەکان', 'جميع الفئات', 'All Categories')}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {language === 'ku' ? (c.nameKu || c.name) : language === 'ar' ? (c.nameAr || c.name) : c.name}
                </option>
              ))}
            </select>

            {/* Stock Filter */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
            >
              <option value="all">{L('هەموو ڕەوشەکانی کۆگا', 'جميع حالات المخزون', 'All Stock Statuses')}</option>
              <option value="low">{L(`⚠️ کەمیی کۆگا (${LOW_STOCK_THRESHOLD} یان کەمتر)`, '⚠️ مخزون منخفض', `Low Stock (<= ${LOW_STOCK_THRESHOLD})`)}</option>
              <option value="out">{L('🚫 تەواوبوو (٠)', '🚫 نفد المخزون', 'Out of Stock (0)')}</option>
              <option value="missingCost">{L('❗ بێ تێچوو', '❗ بدون تكلفة', 'Missing Cost Price')}</option>
            </select>

            {/* Sorting */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
            >
              <option value="highestCost">{L('بەرزترین تێچوو', 'الأعلى تكلفة', 'Highest Cost Value')}</option>
              <option value="highestRetail">{L('بەرزترین نرخ فرۆشتن', 'الأعلى سعر بيع', 'Highest Retail Value')}</option>
              <option value="highestProfit">{L('بەرزترین قازانج', 'الأعلى ربحاً', 'Highest Profit')}</option>
              <option value="highestStock">{L('زۆربەی پارچە', 'الأكثر قطعة', 'Highest Stock Pieces')}</option>
              <option value="lowestStock">{L('کەمترین پارچە', 'الأقل قطعة', 'Lowest Stock Pieces')}</option>
            </select>
          </div>
        </div>

        {/* Results Bar Summary — counts cover the whole filter, not just this page */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs font-bold text-slate-600 bg-slate-100/70 p-3 rounded-2xl px-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              {filteredProducts.length > 0
                ? L(
                    `پیشاندانی ${rangeStart}–${rangeEnd} لە ${filteredProducts.length} پرۆدەکت`,
                    `عرض ${rangeStart}–${rangeEnd} من ${filteredProducts.length} منتج`,
                    `Showing ${rangeStart}–${rangeEnd} of ${filteredProducts.length} products`
                  )
                : L('هیچ ئەنجامێک نییە', 'لا توجد نتائج', 'No results')}
            </span>
            <span className="text-slate-400">
              {L(
                `${filteredTotals.variations} ئایتم · ${filteredTotals.pieces.toLocaleString()} پارچە`,
                `${filteredTotals.variations} صنف · ${filteredTotals.pieces.toLocaleString()} قطعة`,
                `${filteredTotals.variations} variations · ${filteredTotals.pieces.toLocaleString()} pieces`
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              {L('کۆی تێچووی دیاریکراو:', 'إجمالي التكلفة المحددة:', 'Filtered Total Cost:')}{' '}
              <strong className="text-indigo-700 font-black">
                {formatIQDLabel(filteredTotals.cost)}
              </strong>
            </span>

            <label className="flex items-center gap-2 print:hidden">
              <span className="text-slate-500">{L('ڕیز لە پەڕەیەکدا:', 'صفوف بالصفحة:', 'Rows per page:')}</span>
              <select
                value={rowsPerPage}
                onChange={e => setRowsPerPage(Number(e.target.value))}
                className="py-1.5 px-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer hover:border-indigo-300 transition-colors"
              >
                {ROWS_PER_PAGE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Detailed Valuation Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-900 text-white text-xs uppercase tracking-wider font-bold">
              <tr>
                <th className="px-4 py-3.5 rounded-tr-xl">{L('پرۆدەکت / کد', 'المنتج / الكود', 'Product / Code')}</th>
                <th className="px-3 py-3.5">{L('پۆل', 'الفئة', 'Category')}</th>
                <th className="px-3 py-3.5 text-center">{L('ڕەنگەکان', 'الألوان', 'Colors')}</th>
                <th className="px-3 py-3.5 text-center">{L('پارچە لە کۆگا', 'القطع بالمخزن', 'Stock Qty')}</th>
                <th className="px-3 py-3.5">{L('تێچوو (Cost)', 'التكلفة', 'Unit Cost')}</th>
                <th className="px-3 py-3.5">{L('نرخی فرۆشتن', 'سعر البيع', 'Retail Price')}</th>
                <th className="px-3 py-3.5">{L('کۆی بەهای تێچوو', 'إجمالي التكلفة', 'Total Cost')}</th>
                <th className="px-3 py-3.5">{L('کۆی بەهای فرۆشتن', 'إجمالي البيع', 'Total Retail')}</th>
                <th className="px-3 py-3.5">{L('قازانجی پێشبینیکراو', 'الربح المتوقع', 'Expected Profit')}</th>
                <th className="px-4 py-3.5 text-center rounded-tl-xl">{L('دەستکاری تێچوو', 'تعديل التكلفة', 'Action')}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <Boxes className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                    <p className="font-bold text-slate-600">
                      {L('هیچ پرۆدەکتێک بەپێی ئەم فلتەرانە نەدۆزرایەوە', 'لم يتم العثور على منتجات تطابق البحث', 'No products found matching filters')}
                    </p>
                  </td>
                </tr>
              ) : (
                visibleProducts.map(item => {
                  const p = item.product;
                  return (
                    <tr 
                      key={p.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${item.hasMissingCost ? 'bg-purple-50/30' : item.isOutOfStock ? 'bg-rose-50/30' : ''}`}
                    >
                      {/* Product Name & Image */}
                      <td className="px-4 py-3 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              loading="lazy"
                              className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-50"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl border border-slate-200 shrink-0 bg-slate-100 flex items-center justify-center text-slate-300">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate text-sm">
                              {language === 'ku' ? p.nameKu || p.name : language === 'ar' ? p.nameAr || p.name : p.name}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                              {p.barcode && <span>{p.barcode}</span>}
                              {p.sku && <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{p.sku}</span>}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-3 py-3 text-xs font-bold text-slate-600 whitespace-nowrap">
                        {item.categoryName}
                      </td>

                      {/* Colors */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap max-w-[80px] mx-auto">
                          {item.uniqueColors.slice(0, 4).map((c, idx) => (
                            <span
                              key={idx}
                              className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block shrink-0 shadow-2xs"
                              style={{ backgroundColor: getColorHex(c) }}
                              title={c}
                            />
                          ))}
                          {item.uniqueColors.length > 4 && (
                            <span className="text-[10px] text-slate-400 font-bold">+{item.uniqueColors.length - 4}</span>
                          )}
                          {item.uniqueColors.length === 0 && <span className="text-slate-300 text-xs">-</span>}
                        </div>
                      </td>

                      {/* Stock Quantity */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span 
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black dir-ltr ${
                            item.isOutOfStock 
                              ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                              : item.isLowStock 
                              ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {item.stockPieces} {L('دانە', 'قطع', 'pcs')}
                        </span>
                      </td>

                      {/* Unit Cost */}
                      <td className="px-3 py-3 font-mono font-bold whitespace-nowrap">
                        {item.hasMissingCost ? (
                          <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-md border border-purple-200">
                            {L('نادیارە (0)', 'غير محدد', 'Missing')}
                          </span>
                        ) : (
                          <span className="text-slate-700">{formatIQDLabel(item.unitCost)}</span>
                        )}
                      </td>

                      {/* Unit Price */}
                      <td className="px-3 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatIQDLabel(item.unitPrice)}
                      </td>

                      {/* Total Cost Value */}
                      <td className="px-3 py-3 font-mono font-black text-amber-700 whitespace-nowrap">
                        {formatIQDLabel(item.totalCostValue)}
                      </td>

                      {/* Total Retail Value */}
                      <td className="px-3 py-3 font-mono font-black text-emerald-700 whitespace-nowrap">
                        {formatIQDLabel(item.totalRetailValue)}
                      </td>

                      {/* Expected Profit */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="font-mono font-black text-slate-900">
                          {formatIQDLabel(item.expectedProfit)}
                        </div>
                        <div className="text-[10px] font-bold text-emerald-600 dir-ltr">
                          {item.profitMargin}% {L('قازانج', 'ربح', 'margin')}
                        </div>
                      </td>

                      {/* Action: Quick Edit Cost */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            setEditingCostProduct(p);
                            setNewCostInput(String(p.cost || ''));
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors border border-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
                          title={L('دەستکاری تێچوو', 'تعديل التكلفة', 'Edit Cost')}
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{L('تێچوو', 'التكلفة', 'Cost')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Only the table is paged; the audit totals above cover everything. */}
        <div className="print:hidden">
          <Pagination
            currentPage={safePage}
            totalPages={totalTablePages}
            onPageChange={page => {
              setTablePage(Math.min(Math.max(1, page), totalTablePages));
              tableTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
        </div>
      </div>

      {/* Edit Cost Modal */}
      {editingCostProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 font-arabic animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">
                {L('دەستکاریکردنی تێچووی پرۆدەکت', 'تعديل تكلفة المنتج', 'Edit Product Cost Price')}
              </h3>
              <button
                onClick={() => setEditingCostProduct(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <img
                  src={editingCostProduct.imageUrl}
                  alt={editingCostProduct.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <p className="font-bold text-slate-900 text-sm">
                    {language === 'ku' ? editingCostProduct.nameKu || editingCostProduct.name : editingCostProduct.name}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    {L('نرخی فرۆشتن:', 'سعر البيع:', 'Retail Price:')} {formatIQDLabel(editingCostProduct.price)}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {L('بڕی تێچوو بۆ یەک دانە (Cost in IQD)', 'التكلفة للقطعة الواحدة', 'Unit Cost Price (IQD)')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={newCostInput}
                    onChange={(e) => setNewCostInput(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-base font-bold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    IQD
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {L(
                    'تێچووی کڕین یان دروستکردنی پرۆدەکتەکە بنووسە بۆ ئەوەی بەهای جەردەکە و قازانج بە دروستی ئەژمار بکرێت.',
                    'أدخل تكلفة الشراء أو التصنيع لحساب القيمة الإجمالية للمخزون والأرباح بشكل صحيح.',
                    'Enter cost price to calculate accurate inventory valuation and profit margins.'
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveCost}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{L('پاشەکەوتکردنی تێچوو', 'حفظ التكلفة', 'Save Cost')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCostProduct(null)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition-all cursor-pointer"
                >
                  {L('پاشگەزبوونەوە', 'إلغاء', 'Cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
