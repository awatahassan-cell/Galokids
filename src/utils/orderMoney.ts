import { Order, Product } from '../types';

/**
 * What an order is worth to the shop, and what it cost.
 *
 * The admin screens each did this sum by hand, and each got a different answer:
 * the profit report counted cancelled orders as revenue, the calendar left the
 * cost of goods out of "net profit" entirely, and none of them subtracted a
 * refund. So the same month showed three different profits depending on which
 * page you opened, and every one of them was higher than the truth.
 *
 * These helpers are the one place that decides, and they match what the server
 * reports at /api/reports/sales.
 */

/** A cancelled order never happened — it is in no figure at all. */
export const isCountableOrder = (order: any): boolean =>
  Boolean(order) && order.status !== 'cancelled';

/** An order that came back in full is not a sale the shop made. */
export const isCompletedSale = (order: any): boolean =>
  isCountableOrder(order) && order.status !== 'returned';

/**
 * Money kept: what was charged, less anything handed back.
 *
 * A delivery fee on a returned order stays in — it was charged, and the shop
 * still paid the courier.
 */
export const getOrderRevenue = (order: any): number => {
  if (!isCountableOrder(order)) return 0;
  const charged = Number(order.totalAmount ?? order.total_amount ?? 0) || 0;
  const refunded = Number(order.refundedAmount ?? order.refunded_amount ?? 0) || 0;
  return charged - refunded;
};

/** Pieces of a line the shop actually parted with. */
export const getItemNetQuantity = (item: any): number => {
  const sold = Number(item?.quantity ?? 0) || 0;
  const back = Number(item?.returnedQuantity ?? item?.returned_quantity ?? 0) || 0;
  return Math.max(0, sold - back);
};

/** Pieces sold on an order, after anything that came back. */
export const getOrderItemsSold = (order: any): number => {
  if (!isCountableOrder(order)) return 0;
  return (order.items || []).reduce((sum: number, item: any) => sum + getItemNetQuantity(item), 0);
};

/**
 * Cost of the goods that left the shop for good.
 *
 * `products` is the live catalogue, used to pick up a cost that was filled in
 * after the sale. A product with no cost recorded contributes nothing: the old
 * code guessed at 40% of the selling price, which put an invented number into
 * the profit figure and made a shop with no cost prices look reliably
 * profitable. A missing cost is something to go and fill in, not to make up.
 */
export const getOrderCost = (order: any, products: Product[] = []): number => {
  if (!isCountableOrder(order)) return 0;

  return (order.items || []).reduce((sum: number, item: any) => {
    const catalogue = products.find(p => String(p.id) === String(item?.product?.id));
    const unitCost = Number(catalogue?.cost ?? item?.product?.cost ?? 0) || 0;
    return sum + unitCost * getItemNetQuantity(item);
  }, 0);
};

/** How many order lines have no cost price, so the owner knows what to fix. */
export const countLinesMissingCost = (orders: Order[], products: Product[] = []): number =>
  orders.filter(isCountableOrder).reduce((count: number, order: any) => {
    const missing = (order.items || []).filter((item: any) => {
      if (getItemNetQuantity(item) <= 0) return false;
      const catalogue = products.find(p => String(p.id) === String(item?.product?.id));
      return !(Number(catalogue?.cost ?? item?.product?.cost ?? 0) > 0);
    }).length;
    return count + missing;
  }, 0);

export interface SalesTotals {
  revenue: number;
  cogs: number;
  grossProfit: number;
  itemsSold: number;
  orderCount: number;
}

/** Roll a list of orders up into the figures every report card shows. */
export const summariseOrders = (orders: any[], products: Product[] = []): SalesTotals => {
  let revenue = 0;
  let cogs = 0;
  let itemsSold = 0;
  let orderCount = 0;

  for (const order of orders) {
    if (!isCountableOrder(order)) continue;
    revenue += getOrderRevenue(order);
    cogs += getOrderCost(order, products);
    itemsSold += getOrderItemsSold(order);
    if (isCompletedSale(order)) orderCount += 1;
  }

  return { revenue, cogs, grossProfit: revenue - cogs, itemsSold, orderCount };
};
