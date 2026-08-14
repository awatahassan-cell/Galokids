import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, Plus, Search, Filter, Calendar, DollarSign, 
  CreditCard, CheckCircle2, AlertCircle, Clock, FileText, 
  Printer, Trash2, ChevronDown, ChevronUp, Eye, X, 
  Package, ArrowRight, TrendingUp, RefreshCw, Layers,
  Phone, User as UserIcon, Check, FileSpreadsheet
} from 'lucide-react';
import { useStore } from '../../store';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminTr } from '../../i18n/adminDict';
import { formatIQDLabel, formatIQD } from '../../utils/currency';
import { Product, ProductVariation, Purchase, PurchaseItem } from '../../types';
import { getColorHex } from '../../utils/colors';
import { shopToday } from '../../utils/shopTime';
import { downloadXlsx } from '../../utils/exportExcel';

interface PurchaseDraftItem {
  productId: string | number;
  productVariationId: string | number;
  productName: string;
  productImage?: string;
  variationColor?: string;
  variationSize?: string;
  variationBarcode?: string;
  currentStock: number;
  quantity: number;
  previousCost: number;
  costPrice: number;
  previousPrice: number;
  retailPrice: number;
}

export const AdminPurchasesTab: React.FC = () => {
  const { 
    purchases, 
    fetchPurchases, 
    addPurchase, 
    deletePurchase, 
    isPurchasesLoading, 
    products, 
    categories,
    fetchAllProducts 
  } = useStore();

  const { language } = useLanguage();
  const L = (key: string) => adminTr(key, language);
  const isRTL = language === 'ar' || language === 'ku';

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal States
  const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(false);
  const [selectedPurchaseDetails, setSelectedPurchaseDetails] = useState<Purchase | null>(null);
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | number | null>(null);

  // New Purchase Form State
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(shopToday());
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'unpaid'>('paid');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Product Selection for New Purchase
  const [draftItems, setDraftItems] = useState<PurchaseDraftItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  useEffect(() => {
    fetchPurchases();
    if (products.length === 0) {
      fetchAllProducts();
    }
  }, []);

  // Filtered Purchases List
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchInv = (p.invoiceNumber || '').toLowerCase().includes(q);
        const matchSup = (p.supplierName || '').toLowerCase().includes(q);
        const matchPhone = (p.supplierPhone || '').toLowerCase().includes(q);
        const matchNotes = (p.notes || '').toLowerCase().includes(q);
        if (!matchInv && !matchSup && !matchPhone && !matchNotes) return false;
      }

      if (statusFilter !== 'all' && p.paymentStatus !== statusFilter) {
        return false;
      }

      if (startDate && p.purchaseDate < startDate) return false;
      if (endDate && p.purchaseDate > endDate) return false;

      return true;
    });
  }, [purchases, searchQuery, statusFilter, startDate, endDate]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalPurchasesAmount = 0;
    let totalPaidAmount = 0;
    let totalUnpaidAmount = 0;
    let totalPiecesCount = 0;

    filteredPurchases.forEach(p => {
      const tot = Number(p.totalAmount || 0);
      const paid = Number(p.paidAmount || 0);
      totalPurchasesAmount += tot;
      totalPaidAmount += paid;
      totalUnpaidAmount += Math.max(0, tot - paid);

      (p.items || []).forEach(it => {
        totalPiecesCount += Number(it.quantity || 0);
      });
    });

    return {
      totalPurchasesAmount,
      totalPaidAmount,
      totalUnpaidAmount,
      totalPiecesCount,
      count: filteredPurchases.length,
    };
  }, [filteredPurchases]);

  // Filtered Products for Picker
  const selectableProducts = useMemo(() => {
    if (!productSearch.trim() && selectedCategoryFilter === 'all') {
      return products.slice(0, 30);
    }
    const q = productSearch.toLowerCase().trim();
    return products.filter(p => {
      if (selectedCategoryFilter !== 'all' && String(p.categoryId) !== String(selectedCategoryFilter)) {
        return false;
      }
      if (!q) return true;
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchNameKu = (p.nameKu || '').toLowerCase().includes(q);
      const matchNameAr = (p.nameAr || '').toLowerCase().includes(q);
      const matchBarcode = (p.barcode || '').toLowerCase().includes(q);
      const matchSku = (p.sku || '').toLowerCase().includes(q);
      const matchVariation = (p.variations || []).some(v => 
        (v.barcode || '').toLowerCase().includes(q) || 
        (v.sku || '').toLowerCase().includes(q) ||
        (v.color || '').toLowerCase().includes(q) ||
        (v.size || '').toLowerCase().includes(q)
      );
      return matchName || matchNameKu || matchNameAr || matchBarcode || matchSku || matchVariation;
    }).slice(0, 40);
  }, [products, productSearch, selectedCategoryFilter]);

  // Add Variation to Draft Items
  const handleAddVariationToDraft = (product: Product, variation: ProductVariation) => {
    const existingIndex = draftItems.findIndex(
      it => String(it.productId) === String(product.id) && String(it.productVariationId) === String(variation.id)
    );

    if (existingIndex >= 0) {
      setDraftItems(prev => prev.map((it, idx) => 
        idx === existingIndex ? { ...it, quantity: it.quantity + 1 } : it
      ));
    } else {
      const initialCost = Number(product.cost || 0);
      const initialPrice = Number(product.price || 0);

      const newItem: PurchaseDraftItem = {
        productId: product.id,
        productVariationId: variation.id,
        productName: (language === 'ku' ? product.nameKu : language === 'ar' ? product.nameAr : product.name) || product.name,
        productImage: product.imageUrl || (product.images && product.images[0]) || '',
        variationColor: variation.color,
        variationSize: variation.size,
        variationBarcode: variation.barcode || variation.sku || product.barcode || '',
        currentStock: Number(variation.stockQuantity || 0),
        quantity: 1,
        previousCost: initialCost,
        costPrice: initialCost,
        previousPrice: initialPrice,
        retailPrice: initialPrice,
      };
      setDraftItems(prev => [newItem, ...prev]);
    }
  };

  // Add all variations of a product
  const handleAddAllVariationsOfProduct = (product: Product) => {
    if (!product.variations || product.variations.length === 0) return;
    product.variations.forEach(v => {
      handleAddVariationToDraft(product, v);
    });
  };

  // Draft Calculation
  const draftGrandTotal = useMemo(() => {
    return draftItems.reduce((sum, it) => sum + (it.quantity * it.costPrice), 0);
  }, [draftItems]);

  const draftTotalPieces = useMemo(() => {
    return draftItems.reduce((sum, it) => sum + it.quantity, 0);
  }, [draftItems]);

  // Submit New Purchase
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      alert(language === 'ku' ? 'تکایە ناوی سەپلایەر بنووسە' : 'Please enter supplier name');
      return;
    }
    if (draftItems.length === 0) {
      alert(language === 'ku' ? 'تکایە بەلایەنی کەم یەک کاڵا هەڵبژێرە بۆ کڕین' : 'Please select at least one item to purchase');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalPaid = paidAmount === '' ? draftGrandTotal : Number(paidAmount);
      const payload = {
        supplierName: supplierName.trim(),
        supplierPhone: supplierPhone.trim() || undefined,
        purchaseDate,
        totalAmount: draftGrandTotal,
        paidAmount: finalPaid,
        paymentStatus: finalPaid >= draftGrandTotal ? 'paid' : (finalPaid > 0 ? 'partial' : 'unpaid'),
        paymentMethod,
        notes: notes.trim() || undefined,
        items: draftItems.map(it => ({
          productId: it.productId,
          productVariationId: it.productVariationId,
          quantity: it.quantity,
          costPrice: it.costPrice,
          retailPrice: it.retailPrice,
          previousCost: it.previousCost,
          previousPrice: it.previousPrice,
        })),
      };

      const res = await addPurchase(payload);
      if (res.success) {
        setIsNewPurchaseModalOpen(false);
        setDraftItems([]);
        setSupplierName('');
        setSupplierPhone('');
        setPaidAmount('');
        setNotes('');
      } else {
        alert(res.message || 'Failed to record purchase');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export Purchases to Excel
  const handleExportExcel = () => {
    if (filteredPurchases.length === 0) return;

    downloadXlsx({
      filename: `galokids-purchases-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: language === 'ku' ? 'کڕینەکان' : 'Purchases',
      title: [
        language === 'ku' ? 'ڕاپۆرتی پسوولەکانی کڕین و دابینکردن' : 'Purchase Orders & Restock Report',
        `${filteredPurchases.length} ${language === 'ku' ? 'پسوولە' : 'Invoices'} · ${formatIQDLabel(metrics.totalPurchasesAmount)}`
      ],
      columns: [
        { header: L('Invoice Number') || 'Invoice #', width: 22, value: (r: any) => r.invoiceNumber },
        { header: language === 'ku' ? 'دابینکەر / سەپلایەر' : 'Supplier', width: 25, value: (r: any) => r.supplierName },
        { header: language === 'ku' ? 'ژمارەی مۆبایل' : 'Phone', width: 16, value: (r: any) => r.supplierPhone || '-' },
        { header: language === 'ku' ? 'بەروار' : 'Date', width: 14, value: (r: any) => r.purchaseDate },
        { header: language === 'ku' ? 'بڕی دانەکان' : 'Pieces', width: 12, value: (r: any) => (r.items || []).reduce((s: number, i: any) => s + (i.quantity || 0), 0) },
        { header: language === 'ku' ? 'کۆی گشتی' : 'Total Amount', width: 16, value: (r: any) => r.totalAmount },
        { header: language === 'ku' ? 'بڕی دراو' : 'Paid Amount', width: 16, value: (r: any) => r.paidAmount },
        { header: language === 'ku' ? 'قەرزی ماوە' : 'Remaining Debt', width: 16, value: (r: any) => Math.max(0, (r.totalAmount || 0) - (r.paidAmount || 0)) },
        { header: language === 'ku' ? 'دۆخی پارەدان' : 'Status', width: 14, value: (r: any) => r.paymentStatus },
      ],
      rows: filteredPurchases,
    });
  };

  // Print Invoice
  const handlePrintInvoice = (purchase: Purchase) => {
    const w = window.open('', '_blank', 'width=900,height=800');
    if (!w) return;

    const itemsHtml = (purchase.items || []).map((it, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; text-align: center;">${idx + 1}</td>
        <td style="padding: 10px; font-weight: bold;">
          ${(it.product && (it.product.nameKu || it.product.name)) || 'Product'} 
          ${it.variation ? `<span style="color: #64748b; font-size: 11px;">(${it.variation.color || ''} - ${it.variation.size || ''})</span>` : ''}
        </td>
        <td style="padding: 10px; text-align: center; font-weight: bold;">${it.quantity}</td>
        <td style="padding: 10px; text-align: right; font-family: monospace;">${formatIQDLabel(Number(it.costPrice || 0))}</td>
        <td style="padding: 10px; text-align: right; font-family: monospace; font-weight: bold;">${formatIQDLabel(Number(it.subtotal || (it.quantity * it.costPrice)))}</td>
      </tr>
    `).join('');

    w.document.write(`
      <!doctype html>
      <html dir="rtl" lang="ku">
        <head>
          <meta charset="utf-8" />
          <title>پسوولەی کڕین - ${purchase.invoiceNumber}</title>
          <style>
            body { font-family: sans-serif; margin: 30px; direction: rtl; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: bold; color: #0f172a; }
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 25px; background: #f8fafc; padding: 15px; border-radius: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #0f172a; color: white; padding: 10px; font-size: 13px; }
            .totals { float: left; width: 300px; margin-top: 15px; }
            .total-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
            .grand-total { font-size: 16px; font-weight: bold; color: #4338ca; border-bottom: 2px solid #4338ca; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">GALOKIDS - پسوولەی کڕین و دابینکردن</div>
              <div style="color: #64748b; font-size: 12px; margin-top: 4px;">Purchase Invoice & Stock Receipt</div>
            </div>
            <div style="text-align: left;">
              <div style="font-size: 16px; font-weight: bold; font-family: monospace;">#${purchase.invoiceNumber}</div>
              <div style="color: #64748b; font-size: 12px;">بەروار: ${purchase.purchaseDate}</div>
            </div>
          </div>

          <div class="info-grid">
            <div><strong>ناوی دابینکەر / سەپلایەر:</strong> ${purchase.supplierName}</div>
            <div><strong>ژمارەی پەیوەندی:</strong> ${purchase.supplierPhone || 'نادیارە'}</div>
            <div><strong>دۆخی پارەدان:</strong> ${purchase.paymentStatus === 'paid' ? 'بە تەواوی دراوە' : purchase.paymentStatus === 'partial' ? 'بەشێکی دراوە' : 'قەرز (نەدراوە)'}</div>
            <div><strong>شێوازی پارەدان:</strong> ${purchase.paymentMethod || 'کاش'}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th style="text-align: right;">ناوی کاڵا و جۆرەکەی</th>
                <th style="width: 70px;">بڕ (دانە)</th>
                <th style="width: 140px; text-align: right;">تێچووی دانە (Cost)</th>
                <th style="width: 150px; text-align: right;">کۆی گشتی</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row"><span>کۆی تێچووی کاڵاکان:</span> <span>${formatIQDLabel(Number(purchase.totalAmount || 0))}</span></div>
            <div class="total-row"><span>بڕی پارەی دراو:</span> <span>${formatIQDLabel(Number(purchase.paidAmount || 0))}</span></div>
            <div class="total-row grand-total"><span>قەرزی ماوە:</span> <span>${formatIQDLabel(Math.max(0, Number(purchase.totalAmount || 0) - Number(purchase.paidAmount || 0)))}</span></div>
          </div>

          <div style="clear: both; margin-top: 60px; display: flex; justify-content: space-between;">
            <div>واژۆی وەرگر / ژمێریاری: ________________</div>
            <div>واژۆی دابینکەر / سەپلایەر: ________________</div>
          </div>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
  };

  return (
    <div className="space-y-6 font-arabic pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-rose-500 to-emerald-500 opacity-80" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold mb-3">
              <ShoppingBag className="w-4 h-4 text-indigo-400" />
              <span>{language === 'ku' ? 'بەڕێوەبردنی کڕین و دابینکردنی کاڵا' : 'Purchase Orders & Restock Management'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {language === 'ku' ? 'کڕین و نوێکردنەوەی عەمبار' : 'Purchases & Restock'}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              {language === 'ku'
                ? 'کڕینی ئەو بەرهەمانەی پێشتر هەمان بووە، بەراوردی نرخی تێچووی نوێ و کۆن، نوێکردنەوەی عەمبار و تۆمارکردنی حیساباتی سەپلایەر.'
                : 'Restock existing catalogue items, compare old vs new cost/retail prices, and manage supplier debts.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsNewPurchaseModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg hover:shadow-indigo-500/25 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'ku' ? '+ تۆمارکردنی کڕینی نوێ' : '+ New Purchase / Restock'}</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={filteredPurchases.length === 0}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{language === 'ku' ? 'ئێکسڵ' : 'Excel'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">{language === 'ku' ? 'کۆی کڕینەکان' : 'Total Purchases'}</p>
            <h3 className="text-xl font-black text-slate-900 mt-1 font-mono">{formatIQDLabel(metrics.totalPurchasesAmount)}</h3>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5">{metrics.count} {language === 'ku' ? 'پسوولە' : 'invoices'}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">{language === 'ku' ? 'بڕی پارەی دراو' : 'Total Paid'}</p>
            <h3 className="text-xl font-black text-emerald-700 mt-1 font-mono">{formatIQDLabel(metrics.totalPaidAmount)}</h3>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">✓ {language === 'ku' ? 'دراوە بە سەپلایەر' : 'Paid to suppliers'}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">{language === 'ku' ? 'قەرزی ماوە' : 'Remaining Debt'}</p>
            <h3 className="text-xl font-black text-rose-700 mt-1 font-mono">{formatIQDLabel(metrics.totalUnpaidAmount)}</h3>
            <p className="text-[11px] text-rose-600 font-bold mt-0.5">⚠️ {language === 'ku' ? 'قەرزی دابینکەران' : 'Supplier debts'}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">{language === 'ku' ? 'کۆی دانەی هاتووی عەمبار' : 'Total Pieces Restocked'}</p>
            <h3 className="text-xl font-black text-indigo-900 mt-1 font-mono">{metrics.totalPiecesCount.toLocaleString()} {language === 'ku' ? 'دانە' : 'pcs'}</h3>
            <p className="text-[11px] text-indigo-500 font-bold mt-0.5">📦 {language === 'ku' ? 'زیادکراو بۆ ستۆک' : 'Added to stock'}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main List Container */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-6 rounded-[2.5rem] shadow-sm space-y-6">
        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ku' ? 'گەڕان بەپێی ژمارەی پسوولە، ناوی سەپلایەر یان تێبینی...' : 'Search by invoice #, supplier name, notes...'}
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none cursor-pointer hover:border-indigo-300 transition-colors"
            >
              <option value="all">{language === 'ku' ? 'هەموو دۆخەکانی پارەدان' : 'All Payment Statuses'}</option>
              <option value="paid">{language === 'ku' ? '✓ دراوە (Paid)' : 'Paid'}</option>
              <option value="partial">{language === 'ku' ? '⏳ بەشێکی دراوە (Partial)' : 'Partial'}</option>
              <option value="unpaid">{language === 'ku' ? '⚠️ قەرز (Unpaid)' : 'Unpaid / Debt'}</option>
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none"
            />
          </div>
        </div>

        {/* Purchases Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900 text-white text-[11px] uppercase tracking-wider font-bold">
              <tr>
                <th className="px-4 py-3.5 rounded-tr-xl">{language === 'ku' ? 'پسوولە / بەروار' : 'Invoice / Date'}</th>
                <th className="px-3 py-3.5">{language === 'ku' ? 'سەپلایەر / دابینکەر' : 'Supplier'}</th>
                <th className="px-3 py-3.5 text-center">{language === 'ku' ? 'بڕی کاڵاکان' : 'Items & Pieces'}</th>
                <th className="px-3 py-3.5">{language === 'ku' ? 'کۆی گشتی' : 'Total Amount'}</th>
                <th className="px-3 py-3.5">{language === 'ku' ? 'بڕی دراو' : 'Paid Amount'}</th>
                <th className="px-3 py-3.5">{language === 'ku' ? 'قەرزی ماوە' : 'Remaining Debt'}</th>
                <th className="px-3 py-3.5 text-center">{language === 'ku' ? 'دۆخی پارەدان' : 'Status'}</th>
                <th className="px-4 py-3.5 text-center rounded-tl-xl">{language === 'ku' ? 'کردارەکان' : 'Actions'}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {isPurchasesLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-indigo-500" />
                    <p className="font-bold">{language === 'ku' ? 'هێنانی پسوولەکانی کڕین...' : 'Loading purchases...'}</p>
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                    <p className="font-bold text-slate-600 text-sm">
                      {language === 'ku' ? 'هیچ پسوولەیەکی کڕین نەدۆزرایەوە' : 'No purchase orders found'}
                    </p>
                    <button
                      onClick={() => setIsNewPurchaseModalOpen(true)}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{language === 'ku' ? 'یەکەم کڕین تۆمار بکە' : 'Create first purchase'}</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(p => {
                  const isExpanded = expandedPurchaseId === p.id;
                  const total = Number(p.totalAmount || 0);
                  const paid = Number(p.paidAmount || 0);
                  const remaining = Math.max(0, total - paid);
                  const itemsCount = (p.items || []).length;
                  const piecesCount = (p.items || []).reduce((s, it) => s + (it.quantity || 0), 0);

                  return (
                    <React.Fragment key={p.id}>
                      <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-indigo-50/20' : ''}`}>
                        <td className="px-4 py-3.5 font-bold">
                          <div className="font-mono text-slate-900 text-xs font-black flex items-center gap-1.5">
                            <span className="text-indigo-600">#</span>
                            <span>{p.invoiceNumber}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>{p.purchaseDate}</span>
                          </div>
                        </td>

                        <td className="px-3 py-3.5">
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{p.supplierName}</span>
                          </div>
                          {p.supplierPhone && (
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" />
                              <span>{p.supplierPhone}</span>
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-black text-[11px]">
                            <span>{itemsCount} {language === 'ku' ? 'بەرهەم' : 'items'}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-indigo-700">{piecesCount} {language === 'ku' ? 'دانە' : 'pcs'}</span>
                          </span>
                        </td>

                        <td className="px-3 py-3.5 font-mono font-black text-slate-900 text-xs">
                          {formatIQDLabel(total)}
                        </td>

                        <td className="px-3 py-3.5 font-mono font-black text-emerald-700 text-xs">
                          {formatIQDLabel(paid)}
                        </td>

                        <td className="px-3 py-3.5 font-mono font-black text-rose-700 text-xs">
                          {remaining > 0 ? formatIQDLabel(remaining) : <span className="text-slate-400 font-sans font-bold">٠ (دراوە)</span>}
                        </td>

                        <td className="px-3 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                              p.paymentStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : p.paymentStatus === 'partial'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {p.paymentStatus === 'paid'
                              ? (language === 'ku' ? '✓ دراوە' : 'Paid')
                              : p.paymentStatus === 'partial'
                              ? (language === 'ku' ? '⏳ بەشەکی' : 'Partial')
                              : (language === 'ku' ? '⚠️ قەرز' : 'Unpaid')}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setExpandedPurchaseId(isExpanded ? null : p.id)}
                              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                                isExpanded ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                              title={language === 'ku' ? 'پیشاندانی کاڵاکان' : 'Expand items'}
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              onClick={() => handlePrintInvoice(p)}
                              className="p-1.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors cursor-pointer"
                              title={language === 'ku' ? 'چاپکردنی پسوولە' : 'Print invoice'}
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                if (confirm(language === 'ku' ? 'دڵنیایت لە سڕینەوەی ئەم پسوولەیە؟' : 'Are you sure you want to delete this purchase order?')) {
                                  deletePurchase(p.id);
                                }
                              }}
                              className="p-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                              title={language === 'ku' ? 'سڕینەوە' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Items Drawer Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-indigo-100 animate-fadeIn">
                          <td colSpan={8} className="p-4">
                            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>{language === 'ku' ? 'کاڵا کڕدراوەکانی ئەم پسوولەیە' : 'Items in this purchase invoice'}</span>
                                </h4>
                                {p.notes && (
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    <strong>{language === 'ku' ? 'تێبینی:' : 'Note:'}</strong> {p.notes}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {(p.items || []).map((it, itIdx) => (
                                  <div key={itIdx} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                    {it.product?.imageUrl ? (
                                      <img src={it.product.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-white border border-slate-200 shrink-0" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                        <Package className="w-4 h-4" />
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p className="font-bold text-slate-900 truncate text-[11px]">
                                        {(it.product && (it.product.nameKu || it.product.name)) || 'Product'}
                                      </p>
                                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                        {it.variation && (
                                          <span className="inline-flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full border border-slate-300" style={{ backgroundColor: getColorHex(it.variation.color) }} />
                                            <span>{it.variation.size || it.variation.color}</span>
                                          </span>
                                        )}
                                        <span className="font-black text-indigo-700 font-mono">({it.quantity} {language === 'ku' ? 'دانە' : 'pcs'})</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-[10px] font-mono mt-0.5">
                                        <span className="text-slate-500">{language === 'ku' ? 'تێچوو:' : 'Cost:'} {formatIQD(it.costPrice)}</span>
                                        <span className="text-emerald-700 font-bold">{language === 'ku' ? 'کۆ:' : 'Total:'} {formatIQD(it.subtotal || (it.quantity * it.costPrice))}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
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
      </div>

      {/* CREATE NEW PURCHASE MODAL */}
      {isNewPurchaseModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-6 overflow-y-auto font-arabic animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl border border-slate-100 relative my-auto max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {language === 'ku' ? 'تۆمارکردنی کڕینی نوێ و نوێکردنەوەی نرخەکان' : 'New Purchase & Price Update'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {language === 'ku' ? 'بەرهەمەکان هەڵبژێرە، بڕی کڕین بنووسە و نرخی تێچوو و فرۆشتنی نوێ دابنێ.' : 'Select products, add restock quantities, and update cost/retail prices.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsNewPurchaseModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitPurchase} className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar">
              {/* SECTION 1: Supplier & Invoice Information */}
              <div className="bg-slate-50/80 border border-slate-200/80 p-5 rounded-3xl space-y-4">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-indigo-600" />
                  <span>{language === 'ku' ? '١. زانیارییەکانی دابینکەر و پسوولە' : '1. Supplier & Invoice Info'}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'ku' ? 'ناوی دابینکەر / سەپلایەر *' : 'Supplier Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder={language === 'ku' ? 'نموونە: دابینکەری تورکیا' : 'e.g. Istanbul Fashion'}
                      className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'ku' ? 'ژمارەی مۆبایلی سەپلایەر' : 'Supplier Phone'}
                    </label>
                    <input
                      type="text"
                      value={supplierPhone}
                      onChange={(e) => setSupplierPhone(e.target.value)}
                      placeholder="0750 000 0000"
                      className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'ku' ? 'بەرواری کڕین *' : 'Purchase Date *'}
                    </label>
                    <input
                      type="date"
                      required
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'ku' ? 'دۆخی پارەدان' : 'Payment Status'}
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as any)}
                      className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="paid">{language === 'ku' ? '✓ بە تەواوی دراوە (Paid)' : 'Paid'}</option>
                      <option value="partial">{language === 'ku' ? '⏳ بەشێکی دراوە (Partial)' : 'Partial'}</option>
                      <option value="unpaid">{language === 'ku' ? '⚠️ قەرز (Unpaid)' : 'Unpaid / Debt'}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'ku' ? 'بڕی پارەی دراو (دینار)' : 'Paid Amount (IQD)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder={String(draftGrandTotal)}
                      className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'ku' ? 'شێوازی پارەدان' : 'Payment Method'}
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="cash">{language === 'ku' ? 'کاش (Cash)' : 'Cash'}</option>
                      <option value="bank">{language === 'ku' ? 'حەواڵە / بانک (Bank)' : 'Bank'}</option>
                      <option value="debt">{language === 'ku' ? 'قەرز (Debt)' : 'Debt'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'ku' ? 'تێبینی' : 'Notes'}
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={language === 'ku' ? 'تێبینی پسوولە...' : 'Optional notes...'}
                      className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Product Picker */}
              <div className="bg-indigo-50/40 border border-indigo-100 p-5 rounded-3xl space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <h3 className="text-xs font-black text-indigo-950 flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-600" />
                    <span>{language === 'ku' ? '٢. هەڵبژاردنی بەرهەمەکانی ناو کاتالۆگ' : '2. Pick Products to Restock'}</span>
                  </h3>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder={language === 'ku' ? 'گەڕان بەپێی ناو یان بارکۆد...' : 'Search by name or barcode...'}
                        className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      className="py-1.5 px-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="all">{language === 'ku' ? 'هەموو پۆلەکان' : 'All Categories'}</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {language === 'ku' ? (c.nameKu || c.name) : c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Products Picker Horizontal Scroll Grid */}
                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide pt-1">
                  {selectableProducts.map(prod => (
                    <div
                      key={prod.id}
                      className="min-w-[200px] max-w-[200px] bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {prod.imageUrl ? (
                          <img src={prod.imageUrl} alt="" className="w-9 h-9 rounded-xl object-cover border border-slate-100 shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 text-xs truncate">
                            {(language === 'ku' ? prod.nameKu : prod.name) || prod.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">{formatIQDLabel(Number(prod.cost || 0))}</p>
                        </div>
                      </div>

                      {/* Variations Chips */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-1">
                          {(prod.variations || []).map((v, vIdx) => {
                            const isAdded = draftItems.some(it => String(it.productVariationId) === String(v.id));
                            return (
                              <button
                                key={v.id || vIdx}
                                type="button"
                                onClick={() => handleAddVariationToDraft(prod, v)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                  isAdded
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-slate-50 hover:bg-indigo-50 text-slate-700 border-slate-200 hover:border-indigo-300'
                                }`}
                              >
                                <span className="w-2 h-2 rounded-full border border-slate-300" style={{ backgroundColor: getColorHex(v.color) }} />
                                <span>{v.size || v.color}</span>
                                <span className="opacity-70 font-mono">({v.stockQuantity || 0})</span>
                              </button>
                            );
                          })}
                        </div>

                        {prod.variations && prod.variations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleAddAllVariationsOfProduct(prod)}
                            className="w-full text-center text-[10px] font-black text-indigo-600 hover:text-indigo-800 py-1 rounded-lg bg-indigo-50/60 hover:bg-indigo-100 transition-colors cursor-pointer"
                          >
                            + {language === 'ku' ? 'زیادکردنی هەموو جۆرەکان' : 'Add All Variants'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: Purchase Items Table (خشتەی کڕین و بەراوردی نرخەکان) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>{language === 'ku' ? '٣. خشتەی کڕین و بەراورد و گۆڕینی نرخەکان' : '3. Restock Items & Price Updates'}</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    {draftItems.length} {language === 'ku' ? 'جۆر هەڵبژێردراوە' : 'items selected'} ({draftTotalPieces} {language === 'ku' ? 'دانە' : 'pcs'})
                  </span>
                </div>

                {draftItems.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-xs">
                      {language === 'ku' ? 'هیچ کاڵایەک هەڵنەبژێردراوە. لە سەرەوە کاڵاکان کلیک بکە بۆ زیادکردن.' : 'No items picked yet. Click variants above to add.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold">
                        <tr>
                          <th className="px-3 py-2.5">{language === 'ku' ? 'کاڵا و جۆرەکەی' : 'Product & Variant'}</th>
                          <th className="px-2 py-2.5 text-center">{language === 'ku' ? 'عەمباری ئێستا' : 'Current Stock'}</th>
                          <th className="px-2 py-2.5 text-center" style={{ width: '110px' }}>{language === 'ku' ? 'بڕی کڕین (+ دانە)' : 'Buy Quantity'}</th>
                          <th className="px-3 py-2.5 text-center" style={{ width: '140px' }}>{language === 'ku' ? 'تێچوو (پێشوو ➔ نوێ)' : 'Cost (Old ➔ New)'}</th>
                          <th className="px-3 py-2.5 text-center" style={{ width: '140px' }}>{language === 'ku' ? 'فرۆشتن (پێشوو ➔ نوێ)' : 'Retail (Old ➔ New)'}</th>
                          <th className="px-3 py-2.5">{language === 'ku' ? 'کۆی تێچوو' : 'Subtotal'}</th>
                          <th className="px-2 py-2.5 text-center">{language === 'ku' ? 'سڕینەوە' : 'Del'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {draftItems.map((item, idx) => {
                          const subtotal = item.quantity * item.costPrice;
                          const costChanged = item.costPrice !== item.previousCost;
                          const priceChanged = item.retailPrice !== item.previousPrice;

                          return (
                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  {item.productImage ? (
                                    <img src={item.productImage} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                      <Package className="w-3.5 h-3.5" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 truncate text-xs">{item.productName}</p>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                      <span className="w-2 h-2 rounded-full border border-slate-300" style={{ backgroundColor: getColorHex(item.variationColor) }} />
                                      <span>{item.variationSize || item.variationColor}</span>
                                      {item.variationBarcode && <span className="font-mono text-slate-400">[{item.variationBarcode}]</span>}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-2 py-2.5 text-center font-mono font-bold text-slate-600">
                                {item.currentStock}
                              </td>

                              {/* Quantity Input */}
                              <td className="px-2 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDraftItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it));
                                    }}
                                    className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const v = parseInt(e.target.value, 10);
                                      setDraftItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: isNaN(v) || v < 1 ? 1 : v } : it));
                                    }}
                                    className="w-12 text-center font-mono font-bold py-1 bg-slate-50 border border-slate-200 rounded-md text-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDraftItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: it.quantity + 1 } : it));
                                    }}
                                    className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>

                              {/* Cost Price Comparison & Edit */}
                              <td className="px-3 py-2.5 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] text-slate-400 font-mono line-through mb-0.5">
                                    {formatIQD(item.previousCost)}
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.costPrice}
                                    onChange={(e) => {
                                      const v = parseFloat(e.target.value);
                                      setDraftItems(prev => prev.map((it, i) => i === idx ? { ...it, costPrice: isNaN(v) ? 0 : v } : it));
                                    }}
                                    className={`w-24 text-center font-mono font-bold py-1 px-1.5 rounded-lg border text-xs outline-none ${
                                      costChanged ? 'bg-amber-50 border-amber-300 text-amber-900 font-black' : 'bg-slate-50 border-slate-200 text-slate-800'
                                    }`}
                                  />
                                </div>
                              </td>

                              {/* Retail Price Comparison & Edit */}
                              <td className="px-3 py-2.5 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] text-slate-400 font-mono line-through mb-0.5">
                                    {formatIQD(item.previousPrice)}
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.retailPrice}
                                    onChange={(e) => {
                                      const v = parseFloat(e.target.value);
                                      setDraftItems(prev => prev.map((it, i) => i === idx ? { ...it, retailPrice: isNaN(v) ? 0 : v } : it));
                                    }}
                                    className={`w-24 text-center font-mono font-bold py-1 px-1.5 rounded-lg border text-xs outline-none ${
                                      priceChanged ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-black' : 'bg-slate-50 border-slate-200 text-slate-800'
                                    }`}
                                  />
                                </div>
                              </td>

                              {/* Subtotal */}
                              <td className="px-3 py-2.5 font-mono font-black text-indigo-900 text-xs">
                                {formatIQDLabel(subtotal)}
                              </td>

                              {/* Delete Item */}
                              <td className="px-2 py-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => setDraftItems(prev => prev.filter((_, i) => i !== idx))}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer / Sticky Totals & Submit */}
              <div className="bg-slate-900 text-white p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-bold">{language === 'ku' ? 'کۆی گشتی دانەکان:' : 'Total Pieces:'}</span>
                    <span className="text-lg font-black font-mono text-white">{draftTotalPieces} {language === 'ku' ? 'دانە' : 'pcs'}</span>
                  </div>
                  <div className="border-r border-slate-700 pr-6">
                    <span className="text-[11px] text-slate-400 block font-bold">{language === 'ku' ? 'کۆی تێچووی کڕین:' : 'Grand Total Cost:'}</span>
                    <span className="text-xl font-black font-mono text-emerald-400">{formatIQDLabel(draftGrandTotal)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsNewPurchaseModalOpen(false)}
                    className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {language === 'ku' ? 'پاشگەزبوونەوە' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || draftItems.length === 0}
                    className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer active:scale-95 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{language === 'ku' ? 'تۆمارکردن...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{language === 'ku' ? 'تۆمارکردن و نوێکردنەوەی عەمبار' : 'Save & Restock'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
