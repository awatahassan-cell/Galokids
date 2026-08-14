import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, Plus, Search, Filter, Calendar, DollarSign, 
  CreditCard, CheckCircle2, AlertCircle, Clock, FileText, 
  Printer, Trash2, ChevronDown, ChevronUp, Eye, X, 
  Package, ArrowRight, ArrowLeft, TrendingUp, RefreshCw, Layers,
  Phone, User as UserIcon, Check, FileSpreadsheet, Building2,
  Wallet, Receipt, ArrowUpRight, ArrowDownLeft, Edit2, Sparkles,
  MapPin, Mail, Percent, BookOpen, Barcode, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, 
  PieChart, Pie, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell 
} from 'recharts';
import { useStore } from '../../store';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminTr } from '../../i18n/adminDict';
import { formatIQDLabel, formatIQD } from '../../utils/currency';
import { Product, ProductVariation, Purchase, PurchaseItem, Supplier } from '../../types';
import { getColorHex } from '../../utils/colors';
import { shopToday, shopDaysAgo } from '../../utils/shopTime';
import { downloadXlsx } from '../../utils/exportExcel';

const CHART_COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6'];

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
    fetchAllProducts,
    suppliers,
    isSuppliersLoading,
    fetchSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    recordSupplierPayment
  } = useStore();

  const { language } = useLanguage();
  const L = (key: string) => adminTr(key, language);
  const isRTL = language === 'ar' || language === 'ku';

  // Navigation View Mode: 'invoices' (list), 'suppliers' (accounts), 'reports' (analytics), or 'create' (standalone full page)
  const [viewMode, setViewMode] = useState<'invoices' | 'suppliers' | 'reports' | 'create'>('invoices');

  // Filters State for Invoices
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | number | null>(null);

  // Filters State for Suppliers
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSupplierForAccount, setSelectedSupplierForAccount] = useState<Supplier | null>(null);
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(shopToday());
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Filters State for Reports
  const [reportPeriod, setReportPeriod] = useState<'all' | 'today' | '7d' | '30d' | 'this_month' | 'custom'>('this_month');
  const [reportSupplierFilter, setReportSupplierFilter] = useState('all');
  const [reportDebtOnly, setReportDebtOnly] = useState(false);
  const [reportCustomStart, setReportCustomStart] = useState('');
  const [reportCustomEnd, setReportCustomEnd] = useState('');

  // Supplier Form State (Add / Edit)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supFormName, setSupFormName] = useState('');
  const [supFormCompany, setSupFormCompany] = useState('');
  const [supFormContact, setSupFormContact] = useState('');
  const [supFormPhone, setSupFormPhone] = useState('');
  const [supFormEmail, setSupFormEmail] = useState('');
  const [supFormAddress, setSupFormAddress] = useState('');
  const [supFormOpeningBalance, setSupFormOpeningBalance] = useState('0');
  const [supFormNotes, setSupFormNotes] = useState('');
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);

  // New Purchase Form State (Standalone Full Page)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(shopToday());
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'unpaid'>('paid');
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Product Selection for New Purchase
  const [draftItems, setDraftItems] = useState<PurchaseDraftItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
    if (products.length === 0) {
      fetchAllProducts();
    }
  }, []);

  // Handle outside click to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When selectedSupplierId changes in New Purchase, auto-populate supplier info
  const handleSupplierSelectChange = (supId: string) => {
    setSelectedSupplierId(supId);
    if (supId === 'new') {
      setSupplierName('');
      setSupplierPhone('');
    } else {
      const found = suppliers.find(s => String(s.id) === String(supId));
      if (found) {
        setSupplierName(found.name);
        setSupplierPhone(found.phone || '');
      }
    }
  };

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

  // Filtered Suppliers List
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers;
    const q = supplierSearch.toLowerCase().trim();
    return suppliers.filter(s => 
      (s.name || '').toLowerCase().includes(q) ||
      (s.company || '').toLowerCase().includes(q) ||
      (s.contactPerson || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q)
    );
  }, [suppliers, supplierSearch]);

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

    const totalSuppliersDebt = suppliers.reduce((sum, s) => sum + Number(s.debtBalance || 0), 0);

    return {
      totalPurchasesAmount,
      totalPaidAmount,
      totalUnpaidAmount,
      totalPiecesCount,
      totalSuppliersDebt,
      suppliersCount: suppliers.length,
      count: filteredPurchases.length,
    };
  }, [filteredPurchases, suppliers]);

  // =========================================================
  // REPORTS DATA & ANALYTICS CALCULATION
  // =========================================================
  const reportDateBounds = useMemo(() => {
    const today = shopToday();
    if (reportPeriod === 'today') return { start: today, end: today };
    if (reportPeriod === '7d') return { start: shopDaysAgo(7), end: today };
    if (reportPeriod === '30d') return { start: shopDaysAgo(30), end: today };
    if (reportPeriod === 'this_month') {
      const startOfMonth = today.slice(0, 8) + '01';
      return { start: startOfMonth, end: today };
    }
    if (reportPeriod === 'custom') {
      return { start: reportCustomStart || '2000-01-01', end: reportCustomEnd || '2099-12-31' };
    }
    return { start: '2000-01-01', end: '2099-12-31' };
  }, [reportPeriod, reportCustomStart, reportCustomEnd]);

  const reportPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (p.purchaseDate < reportDateBounds.start || p.purchaseDate > reportDateBounds.end) {
        return false;
      }
      if (reportSupplierFilter !== 'all') {
        if (String(p.supplierId) !== String(reportSupplierFilter) && p.supplierName !== reportSupplierFilter) {
          return false;
        }
      }
      if (reportDebtOnly) {
        const debt = Math.max(0, Number(p.totalAmount || 0) - Number(p.paidAmount || 0));
        if (debt <= 0) return false;
      }
      return true;
    });
  }, [purchases, reportDateBounds, reportSupplierFilter, reportDebtOnly]);

  const reportMetrics = useMemo(() => {
    let volume = 0;
    let paid = 0;
    let debt = 0;
    let pieces = 0;
    let projectedRetailValue = 0;

    reportPurchases.forEach(p => {
      const tot = Number(p.totalAmount || 0);
      const pd = Number(p.paidAmount || 0);
      volume += tot;
      paid += pd;
      debt += Math.max(0, tot - pd);

      (p.items || []).forEach(it => {
        const qty = Number(it.quantity || 0);
        pieces += qty;
        projectedRetailValue += (qty * Number(it.retailPrice || it.product?.price || it.costPrice || 0));
      });
    });

    const profitPotential = Math.max(0, projectedRetailValue - volume);
    const profitMargin = projectedRetailValue > 0 ? Math.round((profitPotential / projectedRetailValue) * 100) : 0;

    return {
      volume,
      paid,
      debt,
      pieces,
      projectedRetailValue,
      profitPotential,
      profitMargin,
      invoicesCount: reportPurchases.length,
    };
  }, [reportPurchases]);

  // Timeline Trend Data for Chart
  const trendChartData = useMemo(() => {
    const map = new Map<string, { date: string; total: number; paid: number; debt: number }>();

    reportPurchases.forEach(p => {
      const d = p.purchaseDate || 'Unknown';
      const prev = map.get(d) || { date: d, total: 0, paid: 0, debt: 0 };
      const tot = Number(p.totalAmount || 0);
      const pd = Number(p.paidAmount || 0);
      map.set(d, {
        date: d,
        total: prev.total + tot,
        paid: prev.paid + pd,
        debt: prev.debt + Math.max(0, tot - pd),
      });
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [reportPurchases]);

  // Suppliers Debt Breakdown Chart Data
  const supplierDebtChartData = useMemo(() => {
    return suppliers
      .filter(s => Number(s.debtBalance || 0) > 0)
      .map(s => ({
        name: s.name,
        debt: Number(s.debtBalance || 0),
        totalPurchases: Number(s.totalPurchases || 0),
      }))
      .sort((a, b) => b.debt - a.debt)
      .slice(0, 8);
  }, [suppliers]);

  // Top Restocked Products
  const topRestockedProducts = useMemo(() => {
    const map = new Map<string, { id: string | number; name: string; pieces: number; cost: number; retail: number }>();

    reportPurchases.forEach(p => {
      (p.items || []).forEach(it => {
        const id = String(it.productId);
        const name = (it.product && (it.product.nameKu || it.product.name)) || 'Product';
        const qty = Number(it.quantity || 0);
        const cost = qty * Number(it.costPrice || 0);
        const retail = qty * Number(it.retailPrice || it.product?.price || it.costPrice || 0);

        const prev = map.get(id) || { id, name, pieces: 0, cost: 0, retail: 0 };
        map.set(id, {
          id,
          name,
          pieces: prev.pieces + qty,
          cost: prev.cost + cost,
          retail: prev.retail + retail,
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => b.pieces - a.pieces).slice(0, 10);
  }, [reportPurchases]);

  // Search Results for Product Search Input
  const searchResults = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase().trim();
    return products.filter(p => {
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
    }).slice(0, 10);
  }, [products, productSearch]);

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

    setProductSearch('');
    setIsSearchDropdownOpen(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Add all variations of a product
  const handleAddAllVariationsOfProduct = (product: Product) => {
    if (!product.variations || product.variations.length === 0) return;
    product.variations.forEach(v => {
      handleAddVariationToDraft(product, v);
    });
    setProductSearch('');
    setIsSearchDropdownOpen(false);
  };

  // Keyboard Enter or Barcode Scanner Handler
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = productSearch.trim().toLowerCase();
      if (!q) return;

      // 1. Check exact variation barcode
      for (const prod of products) {
        for (const v of prod.variations || []) {
          if (v.barcode && v.barcode.toLowerCase() === q) {
            handleAddVariationToDraft(prod, v);
            return;
          }
        }
      }

      // 2. Check exact product barcode / sku
      for (const prod of products) {
        if ((prod.barcode && prod.barcode.toLowerCase() === q) || (prod.sku && prod.sku.toLowerCase() === q)) {
          if (prod.variations && prod.variations.length === 1) {
            handleAddVariationToDraft(prod, prod.variations[0]);
            return;
          } else if (prod.variations && prod.variations.length > 1) {
            handleAddVariationToDraft(prod, prod.variations[0]);
            return;
          }
        }
      }

      // 3. If single search match with 1 variation
      if (searchResults.length === 1 && searchResults[0].variations && searchResults[0].variations.length === 1) {
        handleAddVariationToDraft(searchResults[0], searchResults[0].variations[0]);
      }
    }
  };

  // Draft Calculation
  const draftGrandTotal = useMemo(() => {
    return draftItems.reduce((sum, it) => sum + (it.quantity * it.costPrice), 0);
  }, [draftItems]);

  const draftTotalPieces = useMemo(() => {
    return draftItems.reduce((sum, it) => sum + it.quantity, 0);
  }, [draftItems]);

  // Open Edit Supplier Modal
  const handleOpenEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupFormName(sup.name);
    setSupFormCompany(sup.company || '');
    setSupFormContact(sup.contactPerson || '');
    setSupFormPhone(sup.phone || '');
    setSupFormEmail(sup.email || '');
    setSupFormAddress(sup.address || '');
    setSupFormOpeningBalance(String(sup.openingBalance || 0));
    setSupFormNotes(sup.notes || '');
    setIsNewSupplierModalOpen(true);
  };

  // Save Supplier (Create or Update)
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supFormName.trim()) {
      alert(language === 'ku' ? 'تکایە ناوی سەپلایەر بنووسە' : 'Please enter supplier name');
      return;
    }

    setIsSavingSupplier(true);
    try {
      const payload = {
        name: supFormName.trim(),
        company: supFormCompany.trim() || undefined,
        contactPerson: supFormContact.trim() || undefined,
        phone: supFormPhone.trim() || undefined,
        email: supFormEmail.trim() || undefined,
        address: supFormAddress.trim() || undefined,
        openingBalance: Number(supFormOpeningBalance || 0),
        notes: supFormNotes.trim() || undefined,
      };

      let savedSup: Supplier | undefined;
      if (editingSupplier) {
        const res = await updateSupplier(editingSupplier.id, payload);
        savedSup = res.supplier;
      } else {
        const res = await addSupplier(payload);
        savedSup = res.supplier;
      }

      setIsNewSupplierModalOpen(false);
      setEditingSupplier(null);
      setSupFormName('');
      setSupFormCompany('');
      setSupFormContact('');
      setSupFormPhone('');
      setSupFormEmail('');
      setSupFormAddress('');
      setSupFormOpeningBalance('0');
      setSupFormNotes('');

      if (savedSup) {
        setSelectedSupplierId(String(savedSup.id));
        setSupplierName(savedSup.name);
        setSupplierPhone(savedSup.phone || '');
      }
    } finally {
      setIsSavingSupplier(false);
    }
  };

  // Submit Supplier Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForAccount || !paymentAmount || Number(paymentAmount) <= 0) return;

    setIsProcessingPayment(true);
    try {
      const res = await recordSupplierPayment(selectedSupplierForAccount.id, {
        amount: Number(paymentAmount),
        paymentDate,
        paymentMethod,
        notes: paymentNotes.trim() || undefined,
      });

      if (res.success) {
        setIsPaymentModalOpen(false);
        setPaymentAmount('');
        setPaymentNotes('');
        const updated = suppliers.find(s => String(s.id) === String(selectedSupplierForAccount.id));
        if (updated) setSelectedSupplierForAccount(updated);
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Submit New Purchase (Standalone Full Page)
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      alert(language === 'ku' ? 'تکایە ناوی سەپلایەر دیاری بکە یان بنووسە' : 'Please select or enter supplier name');
      return;
    }
    if (draftItems.length === 0) {
      alert(language === 'ku' ? 'تکایە بەلایەنی کەم یەک کاڵا زیاد بکە بۆ خشتەی کڕین' : 'Please add at least one item to purchase table');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalPaid = paidAmount === '' ? draftGrandTotal : Number(paidAmount);
      const payload = {
        supplierId: selectedSupplierId && selectedSupplierId !== 'new' ? Number(selectedSupplierId) : undefined,
        supplierName: supplierName.trim(),
        supplierPhone: supplierPhone.trim() || undefined,
        purchaseDate,
        totalAmount: draftGrandTotal,
        paidAmount: finalPaid,
        paymentStatus: finalPaid >= draftGrandTotal ? 'paid' : (finalPaid > 0 ? 'partial' : 'unpaid'),
        paymentMethod: purchasePaymentMethod,
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
        fetchSuppliers();
        setViewMode('invoices');
        setDraftItems([]);
        setSelectedSupplierId('');
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

  // Export Supplier Debts Report to Excel
  const handleExportDebtsExcel = () => {
    downloadXlsx({
      filename: `galokids-supplier-debts-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: language === 'ku' ? 'قەرزی سەپلایەرەکان' : 'Supplier Debts',
      title: [
        language === 'ku' ? 'ڕاپۆرتی پوختەی قەرزی دابینکەران و سەپلایەرەکان' : 'Suppliers Debt & Statement Report',
        `${suppliers.length} ${language === 'ku' ? 'سەپلایەر' : 'Suppliers'} · ${language === 'ku' ? 'کۆی قەرز:' : 'Total Debt:'} ${formatIQDLabel(metrics.totalSuppliersDebt)}`
      ],
      columns: [
        { header: language === 'ku' ? 'ناوی سەپلایەر' : 'Supplier Name', width: 25, value: (r: any) => r.name },
        { header: language === 'ku' ? 'کۆمپانیا' : 'Company', width: 22, value: (r: any) => r.company || '-' },
        { header: language === 'ku' ? 'مۆبایل' : 'Phone', width: 16, value: (r: any) => r.phone || '-' },
        { header: language === 'ku' ? 'کۆی کڕینەکان' : 'Total Volume', width: 18, value: (r: any) => r.totalPurchases || 0 },
        { header: language === 'ku' ? 'کۆی پارەی دراو' : 'Total Paid', width: 18, value: (r: any) => r.totalPaid || 0 },
        { header: language === 'ku' ? 'قەرزی سەرەتایی' : 'Opening Debt', width: 16, value: (r: any) => r.openingBalance || 0 },
        { header: language === 'ku' ? 'قەرزی ماوەی ئێستا' : 'Current Debt Balance', width: 20, value: (r: any) => r.debtBalance || 0 },
      ],
      rows: suppliers,
    });
  };

  // Print Supplier Statement
  const handlePrintSupplierStatement = (sup: Supplier) => {
    const supPurchases = purchases.filter(p => String(p.supplierId) === String(sup.id) || p.supplierName === sup.name);
    const w = window.open('', '_blank', 'width=900,height=800');
    if (!w) return;

    const purchasesHtml = supPurchases.map((p, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px; font-family: monospace; font-weight: bold;">#${p.invoiceNumber}</td>
        <td style="padding: 8px; text-align: center;">${p.purchaseDate}</td>
        <td style="padding: 8px; text-align: right; font-family: monospace;">${formatIQDLabel(Number(p.totalAmount || 0))}</td>
        <td style="padding: 8px; text-align: right; font-family: monospace; color: #15803d;">${formatIQDLabel(Number(p.paidAmount || 0))}</td>
        <td style="padding: 8px; text-align: right; font-family: monospace; color: #b91c1c; font-weight: bold;">${formatIQDLabel(Math.max(0, Number(p.totalAmount || 0) - Number(p.paidAmount || 0)))}</td>
      </tr>
    `).join('');

    w.document.write(`
      <!doctype html>
      <html dir="rtl" lang="ku">
        <head>
          <meta charset="utf-8" />
          <title>کەشفی حیساب - ${sup.name}</title>
          <style>
            body { font-family: sans-serif; margin: 30px; direction: rtl; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
            th { background: #0f172a; color: white; padding: 8px; }
            .totals { float: left; width: 320px; margin-top: 15px; }
            .total-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
            .grand-total { font-size: 16px; font-weight: bold; color: #b91c1c; border-bottom: 2px solid #b91c1c; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div style="font-size: 20px; font-weight: bold;">GALOKIDS - کەشفی حیساباتی دابینکەر</div>
              <div style="color: #64748b; font-size: 12px; margin-top: 4px;">Supplier Statement of Account</div>
            </div>
            <div style="text-align: left;">
              <div style="color: #64748b; font-size: 12px;">بەرواری دەرچوون: ${shopToday()}</div>
            </div>
          </div>

          <div class="info-grid">
            <div><strong>ناوی دابینکەر:</strong> ${sup.name}</div>
            <div><strong>کۆمپانیا:</strong> ${sup.company || 'نادیارە'}</div>
            <div><strong>مۆبایل:</strong> ${sup.phone || 'نادیارە'}</div>
            <div><strong>ناونیشان:</strong> ${sup.address || 'نادیارە'}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th style="text-align: right;">ژمارەی پسوولە</th>
                <th>بەروار</th>
                <th style="text-align: right;">کۆی پسوولە</th>
                <th style="text-align: right;">بڕی دراو</th>
                <th style="text-align: right;">قەرزی ماوە</th>
              </tr>
            </thead>
            <tbody>
              ${purchasesHtml || '<tr><td colspan="6" style="text-align: center; padding: 15px;">هیچ پسوولەیەک تۆمار نەکراوە</td></tr>'}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row"><span>کۆی گشتی کڕینەکان:</span> <span>${formatIQDLabel(Number(sup.totalPurchases || 0))}</span></div>
            <div class="total-row"><span>کۆی پارەی دراو:</span> <span>${formatIQDLabel(Number(sup.totalPaid || 0))}</span></div>
            <div class="total-row grand-total"><span>کۆی قەرزی ماوەی سەپلایەر:</span> <span>${formatIQDLabel(Number(sup.debtBalance || 0))}</span></div>
          </div>

          <div style="clear: both; margin-top: 60px; display: flex; justify-content: space-between;">
            <div>واژۆی ژمێریاری: ________________</div>
            <div>واژۆی سەپلایەر: ________________</div>
          </div>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
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
      {/* ========================================================= */}
      {/* VIEW 1: STANDALONE FULL PAGE - NEW PURCHASE */}
      {/* ========================================================= */}
      {viewMode === 'create' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Sticky Navigation Header */}
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 p-5 rounded-[2.5rem] shadow-sm sticky top-4 z-40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('invoices')}
                className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                <span>{language === 'ku' ? 'گەڕانەوە بۆ پسوولەکان' : 'Back to Purchases'}</span>
              </button>

              <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-indigo-600" />
                  <span>{language === 'ku' ? 'تۆمارکردنی کڕینی نوێ و نوێکردنەوەی نرخەکان' : 'New Purchase & Price Update'}</span>
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {language === 'ku' ? 'بارکۆد سکان بکە یان ناوی بەرهەم بنووسە بۆ زیادکردن بۆ ناو خشتەی کڕین.' : 'Scan barcode or search product name to add to restock table.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-left bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-2xl">
                <span className="text-[10px] text-indigo-500 block font-bold">{language === 'ku' ? 'کۆی تێچوو:' : 'Grand Total:'}</span>
                <span className="text-lg font-black font-mono text-indigo-950">{formatIQDLabel(draftGrandTotal)}</span>
              </div>

              <button
                onClick={handleSubmitPurchase}
                disabled={isSubmitting || draftItems.length === 0}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer active:scale-95 flex items-center gap-2"
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

          {/* Section 1: Supplier & Invoice Information */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-6 rounded-[2.5rem] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>{language === 'ku' ? '١. زانیارییەکانی سەپلایەر و پارەدان' : '1. Supplier & Payment Info'}</span>
              </h3>

              <button
                type="button"
                onClick={() => {
                  setEditingSupplier(null);
                  setSupFormName('');
                  setSupFormCompany('');
                  setSupFormContact('');
                  setSupFormPhone('');
                  setSupFormEmail('');
                  setSupFormAddress('');
                  setSupFormOpeningBalance('0');
                  setSupFormNotes('');
                  setIsNewSupplierModalOpen(true);
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'ku' ? '+ دروستکردنی ئەکاونتی سەپلایەری نوێ' : '+ New Supplier Account'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Supplier Picker */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {language === 'ku' ? 'هەڵبژاردنی هەژماری سەپلایەر *' : 'Select Supplier Account *'}
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => handleSupplierSelectChange(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">{language === 'ku' ? '-- سەپلایەرێک هەڵبژێرە --' : '-- Choose a Supplier --'}</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.company ? `(${s.company})` : ''} {s.debtBalance && s.debtBalance > 0 ? `[قەرز: ${formatIQD(s.debtBalance)}]` : ''}
                    </option>
                  ))}
                  <option value="new">{language === 'ku' ? '✏️ نووسینی ناوی نوێ لە خوارەوە...' : '✏️ Other / Type Name Below...'}</option>
                </select>
              </div>

              {/* Supplier Name */}
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
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {language === 'ku' ? 'ژمارەی مۆبایل' : 'Phone Number'}
                </label>
                <input
                  type="text"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  placeholder="0750 000 0000"
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {language === 'ku' ? 'بەرواری کڕین *' : 'Purchase Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {language === 'ku' ? 'دۆخی پارەدان' : 'Payment Status'}
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="paid">{language === 'ku' ? '✓ بە تەواوی دراوە (Paid)' : 'Paid'}</option>
                  <option value="partial">{language === 'ku' ? '⏳ بەشێکی دراوە (Partial)' : 'Partial'}</option>
                  <option value="unpaid">{language === 'ku' ? '⚠️ قەرز / نەدراوە (Unpaid)' : 'Unpaid / Debt'}</option>
                </select>
              </div>

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
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {language === 'ku' ? 'شێوازی پارەدان' : 'Payment Method'}
                </label>
                <select
                  value={purchasePaymentMethod}
                  onChange={(e) => setPurchasePaymentMethod(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="cash">{language === 'ku' ? 'کاش (Cash)' : 'Cash'}</option>
                  <option value="bank">{language === 'ku' ? 'حەواڵە / بانک (Bank)' : 'Bank'}</option>
                  <option value="debt">{language === 'ku' ? 'قەرز (Debt)' : 'Debt'}</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {language === 'ku' ? 'تێبینی پسوولە' : 'Invoice Notes'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={language === 'ku' ? 'تێبینی ئارەزوومەندانە...' : 'Optional notes...'}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Product Search & Barcode Scan Input (Top of Table) */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-6 rounded-[2.5rem] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>{language === 'ku' ? 'خشتەی کڕین' : 'Purchase Table'}</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {language === 'ku' ? 'بارکۆد سکان بکە یان ناو بنووسە بۆ ئەوەی ڕاستەوخۆ بخرێتە ناو خشتەکە.' : 'Scan barcode or type product name to add directly into the table.'}
                </p>
              </div>

              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-100 self-start sm:self-auto">
                {draftItems.length} {language === 'ku' ? 'جۆر زیادکراوە' : 'items'} ({draftTotalPieces} {language === 'ku' ? 'دانە' : 'pcs'})
              </span>
            </div>

            {/* Smart Fast Barcode & Product Search Bar with Dropdown */}
            <div ref={searchContainerRef} className="relative z-30">
              <div className="relative">
                <Barcode className="w-5 h-5 text-indigo-600 absolute right-4 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={productSearch}
                  onFocus={() => setIsSearchDropdownOpen(true)}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setIsSearchDropdownOpen(true);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={language === 'ku' ? 'بارکۆد سکان بکە یان ناوی بەرهەم / کۆد بنووسە و Enter داگرە...' : 'Scan barcode or type product name/SKU and press Enter...'}
                  className="w-full pl-10 pr-12 py-3.5 bg-slate-50 border-2 border-indigo-100 hover:border-indigo-300 focus:border-indigo-600 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 outline-none shadow-xs transition-all placeholder:text-slate-400"
                />
                {productSearch && (
                  <button
                    onClick={() => {
                      setProductSearch('');
                      setIsSearchDropdownOpen(false);
                    }}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Floating Dropdown Results */}
              {isSearchDropdownOpen && searchResults.length > 0 && (
                <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-200 p-3 max-h-[380px] overflow-y-auto space-y-2 animate-fadeIn hide-scrollbar">
                  <div className="text-[11px] font-bold text-slate-400 px-3 py-1 flex items-center justify-between">
                    <span>{language === 'ku' ? 'ئەنجامەکانی گەڕان (کلیک لەسەر ڕەنگ و سایزەکان بکە):' : 'Matching Products (Click variant to add):'}</span>
                    <span>{searchResults.length} {language === 'ku' ? 'بەرهەم' : 'products'}</span>
                  </div>

                  {searchResults.map(prod => (
                    <div
                      key={prod.id}
                      className="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        {prod.imageUrl ? (
                          <img src={prod.imageUrl} alt="" className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0 bg-white" />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-black text-slate-900 text-xs sm:text-sm">
                            {(language === 'ku' ? prod.nameKu : prod.name) || prod.name}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] font-mono mt-0.5">
                            <span className="text-slate-400">{language === 'ku' ? 'تێچوو:' : 'Cost:'} {formatIQDLabel(Number(prod.cost || 0))}</span>
                            <span className="text-indigo-600 font-bold">{formatIQDLabel(Number(prod.price || 0))}</span>
                          </div>
                        </div>
                      </div>

                      {/* Variation Badges */}
                      <div className="flex items-center flex-wrap gap-1.5">
                        {(prod.variations || []).map((v, vIdx) => {
                          const isAdded = draftItems.some(it => String(it.productVariationId) === String(v.id));
                          return (
                            <button
                              key={v.id || vIdx}
                              type="button"
                              onClick={() => handleAddVariationToDraft(prod, v)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                isAdded
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                  : 'bg-white hover:bg-indigo-600 hover:text-white text-slate-700 border-slate-200'
                              }`}
                            >
                              <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: getColorHex(v.color) }} />
                              <span>{v.size || v.color}</span>
                              <span className="opacity-70 font-mono text-[10px]">({v.stockQuantity || 0})</span>
                            </button>
                          );
                        })}

                        {prod.variations && prod.variations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleAddAllVariationsOfProduct(prod)}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white font-black text-xs transition-colors cursor-pointer"
                          >
                            + {language === 'ku' ? 'هەموو جۆرەکان' : 'All'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* خشتەی کڕین (The Purchase & Price Updates Table) */}
            {draftItems.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="font-bold text-slate-700 text-sm">
                  {language === 'ku' ? 'خشتەی کڕین بەتاڵە' : 'Purchase table is empty'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {language === 'ku' ? 'بارکۆد سکان بکە یان ناوی بەرهەم لە سەرەوە بنووسە بۆ زیادکردن.' : 'Scan a barcode or search product name above to add items.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900 text-white text-[11px] font-bold">
                    <tr>
                      <th className="px-4 py-3 rounded-tr-xl">{language === 'ku' ? 'کاڵا و جۆرەکەی' : 'Product & Variant'}</th>
                      <th className="px-3 py-3 text-center">{language === 'ku' ? 'ستۆکی ئێستا' : 'Current Stock'}</th>
                      <th className="px-3 py-3 text-center" style={{ width: '130px' }}>{language === 'ku' ? 'بڕی کڕین (+ دانە)' : 'Buy Quantity'}</th>
                      <th className="px-4 py-3 text-center" style={{ width: '160px' }}>{language === 'ku' ? 'تێچوو (پێشوو ➔ نوێ)' : 'Cost (Old ➔ New)'}</th>
                      <th className="px-4 py-3 text-center" style={{ width: '160px' }}>{language === 'ku' ? 'فرۆشتن (پێشوو ➔ نوێ)' : 'Retail (Old ➔ New)'}</th>
                      <th className="px-3 py-3 text-center">{language === 'ku' ? 'قازانج' : 'Margin'}</th>
                      <th className="px-4 py-3">{language === 'ku' ? 'کۆی تێچوو' : 'Subtotal'}</th>
                      <th className="px-3 py-3 text-center rounded-tl-xl">{language === 'ku' ? 'سڕینەوە' : 'Del'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {draftItems.map((item, idx) => {
                      const subtotal = item.quantity * item.costPrice;
                      const costChanged = item.costPrice !== item.previousCost;
                      const priceChanged = item.retailPrice !== item.previousPrice;
                      const margin = item.retailPrice > 0 ? Math.round(((item.retailPrice - item.costPrice) / item.retailPrice) * 100) : 0;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {item.productImage ? (
                                <img src={item.productImage} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                  <Package className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 text-xs">{item.productName}</p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                  <span className="inline-flex items-center gap-1 font-bold">
                                    <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: getColorHex(item.variationColor) }} />
                                    <span>{item.variationSize || item.variationColor}</span>
                                  </span>
                                  {item.variationBarcode && <span className="font-mono text-slate-400">[{item.variationBarcode}]</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-3 text-center font-mono font-black text-slate-700">
                            {item.currentStock}
                          </td>

                          {/* Quantity Input */}
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setDraftItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it));
                                }}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
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
                                className="w-14 text-center font-mono font-black py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setDraftItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: it.quantity + 1 } : it));
                                }}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Cost Price */}
                          <td className="px-4 py-3 text-center">
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
                                className={`w-28 text-center font-mono font-black py-1.5 px-2 rounded-xl border text-xs outline-none ${
                                  costChanged ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-300/30' : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}
                              />
                            </div>
                          </td>

                          {/* Retail Price */}
                          <td className="px-4 py-3 text-center">
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
                                className={`w-28 text-center font-mono font-black py-1.5 px-2 rounded-xl border text-xs outline-none ${
                                  priceChanged ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-2 ring-indigo-300/30' : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}
                              />
                            </div>
                          </td>

                          {/* Profit Margin */}
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                              margin >= 30 ? 'bg-emerald-100 text-emerald-800' : margin >= 15 ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {margin}%
                            </span>
                          </td>

                          {/* Subtotal */}
                          <td className="px-4 py-3 font-mono font-black text-indigo-950 text-xs">
                            {formatIQDLabel(subtotal)}
                          </td>

                          {/* Delete */}
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setDraftItems(prev => prev.filter((_, i) => i !== idx))}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
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
        </div>
      ) : (
        /* ========================================================= */
        /* VIEW 2, 3 & 4: INVOICES, SUPPLIERS & REPORTS */
        /* ========================================================= */
        <div className="space-y-6">
          {/* Top Hero Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-indigo-900/40 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-rose-500 to-emerald-500 opacity-80" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold mb-3">
                  <ShoppingBag className="w-4 h-4 text-indigo-400" />
                  <span>{language === 'ku' ? 'بەڕێوەبردنی کڕین و سەپلایەرەکان' : 'Purchases & Suppliers Management'}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  {language === 'ku' ? 'کڕین، عەمبار و هەژماری سەپلایەر' : 'Purchases, Restock & Suppliers'}
                </h1>
                <p className="text-slate-300 text-sm mt-1 max-w-2xl">
                  {language === 'ku'
                    ? 'تۆمارکردنی پسوولەکانی کڕین، نوێکردنەوەی نرخی تێچوو و فرۆشتن، شیکاری قەرز، و کەشفی حیساباتی دابینکەران.'
                    : 'Manage supplier restock invoices, update new cost/retail prices, debt analytics, and supplier statements.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setViewMode('create')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg hover:shadow-indigo-500/25 transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === 'ku' ? '+ تۆمارکردنی کڕینی نوێ' : '+ New Purchase Order'}</span>
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
                <p className="text-[11px] text-emerald-600 font-bold mt-0.5">✓ {language === 'ku' ? 'دراوە بە سەپلایەران' : 'Paid to suppliers'}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500">{language === 'ku' ? 'کۆی قەرزی سەپلایەرەکان' : 'Total Suppliers Debt'}</p>
                <h3 className="text-xl font-black text-rose-700 mt-1 font-mono">{formatIQDLabel(metrics.totalSuppliersDebt || metrics.totalUnpaidAmount)}</h3>
                <p className="text-[11px] text-rose-600 font-bold mt-0.5">⚠️ {language === 'ku' ? 'قەرزی ماوە لەسەرمان' : 'Outstanding debts'}</p>
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

          {/* Sub-Navigation Switcher (Invoices vs Suppliers vs Reports) */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-200/60 rounded-2xl w-fit flex-wrap">
            <button
              onClick={() => setViewMode('invoices')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'invoices'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>{language === 'ku' ? 'پسوولەکانی کڕین' : 'Purchase Invoices'} ({purchases.length})</span>
            </button>

            <button
              onClick={() => setViewMode('suppliers')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'suppliers'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>{language === 'ku' ? 'هەژماری سەپلایەرەکان' : 'Suppliers Directory'} ({suppliers.length})</span>
            </button>

            <button
              onClick={() => setViewMode('reports')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'reports'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>{language === 'ku' ? 'ڕاپۆرت و شیکاری قەرز' : 'Reports & Debt Analytics'}</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* SUB-TAB 1: INVOICES LIST */}
          {/* ========================================================= */}
          {viewMode === 'invoices' && (
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-6 rounded-[2.5rem] shadow-sm space-y-6 animate-fadeIn">
              {/* Search & Filters */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[260px]">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === 'ku' ? 'گەڕان بەپێی پسوولە، ناوی سەپلایەر یان تێبینی...' : 'Search by invoice #, supplier name, notes...'}
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
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

              {/* Table of Invoices */}
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
                            onClick={() => setViewMode('create')}
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

                            {/* Expanded Drawer Row */}
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
          )}

          {/* ========================================================= */}
          {/* SUB-TAB 2: SUPPLIERS DIRECTORY */}
          {/* ========================================================= */}
          {viewMode === 'suppliers' && (
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-6 rounded-[2.5rem] shadow-sm space-y-6 animate-fadeIn">
              {/* Header & Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    placeholder={language === 'ku' ? 'گەڕان بۆ سەپلایەر بەپێی ناو، کۆمپانیا یان مۆبایل...' : 'Search supplier name, company or phone...'}
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExportDebtsExcel}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{language === 'ku' ? 'ئێکسڵی قەرزەکان' : 'Debts Excel'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingSupplier(null);
                      setSupFormName('');
                      setSupFormCompany('');
                      setSupFormContact('');
                      setSupFormPhone('');
                      setSupFormEmail('');
                      setSupFormAddress('');
                      setSupFormOpeningBalance('0');
                      setSupFormNotes('');
                      setIsNewSupplierModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{language === 'ku' ? '+ دروستکردنی هەژماری سەپلایەر' : '+ New Supplier Account'}</span>
                  </button>
                </div>
              </div>

              {/* Suppliers Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900 text-white text-[11px] uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3.5 rounded-tr-xl">{language === 'ku' ? 'ناوی سەپلایەر / کۆمپانیا' : 'Supplier / Company'}</th>
                      <th className="px-3 py-3.5">{language === 'ku' ? 'پەیوەندی' : 'Contact & Phone'}</th>
                      <th className="px-3 py-3.5 text-center">{language === 'ku' ? 'ژمارەی کڕین' : 'Purchases'}</th>
                      <th className="px-3 py-3.5">{language === 'ku' ? 'کۆی کڕینەکان' : 'Total Volume'}</th>
                      <th className="px-3 py-3.5">{language === 'ku' ? 'پارەی دراو' : 'Total Paid'}</th>
                      <th className="px-3 py-3.5">{language === 'ku' ? 'قەرزی ماوە' : 'Debt Balance'}</th>
                      <th className="px-4 py-3.5 text-center rounded-tl-xl">{language === 'ku' ? 'کردارەکان' : 'Actions'}</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {isSuppliersLoading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400">
                          <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-indigo-500" />
                          <p className="font-bold">{language === 'ku' ? 'هێنانی لیستی سەپلایەرەکان...' : 'Loading suppliers...'}</p>
                        </td>
                      </tr>
                    ) : filteredSuppliers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400">
                          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                          <p className="font-bold text-slate-600 text-sm">
                            {language === 'ku' ? 'هیچ سەپلایەرێک نەدۆزرایەوە' : 'No suppliers found'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredSuppliers.map(s => {
                        const debt = Number(s.debtBalance || 0);

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="font-black text-slate-900 text-xs flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                                <span>{s.name}</span>
                              </div>
                              {s.company && (
                                <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                                  {s.company}
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-3.5">
                              {s.phone ? (
                                <div className="font-mono text-slate-700 text-xs flex items-center gap-1.5">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{s.phone}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                              {s.contactPerson && (
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  ({s.contactPerson})
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-3.5 text-center">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                                {s.purchasesCount || 0} {language === 'ku' ? 'پسوولە' : 'orders'}
                              </span>
                            </td>

                            <td className="px-3 py-3.5 font-mono font-bold text-slate-900 text-xs">
                              {formatIQDLabel(Number(s.totalPurchases || 0))}
                            </td>

                            <td className="px-3 py-3.5 font-mono font-bold text-emerald-700 text-xs">
                              {formatIQDLabel(Number(s.totalPaid || 0))}
                            </td>

                            <td className="px-3 py-3.5">
                              <span className={`inline-flex items-center gap-1 font-mono font-black text-xs px-2.5 py-1 rounded-full ${
                                debt > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {debt > 0 ? formatIQDLabel(debt) : '٠ (پاکتاوە)'}
                              </span>
                            </td>

                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedSupplierForAccount(s);
                                    setIsPaymentModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                                  title={language === 'ku' ? 'تۆمارکردنی پارەدان' : 'Pay debt'}
                                >
                                  <Wallet className="w-3.5 h-3.5" />
                                  <span>{language === 'ku' ? 'واصڵکردن' : 'Pay'}</span>
                                </button>

                                <button
                                  onClick={() => handlePrintSupplierStatement(s)}
                                  className="p-1.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title={language === 'ku' ? 'چاپکردنی کەشفی حیساب' : 'Print Statement'}
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleOpenEditSupplier(s)}
                                  className="p-1.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title={language === 'ku' ? 'دەستکاریکردن' : 'Edit'}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => {
                                    if (confirm(language === 'ku' ? 'دڵنیایت لە سڕینەوەی ئەم هەژمارە؟' : 'Are you sure you want to delete this supplier account?')) {
                                      deleteSupplier(s.id);
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
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SUB-TAB 3: PURCHASES & SUPPLIERS REPORTS & ANALYTICS */}
          {/* ========================================================= */}
          {viewMode === 'reports' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Reports Filter Bar */}
              <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-5 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 mr-1">{language === 'ku' ? 'ماوە:' : 'Period:'}</span>
                  {[
                    { id: 'today', label: language === 'ku' ? 'ئەمڕۆ' : 'Today' },
                    { id: '7d', label: language === 'ku' ? '٧ ڕۆژ' : '7 Days' },
                    { id: 'this_month', label: language === 'ku' ? 'ئەم مانگە' : 'This Month' },
                    { id: '30d', label: language === 'ku' ? '٣٠ ڕۆژ' : '30 Days' },
                    { id: 'all', label: language === 'ku' ? 'هەموو کات' : 'All Time' },
                    { id: 'custom', label: language === 'ku' ? 'دیاریکراو' : 'Custom' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setReportPeriod(tab.id as any)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        reportPeriod === tab.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {reportPeriod === 'custom' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={reportCustomStart}
                        onChange={(e) => setReportCustomStart(e.target.value)}
                        className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                      />
                      <span className="text-slate-400 text-xs">-</span>
                      <input
                        type="date"
                        value={reportCustomEnd}
                        onChange={(e) => setReportCustomEnd(e.target.value)}
                        className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                      />
                    </div>
                  )}

                  <select
                    value={reportSupplierFilter}
                    onChange={(e) => setReportSupplierFilter(e.target.value)}
                    className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="all">{language === 'ku' ? 'هەموو سەپلایەرەکان' : 'All Suppliers'}</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      checked={reportDebtOnly}
                      onChange={(e) => setReportDebtOnly(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{language === 'ku' ? 'تەنها قەرزەکان' : 'Debt Only'}</span>
                  </label>

                  <button
                    onClick={handleExportDebtsExcel}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>{language === 'ku' ? 'ئێکسڵی گشتی' : 'Export Excel'}</span>
                  </button>
                </div>
              </div>

              {/* Reports Financial KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-sm">
                  <span className="text-xs font-bold text-slate-500">{language === 'ku' ? 'کۆی کڕین لەم ماوەیەدا' : 'Purchases in Period'}</span>
                  <h3 className="text-xl font-black text-slate-900 mt-1 font-mono">{formatIQDLabel(reportMetrics.volume)}</h3>
                  <p className="text-[11px] text-slate-400 font-bold mt-1">{reportMetrics.invoicesCount} {language === 'ku' ? 'پسوولە' : 'invoices'}</p>
                </div>

                <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-sm">
                  <span className="text-xs font-bold text-slate-500">{language === 'ku' ? 'پارەی دراو بە سەپلایەر' : 'Paid in Period'}</span>
                  <h3 className="text-xl font-black text-emerald-700 mt-1 font-mono">{formatIQDLabel(reportMetrics.paid)}</h3>
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">✓ {language === 'ku' ? 'دراوە' : 'Settled'}</p>
                </div>

                <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-sm">
                  <span className="text-xs font-bold text-slate-500">{language === 'ku' ? 'قەرزی ماوە لەسەر ئەم ماوەیە' : 'Remaining Debt in Period'}</span>
                  <h3 className="text-xl font-black text-rose-700 mt-1 font-mono">{formatIQDLabel(reportMetrics.debt)}</h3>
                  <p className="text-[11px] text-rose-600 font-bold mt-1">⚠️ {language === 'ku' ? 'قەرزی نەدراو' : 'Unpaid balance'}</p>
                </div>

                <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-sm">
                  <span className="text-xs font-bold text-slate-500">{language === 'ku' ? 'بەهای فرۆشتنی پێشبینیکراو' : 'Projected Retail Value'}</span>
                  <h3 className="text-xl font-black text-indigo-950 mt-1 font-mono">{formatIQDLabel(reportMetrics.projectedRetailValue)}</h3>
                  <p className="text-[11px] text-indigo-600 font-black mt-1">+{reportMetrics.profitMargin}% {language === 'ku' ? 'قازانجی خەمڵێنراو' : 'gross margin'}</p>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Purchases & Payments Trend Chart */}
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-6 rounded-[2.5rem] shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span>{language === 'ku' ? 'شیکاری کڕین و پارەدان بەپێی کات' : 'Purchases & Payments Timeline Trend'}</span>
                  </h3>

                  {trendChartData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-slate-400 text-xs font-bold">
                      {language === 'ku' ? 'داتای کڕین بەردەست نییە بۆ ئەم ماوەیە' : 'No purchase trend data for this period'}
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <RechartsTooltip formatter={(val: any) => formatIQDLabel(Number(val))} />
                          <Area type="monotone" dataKey="total" name={language === 'ku' ? 'کۆی کڕین' : 'Total'} stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
                          <Area type="monotone" dataKey="paid" name={language === 'ku' ? 'پارەی دراو' : 'Paid'} stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Suppliers Debt Distribution */}
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-6 rounded-[2.5rem] shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-rose-600" />
                    <span>{language === 'ku' ? 'دابەشبوونی قەرزی سەپلایەرەکان' : 'Suppliers Debt Distribution'}</span>
                  </h3>

                  {supplierDebtChartData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-emerald-600 text-xs font-bold">
                      ✓ {language === 'ku' ? 'هەموو حیساباتی سەپلایەرەکان پاکتاوە و هیچ قەرزێک نییە!' : 'All supplier accounts are fully settled!'}
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={supplierDebtChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" tick={{ fontSize: 10 }} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 'bold' }} width={110} />
                          <RechartsTooltip formatter={(val: any) => formatIQDLabel(Number(val))} />
                          <Bar dataKey="debt" name={language === 'ku' ? 'قەرزی ماوە' : 'Debt'} fill="#f43f5e" radius={[0, 8, 8, 0]}>
                            {supplierDebtChartData.map((_, idx) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Tables: Top Restocked Items */}
              <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-6 rounded-[2.5rem] shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-600" />
                    <span>{language === 'ku' ? 'پڕکڕدراوترین بەرهەمەکانی ئەم ماوەیە (Top Restocked Items)' : 'Top Restocked Products'}</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-400">{topRestockedProducts.length} {language === 'ku' ? 'بەرهەم' : 'products'}</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-900 text-white text-[11px] font-bold">
                      <tr>
                        <th className="px-4 py-3 rounded-tr-xl">#</th>
                        <th className="px-4 py-3">{language === 'ku' ? 'ناوی بەرهەم' : 'Product Name'}</th>
                        <th className="px-3 py-3 text-center">{language === 'ku' ? 'دانەی کڕدراو' : 'Pieces Bought'}</th>
                        <th className="px-3 py-3">{language === 'ku' ? 'کۆی تێچوو' : 'Total Cost Invested'}</th>
                        <th className="px-3 py-3">{language === 'ku' ? 'بەهای فرۆشتن' : 'Retail Value'}</th>
                        <th className="px-3 py-3 text-center rounded-tl-xl">{language === 'ku' ? 'قازانجی خەمڵێنراو' : 'Projected Profit'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {topRestockedProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400 font-bold">
                            {language === 'ku' ? 'هیچ داتایەک نەدۆزرایەوە' : 'No items data available'}
                          </td>
                        </tr>
                      ) : (
                        topRestockedProducts.map((p, idx) => {
                          const profit = Math.max(0, p.retail - p.cost);
                          const margin = p.retail > 0 ? Math.round((profit / p.retail) * 100) : 0;

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                              <td className="px-4 py-3 font-black text-slate-900">{p.name}</td>
                              <td className="px-3 py-3 text-center font-mono font-black text-indigo-700">{p.pieces} {language === 'ku' ? 'دانە' : 'pcs'}</td>
                              <td className="px-3 py-3 font-mono font-bold text-slate-900">{formatIQDLabel(p.cost)}</td>
                              <td className="px-3 py-3 font-mono font-bold text-emerald-700">{formatIQDLabel(p.retail)}</td>
                              <td className="px-3 py-3 text-center">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                  +{formatIQD(profit)} ({margin}%)
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* UNIVERSAL MODAL: CREATE / EDIT SUPPLIER ACCOUNT */}
      {/* ========================================================= */}
      {isNewSupplierModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto font-arabic animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl border border-slate-100 relative my-auto p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-900 text-base">
                  {editingSupplier
                    ? (language === 'ku' ? 'دەستکاریکردنی هەژماری سەپلایەر' : 'Edit Supplier Account')
                    : (language === 'ku' ? 'دروستکردنی هەژماری سەپلایەری نوێ' : 'Create New Supplier Account')}
                </h3>
              </div>
              <button onClick={() => setIsNewSupplierModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {language === 'ku' ? 'ناوی دابینکەر / سەپلایەر *' : 'Supplier Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={supFormName}
                    onChange={(e) => setSupFormName(e.target.value)}
                    placeholder={language === 'ku' ? 'نموونە: دابینکەری ئەستەنبوڵ' : 'Supplier Name'}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {language === 'ku' ? 'ناوی کۆمپانیا / براند' : 'Company / Brand'}
                  </label>
                  <input
                    type="text"
                    value={supFormCompany}
                    onChange={(e) => setSupFormCompany(e.target.value)}
                    placeholder="Istanbul Kids Fashion"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {language === 'ku' ? 'ژمارەی مۆبایل' : 'Phone Number'}
                  </label>
                  <input
                    type="text"
                    value={supFormPhone}
                    onChange={(e) => setSupFormPhone(e.target.value)}
                    placeholder="0750 000 0000"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {language === 'ku' ? 'کەسی پەیوەندیدار' : 'Contact Person'}
                  </label>
                  <input
                    type="text"
                    value={supFormContact}
                    onChange={(e) => setSupFormContact(e.target.value)}
                    placeholder="Ali Ahmed"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {language === 'ku' ? 'ناونیشان / وڵات' : 'Address / Country'}
                  </label>
                  <input
                    type="text"
                    value={supFormAddress}
                    onChange={(e) => setSupFormAddress(e.target.value)}
                    placeholder="Turkey - Istanbul"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {language === 'ku' ? 'قەرزی سەرەتایی (دینار)' : 'Opening Debt Balance (IQD)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={supFormOpeningBalance}
                    onChange={(e) => setSupFormOpeningBalance(e.target.value)}
                    placeholder="0"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {language === 'ku' ? 'تێبینی' : 'Notes'}
                </label>
                <textarea
                  rows={2}
                  value={supFormNotes}
                  onChange={(e) => setSupFormNotes(e.target.value)}
                  placeholder={language === 'ku' ? 'تێبینی زیاتر دەربارەی سەپلایەر...' : 'Additional notes...'}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewSupplierModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  {language === 'ku' ? 'پاشگەزبوونەوە' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={isSavingSupplier}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingSupplier ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{language === 'ku' ? 'پاشەکەوتکردن' : 'Save Supplier'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* UNIVERSAL MODAL: RECORD SUPPLIER PAYMENT */}
      {/* ========================================================= */}
      {isPaymentModalOpen && selectedSupplierForAccount && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto font-arabic animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl border border-slate-100 relative my-auto p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    {language === 'ku' ? 'تۆمارکردنی پارەدان / واصڵکردن بە سەپلایەر' : 'Record Supplier Payment'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {selectedSupplierForAccount.name}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-2xl flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800">{language === 'ku' ? 'قەرزی ماوەی سەپلایەر:' : 'Outstanding Debt:'}</span>
              <span className="text-sm font-black font-mono text-rose-950">{formatIQDLabel(Number(selectedSupplierForAccount.debtBalance || 0))}</span>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {language === 'ku' ? 'بڕی پارەی دراو (دینار) *' : 'Payment Amount (IQD) *'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={String(selectedSupplierForAccount.debtBalance || '')}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {language === 'ku' ? 'بەروار' : 'Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full py-2 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {language === 'ku' ? 'شێوازی پارەدان' : 'Method'}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full py-2.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="cash">{language === 'ku' ? 'کاش (Cash)' : 'Cash'}</option>
                    <option value="bank">{language === 'ku' ? 'حەواڵە / بانک' : 'Bank'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {language === 'ku' ? 'تێبینی' : 'Notes'}
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder={language === 'ku' ? 'تێبینی...' : 'Optional notes...'}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  {language === 'ku' ? 'پاشگەزبوونەوە' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={isProcessingPayment || !paymentAmount}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isProcessingPayment ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{language === 'ku' ? 'تۆمارکردنی پارەدان' : 'Save Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
