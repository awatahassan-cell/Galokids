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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-x-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 font-arabic">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <span>{language === 'ku' ? 'بەڕێوەبردنی داواکارییەکان' : language === 'ar' ? 'إدارة الطلبات' : 'Manage Orders'}</span>
            <span className="px-3 py-1 text-xs font-bold bg-indigo-100 text-indigo-800 rounded-full">
              {orderCounts.total} {language === 'ku' ? 'کۆی گشتی' : 'Total'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ku'
              ? 'بینین، پاڵاوتن و نوێکردنەوەی باری داواکارییەکانی کڕیاران'
              : 'View, filter and update status of customer orders'}
          </p>
        </div>

        {/* Status Counter Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-bold shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>{language === 'ku' ? 'تازە / چاوەڕوان' : 'New / Pending'}:</span>
            <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-lg font-mono text-sm font-black">{orderCounts.newAndPending}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-900 text-xs font-bold">
            <span>{language === 'ku' ? 'نێردراوە' : 'Shipped'}:</span>
            <span className="px-2 py-0.5 bg-blue-200 text-blue-900 rounded-lg font-mono text-sm font-bold">{orderCounts.shipped}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs font-bold">
            <span>{language === 'ku' ? 'گەیەنراوە' : 'Delivered'}:</span>
            <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-lg font-mono text-sm font-bold">{orderCounts.delivered}</span>
          </div>
        </div>
      </div>

      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Order ID")}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Customer")}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Date")}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Amount")}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Status")}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{L("Action")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {orders.map((order, index) => (
            <tr key={order.id || index}>
              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{order.id}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{order.customerName}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{order.date}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">{Number(order.totalAmount || 0)}</td>
              <td className="px-4 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                  ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                    order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : 
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                    'bg-blue-100 text-blue-800'}`}>
                  {order.status}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 flex items-center gap-3">
                <select
                  value={order.status}
                  onChange={(e) => updateOrderStatus(order.id, e.target.value as Order['status'])}
                  className="border border-slate-300 rounded text-sm py-1 px-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                    className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50 cursor-pointer"
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
      <Pagination meta={ordersPagination} onPageChange={(page) => refreshOrders(page, 10)} />
    </div>
  );
};
