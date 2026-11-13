import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  formatIQD,
  reports,
  toDateKey,
  type DailyReport,
  type DailyReportRow,
} from '@galokids/core';
import { Loading, NeedsConnection, Problem, Screen } from '@/components/kit';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { colors, fonts, radius, shadow, spacing, typography } from '@/theme';

/**
 * The month, day by day.
 *
 * The panel's calendar report. A table of dates answers "what did we take on
 * the 14th"; a calendar answers the question a shopkeeper actually has, which
 * is which days are good and which are quiet — Fridays, the days after
 * payday, the week a promotion ran.
 *
 * The figures come from `/reports/daily`, which counts them in SQL over the
 * whole month rather than summing whatever this device is holding.
 */

/**
 * Sunday first, because that is what `Date.getDay()` returns as 0 and the
 * blank cells before the 1st are counted from it. Starting this list on
 * Saturday put every label one column away from the day it names.
 */
const WEEKDAYS = ['یەک', 'دوو', 'سێ', 'چوار', 'پێنج', 'هەینی', 'شەممە'];

const MONTHS_KU = [
  'کانوونی دووەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران',
  'تەمموز', 'ئاب', 'ئەیلوول', 'تشرینی یەکەم', 'تشرینی دووەم', 'کانوونی یەکەم',
];

export default function CalendarScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [picked, setPicked] = useState<string | null>(null);

  const first = useMemo(() => new Date(year, month, 1), [year, month]);
  const last = useMemo(() => new Date(year, month + 1, 0), [year, month]);

  const report = useFetch<DailyReport>(
    () => reports.daily({ from: toDateKey(first), to: toDateKey(last) }),
    [year, month]
  );

  const offline = useNeedsConnection(report.error);

  // Keyed by day so a cell is a lookup rather than a scan, and so a day the
  // shop did not trade is simply absent instead of being a zero row.
  const byDay = useMemo(() => {
    const map = new Map<string, DailyReportRow>();
    for (const row of report.data?.days ?? []) map.set(row.day.slice(0, 10), row);

    return map;
  }, [report.data]);

  const month_ = { title: `${MONTHS_KU[month]} ${year}` };

  const totals = useMemo(() => {
    const rows = report.data?.days ?? [];

    return {
      revenue: rows.reduce((sum, row) => sum + row.revenue, 0),
      orders: rows.reduce((sum, row) => sum + row.orders_count, 0),
      profit: rows.reduce((sum, row) => sum + row.net_profit, 0),
      best: rows.reduce<DailyReportRow | null>(
        (best, row) => (!best || row.revenue > best.revenue ? row : best),
        null
      ),
    };
  }, [report.data]);

  const step = (by: number) => {
    const next = new Date(year, month + by, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
    setPicked(null);
  };

  // Sunday-first columns, which is how the week is laid out here.
  const lead = first.getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: last.getDate() }, (_, index) => index + 1),
  ];

  const busiest = Math.max(1, ...(report.data?.days ?? []).map(row => row.revenue));
  const chosen = picked ? byDay.get(picked) : null;

  return (
    <Screen
      title="ڕۆژژمێری فرۆشتن"
      subtitle={month_.title}
      onRefresh={report.refresh}
      refreshing={report.refreshing}
    >
      <View style={styles.monthBar}>
        <Pressable style={styles.step} onPress={() => step(1)} hitSlop={6}>
          <Text style={styles.stepMark}>←</Text>
        </Pressable>

        <Text style={styles.monthTitle}>{month_.title}</Text>

        <Pressable style={styles.step} onPress={() => step(-1)} hitSlop={6}>
          <Text style={styles.stepMark}>→</Text>
        </Pressable>
      </View>

      {report.loading ? (
        <Loading />
      ) : offline ? (
        <NeedsConnection what="ڕۆژژمێرەکە" />
      ) : report.error ? (
        <Problem error={report.error} onRetry={report.reload} />
      ) : (
        <>
          <View style={styles.totals}>
            <Total label="داهاتی مانگ" value={formatIQD(totals.revenue)} />
            <Total label="قازانج" value={formatIQD(totals.profit)} tone="good" />
            <Total label="داواکاری" value={String(totals.orders)} />
          </View>

          <View style={styles.weekdays}>
            {WEEKDAYS.map(day => (
              <Text key={day} style={styles.weekday}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, index) => {
              if (day === null) return <View key={`pad-${index}`} style={styles.cell} />;

              const key = toDateKey(new Date(year, month, day));
              const row = byDay.get(key);
              const isToday = key === toDateKey(now);

              // How busy the day was, as how strongly the cell is tinted. The
              // scale is the month's own best day, so a quiet month is still
              // readable rather than uniformly pale.
              const heat = row ? Math.min(1, row.revenue / busiest) : 0;

              return (
                <Pressable
                  key={key}
                  style={[
                    styles.cell,
                    styles.day,
                    heat > 0 && {
                      backgroundColor: `rgba(79,70,229,${0.08 + heat * 0.55})`,
                      borderColor: 'transparent',
                    },
                    isToday && styles.today,
                    picked === key && styles.picked,
                  ]}
                  onPress={() => setPicked(picked === key ? null : key)}
                >
                  <Text style={[styles.dayNumber, heat > 0.45 && styles.dayNumberOnDark]}>
                    {day}
                  </Text>

                  {row && row.revenue > 0 && (
                    <Text style={[styles.dayAmount, heat > 0.45 && styles.dayNumberOnDark]}>
                      {Math.round(row.revenue / 1000)}k
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {chosen ? (
            <View style={styles.detail}>
              <Text style={styles.detailTitle}>{picked}</Text>

              <View style={styles.detailGrid}>
                <Total label="داهات" value={formatIQD(chosen.revenue)} />
                <Total label="قازانج" value={formatIQD(chosen.net_profit)} tone="good" />
                <Total label="داواکاری" value={String(chosen.orders_count)} />
                <Total label="دانە" value={String(chosen.items_sold)} />
                <Total label="POS" value={formatIQD(chosen.pos_revenue)} />
                <Total label="وێبسایت" value={formatIQD(chosen.online_revenue)} />
                <Total label="پەیج" value={formatIQD(chosen.social_revenue)} />
                <Total label="خەرجی" value={formatIQD(chosen.expenses)} tone="bad" />
              </View>
            </View>
          ) : (
            <Text style={styles.hint}>
              {totals.best && totals.best.revenue > 0
                ? `باشترین ڕۆژی مانگ: ${totals.best.day.slice(0, 10)} بە ${formatIQD(totals.best.revenue)}`
                : 'لەم مانگەدا هێشتا هیچ فرۆشتنێک تۆمار نەکراوە.'}
            </Text>
          )}
        </>
      )}
    </Screen>
  );
}

function Total({
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
    <View style={styles.total}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={[styles.totalValue, { color: colour }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  monthBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  step: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepMark: { fontSize: 15, color: colors.text, lineHeight: 20 },
  monthTitle: { ...typography.title, color: colors.text },

  totals: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm },
  total: {
    flexGrow: 1,
    flexBasis: '28%',
    minWidth: 96,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-end',
  },
  totalLabel: { ...typography.tiny, color: colors.textMuted },
  totalValue: { ...typography.heading, color: colors.text },

  weekdays: { flexDirection: 'row-reverse', marginTop: spacing.lg },
  weekday: {
    flex: 1,
    ...typography.tiny,
    color: colors.textFaint,
    textAlign: 'center',
  },

  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', marginTop: spacing.xs },
  // Seven to a row, sized by share rather than by pixels so the month fits any
  // width without the last column falling off.
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  day: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  today: { borderColor: colors.brand, borderWidth: 2 },
  picked: { borderColor: colors.text, borderWidth: 2 },
  dayNumber: { ...typography.small, color: colors.text },
  dayNumberOnDark: { color: '#fff' },
  dayAmount: { fontSize: 9, fontFamily: fonts.semibold, color: colors.textMuted, lineHeight: 14 },

  detail: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    marginBottom: spacing.xxl,
    ...shadow.card,
  },
  detailTitle: { ...typography.heading, color: colors.text, textAlign: 'right' },
  detailGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm },

  hint: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
});
