import { useCallback, useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { Alert, backoffice, catalogue, formatIQD, inventory, type Category } from '@galokids/core';
import { Button, Chips, Empty, Loading, Screen, SearchField, Stat } from '@/components/kit';
import {
  LOW_STOCK,
  stockRows,
  stockTotals,
  variationsFor,
  type LocalProduct,
  type LocalVariation,
  type StockRow,
  type StockSort,
  type StockStatus,
} from '@/offline';
import { Pill, Table, Titled, type Column } from '@/components/Table';
import { useSession } from '@/state/useSession';
import { useSync } from '@/state/useSync';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * What is on the shelves, and what it is worth.
 *
 * Read from the device so the figure is there during a stock-take in a back
 * room with no signal. The valuation cards are totals over the whole shop —
 * not over whatever page is on screen — and the table can be narrowed by
 * section and stock status and ordered by what matters to a stock-take.
 * Correcting a count or a cost is a write and needs the server: a count
 * difference has to go through the ledger, and a cost moves every report.
 */
const STATUSES: { id: StockStatus; label: string }[] = [
  { id: 'all', label: 'هەموو' },
  { id: 'low', label: 'کەمە' },
  { id: 'out', label: 'تەواوبوو' },
  { id: 'missingCost', label: 'بێ تێچوو' },
];

const SORTS: { id: StockSort; label: string }[] = [
  { id: 'name', label: 'ناو' },
  { id: 'highestCost', label: 'بەرزترین تێچوو' },
  { id: 'highestRetail', label: 'بەرزترین فرۆشتن' },
  { id: 'highestProfit', label: 'بەرزترین قازانج' },
  { id: 'highestStock', label: 'زۆرترین پارچە' },
  { id: 'lowestStock', label: 'کەمترین پارچە' },
];

type Totals = Awaited<ReturnType<typeof stockTotals>>;

export default function InventoryScreen() {
  const { can } = useSession();
  const { online, syncNow } = useSync();

  const [term, setTerm] = useState('');
  const [status, setStatus] = useState<StockStatus>('all');
  const [sort, setSort] = useState<StockSort>('name');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);
  const [openVariations, setOpenVariations] = useState<LocalVariation[]>([]);
  const [counting, setCounting] = useState<{ product: LocalProduct; variation: LocalVariation } | null>(null);
  const [costing, setCosting] = useState<LocalProduct | null>(null);

  const showCost = can('reports.view');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(
        await stockRows({
          search: term,
          status,
          sort,
          categoryId: categoryId ? Number(categoryId) : null,
          limit: 100,
        })
      );
      setTotals(await stockTotals());
    } finally {
      setLoading(false);
    }
  }, [term, status, sort, categoryId]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  // Sections are a nicety for filtering: offline there are simply none to pick.
  useEffect(() => {
    catalogue.categories().then(setCategories).catch(() => {});
  }, []);

  const toggle = async (row: StockRow) => {
    if (open === row.product.id) return setOpen(null);
    setOpen(row.product.id);
    setOpenVariations(await variationsFor(row.product.id));
  };

  const filteredCost = rows.reduce((sum, row) => sum + row.costValue, 0);
  const expectedProfit = (totals?.retailValue ?? 0) - (totals?.costValue ?? 0);
  const margin = totals && totals.retailValue > 0 ? Math.round((expectedProfit / totals.retailValue) * 100) : 0;

  const priceOf = (row: StockRow) =>
    row.product.discount_price && row.product.discount_price > 0 ? row.product.discount_price : row.product.price;

  // The panel's stock audit, column for column: what it is, how many are left,
  // what one cost and sells for, and what the shelf is worth at each — which
  // is where the expected profit comes from. The money columns only for those
  // allowed to see what the shop pays.
  const columns: Column<StockRow>[] = [
    {
      title: 'بەرهەم / کۆد',
      width: 2,
      primary: true,
      render: row => <Titled title={row.product.name_ku || row.product.name} sub={row.product.sku} />,
    },
    { title: 'جۆر', width: 0.7, align: 'center', render: row => String(row.variationCount) },
    {
      title: 'پارچە لە کۆگا',
      width: 1,
      align: 'center',
      render: row => (
        <Pill label={String(row.pieces)} tone={row.pieces <= 0 ? 'bad' : row.pieces <= LOW_STOCK ? 'warn' : 'good'} />
      ),
    },
    ...(showCost
      ? [
          {
            title: 'تێچوو',
            width: 1,
            align: 'center' as const,
            render: (row: StockRow) =>
              row.product.cost != null && row.product.cost > 0 ? (
                formatIQD(row.product.cost)
              ) : (
                <Pill label="نادیارە" tone="bad" />
              ),
          },
        ]
      : []),
    { title: 'نرخی فرۆشتن', width: 1, align: 'center', render: row => formatIQD(priceOf(row)) },
    ...(showCost
      ? [
          {
            title: 'کۆی بەهای تێچوو',
            width: 1.2,
            align: 'center' as const,
            render: (row: StockRow) => formatIQD(row.costValue),
          },
          {
            title: 'کۆی بەهای فرۆشتن',
            width: 1.2,
            align: 'center' as const,
            render: (row: StockRow) => formatIQD(row.retailValue),
          },
          {
            title: 'قازانجی پێشبینیکراو',
            width: 1.2,
            align: 'center' as const,
            render: (row: StockRow) => {
              // Nothing to say without a cost: the "profit" would be the whole
              // shelf price, which is not a profit.
              if (!row.product.cost || row.product.cost <= 0) return '—';

              const profit = row.retailValue - row.costValue;

              return <Pill label={formatIQD(profit)} tone={profit > 0 ? 'good' : 'bad'} />;
            },
          },
        ]
      : []),
  ];

  return (
    <Screen title="جەردی کۆگا" subtitle="بڕی ماوە و نرخی کۆگا" scroll={false}>
      <View style={styles.stats}>
        <Stat label="پارچەی ماوە" value={String(totals?.pieces ?? 0)} hint={`${totals?.variations ?? 0} جۆر · ${totals?.products ?? 0} مۆدێل`} />
        {showCost && <Stat label="نرخی کۆگا (تێچوو)" value={formatIQD(totals?.costValue ?? 0)} />}
        {showCost && <Stat label="نرخی کۆگا (فرۆشتن)" value={formatIQD(totals?.retailValue ?? 0)} />}
        {showCost && (
          <Stat
            label="قازانجی پێشبینیکراو"
            value={formatIQD(expectedProfit)}
            hint={`٪${margin}`}
            tone={expectedProfit > 0 ? 'good' : 'neutral'}
          />
        )}
        <Stat label="تەواوبوو" value={String(totals?.outOfStock ?? 0)} tone={(totals?.outOfStock ?? 0) > 0 ? 'bad' : 'neutral'} />
        {showCost && (totals?.missingCost ?? 0) > 0 && (
          <Stat label="بێ تێچوو" value={String(totals!.missingCost)} tone="bad" hint="ڕاستکردنەوەی پێویستە" />
        )}
      </View>

      <SearchField value={term} onChange={setTerm} placeholder="ناو، بارکۆد یان SKU…" />

      <Chips value={status} onChange={setStatus} options={STATUSES} />
      {categories.length > 0 && (
        <Chips
          value={categoryId}
          onChange={setCategoryId}
          options={[{ id: '', label: 'هەموو بەشەکان' }, ...categories.map(c => ({ id: String(c.id), label: c.name_ku || c.name }))]}
        />
      )}
      <Chips value={sort} onChange={setSort} options={SORTS} />

      {loading && rows.length === 0 ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty title="هیچ نەدۆزرایەوە" />
      ) : (
        <Table
          rows={rows}
          keyFor={row => String(row.product.id)}
          columns={columns}
          onPress={toggle}
          footer={
            showCost ? (
              <Text style={styles.footer}>کۆی تێچووی ئەم لیستە: {formatIQD(filteredCost)}</Text>
            ) : undefined
          }
          detailFor={row =>
            open === row.product.id ? (
              <View style={{ gap: spacing.sm }}>
                <View style={styles.variations}>
                  {openVariations.map(variation => (
                    <Pressable
                      key={variation.id}
                      style={styles.variation}
                      onPress={() =>
                        can('inventory.manage') ? setCounting({ product: row.product, variation }) : undefined
                      }
                    >
                      <Text style={styles.variationLabel} numberOfLines={1}>
                        {[variation.color, variation.size].filter(Boolean).join(' · ') || 'ئاسایی'}
                      </Text>
                      <Pill
                        label={String(variation.stock_quantity)}
                        tone={variation.stock_quantity <= 0 ? 'bad' : variation.stock_quantity <= 3 ? 'warn' : 'good'}
                      />
                    </Pressable>
                  ))}
                </View>
                {showCost && can('products.manage') && (
                  <Button label="دەستکاری تێچوو" tone="quiet" onPress={() => setCosting(row.product)} />
                )}
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
          load();
        }}
      />

      {costing && (
        <CostSheet
          product={costing}
          online={online}
          onClose={() => setCosting(null)}
          onSaved={async () => {
            setCosting(null);
            await syncNow({ pullCatalogue: true });
            load();
          }}
        />
      )}
    </Screen>
  );
}

/** One product's unit cost. It moves every margin and report, so it is its own small step. */
function CostSheet({
  product,
  online,
  onClose,
  onSaved,
}: {
  product: LocalProduct;
  online: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [cost, setCost] = useState(product.cost ? String(product.cost) : '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const value = Number(cost);
    if (!Number.isFinite(value) || value < 0) return Alert.alert('تێچوو', 'بڕێکی دروست بنووسە.');

    setSaving(true);
    try {
      await backoffice.saveProduct({ cost: value }, product.id);
      onSaved();
    } catch (error) {
      Alert.alert('نەتوانرا پاشەکەوت بکرێت', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{product.name_ku || product.name}</Text>
          <Text style={styles.sheetSub}>نرخی فرۆشتن: {formatIQD(product.price)}</Text>

          {!online ? (
            <Text style={styles.sheetWarn}>گۆڕینی تێچوو پێویستی بە ئینتەرنێتە.</Text>
          ) : (
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={cost}
              onChangeText={setCost}
              placeholder="تێچووی یەک دانە"
              placeholderTextColor={colors.textFaint}
              textAlign="center"
            />
          )}

          <View style={styles.sheetActions}>
            <Button label="داخستن" tone="quiet" onPress={onClose} />
            {online && <Button label={saving ? 'پاشەکەوت…' : 'پاشەکەوتکردن'} onPress={save} disabled={saving} />}
          </View>
        </View>
      </View>
    </Modal>
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
  footer: { ...typography.small, color: colors.textMuted, textAlign: 'right', padding: spacing.md },

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
