import { formatIQDLabel } from "../utils/currency";
import React, { useState, useMemo, useEffect } from 'react';
import { Pagination } from '../components/Pagination';
import { useStore } from '../store';
import { Product, ProductVariation } from '../types';
import { Search, Plus, Minus, Trash2, CreditCard, Receipt, ShoppingBag, X, Pause, Printer, Play, Clock, RotateCcw, Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { getColorHex } from '../utils/colors';
import { useToast } from '../components/ui/Feedback';
import { POSNavbar } from '../components/POSNavbar';
import { POSProductGrid } from '../components/pos/POSProductGrid';
import { POSCartPanel } from '../components/pos/POSCartPanel';
import { adminTr } from '../i18n/adminDict';
import { printReceiptIframe } from '../utils/printHelper';
import { isCashierRole } from '../utils/roles';
import { getUnitPrice, getLineTotal, roundIQD } from '../utils/pricing';

export const POS: React.FC = () => {
  const { products, orders, addOrder, productsPagination, refreshProducts, lookupCustomer,
    storeSettings, getCurrentShift, openShift, getShiftReport, closeShift, getOrderById, refundOrder, currentUser,
    recordCashMovement, fetchCashMovements, exchangeOrder } = useStore();
  const toast = useToast();
  const [customerInfo, setCustomerInfo] = useState<any>(null);

  // ---- Shift state ----
  const [shift, setShift] = useState<any>(null);
  const [shiftLoaded, setShiftLoaded] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('');
  const [countedCash, setCountedCash] = useState('');
  const [shiftReport, setShiftReport] = useState<any>(null);
  const [zReport, setZReport] = useState<any>(null); // result after closing

  // ---- Cash paid into / taken out of the drawer outside a sale ----
  // Without this, any petty-cash spend or float top-up shows up as a till
  // difference at close, and the cashier gets blamed for it.
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashDirection, setCashDirection] = useState<'in' | 'out'>('out');
  const [cashAmount, setCashAmount] = useState('');
  const [cashReason, setCashReason] = useState('');
  const [cashMovements, setCashMovements] = useState<any[]>([]);
  const [isSavingCash, setIsSavingCash] = useState(false);

  const openCashModal = async (direction: 'in' | 'out') => {
    setCashDirection(direction);
    setCashAmount('');
    setCashReason('');
    setShowCashModal(true);
    setCashMovements(await fetchCashMovements());
  };

  const handleCashMovement = async () => {
    const amount = Math.round(parseFloat(cashAmount) || 0);
    if (amount <= 0) {
      toast(language === 'ku' ? 'بڕێکی دروست بنووسە' : language === 'ar' ? 'أدخل مبلغاً صحيحاً' : 'Enter a valid amount', 'error');
      return;
    }
    if (!cashReason.trim()) {
      toast(language === 'ku' ? 'هۆکارەکە بنووسە' : language === 'ar' ? 'اكتب السبب' : 'A reason is required', 'error');
      return;
    }

    setIsSavingCash(true);
    const res = await recordCashMovement(cashDirection, amount, cashReason.trim());
    setIsSavingCash(false);

    if (!res.success) {
      toast(res.message || (language === 'ku' ? 'تۆمار نەکرا' : language === 'ar' ? 'لم يتم الحفظ' : 'Could not save'), 'error');
      return;
    }

    toast(language === 'ku' ? 'تۆمارکرا ✅' : language === 'ar' ? 'تم التسجيل ✅' : 'Recorded ✅');
    setCashAmount('');
    setCashReason('');
    setCashMovements(await fetchCashMovements());
  };

  useEffect(() => {
    getCurrentShift().then(s => { 
      setShift(s); 
      setShiftLoaded(true); 
      if (!s) {
        setShowShiftModal(true);
      }
    });
  }, [getCurrentShift]);

  const handleOpenShift = async () => {
    const s = await openShift(parseFloat(openingFloat) || 0);
    if (s) { setShift(s); setOpeningFloat(''); setShowShiftModal(false); toast('Shift opened ✅'); }
    else toast('Could not open shift', 'error');
  };

  const openCloseModal = async () => {
    const rep = await getShiftReport();
    setShiftReport(rep?.summary || null);
    setShowShiftModal(true);
  };

  const handleCloseShift = async () => {
    const res = await closeShift(parseFloat(countedCash) || 0);
    if (res) {
      setZReport({ ...res.summary, counted: parseFloat(countedCash) || 0, difference: res.shift?.difference });
      setShift(null); setCountedCash(''); setShiftReport(null); setShowShiftModal(false);
      toast('Shift closed');
    } else toast('Could not close shift', 'error');
  };

  const handlePrintAndCloseShift = async () => {
    await printShiftSummary();
    await handleCloseShift();
  };

  // ---- Return / refund state ----
  const [showReturn, setShowReturn] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState('');
  const [returnOrder, setReturnOrder] = useState<any>(null);
  const [returnQty, setReturnQty] = useState<Record<number, number>>({});
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  const loadReturnOrder = async () => {
    setReturnLoading(true);
    const o = await getOrderById(returnOrderId.trim());
    setReturnLoading(false);
    if (o) { setReturnOrder(o); setReturnQty({}); }
    else toast('Order not found', 'error');
  };

  // Exchange: the items coming back are chosen below, the replacements are
  // whatever is already in the POS cart. One transaction, so stock for both
  // legs moves together.
  const [isExchange, setIsExchange] = useState(false);

  const submitExchange = async () => {
    const returned = Object.entries(returnQty)
      .filter(([, q]) => Number(q) > 0)
      .map(([id, q]) => ({ order_item_id: Number(id), quantity: Number(q) }));

    if (returned.length === 0) {
      toast(language === 'ku' ? 'کەمترین یەک بەرهەم بۆ گەڕاندنەوە هەڵبژێرە' : language === 'ar' ? 'اختر عنصراً واحداً على الأقل' : 'Select at least one item to return', 'error');
      return;
    }

    const replacements = posCart
      .filter(item => /^\d+$/.test(String(item.variation?.id)))
      .map(item => ({ product_variation_id: Number(item.variation.id), quantity: item.quantity }));

    if (replacements.length === 0) {
      toast(language === 'ku' ? 'بەرهەمی جێگرەوە بخە ناو سەبەتەکە' : language === 'ar' ? 'أضف البدائل إلى السلة' : 'Put the replacement items in the cart first', 'error');
      return;
    }

    setReturnLoading(true);
    try {
      const res = await exchangeOrder(returnOrder.id, returned, replacements, returnReason);
      const difference = Number(res?.difference || 0);

      toast(
        difference > 0
          ? (language === 'ku' ? `ئاڵوگۆڕ کرا — کڕیار ${formatIQDLabel(difference)} دەدات` : language === 'ar' ? `تم الاستبدال — يدفع العميل ${formatIQDLabel(difference)}` : `Exchanged — customer pays ${formatIQDLabel(difference)}`)
          : difference < 0
            ? (language === 'ku' ? `ئاڵوگۆڕ کرا — ${formatIQDLabel(-difference)} بگەڕێنەوە` : language === 'ar' ? `تم الاستبدال — أعد ${formatIQDLabel(-difference)}` : `Exchanged — give back ${formatIQDLabel(-difference)}`)
            : (language === 'ku' ? 'ئاڵوگۆڕ کرا ✅' : language === 'ar' ? 'تم الاستبدال ✅' : 'Exchanged ✅')
      );

      setShowReturn(false);
      setReturnOrder(null);
      setReturnOrderId('');
      setReturnQty({});
      setReturnReason('');
      setIsExchange(false);
      setPosCart([]);
      refreshProducts(1, 20, { search });
    } catch (e: any) {
      toast(e?.message || 'Exchange failed', 'error');
    } finally {
      setReturnLoading(false);
    }
  };

  const submitReturn = async () => {
    const items = Object.entries(returnQty)
      .filter(([, q]) => Number(q) > 0)
      .map(([id, q]) => ({ order_item_id: Number(id), quantity: Number(q) }));
    if (items.length === 0) { toast('Select at least one item to return', 'error'); return; }
    setReturnLoading(true);
    const res = await refundOrder(returnOrder.id, items, returnReason);
    setReturnLoading(false);
    if (res.success) {
      toast('Refund processed ✅');
      setShowReturn(false); setReturnOrder(null); setReturnOrderId(''); setReturnQty({}); setReturnReason('');
      refreshProducts(1, 20, { search });
    } else toast(res.message || 'Refund failed', 'error');
  };
  const { t, language } = useLanguage();
  const L = (key: string) => adminTr(key, language);
  const [search, setSearch] = useState('');
  
  // Quick Add State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState('Generic Item');
  const [quickPrice, setQuickPrice] = useState('');
  const [quickCost, setQuickCost] = useState('');
  const [quickQuantity, setQuickQuantity] = useState(1);
  const [quickSize, setQuickSize] = useState('N/A');
  const [quickColor, setQuickColor] = useState('N/A');

  const getProductName = (product: Product) => {
    if (language === 'ku' && product.nameKu) return product.nameKu;
    if (language === 'ar' && product.nameAr) return product.nameAr;
    return product.name;
  };

  const [posCart, setPosCart] = useState<{product: Product, variation: ProductVariation, quantity: number}[]>(() => {
    try {
      const draft = JSON.parse(localStorage.getItem('pos_active_draft') || '{}');
      return draft.posCart || [];
    } catch {
      return [];
    }
  });
  const [customerName, setCustomerName] = useState(() => {
    try {
      const draft = JSON.parse(localStorage.getItem('pos_active_draft') || '{}');
      return draft.customerName || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshProducts(1, 20, { search });
    }, 400);
    return () => clearTimeout(timer);
  }, [search, refreshProducts]);

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(p => 
      (p.name || '').toLowerCase().includes(q) || 
      (p.nameKu || '').toLowerCase().includes(q) || 
      (p.nameAr || '').toLowerCase().includes(q) || 
      (p.barcode || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, 20);
  }, [filteredProducts]);

  const addToPosCart = (product: Product, variation: ProductVariation) => {
    setPosCart(prev => {
      const existing = prev.find(item => item.product.id === product.id && item.variation.id === variation.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id && item.variation.id === variation.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, variation, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, variationId: string, delta: number) => {
    setPosCart(prev => prev.map(item => {
      if (item.product.id === productId && item.variation.id === variationId) {
        const newQ = item.quantity + delta;
        return { ...item, quantity: newQ > 0 ? newQ : 1 };
      }
      return item;
    }));
  };

  const removeItem = (productId: string, variationId: string) => {
    setPosCart(prev => prev.filter(item => !(item.product.id === productId && item.variation.id === variationId)));
  };

  const [discountAmt, setDiscountAmt] = useState<string>(() => {
    try {
      const draft = JSON.parse(localStorage.getItem('pos_active_draft') || '{}');
      return draft.discountAmt || '';
    } catch {
      return '';
    }
  });
  const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>(() => {
    try {
      const draft = JSON.parse(localStorage.getItem('pos_active_draft') || '{}');
      return draft.discountMode || 'amount';
    } catch {
      return 'amount';
    }
  });
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>(() => {
    try {
      const draft = JSON.parse(localStorage.getItem('pos_active_draft') || '{}');
      return draft.paymentMethod || 'cash';
    } catch {
      return 'cash';
    }
  });
  const [cashReceived, setCashReceived] = useState<string>(() => {
    try {
      const draft = JSON.parse(localStorage.getItem('pos_active_draft') || '{}');
      return draft.cashReceived || '';
    } catch {
      return '';
    }
  });
  const [userEditedCash, setUserEditedCash] = useState(false);
  const [customerPhone, setCustomerPhone] = useState(() => {
    try {
      const draft = JSON.parse(localStorage.getItem('pos_active_draft') || '{}');
      return draft.customerPhone || '';
    } catch {
      return '';
    }
  });

  // Save current active sale draft to local storage automatically
  useEffect(() => {
    const draft = {
      posCart,
      customerName,
      customerPhone,
      discountAmt,
      discountMode,
      paymentMethod,
      cashReceived
    };
    localStorage.setItem('pos_active_draft', JSON.stringify(draft));
  }, [posCart, customerName, customerPhone, discountAmt, discountMode, paymentMethod, cashReceived]);

  // Price each line exactly like the server does (variation override, then the
  // product's discounted price, then its normal price). Summing product.price
  // here made the cart rows, the total the cashier collected and the amount
  // stored on the order three different numbers.
  const subtotalVal = roundIQD(
    posCart.reduce((sum, item) => sum + getLineTotal(item.product, item.variation, item.quantity), 0)
  );
  const discountInput = parseFloat(discountAmt) || 0;
  const discountVal = roundIQD(
    discountMode === 'percent'
      ? Math.min(subtotalVal, subtotalVal * (discountInput / 100))
      : Math.min(subtotalVal, discountInput)
  );
  const total = Math.max(0, subtotalVal - discountVal);

  // Automatically keep cashReceived equal to total unless user manually edits it
  useEffect(() => {
    if (!userEditedCash) {
      setCashReceived(total > 0 ? String(total) : '');
    }
  }, [total, userEditedCash]);

  const cashVal = parseFloat(cashReceived) || 0;
  const changeDue = paymentMethod === 'cash' ? Math.max(0, cashVal - total) : 0;

  // Held / parked sales (persisted so they survive a refresh).
  const [heldOrders, setHeldOrders] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('pos_held_orders') || '[]'); } catch { return []; }
  });
  const [showHeld, setShowHeld] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [showRecentSalesModal, setShowRecentSalesModal] = useState(false);

  const persistHeld = (list: any[]) => {
    setHeldOrders(list);
    localStorage.setItem('pos_held_orders', JSON.stringify(list));
  };

  const holdCurrentSale = () => {
    if (posCart.length === 0) return;
    const entry = {
      id: `held_${Date.now()}`,
      at: new Date().toLocaleString(),
      customerName, customerPhone, discountAmt, discountMode,
      cart: posCart,
    };
    persistHeld([entry, ...heldOrders]);
    setPosCart([]); setCustomerName(''); setCustomerPhone(''); setDiscountAmt('');
  };

  const resumeHeld = (id: string) => {
    const entry = heldOrders.find(h => h.id === id);
    if (!entry) return;
    setPosCart(entry.cart || []);
    setCustomerName(entry.customerName || '');
    setCustomerPhone(entry.customerPhone || '');
    setDiscountAmt(entry.discountAmt || '');
    setDiscountMode(entry.discountMode || 'amount');
    persistHeld(heldOrders.filter(h => h.id !== id));
    setShowHeld(false);
  };

  const esc = (v: any) => String(v ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

  const printReceipt = (
    orderItems: any[],
    totals: { subtotal: number; discount: number; total: number; paid: number; change: number; method: string; couponCode?: string; couponDiscount?: number; cashierName?: string },
    custName?: string,
    invoiceNo?: string,
  ) => {
    const receiptCustomer = custName !== undefined ? custName : customerName;
    const cashierName = totals.cashierName || currentUser?.name || currentUser?.username || 'Cashier';
    printReceiptIframe(
      orderItems,
      { ...totals, cashierName },
      receiptCustomer,
      invoiceNo,
      storeSettings
    );
  };

  const printShiftSummary = async () => {
    const rep = await getShiftReport();
    if (!rep?.summary) {
      toast('Could not fetch shift report', 'error');
      return;
    }
    const summary = rep.summary;
    const s = storeSettings || {};
    const storeName = s.store_name || 'Galo Kids 🎈';
    const cashierName = currentUser?.name || currentUser?.username || shift?.user_name || 'Cashier';
    const win = window.open('', '_blank', 'width=320,height=600');
    if (!win) return;
    const opening = Number(summary.opening_float || 0);
    const cashS = Number(summary.cash_sales || 0);
    const cardS = Number(summary.card_sales || 0);
    const totalSales = cashS + cardS;
    const refunds = Number(summary.refunds || 0);
    const expected = Number(summary.expected_cash || 0);

    const lblCashier = language === 'ku' ? 'کاشێر' : language === 'ar' ? 'أمين الصندوق' : 'Cashier';
    const lblOpening = language === 'ku' ? 'پارەی سەرەتای شیفتەکە' : language === 'ar' ? 'المبلغ الأولي للوردية' : 'Opening Float';
    const lblTotalSales = language === 'ku' ? 'کۆی فرۆشی شیفتەکە' : language === 'ar' ? 'إجمالي مبيعات الوردية' : 'Total Shift Sales';
    const lblCashSales = language === 'ku' ? 'فرۆشتنی نەقد' : language === 'ar' ? 'مبيعات كاش' : 'Cash Sales';
    const lblCardSales = language === 'ku' ? 'فرۆشتنی کارت' : language === 'ar' ? 'مبيعات كارت' : 'Card Sales';
    const lblRefunds = language === 'ku' ? 'گەڕاندنەوەکان' : language === 'ar' ? 'المرتجعات' : 'Refunds';
    const lblExpected = language === 'ku' ? 'کۆی نەقدی چاوەڕوانکراو' : language === 'ar' ? 'النقد المتوقع' : 'Expected Cash';
    const lblTitle = language === 'ku' ? 'ڕاپۆرتی شیفت' : language === 'ar' ? 'تقرير الوردية' : 'SHIFT REPORT';

    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Shift Summary</title>
      <style>
        *{font-family:'Courier New',monospace;color:#000}
        body{width:280px;margin:0 auto;padding:10px}
        h2{text-align:center;margin:4px 0;font-size:18px}
        p{margin:4px 0;font-size:12px;text-align:center}
        .line{border-bottom:1px dashed #000;margin:8px 0}
        .row{display:flex;justify-content:space-between;font-size:12px;margin:5px 0}
        .bold{font-weight:bold;font-size:14px}
      </style></head><body>
      <h2>${esc(storeName)}</h2>
      <p>=== ${lblTitle} ===</p>
      <p>${new Date().toLocaleString()}</p>
      <div class="row"><span>${lblCashier}:</span><b>${esc(cashierName)}</b></div>
      <div class="line"></div>
      <div class="row"><span>${lblOpening}:</span><b>${formatIQDLabel(opening)}</b></div>
      <div class="row"><span>${lblCashSales}:</span><b>${formatIQDLabel(cashS)}</b></div>
      <div class="row"><span>${lblCardSales}:</span><b>${formatIQDLabel(cardS)}</b></div>
      <div class="line"></div>
      <div class="row bold"><span>${lblTotalSales}:</span><b>${formatIQDLabel(totalSales)}</b></div>
      <div class="row"><span>${lblRefunds}:</span><b>-${formatIQDLabel(refunds)}</b></div>
      <div class="line"></div>
      <div class="row bold" style="font-size:15px"><span>${lblExpected}:</span><b>${formatIQDLabel(expected)}</b></div>
      <p style="margin-top:16px">${esc(s.receipt_footer || 'Thank you! ❤️')}</p>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`);
    win.document.close();
  };

  const printZReport = (rep: any) => {
    if (!rep) return;
    const s = storeSettings || {};
    const storeName = s.store_name || 'Galo Kids 🎈';
    const cashierName = currentUser?.name || currentUser?.username || 'Cashier';
    const win = window.open('', '_blank', 'width=320,height=600');
    if (!win) return;

    const opening = Number(rep.opening_float || 0);
    const cashS = Number(rep.cash_sales || 0);
    const cardS = Number(rep.card_sales || 0);
    const totalSales = cashS + cardS;
    const refunds = Number(rep.refunds || 0);
    const expected = Number(rep.expected_cash || 0);
    const counted = Number(rep.counted || 0);
    const diff = Number(rep.difference || 0);

    const lblTitle = language === 'ku' ? 'ڕاپۆرتی کۆتایی شیفت (Z-Report)' : language === 'ar' ? 'تقرير ختام الوردية (Z-Report)' : 'Z-REPORT';
    const lblCashier = language === 'ku' ? 'کاشێر' : language === 'ar' ? 'أمين الصندوق' : 'Cashier';
    const lblOpening = language === 'ku' ? 'پارەی سەرەتای شیفتەکە' : language === 'ar' ? 'المبلغ الأولي للوردية' : 'Opening Float';
    const lblTotalSales = language === 'ku' ? 'کۆی فرۆشی شیفتەکە' : language === 'ar' ? 'إجمالي مبيعات الوردية' : 'Total Shift Sales';
    const lblCashSales = language === 'ku' ? 'فرۆشتنی نەقد' : language === 'ar' ? 'مبيعات كاش' : 'Cash Sales';
    const lblCardSales = language === 'ku' ? 'فرۆشتنی کارت' : language === 'ar' ? 'مبيعات كارت' : 'Card Sales';
    const lblRefunds = language === 'ku' ? 'گەڕاندنەوەکان' : language === 'ar' ? 'المرتجعات' : 'Refunds';
    const lblExpected = language === 'ku' ? 'کۆی نەقدی چاوەڕوانکراو' : language === 'ar' ? 'النقد المتوقع' : 'Expected Cash';
    const lblCounted = language === 'ku' ? 'نەقدی ئەژمارکراو' : language === 'ar' ? 'النقد المحسوب' : 'Counted Cash';
    const lblDiff = language === 'ku' ? 'جیاوازی' : language === 'ar' ? 'الفرق' : 'Difference';

    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Z-Report</title>
      <style>
        *{font-family:'Courier New',monospace;color:#000}
        body{width:280px;margin:0 auto;padding:10px}
        h2{text-align:center;margin:4px 0;font-size:18px}
        p{margin:4px 0;font-size:12px;text-align:center}
        .line{border-bottom:1px dashed #000;margin:8px 0}
        .row{display:flex;justify-content:space-between;font-size:12px;margin:5px 0}
        .bold{font-weight:bold;font-size:14px}
      </style></head><body>
      <h2>${esc(storeName)}</h2>
      <p>=== ${lblTitle} ===</p>
      <p>${new Date().toLocaleString()}</p>
      <div class="row"><span>${lblCashier}:</span><b>${esc(cashierName)}</b></div>
      <div class="line"></div>
      <div class="row"><span>${lblOpening}:</span><b>${formatIQDLabel(opening)}</b></div>
      <div class="row"><span>${lblCashSales}:</span><b>${formatIQDLabel(cashS)}</b></div>
      <div class="row"><span>${lblCardSales}:</span><b>${formatIQDLabel(cardS)}</b></div>
      <div class="line"></div>
      <div class="row bold"><span>${lblTotalSales}:</span><b>${formatIQDLabel(totalSales)}</b></div>
      <div class="row"><span>${lblRefunds}:</span><b>-${formatIQDLabel(refunds)}</b></div>
      <div class="line"></div>
      <div class="row bold"><span>${lblExpected}:</span><b>${formatIQDLabel(expected)}</b></div>
      <div class="row bold"><span>${lblCounted}:</span><b>${formatIQDLabel(counted)}</b></div>
      <div class="row bold" style="font-size:15px"><span>${lblDiff}:</span><b>${formatIQDLabel(diff)}</b></div>
      <p style="margin-top:16px">${esc(s.receipt_footer || 'Thank you! ❤️')}</p>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`);
    win.document.close();
  };

  const handleCheckout = async () => {
    if (posCart.length === 0) return;
    if (!shift) {
      toast('Open a shift before making a sale.', 'error');
      setShowShiftModal(true);
      return;
    }
    if (paymentMethod === 'cash' && cashVal < total) {
      toast('Cash received is less than the total.', 'error');
      return;
    }

    // Construct real Order
    const orderItems = posCart.map((item, idx) => ({
      id: `${item.product.id}-${item.variation.id}-${idx}-${Date.now()}`,
      product: item.product,
      variation: item.variation,
      quantity: item.quantity
    }));

    const totals = {
      subtotal: subtotalVal, discount: discountVal, total,
      paid: paymentMethod === 'cash' ? cashVal : total, change: changeDue, method: paymentMethod,
    };
    const custName = customerName;

    const saved = await addOrder({
      userId: 'u1', // Admin/Cashier
      customerName: customerName || 'POS Cash Sale',
      customerEmail: 'cashier@galokids.com',
      customerPhone,
      items: orderItems,
      totalAmount: total,
      status: 'delivered',
      shippingAddress: 'In-Store POS Sale',
      paymentMethod,
      discountAmount: discountVal,
      amountPaid: paymentMethod === 'cash' ? cashVal : total,
    } as any);

    const invoiceNo = saved?.invoiceNo;
    printReceipt(orderItems, totals, custName, invoiceNo);
    setLastReceipt({ orderItems, totals, customerName: custName, invoiceNo }); // keep for reprint
    toast('Sale completed successfully 🎉');

    setPosCart([]);
    setDiscountAmt('');
    setCashReceived('');
    setUserEditedCash(false);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerInfo(null);
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(quickPrice);
    if (isNaN(price) || price < 0) {
      toast('Please enter a valid price', 'error');
      return;
    }
    const cost = parseFloat(quickCost) || 0;
    
    // Create quick dynamic product
    const customId = `quick-${Date.now()}`;
    const customVarId = `qvar-${Date.now()}`;
    
    const customProduct: Product = {
      id: customId,
      categoryId: 'quick',
      name: quickName,
      description: 'Quick added line item',
      barcode: `QUICK-${Date.now().toString().slice(-6)}`,
      imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=150',
      price: price,
      cost: cost,
      variations: []
    };
    
    const customVar: ProductVariation = {
      id: customVarId,
      productId: customId,
      color: quickColor,
      size: quickSize,
      stockQuantity: 999
    };
    
    customProduct.variations = [customVar];
    
    // Add directly to POS Cart
    setPosCart(prev => {
      const existing = prev.find(item => item.product.id === customProduct.id && item.variation.id === customVar.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === customProduct.id && item.variation.id === customVar.id
            ? { ...item, quantity: item.quantity + quickQuantity }
            : item
        );
      }
      return [...prev, { product: customProduct, variation: customVar, quantity: quickQuantity }];
    });
    
    // Reset states and close
    setQuickPrice('');
    setQuickCost('');
    setQuickName('Generic Item');
    setQuickSize('N/A');
    setQuickColor('N/A');
    setQuickQuantity(1);
    setShowQuickAdd(false);
  };

  const isRTL = language === 'ar' || language === 'ku';

  return (
    <div className="w-full min-h-screen lg:h-screen bg-gradient-to-br from-[#D2E0F2] via-[#E8EEF8] to-[#DFE9F5] p-2.5 sm:p-5 flex flex-col gap-3 sm:gap-4 font-arabic overflow-y-auto lg:overflow-hidden relative">
      <POSNavbar
        shift={shift}
        heldOrdersCount={heldOrders.length}
        onOpenHeldOrders={() => setShowHeld(true)}
        onOpenShiftModal={() => setShowShiftModal(true)}
        onOpenCloseShiftModal={openCloseModal}
        onOpenCashDrawer={() => openCashModal('out')}
        lastReceipt={lastReceipt}
        onReprintLastReceipt={() => {
          if (lastReceipt) {
            printReceipt(lastReceipt.orderItems, lastReceipt.totals, lastReceipt.customerName, lastReceipt.invoiceNo);
          }
        }}
        onOpenReturnModal={() => setShowReturn(true)}
        onOpenRecentSales={() => setShowRecentSalesModal(true)}
      />

      {/* Main Terminal Workspace Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-visible lg:overflow-hidden gap-4 sm:gap-5 min-h-0">
        <POSProductGrid
          products={products}
          search={search}
          setSearch={setSearch}
          addToPosCart={addToPosCart}
          setShowReturn={setShowReturn}
          setShowQuickAdd={setShowQuickAdd}
          productsPagination={productsPagination}
          refreshProducts={refreshProducts}
        />

        {/* Cashier Register Cart Panel */}
        <div id="pos-cart-section">
          <POSCartPanel
            posCart={posCart}
            updateQuantity={updateQuantity}
            removeItem={removeItem}
            clearCart={() => {
              setPosCart([]);
              setDiscountAmt('');
              setCashReceived('');
              setCustomerName('');
              setCustomerPhone('');
              setCustomerInfo(null);
              localStorage.removeItem('pos_active_draft');
            }}
            discountAmt={discountAmt}
            setDiscountAmt={setDiscountAmt}
            discountMode={discountMode}
            setDiscountMode={setDiscountMode}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            cashReceived={cashReceived}
            setCashReceived={setCashReceived}
            setUserEditedCash={setUserEditedCash}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            customerInfo={customerInfo}
            lookupCustomer={lookupCustomer}
            subtotal={subtotalVal}
            discountNum={discountVal}
            total={total}
            changeDue={changeDue}
            handleCheckout={handleCheckout}
            holdCurrentSale={holdCurrentSale}
            heldOrdersCount={heldOrders.length}
            setShowHeld={setShowHeld}
            lastReceipt={lastReceipt}
            printReceipt={printReceipt}
          />
        </div>
      </div>

      {/* Mobile Floating Sticky Cart Quick Action Bar */}
      {posCart.length > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
          <button
            onClick={() => {
              const el = document.getElementById('pos-cart-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full bg-slate-900/95 backdrop-blur-xl border border-white/20 text-white p-3.5 px-5 rounded-full shadow-2xl flex items-center justify-between cursor-pointer active:scale-95 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                {posCart.reduce((sum, item) => sum + item.quantity, 0)}
              </div>
              <span className="font-bold text-xs">
                {language === 'ku' ? 'سەبەتەی کاشێر' : language === 'ar' ? 'سلة أمين الصندوق' : 'Cart Items'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-emerald-400">
                {formatIQDLabel(total)}
              </span>
              <ShoppingBag className="w-4 h-4 text-indigo-400" />
            </div>
          </button>
        </div>
      )}


      {/* Cash into / out of the drawer */}
      {showCashModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCashModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {language === 'ku' ? 'پارەی سندوق' : language === 'ar' ? 'حركة الصندوق' : 'Cash In / Out'}
                </h3>
              </div>
              <button onClick={() => setShowCashModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCashDirection('in')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-bold transition-colors ${
                    cashDirection === 'in'
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  {language === 'ku' ? 'خستنە ناو' : language === 'ar' ? 'إيداع' : 'Cash in'}
                </button>
                <button
                  type="button"
                  onClick={() => setCashDirection('out')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-bold transition-colors ${
                    cashDirection === 'out'
                      ? 'bg-rose-600 border-rose-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  {language === 'ku' ? 'دەرهێنان' : language === 'ar' ? 'سحب' : 'Cash out'}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {language === 'ku' ? 'بڕ' : language === 'ar' ? 'المبلغ' : 'Amount'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={cashAmount}
                  onChange={e => setCashAmount(e.target.value)}
                  placeholder="0"
                  className="w-full border border-slate-300 rounded-lg py-2.5 px-3 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {language === 'ku' ? 'هۆکار' : language === 'ar' ? 'السبب' : 'Reason'}
                </label>
                <input
                  type="text"
                  value={cashReason}
                  onChange={e => setCashReason(e.target.value)}
                  placeholder={language === 'ku' ? 'وەک: کڕینی پاکەت' : language === 'ar' ? 'مثال: شراء أكياس' : 'e.g. bought bags'}
                  className="w-full border border-slate-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleCashMovement}
                disabled={isSavingCash}
                className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl hover:bg-slate-800 disabled:bg-slate-300 transition-colors"
              >
                {language === 'ku' ? 'تۆمارکردن' : language === 'ar' ? 'تسجيل' : 'Record'}
              </button>

              {cashMovements.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-black text-slate-500 mb-2">
                    {language === 'ku' ? 'ئەم شیفتە' : language === 'ar' ? 'هذه الوردية' : 'This shift'}
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {cashMovements.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-600 truncate">{m.reason}</span>
                        <b className={m.direction === 'out' ? 'text-rose-600 shrink-0' : 'text-emerald-600 shrink-0'}>
                          {m.direction === 'out' ? '-' : '+'}{formatIQDLabel(m.amount)}
                        </b>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shift open / close modal */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowShiftModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{shift ? (t('closeShift') || 'Close Shift') : (t('openShift') || 'Open Shift')}</h3>
              <button onClick={() => setShowShiftModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {!shift ? (
                <>
                  <label className="block text-sm font-medium text-slate-700">{t('openingFloat') || 'Opening cash (float)'}</label>
                  <input type="number" min="0" value={openingFloat} onChange={e => setOpeningFloat(e.target.value)} placeholder="0"
                    className="w-full border border-slate-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                  <button onClick={handleOpenShift} className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl hover:bg-emerald-700">{t('openShift') || 'Open Shift'}</button>
                </>
              ) : (
                <>
                  {shiftReport && (
                    <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2 border border-slate-200">
                      <div className="flex justify-between items-center"><span className="text-slate-600 font-medium">{t('openingFloat') || 'Opening float'}</span><b className="text-slate-900">{formatIQDLabel(shiftReport.opening_float)}</b></div>
                      <div className="flex justify-between items-center"><span className="text-slate-600 font-medium">{t('cash') || 'Cash'} {t('sales') || 'sales'}</span><b className="text-slate-900">{formatIQDLabel(shiftReport.cash_sales)}</b></div>
                      <div className="flex justify-between items-center"><span className="text-slate-600 font-medium">{t('card') || 'Card'} {t('sales') || 'sales'}</span><b className="text-slate-900">{formatIQDLabel(shiftReport.card_sales)}</b></div>
                      <div className="flex justify-between items-center font-bold text-indigo-700 pt-1.5 border-t border-slate-200"><span className="font-bold">{t('totalShiftSales') || 'Total Shift Sales'}</span><b className="text-base">{formatIQDLabel((Number(shiftReport.cash_sales || 0) + Number(shiftReport.card_sales || 0)))}</b></div>
                      <div className="flex justify-between items-center text-rose-600"><span className="text-slate-600 font-medium">{t('refunds') || 'Refunds'}</span><b>-{formatIQDLabel(shiftReport.refunds)}</b></div>
                      {Number(shiftReport.cash_in || 0) > 0 && (
                        <div className="flex justify-between items-center text-emerald-700"><span className="text-slate-600 font-medium">{language === 'ku' ? 'پارەی خراوەتە ناو' : language === 'ar' ? 'إيداع نقدي' : 'Cash in'}</span><b>+{formatIQDLabel(shiftReport.cash_in)}</b></div>
                      )}
                      {Number(shiftReport.cash_out || 0) > 0 && (
                        <div className="flex justify-between items-center text-rose-600"><span className="text-slate-600 font-medium">{language === 'ku' ? 'پارەی دەرهێنراو' : language === 'ar' ? 'سحب نقدي' : 'Cash out'}</span><b>-{formatIQDLabel(shiftReport.cash_out)}</b></div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-emerald-700"><span className="font-bold">{t('expectedCash') || 'Expected cash'}</span><b className="text-base font-black">{formatIQDLabel(shiftReport.expected_cash)}</b></div>
                    </div>
                  )}
                  <label className="block text-sm font-medium text-slate-700">{t('countedCash') || 'Counted cash in drawer'}</label>
                  <input type="number" min="0" value={countedCash} onChange={e => setCountedCash(e.target.value)} placeholder="0"
                    className="w-full border border-slate-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold" />
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={handlePrintAndCloseShift}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                    >
                      <Printer className="w-4 h-4" />
                      <span>{language === 'ku' ? 'چاپکردنی ڕاپۆرت و داخستنی شیفت' : language === 'ar' ? 'طباعة التقرير وإغلاق الوردية' : 'Print & Close Shift'}</span>
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={printShiftSummary}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 text-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        {t('print') || 'Print'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCloseShift}
                        className="flex-1 bg-slate-800 text-white font-bold py-2 rounded-xl hover:bg-slate-900 shadow-sm transition-all active:scale-95 text-xs"
                      >
                        {t('closeShift') || 'Close Shift'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Z-report result */}
      {zReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setZReport(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 bg-slate-900 text-white text-center">
              <h3 className="text-lg font-bold">Z-Report</h3>
              <p className="text-xs opacity-70">{new Date().toLocaleString()}</p>
            </div>
            <div className="p-6 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">{t('openingFloat') || 'Opening float'}</span><b>{formatIQDLabel(zReport.opening_float)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">{t('cash') || 'Cash'} {t('sales') || 'sales'}</span><b>{formatIQDLabel(zReport.cash_sales)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">{t('card') || 'Card'} {t('sales') || 'sales'}</span><b>{formatIQDLabel(zReport.card_sales)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">{t('refunds') || 'Refunds'}</span><b>-{formatIQDLabel(zReport.refunds)}</b></div>
              {Number(zReport.cash_in || 0) > 0 && (
                <div className="flex justify-between"><span className="text-slate-500">{language === 'ku' ? 'پارەی خراوەتە ناو' : language === 'ar' ? 'إيداع نقدي' : 'Cash in'}</span><b>+{formatIQDLabel(zReport.cash_in)}</b></div>
              )}
              {Number(zReport.cash_out || 0) > 0 && (
                <div className="flex justify-between"><span className="text-slate-500">{language === 'ku' ? 'پارەی دەرهێنراو' : language === 'ar' ? 'سحب نقدي' : 'Cash out'}</span><b>-{formatIQDLabel(zReport.cash_out)}</b></div>
              )}
              <div className="flex justify-between"><span className="text-slate-500">{t('orders') || 'Orders'}</span><b>{zReport.orders_count}</b></div>
              <div className="flex justify-between pt-2 border-t border-slate-100"><span className="text-slate-500">{t('expectedCash') || 'Expected cash'}</span><b>{formatIQDLabel(zReport.expected_cash)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">{t('countedCash') || 'Counted'}</span><b>{formatIQDLabel(zReport.counted)}</b></div>
              <div className={`flex justify-between text-base font-black pt-2 border-t border-slate-100 ${Number(zReport.difference) === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                <span>{t('difference') || 'Difference'}</span><span>{formatIQDLabel(zReport.difference || 0)}</span>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-2">
              <button onClick={() => printZReport(zReport)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-200 flex items-center justify-center gap-1.5 font-bold">
                <Printer className="w-4 h-4" />
                {t('print') || 'Print'}
              </button>
              <button onClick={() => setZReport(null)} className="flex-1 bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700">{t('done') || 'Done'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Return / refund modal */}
      {showReturn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowReturn(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className={`p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between ${isRTL ? 'flex-row-reverse font-arabic' : ''}`}>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {isExchange
                    ? (language === 'ku' ? 'ئاڵوگۆڕی کاڵا' : language === 'ar' ? 'استبدال' : 'Exchange')
                    : (t('returnRefund') || 'Return / Refund')}
                </h3>
              </div>
              <button onClick={() => setShowReturn(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className={`p-5 space-y-4 max-h-[75vh] overflow-y-auto ${isRTL ? 'font-arabic' : ''}`}>
              {/* Refund gives the money back; exchange swaps for what is in the cart. */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsExchange(false)}
                  className={`rounded-xl border py-2 text-xs font-bold transition-colors ${
                    !isExchange ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t('returnRefund') || 'Return / Refund'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsExchange(true)}
                  className={`rounded-xl border py-2 text-xs font-bold transition-colors ${
                    isExchange ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {language === 'ku' ? 'ئاڵوگۆڕ' : language === 'ar' ? 'استبدال' : 'Exchange'}
                </button>
              </div>

              <div>
                <label className={`block text-xs font-semibold text-slate-600 mb-1.5 ${isRTL ? 'text-right' : ''}`}>
                  {t('orderLabel') || 'Order'} # / Invoice
                </label>
                <div className={`flex gap-2 items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <input
                    type="text"
                    value={returnOrderId}
                    onChange={e => setReturnOrderId(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') loadReturnOrder(); }}
                    placeholder={language === 'ku' ? 'ژمارەی پسوولە بنووسە...' : language === 'ar' ? 'أدخل رقم الفاتورة...' : 'Enter order or invoice #...'}
                    className={`flex-1 border border-slate-300 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none ${isRTL ? 'text-right' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={loadReturnOrder}
                    disabled={returnLoading || !returnOrderId.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl disabled:opacity-50 whitespace-nowrap text-sm shadow-sm flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                  >
                    <Search className="w-4 h-4" />
                    <span>{t('search') || 'Search'}</span>
                  </button>
                </div>
              </div>

              {returnLoading && (
                <div className="py-6 text-center text-slate-400 text-sm">
                  {t('loading') || 'Loading...'}
                </div>
              )}

              {returnOrder && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className={`bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 text-xs ${isRTL ? 'text-right' : ''}`}>
                    <p className="font-bold text-slate-800 text-sm">{returnOrder.customerName || 'Walk-in Customer'}</p>
                    <p className="text-slate-500 font-mono mt-0.5">{returnOrder.invoiceNo || `#${returnOrder.id}`}</p>
                  </div>
                  <div className="space-y-2">
                    <label className={`block text-xs font-semibold text-slate-600 ${isRTL ? 'text-right' : ''}`}>
                      {language === 'ku' ? 'بەرهەمەکانی گەڕاندنەوە' : language === 'ar' ? 'عناصر الإرجاع' : 'Items to return'}
                    </label>
                    {(returnOrder.items || []).map((it: any) => (
                      <div key={it.id} className={`flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`text-sm ${isRTL ? 'text-right' : ''}`}>
                          <p className="font-bold text-slate-800">{it.product?.name || 'Item'}</p>
                          <p className="text-xs text-slate-500">{formatIQDLabel(Number(it.price))} × {it.quantity}</p>
                        </div>
                        <div className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className="text-xs text-slate-400">{language === 'ku' ? 'ژمارە:' : 'Qty:'}</span>
                          <input
                            type="number"
                            min="0"
                            max={it.quantity}
                            value={returnQty[it.id] ?? ''}
                            onChange={e => setReturnQty(prev => ({ ...prev, [it.id]: Math.min(it.quantity, Math.max(0, parseInt(e.target.value) || 0)) }))}
                            placeholder="0"
                            className="w-16 border border-slate-300 rounded-lg py-1 px-2 text-center text-sm font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold text-slate-600 mb-1 ${isRTL ? 'text-right' : ''}`}>
                      {t('reason') || 'Reason'}
                    </label>
                    <input
                      type="text"
                      value={returnReason}
                      onChange={e => setReturnReason(e.target.value)}
                      placeholder={t('reason') || 'Reason (optional)'}
                      className={`w-full border border-slate-300 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none ${isRTL ? 'text-right' : ''}`}
                    />
                  </div>

                  {isExchange && (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs space-y-1">
                      <p className="font-black text-indigo-800">
                        {language === 'ku' ? 'بەرهەمە نوێیەکان (لە سەبەتەدا)' : language === 'ar' ? 'العناصر الجديدة (في السلة)' : 'Replacement items (from the cart)'}
                      </p>
                      {posCart.length === 0 ? (
                        <p className="text-slate-500">
                          {language === 'ku' ? 'سەبەتەکە بەتاڵە — بەرهەمی جێگرەوە زیاد بکە.' : language === 'ar' ? 'السلة فارغة — أضف البدائل.' : 'The cart is empty — add the replacements first.'}
                        </p>
                      ) : (
                        <>
                          {posCart.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2">
                              <span className="truncate text-slate-700">{item.product?.name} × {item.quantity}</span>
                              <b className="shrink-0 text-slate-800">{formatIQDLabel(getLineTotal(item.product, item.variation, item.quantity))}</b>
                            </div>
                          ))}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-indigo-100 font-black text-indigo-800">
                            <span>{t('total') || 'Total'}</span>
                            <span>{formatIQDLabel(subtotalVal)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={isExchange ? submitExchange : submitReturn}
                    disabled={returnLoading}
                    className={`w-full ${isExchange ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'} text-white font-bold py-2.5 rounded-xl disabled:opacity-50 shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>
                      {isExchange
                        ? (language === 'ku' ? 'ئەنجامدانی ئاڵوگۆڕ' : language === 'ar' ? 'تنفيذ الاستبدال' : 'Complete exchange')
                        : (t('processRefund') || 'Process Refund')}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Held Orders Modal */}
      {showHeld && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowHeld(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{t('heldOrders') || 'Held Orders'} ({heldOrders.length})</h3>
              <button onClick={() => setShowHeld(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
              {heldOrders.length === 0 ? (
                <p className="text-center text-slate-400 py-8">{t('noHeldOrders') || 'No held orders'}</p>
              ) : heldOrders.map(h => {
                const count = (h.cart || []).reduce((s: number, i: any) => s + i.quantity, 0);
                const sum = (h.cart || []).reduce((s: number, i: any) => s + getLineTotal(i.product, i.variation, i.quantity), 0);
                return (
                  <div key={h.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{h.customerName || 'Walk-in'} · {count} {t('quantity') || 'items'}</p>
                      <p className="text-xs text-slate-500">{h.at} · {formatIQDLabel(sum)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => resumeHeld(h.id)} className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-700">
                        <Play className="w-3.5 h-3.5" /> {t('resume') || 'Resume'}
                      </button>
                      <button onClick={() => persistHeld(heldOrders.filter(x => x.id !== h.id))} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden font-arabic">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{L("Quick Add Item")}</h3>
              <button onClick={() => setShowQuickAdd(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleQuickAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{L("Item Name")}</label>
                <input 
                  type="text" 
                  value={quickName === 'Generic Item' ? L('Generic Item') : quickName} 
                  onChange={e => setQuickName(e.target.value)} 
                  required 
                  placeholder={L("Generic Item")} 
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{L("Price *")}</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={quickPrice} 
                    onChange={e => setQuickPrice(e.target.value)} 
                    required 
                    placeholder="25.00" 
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{L("Cost - Optional")}</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={quickCost} 
                    onChange={e => setQuickCost(e.target.value)} 
                    placeholder="10.00" 
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{L("Color (Optional)")}</label>
                  <input 
                    type="text" 
                    value={quickColor} 
                    onChange={e => setQuickColor(e.target.value)} 
                    placeholder="N/A" 
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{L("Size (Optional)")}</label>
                  <input 
                    type="text" 
                    value={quickSize} 
                    onChange={e => setQuickSize(e.target.value)} 
                    placeholder="N/A" 
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{L("Quantity")}</label>
                <div className="flex items-center gap-3">
                  <button 
                    type="button" 
                    onClick={() => setQuickQuantity(q => Math.max(1, q - 1))}
                    className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-bold cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-bold w-12 text-center text-slate-900 font-mono">{quickQuantity}</span>
                  <button 
                    type="button" 
                    onClick={() => setQuickQuantity(q => q + 1)}
                    className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-bold cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3 justify-end border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowQuickAdd(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  {L("Cancel")}
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {L("Add to Cart")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recent 10 Sales Modal for Historical Receipt Reprinting */}
      {showRecentSalesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 font-arabic animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col p-6 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {language === 'ku' ? 'کۆتا ١٠ فرۆشتنی پۆس' : language === 'ar' ? 'آخر 10 مبيعات POS' : 'Recent 10 POS Sales'}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">
                    {language === 'ku' ? 'کلیک بکە لەسەر هەر فرۆشتنێک بۆ چاپکردنەوەی پسووڵەکەی بێ دەستکاری' : 'Click print next to any sale to reprint its receipt directly'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRecentSalesModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Orders List */}
            <div className="grow overflow-y-auto hide-scrollbar space-y-3 py-1">
              {(() => {
                const posOnlyOrders = orders.filter((ord: any) => {
                  const channel = String(ord.channel || ord.order_type || ord.source || '').toLowerCase();
                  const addr = String(ord.shippingAddress || ord.shipping_address || '').toLowerCase();
                  const name = String(ord.customerName || ord.customer_name || '').toLowerCase();

                  const isPos = (channel === 'pos' || addr.includes('pos') || addr.includes('in-store') || name.includes('pos')) && !channel.includes('online');
                  if (!isPos && (channel === 'online' || channel === 'web')) return false;

                  // If cashier role (2), only show POS sales created by this cashier!
                  if (currentUser && isCashierRole(currentUser.role)) {
                    const cName = (currentUser.name || '').toLowerCase().trim();
                    const ordCName = String(ord.cashierName || ord.cashier_name || '').toLowerCase().trim();
                    const ordUser = String(ord.userId || '');
                    if (ordUser !== String(currentUser.id) && cName && !ordCName.includes(cName)) {
                      return false;
                    }
                  }

                  return true;
                });

                if (posOnlyOrders.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-400 font-bold text-xs">
                      {language === 'ku' ? 'هیچ فرۆشتنێکی پۆس تۆمار نەکراوە.' : 'No recent POS sales recorded.'}
                    </div>
                  );
                }

                return posOnlyOrders.slice(0, 10).map((ord: any, idx: number) => {
                  const invoiceNo = ord.invoiceNo || ord.invoice_no || `INV-${ord.id}`;
                  const custName = ord.customerName || ord.customer_name || 'Walk-in Customer';
                  const totalAmount = Number(ord.totalAmount || ord.total_amount || 0);
                  const method = ord.paymentMethod || ord.payment_method || 'cash';
                  const orderDate = ord.date || ord.created_at || new Date().toISOString();

                  const printableItems = (ord.items || []).map((it: any) => ({
                    product: it.product || { name: it.product_name || 'Product', price: it.price || 0 },
                    variation: it.variation || { size: it.size || '', color: it.color || '' },
                    quantity: Number(it.quantity || 1)
                  }));

                  const printableTotals = {
                    subtotal: totalAmount,
                    discount: Number(ord.discountAmount || 0),
                    total: totalAmount,
                    paid: totalAmount,
                    change: 0,
                    method: method
                  };

                  return (
                    <div key={ord.id || idx} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs hover:bg-indigo-50/40 transition-colors">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-black text-xs text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                            {invoiceNo}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${method === 'cash' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}`}>
                            {method === 'cash' ? (language === 'ku' ? 'نەقد' : 'Cash') : (language === 'ku' ? 'کارت' : 'Card')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                          <span>{custName}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[11px] text-slate-400 font-mono">{new Date(orderDate).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                        <span className="text-sm font-black text-slate-900">
                          {formatIQDLabel(totalAmount)}
                        </span>
                        
                        <button
                          onClick={() => {
                            printReceipt(printableItems, printableTotals, custName, invoiceNo);
                          }}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-300" />
                          <span>{language === 'ku' ? 'چاپکردنەوە' : language === 'ar' ? 'إعادة الطباعة' : 'Reprint'}</span>
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
