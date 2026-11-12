import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { formatIQD, inventory } from '@galokids/core';
import { Button, Empty, Loading, Screen, SearchField, Stat } from '@/components/kit';
import { searchProducts, variationsFor, type LocalProduct, type LocalVariation } from '@/offline';
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
        <FlatList
          data={rows}
          keyExtractor={row => String(row.product.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name} numberOfLines={1}>
                {item.product.name_ku || item.product.name}
              </Text>

              {item.variations.map(variation => {
                const out = variation.stock_quantity <= 0;
                const low = !out && variation.stock_quantity <= 3;

                return (
                  <Pressable
                    key={variation.id}
                    style={styles.variationRow}
                    onPress={() =>
                      can('inventory.manage')
                        ? setCounting({ product: item.product, variation })
                        : undefined
                    }
                  >
                    <Text
                      style={[
                        styles.stock,
                        out && styles.stockOut,
                        low && styles.stockLow,
                      ]}
                    >
                      {variation.stock_quantity}
                    </Text>

                    <Text style={styles.variationLabel} numberOfLines={1}>
                      {[variation.color, variation.size].filter(Boolean).join(' · ') || 'ئاسایی'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
      )}

      {can('inventory.manage') && (
        <Text style={styles.hint}>بۆ ڕاستکردنەوەی ژمارەیەک، کلیکی لێ بکە.</Text>
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
  stats: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm },
  list: { gap: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.md },
  card: {
    padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, gap: spacing.xs,
  },
  name: { ...typography.body, color: colors.text, textAlign: 'right' },
  variationRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, minHeight: 34 },
  variationLabel: { flex: 1, ...typography.small, color: colors.textMuted, textAlign: 'right' },
  stock: { minWidth: 38, textAlign: 'center', ...typography.heading, color: colors.success, ...typography.mono },
  stockLow: { color: colors.warning },
  stockOut: { color: colors.danger },
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
