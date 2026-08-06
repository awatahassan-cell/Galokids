import { formatIQDLabel } from "../utils/currency";
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Loader2, Tag } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { getColorHex } from '../utils/colors';
import iraqLocations from '../data/iraq-locations.json';

export const Checkout: React.FC = () => {
  const { cart, clearCart, addOrder, currentUser, appliedCoupon, setAppliedCoupon, applyCoupon, coupons } = useStore();
  const navigate = useNavigate();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const { t, language, dir } = useLanguage();
  
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [mobileNumber, setMobileNumber] = useState(currentUser?.phone || '');
  const [address, setAddress] = useState(currentUser?.address || '');


  useEffect(() => {
    if (selectedGovernorate) {
      const gov = iraqLocations.find(l => l.governorate === selectedGovernorate);
      if (gov) {
        // Use translated cities if possible, but the value should probably be consistent
        // We'll use the English names as values and show translated names
        setAvailableCities(gov.cities);
        setSelectedCity('');
      }
    } else {
      setAvailableCities([]);
      setSelectedCity('');
    }
  }, [selectedGovernorate]);

  useEffect(() => {
    setFullName(currentUser?.name || '');
    setMobileNumber(currentUser?.phone || '');
    setAddress(currentUser?.address || '');
  }, [currentUser]);

  useEffect(() => {
    // Only re-validate against a locally known coupon list (staff/admin sessions).
    // Customers no longer receive the full list, and the server re-validates the
    // coupon when the order is placed, so we must not clear it here for them.
    if (appliedCoupon && coupons.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const knownCoupon = coupons.find(c => c.id === appliedCoupon.id || c.code === appliedCoupon.code);
      if (knownCoupon) {
        const stillValid = knownCoupon.isActive
          && (!knownCoupon.startDate || todayStr >= knownCoupon.startDate)
          && (!knownCoupon.endDate || todayStr <= knownCoupon.endDate);
        if (!stillValid) setAppliedCoupon(null);
      }
    }
  }, [appliedCoupon, coupons, setAppliedCoupon]);
  if (!currentUser) {
    return null;
  }


  const subtotal = cart.reduce((acc, item) => acc + Number(item.product.discountPrice || item.product.price || 0) * item.quantity, 0);
  const discountAmount = appliedCoupon ? (subtotal * (appliedCoupon.discountPercentage / 100)) : 0;
  const totalAmount = subtotal - discountAmount;

  const getProductName = (product: any) => {
    if (language === 'ku' && product.nameKu) return product.nameKu;
    if (language === 'ar' && product.nameAr) return product.nameAr;
    return product.name;
  };

  const getGovernorateName = (gov: any) => {
    if (language === 'ku') return gov.governorateKu;
    if (language === 'ar') return gov.governorateAr;
    return gov.governorate;
  };

  const getCityName = (govName: string, cityIndex: number) => {
    const gov = iraqLocations.find(l => l.governorate === govName);
    if (!gov) return '';
    if (language === 'ku') return gov.citiesKu[cityIndex];
    if (language === 'ar') return gov.citiesAr[cityIndex];
    return gov.cities[cityIndex];
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }
    setCouponLoading(true);
    setCouponError('');
    const result = await applyCoupon(couponCode.trim());
    setCouponLoading(false);
    if (result.success) {
      setCouponCode('');
    } else {
      setCouponError(t('invalidCoupon') || result.message || 'Invalid or expired coupon code');
    }
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPlacing) return;
    
    const name = fullName || currentUser?.name || 'Online Customer';
    const mobile = mobileNumber || currentUser?.phone || '';
    const formattedAddress = `${selectedGovernorate}, ${selectedCity}, ${address}`;

    setIsPlacing(true);
    setTimeout(() => {
      addOrder({
        userId: currentUser?.id || 'u2',
        customerName: name,
        customerEmail: currentUser?.email || '',
        customerPhone: mobile,
        items: [...cart],
        totalAmount: totalAmount,
        status: 'pending',
        shippingAddress: formattedAddress,
        paymentMethod: 'cod',
        // The server re-validates the code and recomputes the discount.
        couponCode: appliedCoupon?.code,
      } as any);

      setIsPlacing(false);
      setIsSuccess(true);
      clearCart();
      setAppliedCoupon(null);
    }, 1200);
  };

  if (isSuccess) {
    return (
      <div className="grow flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('orderConfirmedTitle')}</h2>
          <p className="text-slate-600 mb-8">
            {t('orderConfirmedMessage')}
          </p>
          <Link 
            to="/"
            className="inline-flex items-center justify-center w-full px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            {t('continueShopping')}
          </Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="grow flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">{t('emptyCart')}</h2>
        <p className="text-slate-600 mb-8">{t('emptyCart')}</p>
        <Link 
          to="/products"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          {t('continueShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className="grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <Link to="/products" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-8 transition-colors">
        <ArrowLeft className={`w-4 h-4 ${dir === 'rtl' ? 'ml-2 rotate-180' : 'mr-2'}`} /> {t('continueShopping')}
      </Link>

      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-8">{t('checkout')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Shipping Form */}
        <div className="lg:col-span-7">
          <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-8 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-6">{t('shippingInfo')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1">{t('fullName')}</label>
                  <input
                    type="text"
                    id="fullName"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="mobileNumber" className="block text-sm font-medium text-slate-700 mb-1">{t('mobileNumber')}</label>
                  <input
                    type="tel"
                    id="mobileNumber"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="governorate" className="block text-sm font-medium text-slate-700 mb-1">{t('governorate')}</label>
                  <select 
                    id="governorate" 
                    required 
                    value={selectedGovernorate}
                    onChange={(e) => setSelectedGovernorate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="">{t('selectGovernorate')}</option>
                    {iraqLocations.map((gov) => (
                      <option key={gov.governorate} value={gov.governorate}>
                        {getGovernorateName(gov)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-1">{t('city')}</label>
                  <select 
                    id="city" 
                    required 
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    disabled={!selectedGovernorate}
                    className="w-full border border-slate-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">{t('selectCity')}</option>
                    {availableCities.map((city, index) => (
                      <option key={city} value={city}>
                        {getCityName(selectedGovernorate, index)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">{t('address')}</label>
                  <input
                    type="text"
                    id="address"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">{t('paymentMethod')}</h2>
              <div className="space-y-4">
                <label className="flex items-center p-4 border border-indigo-200 bg-indigo-50/30 rounded-xl cursor-pointer hover:bg-indigo-50/50 transition-colors">
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="cod" 
                    defaultChecked 
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300" 
                  />
                  <div className="ml-3">
                    <span className="block text-sm font-semibold text-slate-900">{t('payOnDelivery')}</span>
                    <span className="block text-xs text-slate-500 font-medium">{t('payOnDeliveryDesc')}</span>
                  </div>
                </label>
              </div>
            </div>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-5">
          <div className="bg-slate-50 p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">{t('orderSummary')}</h2>
            
            <div className="flow-root mb-6">
              <ul className="-my-6 divide-y divide-slate-200">
                {cart.map((item) => (
                  <li key={item.id} className="py-6 flex">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
                      <img src={item.product.imageUrl} alt={getProductName(item.product)} className="h-full w-full object-cover object-center" />
                    </div>
                    <div className="ml-4 flex flex-1 flex-col">
                      <div>
                        <div className="flex justify-between text-base font-medium text-slate-900">
                          <h3>{getProductName(item.product)}</h3>
                          <p className="ml-4">{formatIQDLabel(Number(item.product.price || 0) * item.quantity)}</p>
                        </div>
                        <p className="mt-1 text-sm text-slate-500"><span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: getColorHex(item.variation.color) }} title={item.variation.color} /> {item.variation.size}</span></p>
                      </div>
                      <div className="flex flex-1 items-end justify-between text-sm">
                        <p className="text-slate-500">{t('quantity')} {item.quantity}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Coupon Code Section */}
            <div className="mb-6 pt-4 border-t border-slate-200">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-800" />
                {t('discountCode') || 'Discount Code'}
              </label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 px-3.5 py-2.5 rounded-xl border border-emerald-200 text-sm font-semibold shadow-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{t('couponApplied') || 'Coupon applied'}: <strong>{appliedCoupon.code}</strong> ({appliedCoupon.discountPercentage}% OFF)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setAppliedCoupon(null)}
                    className="text-emerald-800 hover:bg-emerald-100 rounded-lg p-1 text-base font-extrabold leading-none shrink-0"
                    title="Remove coupon"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={t("discountCode") || "Discount code"}
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 min-w-0 border border-slate-300 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                    <button
                      type="submit"
                      disabled={couponLoading}
                      className="bg-amber-900 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-amber-800 transition-colors disabled:opacity-60 shadow-sm shrink-0"
                    >
                      {couponLoading ? '...' : (t('applyBtn') || 'Apply')}
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-red-500 font-medium px-1">{couponError}</p>}
                </form>
              )}
            </div>

            <div className="border-t border-slate-200 pt-6 space-y-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <p>{t('subtotal')}</p>
                <p>{formatIQDLabel(subtotal)}</p>
              </div>
              {appliedCoupon && (
                <div className="flex items-center justify-between text-sm text-emerald-600 font-medium">
                  <p>{t('discount')} ({appliedCoupon.discountPercentage}%)</p>
                  <p>-{formatIQDLabel(discountAmount)}</p>
                </div>
              )}
              <div className="flex items-center justify-between text-sm text-slate-600">
                <p>{t('shipping')}</p>
                <p>{t('free')}</p>
              </div>
              <div className="flex items-center justify-between text-lg font-bold text-slate-900 pt-4 border-t border-slate-200">
                <p>{t('total')}</p>
                <p>{formatIQDLabel(totalAmount)}</p>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={isPlacing}
              className="mt-8 w-full flex items-center justify-center rounded-full border border-transparent bg-indigo-600 px-6 py-4 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {isPlacing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  {t('loading')}
                </>
              ) : (
                t('placeOrder')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
