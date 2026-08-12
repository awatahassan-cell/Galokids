import { formatIQDLabel } from "../utils/currency";
import React from 'react';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';
import { getColorHex } from '../utils/colors';
import { Navigate, Link } from 'react-router-dom';
import { Package, Clock, CheckCircle, Truck, XCircle, RefreshCw, AlertCircle, RotateCcw } from 'lucide-react';

import { isPosOrder } from '../components/admin/AdminOrdersTab';
import { isSamePhone } from '../utils/phone';
import { Pagination } from '../components/Pagination';
import { orderItemName, orderItemVariation } from '../utils/orderItems';
import { OrderReturnBadge, OrderItemReturnNote } from '../components/OrderReturnBadge';

export const MyOrders: React.FC = () => {
  const { orders, currentUser, refreshOrders, ordersError, ordersPagination } = useStore();
  const { t, language } = useLanguage();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Orders change while the customer is away (the shop confirms, ships or
  // cancels them), and the store only loaded them once at app start. Without
  // this the page showed stale data until the browser was reloaded by hand.
  // A customer who has shopped here for years can have more orders than fit in
  // one page, and there is nothing more alarming than a purchase history that
  // silently stops.
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    if (!currentUser) return;
    refreshOrders({ page, limit: 20 });
  }, [currentUser?.id, refreshOrders, page]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshOrders({ page, limit: 20 });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const userEmail = currentUser.email ? currentUser.email.toLowerCase().trim() : '';

  const userOrders = orders
    .filter(order => {
      // Exclude POS sales from customer My Orders view!
      if (isPosOrder(order)) return false;

      if (String(order.userId) === String(currentUser.id)) return true;
      if (userEmail && order.customerEmail && order.customerEmail.toLowerCase().trim() === userEmail) return true;
      if (currentUser.phone && order.customerPhone && isSamePhone(order.customerPhone, currentUser.phone)) return true;
      return false;
    })
    .sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime());

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-3.5 h-3.5" />;
      case 'processing': return <Package className="w-3.5 h-3.5" />;
      case 'shipped': return <Truck className="w-3.5 h-3.5" />;
      case 'delivered': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'cancelled': return <XCircle className="w-3.5 h-3.5" />;
      case 'returned': return <RotateCcw className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  // Status tones follow the brand: warm while the parcel is in motion, mint
  // once it has landed. Cancelled keeps red — that is the one real warning.
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-slate-100 text-slate-600';
      case 'processing': return 'bg-bubble-100 text-bubble-700';
      case 'shipped': return 'bg-sunny-100 text-sunny-700';
      case 'delivered': return 'bg-mint-50 text-mint-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'returned': return 'bg-sunny-100 text-sunny-800';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="grow max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <span className="vk-sub">
            {language === 'ku' ? 'هەژمارەکەم' : language === 'ar' ? 'حسابي' : 'My account'}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {language === 'ku' ? <>داواکاری<span className="vk-hi">یەکانم</span></>
              : language === 'ar' ? <>طلبا<span className="vk-hi">تي</span></>
              : <>My <span className="vk-hi">orders</span></>}
          </h1>
          <p className="text-slate-500 mt-2 font-bold text-sm">{t('myOrdersSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-grape-700 hover:border-indigo-200 shadow-sm transition-all disabled:opacity-60 cursor-pointer active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>
            {language === 'ku' ? 'نوێکردنەوە' : language === 'ar' ? 'تحديث' : 'Refresh'}
          </span>
        </button>
      </div>

      {ordersError && userOrders.length === 0 ? (
        /* A request that never landed is not an empty history. Saying "you
           have no orders" when the session expired makes a customer think
           their purchases vanished. */
        <div className="bg-white rounded-2xl shadow-sm border border-sunny-200 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-sunny-600 mx-auto mb-4" />
          <h2 className="text-xl font-black text-slate-900 mb-2">
            {ordersError === 'unauthorized'
              ? (language === 'ku' ? 'دانیشتنەکەت بەسەرچووە' : language === 'ar' ? 'انتهت جلستك' : 'Your session expired')
              : (language === 'ku' ? 'نەتوانرا داواکارییەکان بهێنرێن' : language === 'ar' ? 'تعذر تحميل الطلبات' : "Couldn't load your orders")}
          </h2>
          <p className="text-slate-500 mb-5">
            {ordersError === 'unauthorized'
              ? (language === 'ku' ? 'تکایە دووبارە بچۆرە ژوورەوە بۆ بینینی داواکارییەکانت. داواکارییەکانت لەدەست نەچوون.' : language === 'ar' ? 'يرجى تسجيل الدخول مرة أخرى. طلباتك لم تُفقد.' : 'Please sign in again — your orders are safe.')
              : (language === 'ku' ? 'پەیوەندی بە سێرڤەرەوە نەکرا. دووبارە هەوڵبدەوە.' : language === 'ar' ? 'تعذر الاتصال بالخادم. حاول مرة أخرى.' : 'We could not reach the server. Please try again.')}
          </p>
          {ordersError === 'unauthorized' ? (
            <Link to="/login" className="inline-block bg-candy-500 hover:bg-candy-600 text-white font-black px-6 py-3 rounded-full transition-colors">
              {t('signIn') || 'چوونەژوورەوە'}
            </Link>
          ) : (
            <button onClick={handleRefresh} className="bg-candy-500 hover:bg-candy-600 text-white font-black px-6 py-3 rounded-full transition-colors">
              {language === 'ku' ? 'هەوڵدانەوە' : language === 'ar' ? 'إعادة المحاولة' : 'Try again'}
            </button>
          )}
        </div>
      ) : userOrders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{t('noOrdersFound')}</h2>
          <p className="text-slate-500">{t('noOrdersYet')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {userOrders.map((order) => {
            const steps = ['pending', 'processing', 'shipped', 'delivered'];
            const reached = Math.max(0, steps.indexOf(order.status));
            // Neither a cancelled nor a returned order is still on its way, so
            // the delivery rail below would be misleading for both.
            const cancelled = order.status === 'cancelled' || order.status === 'returned';
            const itemCount = (order.items || []).reduce((n, it) => n + (it.quantity || 0), 0);
            const placedOn = new Date(order.createdAt || order.date || Date.now());
            const stepLabels = language === 'ku'
              ? ['وەرگیرا', 'ئامادەکرا', 'ڕێکەوت', 'گەیشت']
              : language === 'ar'
              ? ['استُلم', 'جُهّز', 'في الطريق', 'وصل']
              : ['Received', 'Packed', 'On the way', 'Delivered'];

            return (
              <div key={order.id} className="bg-white rounded-3xl border border-slate-100 shadow-2xs hover:shadow-lg transition-shadow overflow-hidden">
                {/* Invoice number and status, as one row */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-dashed border-slate-200">
                  <span className="font-mono text-xs sm:text-sm font-black text-slate-500 tracking-wide">
                    {order.invoiceNo || `#${order.id}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <OrderReturnBadge order={order} />
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-black ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {t(order.status)}
                    </span>
                  </div>
                </div>

                {/* Four dots joined by a rail — where the parcel actually is. */}
                {!cancelled && (
                  <div className="px-4 sm:px-5 pt-5">
                    <div className="flex items-center">
                      {steps.map((_, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && (
                            <span className={`flex-1 h-[3px] ${i <= reached ? 'bg-candy-500' : 'bg-slate-200'}`} />
                          )}
                          <span
                            className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                              i <= reached ? 'bg-candy-500 ring-4 ring-candy-500/20' : 'bg-slate-200'
                            }`}
                          />
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="flex justify-between mt-2.5">
                      {stepLabels.map((label, i) => (
                        <span
                          key={label}
                          className={`text-[10px] sm:text-[11px] font-black ${
                            i <= reached ? 'text-candy-700' : 'text-slate-400'
                          }`}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="p-4 sm:p-5 space-y-3">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-candy-50 to-candy-200 overflow-hidden shrink-0">
                        {item.product?.imageUrl && (
                          <img src={item.product.imageUrl} alt={orderItemName(item, language)} loading="lazy" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="grow min-w-0">
                        <h4 className="font-black text-slate-900 text-sm truncate">{orderItemName(item, language)}</h4>
                        <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5 mt-0.5">
                          {item.variation?.color && (
                            <span className="w-3 h-3 rounded-full border border-slate-200 shrink-0" style={{ backgroundColor: getColorHex(item.variation.color) }} title={item.variation.color} />
                          )}
                          {orderItemVariation(item)} × {item.quantity}
                        </p>
                        <OrderItemReturnNote item={item} className="mt-1" />
                      </div>
                      <span className="font-mono text-sm font-black text-slate-800 shrink-0">
                        {formatIQDLabel(Number(item.price ?? item.product?.price ?? 0) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* What it came to, and where it went */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-4 border-t border-dashed border-slate-200 bg-slate-50/60">
                  <span className="text-xs font-bold text-slate-500">
                    {itemCount} {language === 'ku' ? 'بەرهەم' : language === 'ar' ? 'منتج' : 'items'}
                    {' · '}{placedOn.toLocaleDateString()}
                    {order.shippingAddress ? ` · ${String(order.shippingAddress).split('-')[0].trim()}` : ''}
                  </span>
                  <span className="font-mono text-lg font-black text-candy-700">
                    {formatIQDLabel(Number(order.totalAmount || 0))}
                  </span>
                </div>
              </div>
            );
          })}
          {(ordersPagination?.lastPage || 1) > 1 && (
            <Pagination
              meta={{
                currentPage: page,
                lastPage: ordersPagination.lastPage,
                total: ordersPagination.total,
              }}
              onPageChange={next => {
                setPage(next);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
