import React from 'react';
import { ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Clock, Pause, CheckCircle2, User } from 'lucide-react';
import { Product, ProductVariation } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminTr } from '../../i18n/adminDict';
import { formatIQDLabel } from '../../utils/currency';
import { getColorHex } from '../../utils/colors';

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

  return (
    <div className="w-full md:w-[380px] lg:w-[420px] bg-white border-l border-slate-200/80 flex flex-col h-full overflow-hidden font-arabic shadow-sm">
      {/* Customer Information Bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-indigo-600" />
            {t('customerDetails') || L('Customer Details')}
          </span>
          {customerInfo?.found && (
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              VIP · {customerInfo.orders_count} {L('Orders')}
            </span>
          )}
        </div>

        <div className="grid grid-cols-5 gap-2">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="col-span-3 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder={t('customerPlaceholder') || L('Full Name')}
          />
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            onBlur={async () => {
              if (customerPhone.replace(/\D/g, '').length >= 7) {
                const info = await lookupCustomer(customerPhone);
                if (info?.found && info.name && !customerName) {
                  setCustomerName(info.name);
                }
              }
            }}
            className="col-span-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder={t('mobileNumber') || L('Phone')}
          />
        </div>
      </div>

      {/* Cart Control Top Bar */}
      <div className="px-3 py-2.5 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-black uppercase tracking-wider">
            {t('yourCart') || L('Register Cart')} ({posCart.reduce((sum, item) => sum + item.quantity, 0)})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 1. Hold Current Order Button */}
          <button
            type="button"
            onClick={holdCurrentSale}
            disabled={posCart.length === 0}
            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
            title={L('Suspend Sale')}
          >
            <Pause className="w-3.5 h-3.5" />
            <span>{L('Hold')}</span>
          </button>

          {/* 2. Open Held Orders List Button */}
          <button
            type="button"
            onClick={() => setShowHeld(true)}
            className="relative px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            title={L('Held Orders')}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            {heldOrdersCount > 0 && (
              <span className="w-4 h-4 bg-amber-500 text-slate-900 text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                {heldOrdersCount}
              </span>
            )}
          </button>

          {/* 3. Clear Cart */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm(language === 'ku' ? 'دڵنیای لە پاککردنەوەی سەبەتەکە؟' : 'Clear register cart?')) {
                clearCart();
              }
            }}
            disabled={posCart.length === 0}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg disabled:opacity-30 cursor-pointer"
            title={t('clear') || 'Clear'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 hide-scrollbar">
        {posCart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
            <ShoppingCart className="w-12 h-12 mb-3 text-slate-300 animate-pulse" />
            <p className="text-xs font-bold text-slate-600">{t('emptyCart') || L('Cart is empty')}</p>
            <p className="text-[11px] text-slate-400 mt-1">{language === 'ku' ? 'بەرهەمێک لە چەپەوە کلیک بکە' : 'Click any product from catalog'}</p>
          </div>
        ) : (
          posCart.map(item => {
            const itemTotal = Number(item.product.discountPrice || item.product.price || 0) * item.quantity;
            return (
              <div
                key={`${item.product.id}-${item.variation.id}`}
                className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center gap-3 transition-all hover:bg-white hover:border-slate-300"
              >
                {/* Thumbnail */}
                <img
                  src={item.product.imageUrl}
                  alt={getProductName(item.product)}
                  className="w-12 h-12 object-cover rounded-lg bg-white border border-slate-200 shrink-0"
                />

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate" title={getProductName(item.product)}>
                    {getProductName(item.product)}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 mt-0.5">
                    <span className="w-2 h-2 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: getColorHex(item.variation.color) }} />
                    <span>{item.variation.size}</span>
                    <span>·</span>
                    <span className="font-mono text-slate-700">{formatIQDLabel(Number(item.product.price || 0))}</span>
                  </div>
                </div>

                {/* Quantity & Delete */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs font-extrabold text-indigo-700">
                    {formatIQDLabel(itemTotal)}
                  </span>

                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, item.variation.id, -1)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <span className="px-1.5 text-xs font-bold text-slate-900 min-w-[1.2rem] text-center font-mono">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, item.variation.id, 1)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeItem(item.product.id, item.variation.id)}
                      className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded cursor-pointer ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cart Summary & Checkout Footer */}
      {posCart.length > 0 && (
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
          {/* Subtotal & Discount Inputs */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between font-semibold text-slate-600">
              <span>{t('subtotal') || L('Subtotal')}:</span>
              <span className="font-mono text-slate-900">{formatIQDLabel(subtotal)}</span>
            </div>

            {/* Discount Bar */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600 font-semibold">{t('discount') || L('Discount')}:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  value={discountAmt}
                  onChange={(e) => setDiscountAmt(e.target.value)}
                  placeholder="0"
                  className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-right outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setDiscountMode(discountMode === 'amount' ? 'percent' : 'amount')}
                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg text-[10px] font-bold text-slate-700 cursor-pointer"
                >
                  {discountMode === 'amount' ? 'IQD' : '%'}
                </button>
              </div>
            </div>

            {/* Grand Total Bar */}
            <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>{t('total') || L('Total Due')}:</span>
              <span className="text-base font-black text-indigo-600 font-mono">{formatIQDLabel(total)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                paymentMethod === 'cash'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>{t('cash') || L('Cash')}</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                paymentMethod === 'card'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>{t('card') || L('Card')}</span>
            </button>
          </div>

          {/* Checkout Submit Button */}
          <button
            type="button"
            onClick={handleCheckout}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-black text-sm shadow-md shadow-emerald-200 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{t('pay') || L('Checkout & Print Receipt')}</span>
          </button>
        </div>
      )}
    </div>
  );
};
