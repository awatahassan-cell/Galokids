import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  formatDateTime,
  formatIQD,
  orders as ordersApi,
  presetRanges,
  reports,
  toDateKey,
  useLayout,
  type SalesReport,
} from '@galokids/core';
import { Chips, Loading, NeedsConnection, Problem, Screen } from '@/components/kit';
import { NavIcon } from '@/navigation/NavIcon';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { colors, fonts, radius, shadow, spacing, typography } from '@/theme';

/**
 * What the shop is doing, on one screen.
 *
 * The panel's overview tab: the money in, split by where it came from, what is
 * left after cost and expenses, and the last few orders. A shopkeeper opening
 * the till in the morning wants this before anything else, and reaching it
 * previously meant choosing a report and then reading a table.
 *
 * Every figure is the server's arithmetic over the whole period, not a sum of
 * whatever rows this device happens to be holding — which is the difference
 * between a dashboard and a guess.
 */
export default function OverviewScreen() {
  const router = useRouter();
  const { wide } = useLayout();
  const [rangeId, setRangeId] = useState<'today' | 'week' | 'month' | 'quarter'>('month');

  const ranges = useMemo(() => presetRanges(), []);
  const range = ranges[rangeId]!;

  const sales = useFetch<SalesReport>(() => reports.sales(range), [rangeId]);
  const today = useFetch<SalesReport>(
    () => reports.sales({ from: toDateKey(), to: toDateKey() }),
    []
  );
  const recent = useFetch(() => ordersApi.list({ limit: 6 }), []);

  // Worked out before the early returns below. It holds no state of its own,
  // but reading it up here keeps every call in this component unconditional.
  const offline = useNeedsConnection(sales.error);

  if (sales.loading) {
    return (
      <Screen title="ڕوونکردنەوەی گشتی" subtitle="داهات، قازانج و دۆخی ئەمڕۆ">
        <Loading />
      </Screen>
    );
  }

  if (offline) {
    return (
      <Screen title="ڕوونکردنەوەی گشتی" subtitle="داهات، قازانج و دۆخی ئەمڕۆ">
        <NeedsConnection what="ئەم ڕوونکردنەوەیە" />
      </Screen>
    );
  }

  if (sales.error || !sales.data) {
    return (
      <Screen title="ڕوونکردنەوەی گشتی" subtitle="داهات، قازانج و دۆخی ئەمڕۆ">
        <Problem error={sales.error} onRetry={sales.reload} />
      </Screen>
    );
  }

  const figures = sales.data;
  const margin =
    figures.revenue > 0 ? Math.round((figures.net_profit / figures.revenue) * 100) : 0;

  return (
    <Screen
      title="ڕوونکردنەوەی گشتی"
      subtitle={`${range.label} · ${figures.order_count} داواکاری`}
      onRefresh={() => {
        sales.refresh();
        today.refresh();
        recent.refresh();
      }}
      refreshing={sales.refreshing}
    >
      <Chips
        options={[
          { id: 'today' as const, label: ranges.today!.label },
          { id: 'week' as const, label: ranges.week!.label },
          { id: 'month' as const, label: ranges.month!.label },
          { id: 'quarter' as const, label: ranges.quarter!.label },
        ]}
        value={rangeId}
        onChange={setRangeId}
      />

      {/* The headline: everything taken, and what is left of it. */}
      <View style={styles.headline}>
        <Text style={styles.headlineLabel}>کۆی داهات</Text>
        <Text style={styles.headlineValue}>{formatIQD(figures.revenue)}</Text>

        <View style={styles.headlineSplit}>
          <Text style={styles.headlineNet}>{formatIQD(figures.net_profit)}</Text>
          <Text style={styles.headlineNetLabel}>قازانجی سافی · ٪{margin}</Text>
        </View>
      </View>

      {/* Where the money came from. The panel colours these three the same way. */}
      <View style={[styles.channels, wide && styles.channelsWide]}>
        <Channel
          label="فرۆشتنی POS"
          amount={figures.pos_revenue}
          colour={colors.channelPos}
          icon="pos-sales"
        />
        <Channel
          label="فرۆشتنی وێبسایت"
          amount={figures.online_revenue}
          colour={colors.channelWeb}
          icon="orders"
        />
        <Channel
          label="فرۆشتنی پەیج"
          amount={figures.social_revenue}
          colour={colors.channelSocial}
          icon="social"
        />
      </View>

      {/* What it cost to make that money. */}
      <View style={styles.grid}>
        <Figure label="تێچووی کاڵا" value={formatIQD(figures.cogs)} />
        <Figure label="خەرجییەکان" value={formatIQD(figures.expenses)} />
        <Figure label="قازانجی خاو" value={formatIQD(figures.gross_profit)} tone={figures.gross_profit < 0 ? 'bad' : 'good'} />
        <Figure label="گەڕدراوە" value={formatIQD(figures.refunded)} tone="bad" />
        <Figure label="دانەی فرۆشراو" value={String(figures.items_sold)} />
        <Figure
          label="ناوەندی داواکاری"
          value={formatIQD(Math.round(figures.average_order_value))}
        />
      </View>

      {/* Today, always, whatever period is selected above: it is the question
          a shopkeeper actually opens the app to answer. */}
      <Text style={styles.sectionTitle}>ئەمڕۆ</Text>
      <View style={styles.todayCard}>
        {today.loading ? (
          <Text style={styles.todayWait}>…</Text>
        ) : today.data ? (
          <>
            <Figure label="داهات" value={formatIQD(today.data.revenue)} />
            <Figure label="داواکاری" value={String(today.data.order_count)} />
            <Figure label="قازانج" value={formatIQD(today.data.net_profit)} tone={today.data.net_profit < 0 ? 'bad' : 'good'} />
          </>
        ) : (
          <Text style={styles.todayWait}>نەتوانرا بخوێندرێتەوە</Text>
        )}
      </View>

      {/* The last few orders, as a way into the orders screen. */}
      <View style={styles.sectionHead}>
        <Pressable onPress={() => router.push('/(admin)/orders' as never)} hitSlop={8}>
          <Text style={styles.seeAll}>هەمووی</Text>
        </Pressable>
        <Text style={styles.sectionTitle}>دوایین داواکارییەکان</Text>
      </View>

      <View style={styles.recent}>
        {(recent.data?.data ?? []).map(order => (
          <Pressable
            key={order.id}
            style={styles.recentRow}
            onPress={() => router.push('/(admin)/orders' as never)}
          >
            <Text style={styles.recentAmount}>{formatIQD(order.total_amount)}</Text>

            <View style={styles.recentInfo}>
              <Text style={styles.recentName} numberOfLines={1}>
                {order.customer_name || `#${order.invoice_no ?? order.id}`}
              </Text>
              <Text style={styles.recentWhen}>{formatDateTime(order.created_at)}</Text>
            </View>
          </Pressable>
        ))}

        {recent.data && recent.data.data.length === 0 && (
          <Text style={styles.todayWait}>هێشتا هیچ داواکارییەک نییە</Text>
        )}
      </View>
    </Screen>
  );
}

function Channel({
  label,
  amount,
  colour,
  icon,
}: {
  label: string;
  amount: number;
  colour: string;
  icon: 'pos-sales' | 'orders' | 'social';
}) {
  return (
    <View style={[styles.channel, { backgroundColor: colour }]}>
      <NavIcon name={icon} size={16} color="rgba(255,255,255,0.75)" />
      <Text style={styles.channelAmount}>{formatIQD(amount)}</Text>
      <Text style={styles.channelLabel}>{label}</Text>
    </View>
  );
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'bad';
}) {
  const colour = tone === 'good' ? colors.success : tone === 'bad' ? colors.danger : colors.text;

  return (
    <View style={styles.figure}>
      <Text style={styles.figureLabel}>{label}</Text>
      <Text style={[styles.figureValue, { color: colour }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headline: {
    marginTop: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-end',
    ...shadow.card,
  },
  headlineLabel: { ...typography.eyebrow, color: colors.textFaint },
  headlineValue: { fontSize: 34, fontFamily: fonts.bold, color: colors.text, lineHeight: 48 },
  headlineSplit: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  headlineNet: { ...typography.title, color: colors.success },
  headlineNetLabel: { ...typography.tiny, color: colors.textMuted },

  channels: { gap: spacing.sm, marginTop: spacing.md },
  channelsWide: { flexDirection: 'row-reverse' },
  channel: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'flex-end',
    gap: 2,
    ...shadow.card,
  },
  channelAmount: { fontSize: 18, fontFamily: fonts.bold, color: '#fff', lineHeight: 28 },
  channelLabel: { ...typography.tiny, color: 'rgba(255,255,255,0.75)' },

  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  figure: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 110,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-end',
  },
  figureLabel: { ...typography.tiny, color: colors.textMuted },
  figureValue: { ...typography.heading, color: colors.text },

  sectionTitle: {
    ...typography.eyebrow,
    color: colors.textFaint,
    textAlign: 'right',
    marginTop: spacing.xl,
  },
  sectionHead: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAll: { ...typography.tiny, color: colors.brand, marginTop: spacing.xl },

  todayCard: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  todayWait: { ...typography.small, color: colors.textFaint, textAlign: 'right', padding: spacing.md },

  recent: {
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.xxl,
  },
  recentRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  recentInfo: { flex: 1, alignItems: 'flex-end' },
  recentName: { ...typography.body, color: colors.text, textAlign: 'right' },
  recentWhen: { ...typography.tiny, color: colors.textFaint },
  recentAmount: { ...typography.heading, color: colors.text },
});
