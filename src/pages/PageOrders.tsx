import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { Product, ProductVariation } from '../types';
import { 
  Search, Plus, Minus, Trash2, Printer, 
  RotateCcw, Send, CheckCircle2, MessageCircle, MapPin, 
  Phone, User, Tag, ShoppingBag, X, Sparkles, Check, Truck, 
  ExternalLink, FileText, AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { getColorHex, getLocalizedColorName, getLocalizedSizeName } from '../utils/colors';
import { useToast } from '../components/ui/Feedback';
import { PageOrdersNavbar } from '../components/pageOrders/PageOrdersNavbar';
import { adminTr } from '../i18n/adminDict';
import { formatIQDLabel } from '../utils/currency';
import { getUnitPrice, getLineTotal, roundIQD } from '../utils/pricing';
import iraqLocations from '../data/iraq-locations.json';
import { 
  getGovernorateLabel, getDistrictLabel, findGovernorate, 
  getDistricts, Lang 
} from '../utils/address';
import { printDeliveryWaybill, DeliveryWaybillData } from '../utils/printHelper';

interface PageOrderItem {
  product: Product;
  variation: ProductVariation;
  quantity: number;
}


export const PageOrders: React.FC = () => {
  const { 
    products, categories, addOrder, refreshProducts, 
    storeSettings, fetchShippingQuote, currentUser 
  } = useStore();
  const toast = useToast();
  const { language, t } = useLanguage();
  const L = (key: string) => adminTr(key, language);
  const isRTL = language === 'ar' || language === 'ku';
  const addrLang: Lang = language === 'ku' || language === 'ar' ? language : 'en';

  // --- Draft State Loaded from localStorage ---
  const [cart, setCart] = useState<PageOrderItem[]>(() => {
    try {
      const d = JSON.parse(localStorage.getItem('page_order_draft') || '{}');
      return Array.isArray(d.cart) ? d.cart : [];
    } catch { return []; }
  });

  const [customerName, setCustomerName] = useState(() => {
    try { return JSON.parse(localStorage.getItem('page_order_draft') || '{}').customerName || ''; } catch { return ''; }
  });
  const [customerPhone, setCustomerPhone] = useState(() => {
    try { return JSON.parse(localStorage.getItem('page_order_draft') || '{}').customerPhone || ''; } catch { return ''; }
  });
  const [customerPhone2, setCustomerPhone2] = useState(() => {
    try { return JSON.parse(localStorage.getItem('page_order_draft') || '{}').customerPhone2 || ''; } catch { return ''; }
  });
  const [selectedGovernorate, setSelectedGovernorate] = useState(() => {
    try { return JSON.parse(localStorage.getItem('page_order_draft') || '{}').selectedGovernorate || 'Erbil'; } catch { return 'Erbil'; }
  });
  const [selectedDistrict, setSelectedDistrict] = useState(() => {
    try { return JSON.parse(localStorage.getItem('page_order_draft') || '{}').selectedDistrict || ''; } catch { return ''; }
  });
  const [detailedAddress, setDetailedAddress] = useState(() => {
    try { return JSON.parse(localStorage.getItem('page_order_draft') || '{}').detailedAddress || ''; } catch { return ''; }
  });
  const source = 'social';
  const [pageHandle, setPageHandle] = useState(() => {
    try { return JSON.parse(localStorage.getItem('page_order_draft') || '{}').pageHandle || ''; } catch { return ''; }
  });
  const [orderNotes, setOrderNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('page_order_draft') || '{}').orderNotes || ''; } catch { return ''; }
  });

  const [discountAmt, setDiscountAmt] = useState(() => {
    try { return JSON.parse(localStorage.getItem('page_order_draft') || '{}').discountAmt || ''; } catch { return ''; }
  });
  const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>('amount');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'fib' | 'fastpay' | 'prepaid'>('cash');
  const [initialStatus, setInitialStatus] = useState<'pending' | 'processing' | 'shipped'>('pending');

  // Custom Shipping override
  const [isCustomShipping, setIsCustomShipping] = useState(false);
  const [shippingFeeInput, setShippingFeeInput] = useState<string>('');
  const [serverShippingQuote, setServerShippingQuote] = useState<number>(3000);

  // Filter & Search states for Catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Variant selector modal
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [chosenColor, setChosenColor] = useState<string>('');
  const [chosenSize, setChosenSize] = useState<string>('');

  // Quick custom item modal
  const [showQuickItemModal, setShowQuickItemModal] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPrice, setQuickPrice] = useState('');
  const [quickColor, setQuickColor] = useState('');
  const [quickSize, setQuickSize] = useState('');

  // Success / Completed Modal
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync draft to localStorage
  useEffect(() => {
    const draft = {
      cart,
      customerName,
      customerPhone,
      customerPhone2,
      selectedGovernorate,
      selectedDistrict,
      detailedAddress,
      source,
      pageHandle,
      orderNotes,
      discountAmt,
    };
    localStorage.setItem('page_order_draft', JSON.stringify(draft));
  }, [
    cart, customerName, customerPhone, customerPhone2, selectedGovernorate,
    selectedDistrict, detailedAddress, source, pageHandle, orderNotes, discountAmt
  ]);

  // Available districts for the selected governorate
  const availableDistricts = useMemo(() => {
    return getDistricts(selectedGovernorate);
  }, [selectedGovernorate]);

  // Calculate Subtotal & Totals
  const subtotal = useMemo(() => {
    return roundIQD(
      cart.reduce((acc, it) => acc + getLineTotal(it.product, it.variation, it.quantity), 0)
    );
  }, [cart]);

  const discountNum = useMemo(() => {
    const raw = parseFloat(discountAmt) || 0;
    if (raw <= 0) return 0;
    if (discountMode === 'percent') {
      return roundIQD(Math.min(subtotal, subtotal * (raw / 100)));
    }
    return roundIQD(Math.min(subtotal, raw));
  }, [discountAmt, discountMode, subtotal]);

  const goodsTotal = Math.max(0, subtotal - discountNum);

  // Fetch Shipping Quote from Server based on governorate
  useEffect(() => {
    let cancelled = false;
    if (selectedGovernorate) {
      fetchShippingQuote(selectedGovernorate, goodsTotal).then(quote => {
        if (!cancelled) {
          setServerShippingQuote(quote.fee);
          if (!isCustomShipping) {
            setShippingFeeInput(String(quote.fee));
          }
        }
      }).catch(() => {
        if (!cancelled && !isCustomShipping) {
          setServerShippingQuote(3000);
          setShippingFeeInput('3000');
        }
      });
    }
    return () => { cancelled = true; };
  }, [selectedGovernorate, goodsTotal, fetchShippingQuote, isCustomShipping]);

  const activeShippingFee = isCustomShipping 
    ? Math.max(0, parseFloat(shippingFeeInput) || 0) 
    : serverShippingQuote;

  const totalAmount = goodsTotal + activeShippingFee;

  // Filter catalog products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'all' || String(p.categoryId) === String(selectedCategory);
      if (!matchCat) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const name = (p.name || '').toLowerCase();
      const nameKu = (p.nameKu || '').toLowerCase();
      const nameAr = (p.nameAr || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      return name.includes(q) || nameKu.includes(q) || nameAr.includes(q) || barcode.includes(q) || sku.includes(q);
    });
  }, [products, selectedCategory, searchQuery]);

  // Product Selection Handlers
  const handleProductCardClick = (product: Product) => {
    const vars = product.variations || [];
    if (vars.length === 1) {
      // Single variation -> add immediately
      addToCart(product, vars[0]);
    } else if (vars.length > 1) {
      // Multiple variations -> open modal
      setSelectedProductForModal(product);
      setChosenColor(vars[0].color || '');
      setChosenSize(vars[0].size || '');
    } else {
      // Dummy variation
      const defaultVar: ProductVariation = {
        id: `var_def_${product.id}`,
        productId: product.id,
        color: 'Default',
        size: 'One Size',
        stockQuantity: 99
      };
      addToCart(product, defaultVar);
    }
  };

  const addToCart = (product: Product, variation: ProductVariation) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(
        it => it.product.id === product.id && it.variation.id === variation.id
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + 1
        };
        return next;
      }
      return [...prev, { product, variation, quantity: 1 }];
    });
    toast(language === 'ku' ? 'زیادکرا بۆ سەبەتە ✅' : 'Added to order ✅', 'success');
  };

  const updateQuantity = (productIndex: number, delta: number) => {
    setCart(prev => {
      const next = [...prev];
      const item = next[productIndex];
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return next.filter((_, idx) => idx !== productIndex);
      }
      next[productIndex] = { ...item, quantity: newQty };
      return next;
    });
  };

  const removeItem = (productIndex: number) => {
    setCart(prev => prev.filter((_, idx) => idx !== productIndex));
  };

  const clearAll = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerPhone2('');
    setDetailedAddress('');
    setPageHandle('');
    setOrderNotes('');
    setDiscountAmt('');
    setIsCustomShipping(false);
    localStorage.removeItem('page_order_draft');
    toast(language === 'ku' ? 'فۆرمەکە پاککرایەوە' : 'Form cleared', 'info');
  };

  // Add custom quick item
  const handleAddQuickItem = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(quickPrice);
    if (isNaN(price) || price <= 0) {
      toast('Please enter a valid price', 'error');
      return;
    }
    const customId = `quick_${Date.now()}`;
    const customVarId = `qvar_${Date.now()}`;
    const customProduct: Product = {
      id: customId,
      categoryId: 'quick',
      name: quickTitle || 'Manual Line Item',
      nameKu: quickTitle || 'کاڵای دیاریکراو',
      description: 'Custom quick item',
      price: price,
      imageUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&q=80&w=200',
      variations: []
    };
    const customVar: ProductVariation = {
      id: customVarId,
      productId: customId,
      color: quickColor || 'Default',
      size: quickSize || 'One Size',
      stockQuantity: 99
    };
    customProduct.variations = [customVar];
    addToCart(customProduct, customVar);
    setShowQuickItemModal(false);
    setQuickTitle('');
    setQuickPrice('');
    setQuickColor('');
    setQuickSize('');
  };

  // Order Submission
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast(language === 'ku' ? 'تکایە سەرەتا کاڵا هەڵبژێرە' : 'Please add items to cart first', 'error');
      return;
    }
    if (!customerPhone.trim()) {
      toast(language === 'ku' ? 'ژمارەی مۆبایلی کڕیار پێویستە' : 'Customer phone number is required', 'error');
      return;
    }
    if (!selectedGovernorate) {
      toast(language === 'ku' ? 'پارێزگا دیاری بکە' : 'Please select governorate', 'error');
      return;
    }

    setIsSubmitting(true);

    // Build full formatted address string
    const govObj = findGovernorate(selectedGovernorate);
    const govName = govObj ? getGovernorateLabel(govObj, addrLang) : selectedGovernorate;
    const fullAddressParts = [
      govName,
      selectedDistrict ? selectedDistrict : null,
      detailedAddress.trim() ? detailedAddress.trim() : null
    ].filter(Boolean);
    const formattedAddress = fullAddressParts.join(' - ');

    // Compile line items for the order
    const orderItems = cart.map((it, idx) => ({
      id: `${it.product.id}-${it.variation.id}-${idx}-${Date.now()}`,
      product: it.product,
      variation: it.variation,
      quantity: it.quantity,
      price: getUnitPrice(it.product, it.variation)
    }));

    // Compose custom note with page handle
    const fullNotes = [
      `Source: SOCIAL${pageHandle ? ` (@${pageHandle.trim()})` : ''}`,
      customerPhone2.trim() ? `Phone 2: ${customerPhone2.trim()}` : null,
      orderNotes.trim() ? `Notes: ${orderNotes.trim()}` : null,
    ].filter(Boolean).join(' | ');

    try {
      const res = await addOrder({
        customerName: customerName.trim() || (language === 'ku' ? 'کڕیاری پەیج' : 'Page Customer'),
        customerPhone: customerPhone.trim(),
        customerEmail: `social@galokids.orders`,
        shippingAddress: `${formattedAddress} [${fullNotes}]`,
        governorate: selectedGovernorate,
        shippingFee: activeShippingFee,
        items: orderItems,
        totalAmount: totalAmount,
        status: initialStatus,
        paymentMethod: paymentMethod === 'cash' ? 'Cash on Delivery (COD)' : paymentMethod.toUpperCase(),
        discountAmount: discountNum,
        channel: 'social',
        source: 'social',
      } as any);

      const invoiceNo = res?.invoiceNo || res?.invoice_no || `INV-${Date.now().toString().slice(-6)}`;

      const completedData: DeliveryWaybillData = {
        invoiceNo,
        customerName: customerName.trim() || (language === 'ku' ? 'کڕیاری پەیج' : 'Page Customer'),
        customerPhone: customerPhone.trim(),
        customerPhone2: customerPhone2.trim(),
        governorate: govName,
        address: [selectedDistrict, detailedAddress].filter(Boolean).join(' - ') || formattedAddress,
        source: language === 'ku' ? 'پەیج' : 'Page',
        pageHandle: pageHandle.trim(),
        note: orderNotes.trim(),
        items: orderItems,
        subtotal: subtotal,
        discount: discountNum,
        shippingFee: activeShippingFee,
        total: totalAmount,
        paymentMethod: paymentMethod === 'cash' ? 'کاش لەکاتی وەرگرتن' : paymentMethod.toUpperCase(),
        storeSettings
      };

      setCompletedOrder(completedData);
      toast(language === 'ku' ? 'داواکارییەکە بە سەرکەوتوویی تۆمارکرا 🎉' : 'Order placed successfully 🎉', 'success');

      // Clear the draft
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerPhone2('');
      setDetailedAddress('');
      setPageHandle('');
      setOrderNotes('');
      setDiscountAmt('');
      localStorage.removeItem('page_order_draft');

    } catch (err: any) {
      console.error('Failed to create page order:', err);
      toast(err.message || 'Failed to submit order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // WhatsApp Message Generator
  const generateWhatsAppUrl = (orderData: DeliveryWaybillData) => {
    let rawPhone = orderData.customerPhone.replace(/\D/g, '');
    if (rawPhone.startsWith('07')) {
      rawPhone = '964' + rawPhone.slice(1);
    } else if (rawPhone.startsWith('7')) {
      rawPhone = '964' + rawPhone;
    }

    const itemsSummary = orderData.items.map(it => {
      const p = it.product;
      const name = (language === 'ku' && p?.nameKu) ? p.nameKu : (language === 'ar' && p?.nameAr) ? p.nameAr : (p?.name || 'کالای گەلۆ');
      const varText = [it.variation?.color, it.variation?.size].filter(Boolean).join(' - ');
      const price = formatIQDLabel(Number(it.price || p?.price || 0) * (it.quantity || 1));
      return `• ${name}${varText ? ` (${varText})` : ''} × ${it.quantity} = ${price}`;
    }).join('\n');

    const msg = [
      `سڵاو بەڕێز ${orderData.customerName || 'کڕیاری خۆشەویست'} 🎈`,
      `سوپاس بۆ داواکارییەکەت لە گەلۆ کیدس (Galo Kids).`,
      `ژمارەی پسوولە: ${orderData.invoiceNo || ''}`,
      '',
      `📦 کاڵاکان:`,
      itemsSummary,
      '--------------------------',
      `🏷️ کۆی کاڵاکان: ${formatIQDLabel(orderData.subtotal)}`,
      orderData.discount > 0 ? `🎁 داشکاندن: -${formatIQDLabel(orderData.discount)}` : null,
      `🚚 کرێی گەیاندن: ${orderData.shippingFee > 0 ? formatIQDLabel(orderData.shippingFee) : 'بێ بەرامبەر (خۆڕایی)'}`,
      `💰 کۆی گشتی بۆ وەرگرتن: ${formatIQDLabel(orderData.total)}`,
      orderData.address ? `📍 ناونیشان: ${orderData.governorate} - ${orderData.address}` : null,
      '',
      `تکایە دڵنیابە لە دروستی زانیارییەکان. دەستبەجێ داواکارییەکەت ئامادە دەکرێت و دەدرێتە دلیڤەری! ✨`
    ].filter(Boolean).join('\n');

    return `https://wa.me/${rawPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col p-2 sm:p-4 md:p-6 font-arabic selection:bg-rose-100 selection:text-rose-900">
      
      {/* Top Navigation Bar */}
      <PageOrdersNavbar onClearDraft={clearAll} />

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-3 sm:mt-4 grow">
        
        {/* Left 7 Columns: Product Selection Catalog */}
        <div className="lg:col-span-7 flex flex-col bg-white rounded-3xl sm:rounded-[2rem] border border-slate-200/80 shadow-xs overflow-hidden">
          
          {/* Catalog Filter Header */}
          <div className="p-3 sm:p-4 border-b border-slate-100 space-y-3 bg-white/60">
            <div className="flex items-center gap-2">
              <div className="relative grow">
                <Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
                <input
                  type="text"
                  placeholder={language === 'ku' ? 'گەڕان بەپێی ناو، بارکۆد، کۆد...' : 'Search product, barcode, sku...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={`w-full py-2.5 rounded-2xl bg-slate-100/80 border border-transparent focus:border-rose-300 focus:bg-white text-xs font-bold transition-all outline-none ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 ${isRTL ? 'left-3' : 'right-3'}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick custom line button */}
              <button
                type="button"
                onClick={() => setShowQuickItemModal(true)}
                className="px-3.5 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-black transition-all shrink-0 flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                title="Add custom / non-catalog item"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{language === 'ku' ? 'کاڵای دیاریکراو' : 'Custom Item'}</span>
              </button>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                  selectedCategory === 'all' 
                    ? 'bg-slate-900 text-white shadow-2xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {language === 'ku' ? 'هەموو پۆلەکان' : 'All'}
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(String(cat.id))}
                  className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                    selectedCategory === String(cat.id)
                      ? 'bg-rose-500 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {(language === 'ku' && cat.nameKu) ? cat.nameKu : (language === 'ar' && cat.nameAr) ? cat.nameAr : cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="p-3 sm:p-4 overflow-y-auto grow max-h-[calc(100vh-280px)]">
            {filteredProducts.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="font-bold text-sm">{language === 'ku' ? 'هیچ کاڵایەک نەدۆزرایەوە' : 'No products found'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
                {filteredProducts.map(prod => {
                  const hasDiscount = Number(prod.discountPrice || 0) > 0 && Number(prod.discountPrice) < Number(prod.price);
                  const effectivePrice = hasDiscount ? Number(prod.discountPrice) : Number(prod.price);
                  const totalStock = (prod.variations || []).reduce((acc, v) => acc + (v.stockQuantity || 0), 0);
                  const isOutOfStock = (prod.variations && prod.variations.length > 0 && totalStock <= 0);

                  const displayName = (language === 'ku' && prod.nameKu) 
                    ? prod.nameKu 
                    : (language === 'ar' && prod.nameAr) ? prod.nameAr : prod.name;

                  return (
                    <div
                      key={prod.id}
                      onClick={() => !isOutOfStock && handleProductCardClick(prod)}
                      className={`group relative flex flex-col bg-white border rounded-2xl p-2 sm:p-2.5 transition-all text-right select-none ${
                        isOutOfStock 
                          ? 'opacity-50 grayscale border-slate-200 cursor-not-allowed' 
                          : 'border-slate-200/80 hover:border-rose-300 hover:shadow-md cursor-pointer active:scale-98'
                      }`}
                    >
                      {/* Product Image */}
                      <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-100 mb-2 relative">
                        <img 
                          src={prod.imageUrl || '/assets/placeholder.png'} 
                          alt={displayName}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                        {hasDiscount && (
                          <span className="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                            داشکاندن
                          </span>
                        )}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-xs font-black">
                            تەواوبووە
                          </div>
                        )}
                      </div>

                      {/* Title & Price */}
                      <h4 className="font-bold text-[11px] sm:text-xs text-slate-800 line-clamp-1 group-hover:text-rose-600 transition-colors">
                        {displayName}
                      </h4>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="font-black text-xs sm:text-sm text-slate-900">
                          {formatIQDLabel(effectivePrice)}
                        </span>
                        {hasDiscount && (
                          <span className="text-[10px] text-slate-400 line-through">
                            {formatIQDLabel(prod.price)}
                          </span>
                        )}
                      </div>

                      {/* Color dots & variants count */}
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-slate-50 pt-1">
                        <span className="flex items-center gap-1">
                          {(prod.variations || []).slice(0, 3).map((v, i) => (
                            <span 
                              key={i} 
                              className="w-2 h-2 rounded-full border border-black/10" 
                              style={{ backgroundColor: getColorHex(v.color) || '#ccc' }} 
                            />
                          ))}
                          {(prod.variations?.length || 0) > 3 && <span>+{(prod.variations?.length || 0) - 3}</span>}
                        </span>
                        <span className={totalStock > 0 && totalStock < 5 ? 'text-amber-600' : 'text-slate-400'}>
                          ستۆک: {totalStock}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Columns: Customer, Delivery & Order Panel */}
        <div className="lg:col-span-5 flex flex-col bg-white rounded-3xl sm:rounded-[2rem] border border-slate-200/80 shadow-xs overflow-hidden">
          
          {/* Right Header */}
          <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900">
                  {language === 'ku' ? 'تۆمارکردنی داواکاری و گەیاندن' : 'Order & Delivery Details'}
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">
                  {cart.length} {language === 'ku' ? 'کاڵا دیاریکراوە' : 'items selected'}
                </span>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-[11px] font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'ku' ? 'سڕینەوەی سەبەتە' : 'Clear Cart'}</span>
              </button>
            )}
          </div>

          <div className="p-3 sm:p-4 overflow-y-auto space-y-4 max-h-[calc(100vh-280px)]">
            
            {/* Selected Items List */}
            {cart.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400">
                <ShoppingBag className="w-8 h-8 mx-auto mb-1 opacity-30 text-rose-500" />
                <p className="font-bold text-xs">
                  {language === 'ku' ? 'کلیک لە کاڵاکانی لای ڕاست بکە بۆ زیادکردن' : 'Click items on the left to add them'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 border border-slate-100 rounded-2xl p-2 bg-slate-50/40">
                {cart.map((item, idx) => {
                  const displayName = (language === 'ku' && item.product.nameKu)
                    ? item.product.nameKu
                    : (language === 'ar' && item.product.nameAr) ? item.product.nameAr : item.product.name;
                  const unitPrice = getUnitPrice(item.product, item.variation);
                  const lineTotal = unitPrice * item.quantity;
                  const varText = [item.variation.color, item.variation.size].filter(Boolean).join(' · ');

                  return (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-slate-100 shadow-2xs"
                    >
                      <img 
                        src={item.product.imageUrl || '/assets/placeholder.png'} 
                        alt={displayName} 
                        className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0"
                      />
                      <div className="grow min-w-0">
                        <h5 className="font-bold text-xs text-slate-800 truncate">{displayName}</h5>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 font-bold">
                          <span>{varText || 'One Size'}</span>
                          <span>•</span>
                          <span className="text-slate-600">{formatIQDLabel(unitPrice)}</span>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 shrink-0 bg-slate-100 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, -1)}
                          className="w-6 h-6 rounded-md bg-white text-slate-700 flex items-center justify-center font-bold text-xs hover:bg-rose-50 hover:text-rose-600 shadow-2xs cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-black text-xs text-slate-900">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, 1)}
                          className="w-6 h-6 rounded-md bg-white text-slate-700 flex items-center justify-center font-bold text-xs hover:bg-emerald-50 hover:text-emerald-600 shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-black text-xs text-slate-900 shrink-0 w-16 text-left">
                        {formatIQDLabel(lineTotal)}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-slate-300 hover:text-rose-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}


            {/* Customer Information Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  {language === 'ku' ? 'ناوی سیانی کڕیار:' : 'Customer Name:'}
                </label>
                <div className="relative">
                  <User className={`w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input
                    type="text"
                    placeholder={language === 'ku' ? 'ناوی کڕیار...' : 'e.g. احمد علی'}
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className={`w-full py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:border-rose-400 focus:bg-white outline-none ${isRTL ? 'pr-8 pl-3' : 'pl-8 pr-3'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  <span className="text-rose-500">*</span> {language === 'ku' ? 'ژمارەی مۆبایل:' : 'Phone Number:'}
                </label>
                <div className="relative">
                  <Phone className={`w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input
                    type="tel"
                    placeholder="0750 123 4567"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    dir="ltr"
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-right focus:border-rose-400 focus:bg-white outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  {language === 'ku' ? 'ژمارەی دووەم (ئارەزوومەندانە):' : 'Phone 2 (Optional):'}
                </label>
                <input
                  type="tel"
                  placeholder="0770 000 0000"
                  value={customerPhone2}
                  onChange={e => setCustomerPhone2(e.target.value)}
                  dir="ltr"
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-right focus:border-rose-400 focus:bg-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  {language === 'ku' ? 'یوزەری پەیج / کۆدی چات:' : 'Social Username / Chat ID:'}
                </label>
                <input
                  type="text"
                  placeholder="@username"
                  value={pageHandle}
                  onChange={e => setPageHandle(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:border-rose-400 focus:bg-white outline-none"
                />
              </div>
            </div>

            {/* Address & Governorate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  {language === 'ku' ? 'پارێزگا:' : 'Governorate:'}
                </label>
                <select
                  value={selectedGovernorate}
                  onChange={e => {
                    setSelectedGovernorate(e.target.value);
                    setSelectedDistrict('');
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:border-rose-400 focus:bg-white outline-none cursor-pointer"
                >
                  {iraqLocations.map(gov => (
                    <option key={gov.id} value={gov.governorate}>
                      {getGovernorateLabel(gov, addrLang)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  {language === 'ku' ? 'قەزا / ناوچە:' : 'District:'}
                </label>
                <select
                  value={selectedDistrict}
                  onChange={e => setSelectedDistrict(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:border-rose-400 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="">{language === 'ku' ? '-- هەڵبژێرە --' : '-- Select District --'}</option>
                  {availableDistricts.map(dist => (
                    <option key={dist.id} value={dist.name}>
                      {getDistrictLabel(dist, addrLang)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Detailed Street Address */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 mb-1">
                {language === 'ku' ? 'ناونیشانی تەواو (گەڕەک، کۆڵان، خاڵی دیار):' : 'Detailed Address (Street, Landmark):'}
              </label>
              <div className="relative">
                <MapPin className={`w-3.5 h-3.5 text-slate-400 absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'}`} />
                <textarea
                  rows={2}
                  placeholder={language === 'ku' ? 'نموونە: شەقامی ٤٠ مەتری، نزیک مارکێتی بەختیاری...' : 'Street address notes...'}
                  value={detailedAddress}
                  onChange={e => setDetailedAddress(e.target.value)}
                  className={`w-full py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:border-rose-400 focus:bg-white outline-none resize-none ${isRTL ? 'pr-8 pl-3' : 'pl-8 pr-3'}`}
                />
              </div>
            </div>

            {/* Shipping Fee Configuration */}
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-rose-500" />
                  {language === 'ku' ? 'کرێی گەیاندن:' : 'Delivery Fee:'}
                </span>

                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCustomShipping}
                    onChange={e => {
                      setIsCustomShipping(e.target.checked);
                      if (!e.target.checked) setShippingFeeInput(String(serverShippingQuote));
                    }}
                    className="rounded text-rose-500 focus:ring-0"
                  />
                  <span>{language === 'ku' ? 'دەستکاری بە دەستی' : 'Custom Fee'}</span>
                </label>
              </div>

              {isCustomShipping ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="500"
                    placeholder="0"
                    value={shippingFeeInput}
                    onChange={e => setShippingFeeInput(e.target.value)}
                    className="grow py-1.5 px-3 rounded-xl bg-white border border-slate-200 text-xs font-black text-right outline-none focus:border-rose-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShippingFeeInput('0')}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-black border border-emerald-200 cursor-pointer"
                  >
                    {language === 'ku' ? 'خۆڕایی (Free)' : 'Free'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 bg-white p-2 rounded-xl border border-slate-100">
                  <span>{language === 'ku' ? 'نرخی پێشوەختە بۆ ئەم شارە:' : 'Standard rate for city:'}</span>
                  <span className="font-black text-slate-900">{formatIQDLabel(serverShippingQuote)}</span>
                </div>
              )}
            </div>

            {/* Discount Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  {language === 'ku' ? 'داشکاندن:' : 'Discount:'}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="0"
                    value={discountAmt}
                    onChange={e => setDiscountAmt(e.target.value)}
                    className="grow py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-right outline-none focus:border-rose-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setDiscountMode(discountMode === 'amount' ? 'percent' : 'amount')}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-black shrink-0 cursor-pointer"
                  >
                    {discountMode === 'amount' ? 'IQD' : '%'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  {language === 'ku' ? 'دۆخی داواکاری:' : 'Order Status:'}
                </label>
                <select
                  value={initialStatus}
                  onChange={e => setInitialStatus(e.target.value as any)}
                  className="w-full py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:border-rose-400 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="pending">{language === 'ku' ? 'چاوەڕوانکراو (Pending)' : 'Pending'}</option>
                  <option value="processing">{language === 'ku' ? 'ئامادەکردن (Processing)' : 'Processing'}</option>
                  <option value="shipped">{language === 'ku' ? 'ڕەوانەکراو (Shipped)' : 'Shipped'}</option>
                </select>
              </div>
            </div>

            {/* Packaging / Delivery Notes */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 mb-1">
                {language === 'ku' ? 'تێبینی بۆ پاکەت یان دلیڤەری:' : 'Delivery Notes:'}
              </label>
              <input
                type="text"
                placeholder={language === 'ku' ? 'نموونە: بەستەی دیاری بێت، گەیاندنی ئێواران...' : 'Gift wrap, call before arrival...'}
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:border-rose-400 focus:bg-white outline-none"
              />
            </div>

            {/* Order Totals Summary Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>{language === 'ku' ? 'کۆی کاڵاکان:' : 'Subtotal:'}</span>
                <span className="font-bold">{formatIQDLabel(subtotal)}</span>
              </div>

              {discountNum > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-400">
                  <span>{language === 'ku' ? 'داشکاندن:' : 'Discount:'}</span>
                  <span className="font-bold">-{formatIQDLabel(discountNum)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>{language === 'ku' ? 'کرێی گەیاندن:' : 'Delivery Fee:'}</span>
                <span className="font-bold">
                  {activeShippingFee > 0 ? formatIQDLabel(activeShippingFee) : (language === 'ku' ? 'خۆڕایی' : 'Free')}
                </span>
              </div>

              <div className="border-t border-slate-700/80 pt-2 flex items-center justify-between">
                <span className="font-black text-sm text-slate-100">
                  {language === 'ku' ? 'کۆی گشتی بۆ وەرگرتن:' : 'Total to Collect:'}
                </span>
                <span className="font-black text-lg text-rose-400">
                  {formatIQDLabel(totalAmount)}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={isSubmitting || cart.length === 0}
              onClick={handlePlaceOrder}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                cart.length === 0 || isSubmitting
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500 shadow-none'
                  : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 active:scale-98 shadow-rose-200'
              }`}
            >
              {isSubmitting ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{language === 'ku' ? 'تۆمارکردنی داواکاری و ناردن' : 'Submit & Place Order'}</span>
                </>
              )}
            </button>

          </div>
        </div>

      </div>

      {/* Variation Chooser Modal */}
      {selectedProductForModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-black text-sm text-slate-900">
                  {selectedProductForModal.nameKu || selectedProductForModal.name}
                </h3>
                <p className="text-xs font-bold text-rose-600 mt-0.5">
                  {formatIQDLabel(selectedProductForModal.price)}
                </p>
              </div>
              <button
                onClick={() => setSelectedProductForModal(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Colors */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-2">
                {language === 'ku' ? 'ڕەنگ هەڵبژێرە:' : 'Select Color:'}
              </label>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(selectedProductForModal.variations.map(v => String(v.color || '')))).filter(Boolean).map((col: string) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setChosenColor(col)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      chosenColor === col
                        ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span 
                      className="w-3 h-3 rounded-full border border-black/10" 
                      style={{ backgroundColor: getColorHex(col) || '#ccc' }} 
                    />
                    <span>{getLocalizedColorName(col, language)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-2">
                {language === 'ku' ? 'قەبارە / تەمەن هەڵبژێرە:' : 'Select Size:'}
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedProductForModal.variations
                  .filter(v => !chosenColor || v.color === chosenColor)
                  .map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setChosenSize(v.size)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        chosenSize === v.size
                          ? 'border-rose-500 bg-rose-500 text-white shadow-2xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{getLocalizedSizeName(v.size, language)}</span>
                      <span className="text-[10px] opacity-75 mr-1 font-mono">
                        ({v.stockQuantity} ماوە)
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Add Action */}
            <button
              type="button"
              onClick={() => {
                const found = selectedProductForModal.variations.find(
                  v => v.color === chosenColor && v.size === chosenSize
                ) || selectedProductForModal.variations[0];
                if (found) {
                  addToCart(selectedProductForModal, found);
                  setSelectedProductForModal(null);
                }
              }}
              className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black shadow-md active:scale-98 cursor-pointer"
            >
              {language === 'ku' ? 'زیادکردن بۆ سەبەتە' : 'Add to Order'}
            </button>
          </div>
        </div>
      )}

      {/* Quick Custom Item Modal */}
      {showQuickItemModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form 
            onSubmit={handleAddQuickItem} 
            className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl border border-slate-100 space-y-3"
          >
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-black text-sm text-slate-900">
                {language === 'ku' ? 'زیادکردنی کاڵای دەستی' : 'Add Custom Line Item'}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowQuickItemModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 mb-1">
                {language === 'ku' ? 'ناوی کاڵا:' : 'Item Name:'}
              </label>
              <input
                type="text"
                required
                placeholder={language === 'ku' ? 'نموونە: تیشێرتی تایبەت' : 'e.g. Special Shirt'}
                value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 mb-1">
                {language === 'ku' ? 'نرخ (دینار):' : 'Price (IQD):'}
              </label>
              <input
                type="number"
                required
                placeholder="10000"
                value={quickPrice}
                onChange={e => setQuickPrice(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-right outline-none font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  {language === 'ku' ? 'ڕەنگ:' : 'Color:'}
                </label>
                <input
                  type="text"
                  placeholder="Red"
                  value={quickColor}
                  onChange={e => setQuickColor(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  {language === 'ku' ? 'قەبارە:' : 'Size:'}
                </label>
                <input
                  type="text"
                  placeholder="3-4 Years"
                  value={quickSize}
                  onChange={e => setQuickSize(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black shadow-md cursor-pointer mt-2"
            >
              {language === 'ku' ? 'زیادکردن بۆ سەبەتە' : 'Add Line'}
            </button>
          </form>
        </div>
      )}

      {/* Order Completed Success Modal with Waybill & WhatsApp Actions */}
      {completedOrder && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-black text-lg text-slate-900">
                {language === 'ku' ? 'داواکارییەکە تۆمارکرا!' : 'Order Successfully Placed!'}
              </h3>
              <p className="text-xs font-bold text-slate-500 mt-1">
                {language === 'ku' ? 'ژمارەی پسوولە:' : 'Invoice No:'}{' '}
                <span className="font-mono font-black text-slate-800">{completedOrder.invoiceNo}</span>
              </p>
              <p className="text-xs font-bold text-rose-600 mt-1">
                {language === 'ku' ? 'کۆی گشتی بۆ وەرگرتن:' : 'Total Amount to Collect:'}{' '}
                {formatIQDLabel(completedOrder.total)}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {/* Print Waybill */}
              <button
                type="button"
                onClick={() => printDeliveryWaybill(completedOrder)}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98"
              >
                <Printer className="w-4 h-4 text-rose-400" />
                <span>{language === 'ku' ? 'چاپکردنی وەصڵی گەیاندن (Waybill)' : 'Print Delivery Waybill'}</span>
              </button>

              {/* WhatsApp Message */}
              <a
                href={generateWhatsAppUrl(completedOrder)}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{language === 'ku' ? 'ناردنی نامەی واتسئاپ بۆ کڕیار' : 'Send WhatsApp Message'}</span>
              </a>

              {/* Dismiss / Next Sale */}
              <button
                type="button"
                onClick={() => setCompletedOrder(null)}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                {language === 'ku' ? 'داواکاری نوێ' : 'Next Order'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
