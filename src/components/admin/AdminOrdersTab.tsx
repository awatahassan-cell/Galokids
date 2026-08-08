import React from 'react';
import { Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminTr } from '../../i18n/adminDict';
import { Order, PaginationMeta } from '../../types';
import { Pagination } from '../Pagination';
import { useConfirm, useToast } from '../ui/Feedback';

export interface AdminOrdersTabProps {
  orders: Order[];
  orderCounts: {
    total: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    newAndPending: number;
  };
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  deleteOrder: (orderId: string) => void;
  ordersPagination: PaginationMeta;
  refreshOrders: (page?: number, limit?: number) => void;
  confirmDialog?: (options: any) => Promise<boolean>;
  toast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AdminOrdersTab: React.FC<AdminOrdersTabProps> = ({
  orders,
  orderCounts,
  updateOrderStatus,
  deleteOrder,
  ordersPagination,
  refreshOrders,
  confirmDialog: propConfirmDialog,
  toast: propToast,
}) => {
  const { language } = useLanguage();
  const L = (key: string) => adminTr(key, language);
  const hookConfirm = useConfirm();
  const hookToast = useToast();
  const confirmDialog = propConfirmDialog || hookConfirm;
  const toast = propToast || hookToast;

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-6 md:p-8 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.4)] overflow-x-auto font-arabic">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100/80">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <span>{language === 'ku' ? 'بەڕێوەبردنی داواکارییەکان' : language === 'ar' ? 'إدارة الطلبات' : 'Manage Orders'}</span>
            <span className="px-3 py-1 text-xs font-black bg-slate-900 text-white rounded-full shadow-xs">
              {orderCounts.total} {language === 'ku' ? 'کۆی گشتی' : 'Total'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {language === 'ku'
              ? 'بینین، پاڵاوتن و نوێکردنەوەی باری داواکارییەکانی کڕیاران'
              : 'View, filter and update status of customer orders'}
          </p>
        </div>

        {/* Status Counter Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-200 text-amber-900 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            <span>{language === 'ku' ? 'تازە / چاوەڕوان' : 'New / Pending'}:</span>
            <span className="px-2 py-0.5 bg-amber-500 text-white rounded-lg text-xs font-black">{orderCounts.newAndPending}</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-blue-500/10 border border-blue-200 text-blue-900 text-xs font-bold shadow-2xs">
            <span>{language === 'ku' ? 'نێردراوە' : 'Shipped'}:</span>
            <span className="px-2 py-0.5 bg-blue-600 text-white rounded-lg text-xs font-bold">{orderCounts.shipped}</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-200 text-emerald-900 text-xs font-bold shadow-2xs">
            <span>{language === 'ku' ? 'گەیەنراوە' : 'Delivered'}:</span>
            <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-lg text-xs font-bold">{orderCounts.delivered}</span>
          </div>
        </div>
      </div>

      <table className="min-w-full divide-y divide-slate-100">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{L("Order ID")}</th>
            <th className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{L("Customer")}</th>
            <th className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{L("Date")}</th>
            <th className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{L("Amount")}</th>
            <th className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{L("Status")}</th>
            <th className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{L("Action")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs font-medium">
          {orders.map((order, index) => (
            <tr key={order.id || index} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-4 py-4 whitespace-nowrap font-bold text-slate-900">#{order.id}</td>
              <td className="px-4 py-4 whitespace-nowrap text-slate-600 font-semibold">{order.customerName}</td>
              <td className="px-4 py-4 whitespace-nowrap text-slate-400">{order.date}</td>
              <td className="px-4 py-4 whitespace-nowrap font-black text-slate-900">{Number(order.totalAmount || 0)}</td>
              <td className="px-4 py-4 whitespace-nowrap">
                <span className={`px-3 py-1 inline-flex text-[11px] font-black rounded-full 
                  ${order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                    order.status === 'processing' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 
                    order.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 
                    'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                  {order.status}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-slate-500 flex items-center gap-3">
                <select
                  value={order.status}
                  onChange={(e) => updateOrderStatus(order.id, e.target.value as Order['status'])}
                  className="bg-slate-100/80 border border-slate-200 rounded-xl text-xs py-1.5 px-3 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="pending">{L("Pending")}</option>
                  <option value="processing">{L("Processing")}</option>
                  <option value="shipped">{L("Shipped")}</option>
                  <option value="delivered">{L("Delivered")}</option>
                  <option value="cancelled">{L("Cancelled")}</option>
                </select>
                {order.id && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (await confirmDialog({
                        title: L('Delete order?'),
                        message: language === 'ku'
                          ? `داواکاری #${order.id} دەسڕدرێتەوە و ستۆکەکەی دەگەڕێندرێتەوە بۆ کۆگا.`
                          : language === 'ar'
                          ? `سيتم حذف الطلب #${order.id} وإعادة مخزونه إلى الكتالوج.`
                          : `Order #${order.id} will be deleted and its stock returned to inventory.`,
                        confirmText: L('Delete'),
                        cancelText: L('Cancel'),
                        danger: true,
                      })) {
                        deleteOrder(order.id);
                        toast(L('Order deleted and stock restored ✅'));
                      }
                    }}
                    className="text-slate-400 hover:text-rose-600 transition-colors p-2 rounded-xl hover:bg-rose-50 cursor-pointer"
                    title={L("Delete Order")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4">
        <Pagination meta={ordersPagination} onPageChange={(page) => refreshOrders(page, 10)} />
      </div>
    </div>
  );
};
