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
      <div className={`flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full ${isRTL ? 'md:flex-row-reverse' : ''}`}>
        {/* Products Section */}
        <div className="w-full md:w-2/3 p-4 md:p-6 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        <div className="mb-4 text-left">
          <label className={`block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ${isRTL ? 'mr-1 text-right font-arabic' : 'ml-1'}`}>
            {t('customerDetails') || 'Customer Details'}
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={`flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 font-medium ${isRTL ? 'text-right font-arabic' : ''}`}
              placeholder={t('customerPlaceholder') || "Full Name (e.g. Ali Ahmed)"}
            />
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => { setCustomerPhone(e.target.value); setCustomerInfo(null); }}
              onBlur={async () => {
                if (customerPhone.replace(/\D/g, '').length >= 7) {
                  const info = await lookupCustomer(customerPhone);
                  if (info?.found) {
                    setCustomerInfo(info);
                    if (info.name && !customerName) setCustomerName(info.name);
                  } else setCustomerInfo(null);
                }
              }}
              className={`w-40 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 font-medium ${isRTL ? 'text-right font-arabic' : ''}`}
              placeholder={t('mobileNumber') || 'Phone'}
            />
          </div>
          {customerInfo?.found && (
            <div className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
              ⭐ {t('returningCustomer') || 'Returning customer'} · {customerInfo.orders_count} {t('myOrders') || 'orders'} · {formatIQDLabel(Number(customerInfo.total_spent || 0))}
            </div>
          )}
        </div>
        <div className="mb-4 flex gap-2">
          <div className="relative flex-grow">
            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                // Barcode scanners type the code then send Enter. If exactly one
                // product matches the scanned barcode, add it straight to the cart.
                if (e.key !== 'Enter') return;
                const code = search.trim().toLowerCase();
                if (!code) return;
                const match = products.find(p => (p.barcode || '').toLowerCase() === code)
                  || (filteredProducts.length === 1 ? filteredProducts[0] : undefined);
                if (match) {
                  const firstVar = (match.variations || []).find(v => v.stockQuantity > 0) || (match.variations || [])[0];
                  if (firstVar) {
                    addToPosCart(match, firstVar);
                    setSearch('');
                  }
                }
              }}
              className={`w-full ${isRTL ? 'pr-10 pl-4 text-right font-arabic' : 'pl-10 pr-4'} py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900`}
              placeholder={t('searchProducts') || "Search by name or barcode..."}
            />
          </div>
          <button
            onClick={() => setShowReturn(true)}
            className={`bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold px-3.5 py-3 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap border border-slate-200 active:scale-95 ${isRTL ? 'flex-row-reverse font-arabic' : ''}`}
            title={t('returnRefund') || 'Return'}
          >
            <RotateCcw className="w-4 h-4 text-rose-500" />
            <span className="hidden sm:inline">{t('returnRefund') || 'Return'}</span>
          </button>
          <button
            onClick={() => setShowQuickAdd(true)}
            className={`bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-3 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap ${isRTL ? 'flex-row-reverse font-arabic' : ''}`}
          >
            <Plus className="w-5 h-5" />
            {t('quickAdd') || 'Quick Add'}
          </button>
        </div>

        <div className="flex-grow overflow-y-auto hide-scrollbar">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {displayedProducts.map(product => (
              <div 
                key={product.id} 
                onClick={() => {
                  const firstVar = (product.variations || []).find(v => v.stockQuantity > 0) || (product.variations || [])[0];
                  if (firstVar) {
                    addToPosCart(product, firstVar);
                  }
                }}
                className="bg-white rounded-lg border border-slate-200 p-1.5 hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer relative group flex flex-col justify-between"
              >
                <div>
                  {(() => {
                    const totalStock = (product.variations || []).reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
                    return (
                      <span className={`absolute top-1 ${isRTL ? 'left-1' : 'right-1'} z-10 text-[8px] font-black px-1 py-0.2 rounded shadow-xs ${totalStock === 0 ? 'bg-rose-500 text-white' : totalStock <= 5 ? 'bg-amber-500 text-white' : 'bg-slate-900/80 text-white'}`}>
                        {totalStock === 0 ? (t('outOfStock') || 'Out') : `${totalStock}`}
                      </span>
                    );
                  })()}
                  <img src={product.imageUrl} alt={getProductName(product)} className="w-full h-14 sm:h-16 object-cover rounded-md mb-1 bg-slate-50" />
                  <h3 className={`font-bold text-slate-900 text-[11px] leading-tight truncate ${isRTL ? 'text-right font-arabic' : ''}`} title={getProductName(product)}>{getProductName(product)}</h3>
                  <p className={`font-black text-indigo-600 text-[11px] mb-1 ${isRTL ? 'text-right' : ''}`}>{formatIQDLabel(Number(product.price || 0))}</p>
                </div>

                {/* Variations list with direct select */}
                <div className={`flex flex-wrap gap-0.5 ${isRTL ? 'flex-row-reverse' : ''}`} onClick={(e) => e.stopPropagation()}>
                  {(product.variations || []).map(v => {
                    const out = (v.stockQuantity || 0) <= 0;
                    return (
                    <button
                      key={v.id}
                      disabled={out}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (out) { toast('This variation is out of stock', 'error'); return; }
                        addToPosCart(product, v);
                      }}
                      className={`px-1 py-0.5 text-[9px] rounded font-bold border transition-colors ${out ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through' : 'bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 border-slate-200/80 hover:border-indigo-300'}`}
                    >
                      <span className={`inline-flex items-center gap-0.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="w-1.5 h-1.5 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: getColorHex(v.color) }} title={v.color} />
                        {v.size} <span className="opacity-60 text-[8px]">({v.stockQuantity ?? 0})</span>
                      </span>
                    </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {productsPagination && productsPagination.lastPage > 1 && (
          <div className="mt-4 border-t border-slate-100 pt-3 shrink-0">
            <Pagination meta={productsPagination} onPageChange={(page) => refreshProducts(page, 20, { search })} />
          </div>
        )}
      </div>

      {/* Cart Section */}
      <div className={`w-full md:w-1/3 bg-white ${isRTL ? 'border-r' : 'border-l'} border-slate-200 flex flex-col h-[calc(100vh-64px)]`}>
        <div className={`p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h2 className={`text-lg font-bold text-slate-900 flex items-center ${isRTL ? 'font-arabic' : ''}`}>
            <Receipt className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'} text-indigo-600`} /> {t('yourCart')}
          </h2>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {/* Suspended Sales (Held Orders) List */}
            <button
              onClick={() => setShowHeld(true)}
              className="relative text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-all active:scale-95"
              title={t('heldOrders') || 'Suspended Sales'}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden xl:inline">{t('heldOrders') || 'Suspended'}</span>
              {heldOrders.length > 0 && (
                <span className="min-w-[16px] h-4 px-1 bg-amber-600 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">{heldOrders.length}</span>
              )}
            </button>

            {/* Reprint Last Receipt */}
            {lastReceipt && (
              <button
                onClick={() => printReceipt(lastReceipt.orderItems, lastReceipt.totals, lastReceipt.customerName, lastReceipt.invoiceNo)}
                className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-all active:scale-95"
                title={t('reprintReceipt') || 'Reprint last receipt'}
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
              </button>
            )}

            {/* Suspend Current Sale */}
            <button
              onClick={holdCurrentSale}
              disabled={posCart.length === 0}
              className="text-xs font-bold text-amber-800 bg-amber-100/60 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-40 transition-all active:scale-95 shadow-sm"
              title={t('hold') || 'Suspend Sale'}
            >
              <Pause className="w-3.5 h-3.5 text-amber-600" />
              <span>{t('hold') || 'Suspend'}</span>
            </button>

            {/* Clear Cart */}
            <button
              onClick={() => {
                if (window.confirm(language === 'ku' ? 'دڵنیای لە پاککردنەوەی سەبەتەکە؟' : language === 'ar' ? 'هل أنت متأكد من مسح السلة؟' : 'Are you sure you want to clear the cart?')) {
                  setPosCart([]);
                  setDiscountAmt('');
                  setCashReceived('');
                  setCustomerName('');
                  setCustomerPhone('');
                  setCustomerInfo(null);
                  localStorage.removeItem('pos_active_draft');
                }
              }}
              className="text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all active:scale-95 shadow-sm"
              title={t('clear') || 'Clear'}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              <span className="hidden xl:inline">{t('clear')}</span>
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-4 hide-scrollbar">
          {posCart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <ShoppingBag className="w-12 h-12 mb-2 opacity-20" />
              <p className={isRTL ? 'font-arabic' : ''}>{t('emptyCart')}</p>
            </div>
          ) : (
            posCart.map((item, idx) => (
              <div key={`${item.product.id}-${item.variation.id}-${idx}`} className={`flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <img src={item.product.imageUrl} alt={getProductName(item.product)} className="w-12 h-12 object-cover rounded-lg" />
                <div className={`flex-grow ${isRTL ? 'text-right' : ''}`}>
                  <h4 className={`text-sm font-medium text-slate-900 leading-tight ${isRTL ? 'font-arabic' : ''}`}>{getProductName(item.product)}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className={`inline-flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="w-2.5 h-2.5 rounded-full border border-slate-200" style={{ backgroundColor: getColorHex(item.variation.color) }} title={item.variation.color} /> 
                      {item.variation.size}
                    </span>
                  </p>
                  <p className="text-sm font-bold text-indigo-600 mt-1">{formatIQDLabel(Number(item.product.price || 0) * item.quantity)}</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <button onClick={() => updateQuantity(item.product.id, item.variation.id, 1)} className="p-1 bg-white border border-slate-200 rounded shadow-sm hover:bg-slate-50 text-slate-600">
                    <Plus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-bold w-6 text-center text-slate-900">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, item.variation.id, -1)} className="p-1 bg-white border border-slate-200 rounded shadow-sm hover:bg-slate-50 text-slate-600">
                    <Minus className="w-3 h-3" />
                  </button>
                </div>
                <button 
                  onClick={() => removeItem(item.product.id, item.variation.id)}
                  className={`p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${isRTL ? 'mr-1' : 'ml-1'}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white">
          <div className={`flex justify-between items-center mb-3 ${isRTL ? 'flex-row-reverse font-arabic' : ''}`}>
            <span className="text-slate-600 font-medium">{t('subtotal')}</span>
            <span className="text-slate-900 font-bold">{formatIQDLabel(posCart.reduce((sum, item) => sum + (Number(item.product.price || 0) * item.quantity), 0))}</span>
          </div>
          
          <div className={`flex items-center justify-between mb-4 gap-3 ${isRTL ? 'flex-row-reverse font-arabic' : ''}`}>
            <span className="text-slate-600 font-medium shrink-0">{t('discount') || 'Discount'}</span>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="flex rounded-lg overflow-hidden border border-slate-200">
                <button type="button" onClick={() => setDiscountMode('amount')}
                  className={`px-2.5 py-1.5 text-xs font-bold ${discountMode === 'amount' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500'}`}>$</button>
                <button type="button" onClick={() => setDiscountMode('percent')}
                  className={`px-2.5 py-1.5 text-xs font-bold ${discountMode === 'percent' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500'}`}>%</button>
              </div>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={discountAmt}
                onChange={(e) => setDiscountAmt(e.target.value)}
                className="w-[90px] px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-right"
              />
            </div>
          </div>

          {/* Payment method */}
          <div className={`flex gap-2 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {(['cash', 'card'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${paymentMethod === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {m === 'cash' ? (t('cash') || 'Cash') : (t('card') || 'Card')}
              </button>
            ))}
          </div>

          {paymentMethod === 'cash' && (
            <div className={`flex items-center justify-between mb-3 gap-4 ${isRTL ? 'flex-row-reverse font-arabic' : ''}`}>
              <span className="text-slate-600 font-medium shrink-0">{t('cashReceived') || 'Cash received'}</span>
              <div className="relative max-w-[140px]">
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={cashReceived}
                  onChange={(e) => {
                    setUserEditedCash(true);
                    setCashReceived(e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                />
              </div>
            </div>
          )}

          {paymentMethod === 'cash' && cashVal > 0 && (
            <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse font-arabic' : ''}`}>
              <span className="text-slate-600 font-medium">{t('change') || 'Change'}</span>
              <span className={`font-black ${cashVal >= total ? 'text-emerald-600' : 'text-red-500'}`}>{formatIQDLabel(changeDue)}</span>
            </div>
          )}

          <div className={`flex justify-between items-center mb-6 pt-4 border-t border-slate-100 ${isRTL ? 'flex-row-reverse font-arabic' : ''}`}>
            <span className="text-lg font-bold text-slate-900">{t('total')}</span>
            <span className="text-2xl font-black text-indigo-600">{formatIQDLabel(total)}</span>
          </div>
          
          <button 
            onClick={handleCheckout}
            disabled={posCart.length === 0}
            className={`w-full bg-indigo-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md ${isRTL ? 'flex-row-reverse font-arabic' : ''}`}
          >
            <CreditCard className={`w-6 h-6 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('pay')} {formatIQDLabel(total)}
          </button>
        </div>
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
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Quick Add Item</h3>
              <button onClick={() => setShowQuickAdd(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleQuickAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
                <input 
                  type="text" 
                  value={quickName} 
                  onChange={e => setQuickName(e.target.value)} 
                  required 
                  placeholder="e.g. Custom Garment" 
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={quickPrice} 
                    onChange={e => setQuickPrice(e.target.value)} 
                    required 
                    placeholder="25.00" 
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cost - Optional</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={quickCost} 
                    onChange={e => setQuickCost(e.target.value)} 
                    placeholder="10.00" 
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Color (Optional)</label>
                  <input 
                    type="text" 
                    value={quickColor} 
                    onChange={e => setQuickColor(e.target.value)} 
                    placeholder="N/A" 
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Size (Optional)</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                <div className="flex items-center gap-3">
                  <button 
                    type="button" 
                    onClick={() => setQuickQuantity(q => Math.max(1, q - 1))}
                    className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-bold"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-bold w-12 text-center text-slate-900">{quickQuantity}</span>
                  <button 
                    type="button" 
                    onClick={() => setQuickQuantity(q => q + 1)}
                    className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-bold"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3 justify-end border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowQuickAdd(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add to Cart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  </div>
);
};
