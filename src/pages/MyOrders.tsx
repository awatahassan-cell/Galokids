import { formatIQDLabel } from "../utils/currency";
import React from 'react';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';
import { getColorHex } from '../utils/colors';
import { Navigate } from 'react-router-dom';
import { Package, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';

import { isPosOrder } from '../components/admin/AdminOrdersTab';

export const MyOrders: React.FC = () => {
  const { orders, currentUser } = useStore();
  const { t, language } = useLanguage();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const userPhoneDigits = currentUser.phone ? currentUser.phone.replace(/[^\d]/g, '') : '';
  const userEmail = currentUser.email ? currentUser.email.toLowerCase().trim() : '';

  const userOrders = orders
    .filter(order => {
      // Exclude POS sales from customer My Orders view!
      if (isPosOrder(order)) return false;

      if (String(order.userId) === String(currentUser.id)) return true;
      if (userEmail && order.customerEmail && order.customerEmail.toLowerCase().trim() === userEmail) return true;
      if (userPhoneDigits && order.customerPhone) {
        const orderPhoneDigits = order.customerPhone.replace(/[^\d]/g, '');
        if (orderPhoneDigits && (orderPhoneDigits === userPhoneDigits || (userPhoneDigits.length >= 8 && orderPhoneDigits.includes(userPhoneDigits.slice(-8))))) {
          return true;
        }
      }
      return false;
    })
    .sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime());

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'processing': return <Package className="w-5 h-5 text-blue-500" />;
      case 'shipped': return <Truck className="w-5 h-5 text-indigo-500" />;
      case 'delivered': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getProductName = (product: any) => {
    if (language === 'ku' && product.nameKu) return product.nameKu;
    if (language === 'ar' && product.nameAr) return product.nameAr;
    return product.name;
  };

  return (
    <div className="grow max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('myOrders')}</h1>
        <p className="text-slate-500 mt-2">{t('myOrdersSubtitle')}</p>
      </div>

      {userOrders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{t('noOrdersFound')}</h2>
          <p className="text-slate-500">{t('noOrdersYet')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {userOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50 p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">{t('orderLabel')} #{order.id}</p>
                  <p className="font-medium text-slate-900">{new Date(order.createdAt || order.date || Date.now()).toLocaleDateString()}</p>
                  <p className="text-sm text-slate-500 mt-1">{t('mobileNumber')}: {order.customerPhone || '-'}</p>
                </div>
                <div className="flex flex-col sm:items-end gap-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span className="ml-2">{t(order.status)}</span>
                  </span>
                  <p className="font-bold text-slate-900">{t('totalLabel')}: {formatIQDLabel(Number(order.totalAmount || 0))}</p>
                </div>
              </div>
              
              {/* Progress Bar */}
              {order.status !== 'cancelled' && (
                <div className="px-4 sm:px-6 py-6 border-b border-slate-200">
                  <div className="relative">
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-slate-200">
                      <div style={{ width: `${(Math.max(0, ['pending', 'processing', 'shipped', 'delivered'].indexOf(order.status)) / 3) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-500"></div>
                    </div>
                    <div className="flex justify-between text-xs font-medium text-slate-500 px-1">
                      <div className={`text-center ${['pending', 'processing', 'shipped', 'delivered'].includes(order.status) ? 'text-indigo-600' : ''}`}>{t('pending')}</div>
                      <div className={`text-center ${['processing', 'shipped', 'delivered'].includes(order.status) ? 'text-indigo-600' : ''}`}>{t('processing')}</div>
                      <div className={`text-center ${['shipped', 'delivered'].includes(order.status) ? 'text-indigo-600' : ''}`}>{t('shipped')}</div>
                      <div className={`text-center ${['delivered'].includes(order.status) ? 'text-indigo-600' : ''}`}>{t('delivered')}</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="p-4 sm:p-6">
                <h3 className="text-sm font-medium text-slate-900 mb-4">{t('orderItems')}</h3>
                <div className="space-y-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0 last:pb-0">
                      <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                        <img src={item.product.imageUrl} alt={getProductName(item.product)} className="w-full h-full object-cover" />
                      </div>
                      <div className="grow">
                        <h4 className="font-medium text-slate-900 text-sm">{getProductName(item.product)}</h4>
                        <p className="text-sm text-slate-500">
                          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: getColorHex(item.variation.color) }} title={item.variation.color} /> {item.variation.size}</span> × {item.quantity}
                        </p>
                      </div>
                      <div className="text-right font-medium text-slate-900 text-sm">
                        {formatIQDLabel(Number(item.product.price || 0) * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
