import React from 'react';
import { ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Clock, Pause, CheckCircle2, User, X } from 'lucide-react';
import { Product, ProductVariation } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminTr } from '../../i18n/adminDict';
import { formatIQDLabel } from '../../utils/currency';
import { getColorHex } from '../../utils/colors';
import { getUnitPrice, getLineTotal } from '../../utils/pricing';

export interface POSCartPanelProps {
  posCart: { product: Product; variation: ProductVariation; quantity: number }[];
  updateQuantity: (productId: string, variationId: string, delta: number) => void;
  removeItem: (productId: string, variationId: string) => void;
  clearCart: () => void;
  discountAmt: string;
  setDiscountAmt: (v: string) => void;
  discountMode: 'amount' | 'percent';
  setDiscountMode: (m: 'amount' | 'percent') => void;
  paymentMethod: 'cash' | 'card';
  setPaymentMethod: (m: 'cash' | 'card') => void;
  cashReceived: string;
  setCashReceived: (v: string) => void;
  setUserEditedCash: (b: boolean) => void;
  customerName: string;
  setCustomerName: (n: string) => void;
  customerPhone: string;
  setCustomerPhone: (p: string) => void;
  customerInfo: any;
  lookupCustomer: (p: string) => Promise<any>;
  subtotal: number;
  discountNum: number;
  total: number;
  changeDue: number;
  handleCheckout: () => void;
  holdCurrentSale: () => void;
  heldOrdersCount: number;
  setShowHeld: (b: boolean) => void;
  lastReceipt: any;
  printReceipt: (items: any[], totals: any, custName: string, invNo: string) => void;
}

export const POSCartPanel: React.FC<POSCartPanelProps> = ({
  posCart,
  updateQuantity,
  removeItem,
  clearCart,
  discountAmt,
  setDiscountAmt,
  discountMode,
  setDiscountMode,
  paymentMethod,
  setPaymentMethod,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerInfo,
  lookupCustomer,
  subtotal,
  discountNum,
  total,
  handleCheckout,
  holdCurrentSale,
  heldOrdersCount,
  setShowHeld,
}) => {
  const { t, language } = useLanguage();
  const L = (key: string) => adminTr(key, language);
  const isRTL = language === 'ar' || language === 'ku';

  const getProductName = (product: Product) => {
    if (language === 'ku' && product.nameKu) return product.nameKu;
    if (language === 'ar' && product.nameAr) return product.nameAr;
    return product.name;
  };

  const handleCancelSale = () => {
    clearCart();
    setDiscountAmt('');
  };

  return (
    <div className="w-full lg:w-[400px] xl:w-[440px] bg-white/85 backdrop-blur-xl border border-white/90 rounded-3xl lg:rounded-[2.5rem] p-3.5 sm:p-5 shadow-xl flex flex-col h-auto lg:h-full overflow-visible lg:overflow-hidden font-arabic shrink-0">
      
      {/* Customer Info Section */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 mb-3 space-y-2 shrink-0">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-indigo-600" />
            {L("Customer Details")}
          </span>
          {customerInfo?.found && (
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full shadow-2xs">
              VIP · {customerInfo.orders_count} {L('Orders')}
            </span>
          )}
        </div>

        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          placeholder={L("Full Name (e.g. Ali Ahmed)")}
        />
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2.5 pr-0.5 mb-3">
        {posCart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-3xl">
            <ShoppingCart className="w-10 h-10 text-slate-300 mb-2 animate-pulse" />
            <h4 className="text-xs font-black text-slate-600">{L("Cart is empty")}</h4>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
              {L("Click on any product variation on the left to add items to order.")}
            </p>
          </div>
        ) : (
          posCart.map(({ product, variation, quantity }) => {
            const displayPrice = getUnitPrice(product, variation);
            const lineTotal = getLineTotal(product, variation, quantity);
            const hexColor = getColorHex(variation.color || '');

            return (
              <div
                key={`${product.id}-${variation.id}`}
                className="bg-white border border-slate-100 rounded-2xl p-2.5 shadow-2xs flex items-center justify-between gap-2.5 group transition-all"
              >
                {/* Product Image Thumbnail */}
                <img
                  src={product.imageUrl || 'https://images.unsplash.com/photo-1560243563-062bfc001d68?auto=format&fit=crop&q=80&w=800'}
                  alt={getProductName(product)}
                  className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-100 bg-slate-100"
                />

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-black text-slate-900 truncate" title={getProductName(product)}>
                    {getProductName(product)}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[9px] font-bold">
                      {variation.size}
                    </span>
                    {hexColor && (
                      <span className="w-2 h-2 rounded-full border border-slate-200 shrink-0" style={{ backgroundColor: hexColor }} />
                    )}
                    <span className="text-[10px] font-black text-slate-800">
                      {formatIQDLabel(Number(displayPrice || 0))}
                    </span>
                  </div>
                </div>

                {/* Quantity Stepper & Line Total */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200/60">
                    <button
                      onClick={() => updateQuantity(product.id, variation.id, -1)}
                      className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center text-xs font-black text-slate-900">
                      {quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(product.id, variation.id, 1)}
                      className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="text-xs font-black text-slate-900 min-w-[70px] text-right">
                    {formatIQDLabel(lineTotal)}
                  </span>

                  <button
                    onClick={() => removeItem(product.id, variation.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                    title={L("Remove Item")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary & Checkout Footer */}
      <div className="border-t border-slate-200/80 pt-3 space-y-3 shrink-0">
        
        {/* Discount & Payment Method Selectors */}
        <div className="grid grid-cols-2 gap-2">
          
          {/* Discount Input */}
          <div className="flex items-center bg-slate-100 rounded-xl border border-slate-200/80 p-1">
            <input
              type="number"
              value={discountAmt}
              onChange={(e) => setDiscountAmt(e.target.value)}
              placeholder={L("Discount")}
              className="w-full bg-transparent px-2 py-1 text-xs font-bold text-slate-900 outline-none"
            />
            <button
              onClick={() => setDiscountMode(discountMode === 'amount' ? 'percent' : 'amount')}
              className="px-2 py-1 bg-white text-slate-800 rounded-lg text-[10px] font-black shadow-2xs border border-slate-200 shrink-0 cursor-pointer"
            >
              {discountMode === 'amount' ? 'IQD' : '%'}
            </button>
          </div>

          {/* Payment Method Toggle */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`py-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                paymentMethod === 'cash' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>{L("Cash")}</span>
            </button>

            <button
              onClick={() => setPaymentMethod('card')}
              className={`py-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                paymentMethod === 'card' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{L("Card")}</span>
            </button>
          </div>
        </div>

        {/* Totals Summary Card */}
        <div className="bg-slate-900 text-white p-4 rounded-3xl space-y-2 shadow-md">
          <div className="flex justify-between items-center text-xs text-slate-400 font-bold">
            <span>{L("Subtotal")}:</span>
            <span className="text-white font-black">{formatIQDLabel(subtotal)}</span>
          </div>

          {discountNum > 0 && (
            <div className="flex justify-between items-center text-xs text-rose-400 font-bold">
              <span>{L("Discount")}:</span>
              <span>-{formatIQDLabel(discountNum)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-base font-black">
            <span>{L("Total Payable")}:</span>
            <span className="text-emerald-400 text-lg">{formatIQDLabel(total)}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-2">
          {/* Cancel Sale Button */}
          <button
            disabled={posCart.length === 0}
            onClick={handleCancelSale}
            className="w-auto px-3 py-3.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-full font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Hold Sale Button */}
          <button
            disabled={posCart.length === 0}
            onClick={holdCurrentSale}
            className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-full font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Pause className="w-4 h-4" />
            <span>{L("Hold")}</span>
          </button>

          {/* Complete Sale Button */}
          <button
            disabled={posCart.length === 0}
            onClick={handleCheckout}
            className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-full font-black text-xs shadow-lg active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{L("Complete Sale & Print")}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
