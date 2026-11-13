import type { ReactNode } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLayout } from '@galokids/core';
import { colors, radius, shadow, spacing, typography } from '@/theme';

/**
 * A list, laid out the way the back office lays lists out.
 *
 * The panel shows every list as a table: a tinted header of small spaced
 * capitals, hairline rows, and columns that line up so a shopkeeper can read
 * down one — which is the whole point of a table and the thing a column of
 * stacked cards cannot do. Scanning twenty prices means twenty prices in the
 * same place, not twenty cards each with the price wherever the name left room.
 *
 * On a phone there is no room for six columns, so the same `columns` are drawn
 * as a stacked row instead: the first column is the heading, the rest are
 * labelled values beneath it. One definition, both shapes — so a column cannot
 * exist on a desk and be forgotten on a phone.
 */

export interface Column<T> {
  /** The heading, as it appears in the panel. */
  title: string;
  /** How wide, as a share of the row. Omit for an even share. */
  width?: number;
  align?: 'start' | 'center' | 'end';
  /** The cell. A string is drawn in the table's own type. */
  render: (row: T) => ReactNode;
  /**
   * Keep this column off the phone layout.
   *
   * For the ones that are context rather than content — a row number, a
   * duplicate of something already in the heading.
   */
  wideOnly?: boolean;
  /** The heading line on a phone, drawn large with no label. */
  primary?: boolean;
}

export function Table<T>({
  columns,
  rows,
  keyFor,
  onPress,
  refreshing,
  onRefresh,
  footer,
  empty,
  detailFor,
  inline,
}: {
  /**
   * Draw the rows in place instead of in a scrolling list.
   *
   * For a table that sits inside a page which already scrolls — a report with
   * figures above it. A list inside a scroll view has no height of its own to
   * scroll within, and nesting the two is how a table ends up zero pixels tall.
   */
  inline?: boolean;
  columns: Column<T>[];
  rows: T[];
  keyFor: (row: T) => string;
  onPress?: (row: T) => void;
  /**
   * Something to draw under a row — the panel's expanding rows.
   *
   * Return null for a closed row. The caller decides which row is open, so
   * the table holds no state of its own about it.
   */
  detailFor?: (row: T) => ReactNode | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: ReactNode;
  empty?: ReactNode;
}) {
  const { wide } = useLayout();

  if (rows.length === 0 && empty) return <>{empty}</>;

  if (inline) {
    if (!wide) {
      return (
        <View style={styles.stackList}>
          {rows.map(row => (
            <View key={keyFor(row)}>
              <StackedRow columns={columns} row={row} onPress={onPress} />
              {detailFor ? detailFor(row) : null}
            </View>
          ))}
          {footer}
        </View>
      );
    }

    return (
      <View style={[styles.frame, styles.frameInline]}>
        <View style={styles.head}>
          {columns.map(column => (
            <View key={column.title} style={cellStyle(column)}>
              <Text style={[styles.headText, alignText(column.align)]} numberOfLines={1}>
                {column.title}
              </Text>
            </View>
          ))}
        </View>

        {rows.map(row => (
          <View key={keyFor(row)} style={styles.row}>
            {columns.map(column => (
              <View key={column.title} style={cellStyle(column)}>
                <Cell align={column.align}>{column.render(row)}</Cell>
              </View>
            ))}
          </View>
        ))}

        {footer}
      </View>
    );
  }

  if (!wide) {
    return (
      <FlatList
        data={rows}
        keyExtractor={keyFor}
        contentContainerStyle={styles.stackList}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={footer ? <>{footer}</> : null}
        renderItem={({ item }) => (
          <View>
            <StackedRow columns={columns} row={item} onPress={onPress} />
            {detailFor ? detailFor(item) : null}
          </View>
        )}
      />
    );
  }

  return (
    <View style={styles.frame}>
      <View style={styles.head}>
        {columns.map(column => (
          <View key={column.title} style={cellStyle(column)}>
            <Text style={[styles.headText, alignText(column.align)]} numberOfLines={1}>
              {column.title}
            </Text>
          </View>
        ))}
      </View>

      <FlatList
        data={rows}
        keyExtractor={keyFor}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={footer ? <>{footer}</> : null}
        renderItem={({ item }) => {
          const body = (
            <View style={styles.row}>
              {columns.map(column => (
                <View key={column.title} style={cellStyle(column)}>
                  <Cell align={column.align}>{column.render(item)}</Cell>
                </View>
              ))}
            </View>
          );

          const detail = detailFor ? detailFor(item) : null;

          if (!onPress) {
            return (
              <View>
                {body}
                {detail ? <View style={styles.detail}>{detail}</View> : null}
              </View>
            );
          }

          return (
            <View>
              <Pressable
                style={({ pressed }) => (pressed ? styles.rowPressed : undefined)}
                onPress={() => onPress(item)}
              >
                {body}
              </Pressable>
              {detail ? <View style={styles.detail}>{detail}</View> : null}
            </View>
          );
        }}
      />
    </View>
  );
}

function StackedRow<T>({
  columns,
  row,
  onPress,
}: {
  columns: Column<T>[];
  row: T;
  onPress?: (row: T) => void;
}) {
  const heading = columns.find(column => column.primary) ?? columns[0]!;
  const rest = columns.filter(column => column !== heading && !column.wideOnly);

  const body = (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Cell align="end">{heading.render(row)}</Cell>
      </View>

      <View style={styles.cardBody}>
        {rest.map(column => (
          <View key={column.title} style={styles.pair}>
            <Text style={styles.pairLabel}>{column.title}</Text>
            <Cell align="end">{column.render(row)}</Cell>
          </View>
        ))}
      </View>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      style={({ pressed }) => (pressed ? styles.rowPressed : undefined)}
      onPress={() => onPress(row)}
    >
      {body}
    </Pressable>
  );
}

/** A plain string gets the table's own type; anything else is drawn as given. */
function Cell({ children, align }: { children: ReactNode; align?: Column<unknown>['align'] }) {
  if (typeof children === 'string' || typeof children === 'number') {
    return (
      <Text style={[styles.cellText, alignText(align)]} numberOfLines={2}>
        {children}
      </Text>
    );
  }

  return <>{children}</>;
}

function cellStyle<T>(column: Column<T>) {
  return {
    flexGrow: column.width ?? 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center' as const,
    alignItems:
      column.align === 'center'
        ? ('center' as const)
        : column.align === 'start'
          ? ('flex-start' as const)
          : ('flex-end' as const),
  };
}

function alignText(align?: Column<unknown>['align']) {
  return {
    textAlign:
      align === 'center' ? ('center' as const) : align === 'start' ? ('left' as const) : ('right' as const),
  };
}

/**
 * The small tinted pill the panel uses for a status, a count or a flag.
 *
 * Here rather than redefined per screen so "delivered" is the same green in
 * the orders list, the till's sales and a customer's history.
 */
export function Pill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'good' | 'bad' | 'warn' | 'info';
}) {
  const palette = {
    neutral: { bg: colors.borderSoft, fg: colors.textMuted },
    good: { bg: colors.successSoft, fg: colors.success },
    bad: { bg: colors.dangerSoft, fg: colors.danger },
    warn: { bg: colors.warningSoft, fg: colors.warning },
    info: { bg: colors.brandSoft, fg: colors.brand },
  }[tone];

  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.pillText, { color: palette.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** A name with the thing it belongs to underneath — the panel's first column. */
export function Titled({
  title,
  sub,
  leading,
}: {
  title: string;
  sub?: string | null;
  leading?: ReactNode;
}) {
  return (
    <View style={styles.titled}>
      {leading}

      <View style={styles.titledText}>
        <Text style={styles.titledTitle} numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text style={styles.titledSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** A horizontal scroller for a table too wide for the window. */
export function WideScroll({ children, minWidth }: { children: ReactNode; minWidth: number }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ minWidth }}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadow.card,
  },
  frameInline: { flex: 0 },
  head: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm + 2,
  },
  headText: { ...typography.eyebrow, color: colors.textMuted },

  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    minHeight: 58,
  },
  rowPressed: { backgroundColor: colors.background },
  detail: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    padding: spacing.md,
  },
  cellText: { ...typography.small, color: colors.text },

  stackList: { gap: spacing.sm, paddingBottom: spacing.xxl },
  card: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadow.card,
  },
  cardHead: { alignItems: 'flex-end' },
  cardBody: { gap: 3 },
  pair: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pairLabel: { ...typography.tiny, color: colors.textFaint },

  pill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: radius.sm,
    // No alignSelf: the cell decides. Pinning the pill to one side put every
    // status a few pixels off its own centred column heading.
  },
  pillText: { ...typography.tiny },

  titled: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, width: '100%' },
  titledText: { flex: 1, alignItems: 'flex-end', minWidth: 0 },
  titledTitle: { ...typography.small, color: colors.text, textAlign: 'right' },
  titledSub: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },
});
