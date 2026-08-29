import React from 'react';
import { colors } from '../theme';
import { useLanguage } from '../i18n/LanguageProvider';
import type { OrderStatus } from '../api/types';
import type { StringKey } from '../i18n/strings';
import { Pill } from './ui';

const TONES: Record<OrderStatus, { tone: 'candy' | 'mint' | 'sunny' | 'slate' | 'rose'; key: StringKey }> = {
  pending: { tone: 'sunny', key: 'statusPending' },
  processing: { tone: 'candy', key: 'statusProcessing' },
  shipped: { tone: 'candy', key: 'statusShipped' },
  delivered: { tone: 'mint', key: 'statusDelivered' },
  cancelled: { tone: 'slate', key: 'statusCancelled' },
  returned: { tone: 'rose', key: 'statusReturned' },
};

export const OrderStatusPill: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const { t } = useLanguage();
  const entry = TONES[status] ?? TONES.pending;
  return <Pill label={t(entry.key)} tone={entry.tone} />;
};

/**
 * The colour a status is drawn in, for anything that is not a pill — the
 * timeline on the order screen, for instance.
 */
export function statusColour(status: OrderStatus): string {
  switch (status) {
    case 'delivered':
      return colors.mint[600];
    case 'cancelled':
      return colors.slate[400];
    case 'returned':
      return colors.rose[600];
    case 'pending':
      return colors.sunny[600];
    default:
      return colors.candy[500];
  }
}
