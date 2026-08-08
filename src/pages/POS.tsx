import { formatIQDLabel } from "../utils/currency";
import React, { useState, useMemo, useEffect } from 'react';
import { Pagination } from '../components/Pagination';
import { useStore } from '../store';
import { Product, ProductVariation } from '../types';
import { Search, Plus, Minus, Trash2, CreditCard, Receipt, ShoppingBag, X, Pause, Printer, Play, Clock, RotateCcw } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { getColorHex } from '../utils/colors';
import { useToast } from '../components/ui/Feedback';
import { POSNavbar } from '../components/POSNavbar';
import { POSProductGrid } from '../components/pos/POSProductGrid';
import { POSCartPanel } from '../components/pos/POSCartPanel';
import { adminTr } from '../i18n/adminDict';

export const POS: React.FC = () => {
  const { products, addOrder, productsPagination, refreshProducts, lookupCustomer,
    storeSettings, getCurrentShift, openShift, getShiftReport, closeShift, getOrderById, refundOrder, currentUser } = useStore();
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

  const subtotalVal = posCart.reduce((sum, item) => sum + (Number(item.product.price || 0) * item.quantity), 0);
  const discountInput = parseFloat(discountAmt) || 0;
  const discountVal = discountMode === 'percent'
    ? Math.min(subtotalVal, subtotalVal * (discountInput / 100))
    : Math.min(subtotalVal, discountInput);
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
    totals: { subtotal: number; discount: number; total: number; paid: number; change: number; method: string; },
    custName?: string,
    invoiceNo?: string,
  ) => {
    const receiptCustomer = custName !== undefined ? custName : customerName;
    const s = storeSettings || {};
    const storeName = s.store_name || 'Galo Kids 🎈';
    const rows = orderItems.map(it => {
      const name = getProductName(it.product);
      const line = Number(it.product.price || 0) * it.quantity;
      return `<tr><td>${esc(name)}<br><small>${esc(it.variation.size || '')} ${esc(it.variation.color || '')}</small></td><td style="text-align:center">${it.quantity}</td><td style="text-align:right">${formatIQDLabel(line)}</td></tr>`;
    }).join('');
    const win = window.open('', '_blank', 'width=320,height=600');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(invoiceNo || '')}</title>
      <style>
        *{font-family:'Courier New',monospace;color:#000}
        body{width:280px;margin:0 auto;padding:10px}
        h2{text-align:center;margin:4px 0;font-size:18px}
        img.logo{display:block;margin:0 auto 6px;max-width:120px;max-height:70px;object-fit:contain}
        table{width:100%;border-collapse:collapse;font-size:12px}
        td,th{padding:3px 0;border-bottom:1px dashed #999}
        .tot td{border:none;font-size:13px}
        .big{font-weight:bold;font-size:15px}
        small{color:#555}
        .center{text-align:center;font-size:11px;margin-top:4px}
        .inv{text-align:center;font-weight:bold;font-size:13px;margin:6px 0}
      </style></head><body>
      <img class="logo" src="${esc(s.store_logo || '/assets/galo-logo.png')}" />
      <h2>${esc(storeName)}</h2>
      ${s.store_address ? `<p class="center">${esc(s.store_address)}</p>` : ''}
      ${s.store_phone ? `<p class="center">☎ ${esc(s.store_phone)}</p>` : ''}
      ${invoiceNo ? `<p class="inv">${esc(invoiceNo)}</p>` : ''}
      <p class="center">${new Date().toLocaleString()}</p>
      ${receiptCustomer ? `<p class="center">Customer: ${esc(receiptCustomer)}</p>` : ''}
      <table><thead><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Price</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <table style="margin-top:8px"><tbody class="tot">
        <tr><td>Subtotal</td><td style="text-align:right">${formatIQDLabel(totals.subtotal)}</td></tr>
        ${totals.discount ? `<tr><td>Discount</td><td style="text-align:right">-${formatIQDLabel(totals.discount)}</td></tr>` : ''}
        <tr class="big"><td>TOTAL</td><td style="text-align:right">${formatIQDLabel(totals.total)}</td></tr>
        <tr><td>Paid (${esc(totals.method)})</td><td style="text-align:right">${formatIQDLabel(totals.paid)}</td></tr>
        ${totals.method === 'cash' ? `<tr><td>Change</td><td style="text-align:right">${formatIQDLabel(totals.change)}</td></tr>` : ''}
      </tbody></table>
      <p class="center">${esc(s.receipt_footer || 'Thank you! ❤️')}</p>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`);
    win.document.close();
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
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <POSNavbar
        shift={shift}
        heldOrdersCount={heldOrders.length}
        onOpenHeldOrders={() => setShowHeld(true)}
        onOpenShiftModal={() => setShowShiftModal(true)}
        onOpenCloseShiftModal={openCloseModal}
        lastReceipt={lastReceipt}
        onReprintLastReceipt={() => {
          if (lastReceipt) {
            printReceipt(lastReceipt.orderItems, lastReceipt.totals, lastReceipt.customerName, lastReceipt.invoiceNo);
          }
        }}
        onOpenReturnModal={() => setShowReturn(true)}
      />
      <div className={`flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full h-[calc(100vh-64px)] overflow-hidden ${isRTL ? 'md:flex-row-reverse' : ''}`}>
        {/* Products Catalog Area */}
        <div className="w-full md:w-2/3 p-3.5 sm:p-4 flex flex-col h-full overflow-hidden">
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
        </div>

        {/* Cashier Register Cart Panel */}
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
                <h3 className="text-base font-bold text-slate-900">{t('returnRefund') || 'Return / Refund'}</h3>
              </div>
              <button onClick={() => setShowReturn(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className={`p-5 space-y-4 max-h-[75vh] overflow-y-auto ${isRTL ? 'font-arabic' : ''}`}>
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

                  <button
                    type="button"
                    onClick={submitReturn}
                    disabled={returnLoading}
                    className={`w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl disabled:opacity-50 shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{t('processRefund') || 'Process Refund'}</span>
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
                const sum = (h.cart || []).reduce((s: number, i: any) => s + Number(i.product.price || 0) * i.quantity, 0);
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
    </div>
  );
};
