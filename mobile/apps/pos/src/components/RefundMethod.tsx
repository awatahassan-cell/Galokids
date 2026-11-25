import { View } from 'react-native';
import type { Order } from '@galokids/core';
import { Chips } from '@/components/kit';
import { Labeled } from '@/components/Sheet';

export type RefundMethodId = 'cash' | 'card' | 'other';

/**
 * How a refund on this order most likely goes back: a till sale the way it
 * came in, a website or page order not from the drawer. Matches the server's
 * own default, so the picker shows what will happen if it is left alone.
 */
export function defaultRefundMethod(order: Pick<Order, 'payment_method' | 'channel'>): RefundMethodId {
  if (order.payment_method === 'card') return 'card';
  return order.channel === 'pos' ? 'cash' : 'other';
}

/**
 * "Where did the money come from?" — it decides whether the drawer count goes
 * down. Handing cash across the counter does; a bank transfer or a refund to
 * the card does not, and counting it would make the shift look short.
 */
export function RefundMethodPicker({
  value,
  onChange,
}: {
  value: RefundMethodId;
  onChange: (next: RefundMethodId) => void;
}) {
  return (
    <Labeled label="پارە چۆن گەڕێندرایەوە؟">
      <View>
        <Chips
          options={[
            { id: 'cash', label: 'لە دراوی تیل' },
            { id: 'card', label: 'بۆ کارت' },
            { id: 'other', label: 'گواستنەوە / شێوازی تر' },
          ]}
          value={value}
          onChange={onChange}
        />
      </View>
    </Labeled>
  );
}
