import { formatIQDLabel } from "../utils/currency";
import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Minus, Plus, ShoppingBag, Trash2, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { getColorHex, getLocalizedColorName, getLocalizedSizeName } from '../utils/colors';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const { cart, removeFromCart, updateCartItemQuantity, appliedCoupon, setAppliedCoupon, applyCoupon } = useStore();
  const [couponCode, setCouponCode] = React.useState('');
  const [couponError, setCouponError] = React.useState('');
  const [couponLoading, setCouponLoading] = React.useState(false);
  const [showCouponInput, setShowCouponInput] = React.useState(false);
  const { t, language } = useLanguage();

  const subtotal = cart.reduce((acc, item) => acc + Number(item.product.discountPrice || item.product.price || 0) * item.quantity, 0);
  const discountAmount = appliedCoupon ? (subtotal * (appliedCoupon.discountPercentage / 100)) : 0;
  const totalAmount = subtotal - discountAmount;

  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponCode.trim()) {
      setAppliedCoupon(null);
      return;
    }
    setCouponLoading(true);
    const result = await applyCoupon(couponCode.trim());
    setCouponLoading(false);
    if (result.success) {
      setCouponCode('');
    } else {
      setCouponError(t('invalidCoupon') || result.message || 'Invalid or expired coupon code');
    }
  };

  const getProductName = (product: any) => {
    if (language === 'ku' && product.nameKu) return product.nameKu;
    if (language === 'ar' && product.nameAr) return product.nameAr;
    return product.name;
  };

  return (
    <AnimatePresence>
      {isOpen && createPortal(
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[99998]"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[99999] flex flex-col font-arabic"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 flex items-center">
                <ShoppingBag className="w-5 h-5 mr-2" /> {t('yourCart')}
              </h2>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
                  <ShoppingBag className="w-12 h-12 text-slate-300" />
                  <p>{t('emptyCart')}</p>
                  <button 
                    onClick={onClose}
                    className="text-indigo-600 font-medium hover:text-indigo-700"
                  >
                    {t('continueShopping')}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <AnimatePresence mode="popLayout">
                    {cart.filter(item => item).map((item) => (
                      <motion.div 
                        key={item?.id} 
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        className="flex gap-4"
                      >
                        <div className="w-24 h-24 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                          <img 
                            src={item.product.imageUrl} 
                            alt={item.product.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 flex flex-col">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">{getProductName(item.product)}</h3>
                              <p className="text-xs text-slate-500 mt-1">
                                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: getColorHex(item.variation.color) }} title={getLocalizedColorName(item.variation.color, language)} /> {getLocalizedColorName(item.variation.color, language)} {item.variation.color && item.variation.size ? '•' : ''} {getLocalizedSizeName(item.variation.size, language)}</span>
                              </p>
                            </div>
                            <p className="text-sm font-medium text-slate-900">{formatIQDLabel(Number(item.product.discountPrice || item.product.price || 0) * item.quantity)}</p>
                          </div>
                          
                          <div className="mt-auto flex items-center justify-between">
                            <div className="flex items-center border border-slate-200 rounded-lg">
                              <button 
                                onClick={() => updateCartItemQuantity(item?.id, item.quantity - 1)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-3 text-sm font-medium text-slate-700 min-w-[2rem] text-center">
                                {item.quantity}
                              </span>
                              <button 
                                onClick={() => updateCartItemQuantity(item?.id, item.quantity + 1)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50"
                                disabled={item.quantity >= item.variation.stockQuantity}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <button 
                              onClick={() => removeFromCart(item?.id)}
                              className="text-xs font-medium text-red-500 hover:text-red-700 flex items-center"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> {t('remove')}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-slate-200 p-6 bg-slate-50 space-y-4">
                
                {/* Coupon Section */}
                <div className="space-y-2">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 px-3 py-2 rounded-xl text-xs font-semibold border border-emerald-200">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{(t('couponApplied') || 'Coupon applied')}: <strong>{appliedCoupon.code}</strong> ({appliedCoupon.discountPercentage}% OFF)</span>
                      </span>
                      <button 
                        onClick={() => setAppliedCoupon(null)} 
                        className="hover:bg-emerald-100 text-emerald-800 rounded-lg p-1 text-sm font-bold leading-none shrink-0"
                        title="Remove coupon"
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={t("discountCode") || "Discount code"}
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          className="flex-1 min-w-0 border border-slate-300 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        />
                        <button
                          onClick={handleApplyCoupon}
                          disabled={couponLoading}
                          className="bg-amber-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-800 transition-colors disabled:opacity-60 shadow-sm shrink-0"
                        >
                          {couponLoading ? '...' : (t('applyBtn') || 'Apply')}
                        </button>
                      </div>
                      {couponError && <p className="text-xs text-red-500 font-medium px-1">{couponError}</p>}
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>{t('subtotal') || 'Subtotal'}</span>
                    <span>{formatIQDLabel(subtotal)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex items-center justify-between text-sm text-emerald-600 font-medium">
                      <span>{t('discount') || 'Discount'} ({appliedCoupon.discountPercentage}%)</span>
                      <span>-{formatIQDLabel(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 text-lg">
                    <span>{t('total') || 'Total'}</span>
                    <span>{formatIQDLabel(totalAmount)}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-6">{t('shippingCalculated') || 'Shipping and taxes calculated at checkout.'}</p>
                <Link 
                  to="/checkout"
                  onClick={onClose}
                  className="w-full flex items-center justify-center bg-slate-900 text-white py-3.5 rounded-full font-bold hover:bg-slate-800 transition-colors shadow-sm"
                >
                  {t('checkout') || 'Checkout'}
                </Link>
              </div>
            )}
          </motion.div>
        </>,
        document.body
      )}
    </AnimatePresence>
  );
};
