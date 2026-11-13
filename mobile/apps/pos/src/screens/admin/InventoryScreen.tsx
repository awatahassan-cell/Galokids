import { useCallback, useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { Alert, formatIQD, inventory } from '@galokids/core';
import { Button, Empty, Loading, Screen, SearchField, Stat } from '@/components/kit';
import { searchProducts, variationsFor, type LocalProduct, type LocalVariation } from '@/offline';
import { Pill, Table, Titled, type Column } from '@/components/Table';
import { useSession } from '@/state/useSession';
import { useSync } from '@/state/useSync';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * What is on the shelves, and what it is worth.
 *
 * Read from the device so the figure is there during a stock-take in a back
 * room with no signal. Correcting a count is a write and needs the server:
 * the difference has to go through the ledger, or the shop loses the one
 * record that explains where stock went.
 */
export default function InventoryScreen() {
  const { can } = useSession();
  const { online, syncNow } = useSync();

  const [term, setTerm] = useState('');
  const [rows, setRows] = useState<{ product: LocalProduct; variations: LocalVariation[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);
  const [counting, setCounting] = useState<{ product: LocalProduct; variation: LocalVariation } | null>(null);

  const load = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const products = await searchProducts(search, 60);
      const withStock = await Promise.all(
        products.map(async product => ({ product, variations: await variationsFor(product.id) }))
      );
      setRows(withStock);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(term), 200);
    return () => clearTimeout(timer);
  }, [term, load]);

  const pieces = rows.reduce(
    (sum, row) => sum + row.variations.reduce((n, v) => n + v.stock_quantity, 0),
    0
  );

  // Valued at cost, not at the shelf price: this is what the stock is worth to
  // the shop, which is the figure an accountant asks for.
  const value = rows.reduce(
    (sum, row) =>
      sum + row.variations.reduce((n, v) => n + v.stock_quantity * Number(row.product.cost ?? 0), 0),
    0
  );

  const lowCount = rows.filter(row =>
    row.variations.some(v => v.stock_quantity > 0 && v.stock_quantity <= 3)
  ).length;

  type InventoryRow = { product: LocalProduct; variations: LocalVariation[] };

  const showCost = can('reports.view');
  const piecesOf = (row: InventoryRow) =>
    row.variations.reduce((sum, variation) => sum + variation.stock_quantity, 0);
  const priceOf = (row: InventoryRow) =>
    row.product.discount_price && row.product.discount_price > 0
      ? row.product.discount_price
      : row.product.price;

  // The panel's stock audit, column for column: what it is, how many are left,
  // what one cost and sells for, and what the shelf is worth at each — which
  // is where the expected profit comes from. The money columns only for those
  // allowed to see what the shop pays.
  const columns: Column<InventoryRow>[] = [
    {
      title: 'بەرهەم / کۆد',
      width: 2,
      primary: true,
      render: row => (
        <Titled title={row.product.name_ku || row.product.name} sub={row.product.sku} />
      ),
    },
    {
      title: 'جۆر',
      width: 0.7,
      align: 'center',
      render: row => String(row.variations.length),
    },
    {
      title: 'پارچە لە کۆگا',
      width: 1,
      align: 'center',
      render: row => {
        const pieces = piecesOf(row);

        return <Pill label={String(pieces)} tone={pieces <= 0 ? 'bad' : pieces <= 5 ? 'warn' : 'good'} />;
      },
    },
    ...(showCost
      ? [
          {
            title: 'تێچوو',
            width: 1,
            align: 'center' as const,
            render: (row: InventoryRow) =>
              row.product.cost != null ? formatIQD(row.product.cost) : '—',
          },
        ]
      : []),
    {
      title: 'نرخی فرۆشتن',
      width: 1,
      align: 'center',
      render: row => formatIQD(priceOf(row)),
    },
    ...(showCost
      ? [
          {
            title: 'کۆی بەهای تێچوو',
            width: 1.2,
            align: 'center' as const,
            render: (row: InventoryRow) =>
              formatIQD(piecesOf(row) * Number(row.product.cost ?? 0)),
          },
          {
            title: 'کۆی بەهای فرۆشتن',
            width: 1.2,
            align: 'center' as const,
            render: (row: InventoryRow) => formatIQD(piecesOf(row) * priceOf(row)),
          },
          {
            title: 'قازانجی پێشبینیکراو',
            width: 1.2,
            align: 'center' as const,
            render: (row: InventoryRow) => {
              // Nothing to say without a cost: the "profit" would be the whole
              // shelf price, which is not a profit.
              if (row.product.cost == null) return '—';

              const profit = piecesOf(row) * (priceOf(row) - Number(row.product.cost));

              return <Pill label={formatIQD(profit)} tone={profit > 0 ? 'good' : 'bad'} />;
            },
          },
        ]
      : []),
  ];

  return (
    <Screen title="جەردی کۆگا" subtitle="بڕی ماوە و نرخی کۆگا" scroll={false}>
      <View style={styles.stats}>
        <Stat label="پارچەی ماوە" value={String(pieces)} />
        {can('reports.view') && <Stat label="نرخی کۆگا (تێچوو)" value={formatIQD(value)} />}
        <Stat label="کەم ماوە" value={String(lowCount)} tone={lowCount > 0 ? 'bad' : 'neutral'} />
      </View>

      <SearchField value={term} onChange={setTerm} placeholder="ناو یان بارکۆد…" />

      {loading && rows.length === 0 ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty title="هیچ نەدۆزرایەوە" />
      ) : (
        <Table
          rows={rows}
          keyFor={row => String(row.product.id)}
          columns={columns}
          onPress={row => setOpen(open === row.product.id ? null : row.product.id)}
          detailFor={row =>
            open === row.product.id ? (
              <View style={styles.variations}>
                {row.variations.map(variation => (
                  <Pressable
                    key={variation.id}
                    style={styles.variation}
                    onPress={() =>
                      can('inventory.manage')
                        ? setCounting({ product: row.product, variation })
                        : undefined
                    }
                  >
                    <Text style={styles.variationLabel} numberOfLines={1}>
                      {[variation.color, variation.size].filter(Boolean).join(' · ') || 'ئاسایی'}
                    </Text>
                    <Pill
                      label={String(variation.stock_quantity)}
                      tone={
                        variation.stock_quantity <= 0
                          ? 'bad'
                          : variation.stock_quantity <= 3
                            ? 'warn'
                            : 'good'
                      }
                    />
                  </Pressable>
                ))}
              </View>
            ) : null
          }
        />
      )}

      {can('inventory.manage') && (
        <Text style={styles.hint}>ڕیزێک بکەرەوە و لەسەر جۆرێک کلیک بکە بۆ ڕاستکردنەوەی ژمارەکەی.</Text>
      )}

      <CountSheet
        target={counting}
        online={online}
        onClose={() => setCounting(null)}
        onSaved={() => {
          setCounting(null);
          syncNow();
          load(term);
        }}
      />
    </Screen>
  );
}

function CountSheet({
  target,
  online,
  onClose,
  onSaved,
}: {
  target: { product: LocalProduct; variation: LocalVariation } | null;
  online: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [counted, setCounted] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) setCounted(String(target.variation.stock_quantity));
  }, [target]);

  if (!target) return null;

  const save = async () => {
    const value = Number(counted);
    if (!Number.isFinite(value) || value < 0) {
      Alert.alert('ژمارە', 'ژمارەیەکی دروست بنووسە.');
      return;
    }

    setSaving(true);
    try {
      await inventory.adjust(target.variation.id, value, 'ژماردنی کۆگا لە ئەپەوە');
      onSaved();
    } catch (error) {
      Alert.alert('نەتوانرا ڕاست بکرێتەوە', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{target.product.name_ku || target.product.name}</Text>
          <Text style={styles.sheetSub}>
            {[target.variation.color, target.variation.size].filter(Boolean).join(' · ') || 'ئاسایی'}
          </Text>

          {!online ? (
            <Text style={styles.sheetWarn}>
              ڕاستکردنەوەی ژمارە پێویستی بە ئینتەرنێتە، چونکە جیاوازییەکە دەبێت لە مێژووی ستۆکدا
              تۆمار بکرێت.
            </Text>
          ) : (
            <>
              <Text style={styles.sheetPrompt}>
                ئەو ژمارەیە بنووسە کە بەڕاستی لە کۆگادا ژمێردرا. جیاوازییەکە تۆمار دەکرێت.
              </Text>

              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={counted}
                onChangeText={setCounted}
                textAlign="center"
              />
            </>
          )}

          <View style={styles.sheetActions}>
            <Button label="داخستن" tone="quiet" onPress={onClose} />
            {online && (
              <Button label={saving ? 'پاشەکەوت…' : 'تۆمارکردن'} onPress={save} disabled={saving} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  variations: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm },
  variation: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stats: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm },
  variationLabel: { flex: 1, ...typography.small, color: colors.textMuted, textAlign: 'right' },
  hint: { ...typography.tiny, color: colors.textFaint, textAlign: 'center' },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.lg, gap: spacing.sm,
  },
  sheetTitle: { ...typography.title, color: colors.text, textAlign: 'right' },
  sheetSub: { ...typography.small, color: colors.textMuted, textAlign: 'right' },
  sheetPrompt: { ...typography.small, color: colors.textMuted, textAlign: 'right', lineHeight: 22 },
  sheetWarn: { ...typography.small, color: colors.warning, textAlign: 'right', lineHeight: 22 },
  input: {
    minHeight: TOUCH_TARGET + 8, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, ...typography.display, color: colors.text,
  },
  sheetActions: { flexDirection: 'row-reverse', gap: spacing.sm, marginTop: spacing.sm },
});
