import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Alert,
  backoffice,
  catalogue,
  formatIQD,
  type BulkDiscountInput,
  type BulkDiscountResult,
  type Category,
} from '@galokids/core';
import { Button, Chips } from '@/components/kit';
import { Field, Group, Labeled, Sheet, sheetStyles } from '@/components/Sheet';
import { Select } from '@/components/Select';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * One percentage off the catalogue.
 *
 * Until now a sale meant opening every product and typing a new price. This
 * sets each product's discount price from its list price — the list price is
 * never touched — for everything, one section, or the products ticked.
 *
 * The numbers are shown before anything is saved (the server answers a dry
 * run), including any product that would fall below what it cost.
 */

const PRESETS = [10, 15, 20, 25, 30, 40, 50];

export function DiscountSheet({
  ids,
  onClose,
  onDone,
}: {
  /** Ticked products, if any. */
  ids: number[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [percent, setPercent] = useState(20);
  const [custom, setCustom] = useState('');
  const [scope, setScope] = useState<'all' | 'category' | 'ids'>(ids.length > 0 ? 'ids' : 'all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [keepExisting, setKeepExisting] = useState(false);
  const [roundTo, setRoundTo] = useState('250');
  const [preview, setPreview] = useState<BulkDiscountResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    catalogue.categories().then(list => {
      setCategories(list);
      if (list[0]) setCategoryId(String(list[0].id));
    }).catch(() => {});
  }, []);

  const input = useMemo<Omit<BulkDiscountInput, 'percent'>>(() => ({
    scope,
    ...(scope === 'category' ? { category_id: Number(categoryId) } : {}),
    ...(scope === 'ids' ? { ids } : {}),
    keep_existing: keepExisting,
    round_to: Number(roundTo) as BulkDiscountInput['round_to'],
  }), [scope, categoryId, ids, keepExisting, roundTo]);

  // Live preview, re-asked whenever a choice changes.
  useEffect(() => {
    if (scope === 'category' && !categoryId) return;
    if (!(percent >= 1 && percent <= 90)) { setPreview(null); return; }

    let live = true;
    const timer = setTimeout(() => {
      backoffice.bulkDiscount({ ...input, percent, dry_run: true })
        .then(result => { if (live) { setPreview(result); setError(null); } })
        .catch(e => { if (live) { setPreview(null); setError((e as Error).message); } });
    }, 250);

    return () => { live = false; clearTimeout(timer); };
  }, [percent, input, scope, categoryId]);

  const scopeLabel =
    scope === 'all' ? 'هەموو کاڵاکان' : scope === 'ids' ? `${ids.length} کاڵای هەڵبژێردراو` : 'ئەم بەشە';

  const run = async (pct: number) => {
    setBusy(true);
    try {
      const result = await backoffice.bulkDiscount({ ...input, percent: pct });
      Alert.alert(
        pct > 0 ? 'داشکاندن جێبەجێ کرا' : 'داشکاندن لابرا',
        `${result.affected} کاڵا گۆڕدرا.`
      );
      onDone();
    } catch (e) {
      Alert.alert('نەتوانرا', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const apply = () =>
    Alert.alert(
      'داشکاندن جێبەجێ بکرێت؟',
      `٪${percent} داشکاندن بۆ ${preview?.affected ?? 0} کاڵا (${scopeLabel}). نرخی ئاسایی ناگۆڕدرێت و دەتوانیت هەر کاتێک لابیبەیت.`,
      [
        { text: 'نەخێر', style: 'cancel' },
        { text: 'جێبەجێ بکە', onPress: () => run(percent) },
      ]
    );

  const remove = () =>
    Alert.alert(
      'داشکاندنەکان لابدرێن؟',
      `هەموو نرخە داشکێنراوەکان لەسەر ${scopeLabel} لادەبرێن و نرخی ئاسایی دەگەڕێتەوە، داشکاندنی دەستیش.`,
      [
        { text: 'نەخێر', style: 'cancel' },
        { text: 'لایببە', style: 'destructive', onPress: () => run(0) },
      ]
    );

  return (
    <Sheet title="داشکاندنی کۆمەڵ" onClose={onClose}>
      <Group title="چەند سەدا؟">
        <Chips
          options={PRESETS.map(p => ({ id: String(p), label: `%${p}` }))}
          value={custom ? '' : String(percent)}
          onChange={v => { setCustom(''); setPercent(Number(v)); }}
        />
        <Labeled label="یان سەدای تر (١ تا ٩٠)">
          <Field
            value={custom}
            numeric
            placeholder="٣٥"
            onChange={text => {
              const clean = text.replace(/[^\d]/g, '');
              setCustom(clean);
              if (clean) setPercent(Number(clean));
            }}
          />
        </Labeled>
      </Group>

      <Group title="لەسەر چی؟">
        <Chips
          options={[
            { id: 'all', label: 'هەموو کاڵاکان' },
            { id: 'category', label: 'یەک بەش' },
            ...(ids.length > 0 ? [{ id: 'ids', label: `${ids.length} هەڵبژێردراو` }] : []),
          ]}
          value={scope}
          onChange={v => setScope(v as typeof scope)}
        />
        {scope === 'category' && (
          <Select
            value={categoryId}
            options={categories.map(c => ({ id: String(c.id), label: c.name_ku || c.name }))}
            onChange={setCategoryId}
          />
        )}
      </Group>

      <Group title="ڕێکخستن">
        <Labeled label="ئەوانەی داشکاندنی دەستیان هەیە">
          <Chips
            options={[{ id: 'no', label: 'بیانگۆڕە' }, { id: 'yes', label: 'نەیانگۆڕە' }]}
            value={keepExisting ? 'yes' : 'no'}
            onChange={v => setKeepExisting(v === 'yes')}
          />
        </Labeled>
        <Labeled label="نرخ بکرێتە نزیکترین">
          <Select
            value={roundTo}
            options={[
              { id: '1', label: 'بێ خڕکردنەوە' },
              { id: '50', label: '٥٠ دینار' },
              { id: '100', label: '١٠٠ دینار' },
              { id: '250', label: '٢٥٠ دینار' },
              { id: '500', label: '٥٠٠ دینار' },
              { id: '1000', label: '١٠٠٠ دینار' },
            ]}
            onChange={setRoundTo}
          />
        </Labeled>
      </Group>

      <View style={styles.preview}>
        {error ? <Text style={styles.bad}>{error}</Text> : null}
        {!error && !preview ? <Text style={sheetStyles.hint}>…</Text> : null}
        {preview && (
          <>
            <Text style={styles.head}>{preview.affected} کاڵا داشکاندنیان دەبێت</Text>

            {preview.samples.map(sample => (
              <View key={sample.id} style={styles.sample}>
                <View style={styles.after}>
                  <Text style={styles.was}>{formatIQD(sample.price)}</Text>
                  <Text style={styles.now}>{formatIQD(sample.new_discount_price ?? sample.price)}</Text>
                </View>
                <Text style={styles.name} numberOfLines={1}>{sample.name_ku || sample.name}</Text>
              </View>
            ))}

            {preview.skipped_existing > 0 && (
              <Text style={sheetStyles.hint}>{preview.skipped_existing} کاڵا بەهۆی داشکاندنی دەستییەوە نەگۆڕدران</Text>
            )}
            {preview.skipped_too_small > 0 && (
              <Text style={sheetStyles.hint}>{preview.skipped_too_small} کاڵا نرخیان زۆر بچووکە بۆ داشکاندن</Text>
            )}
            {preview.variations_with_own_price > 0 && (
              <Text style={styles.warn}>{preview.variations_with_own_price} قەبارە نرخی تایبەتی خۆیان هەیە و ناگۆڕدرێن</Text>
            )}
            {preview.below_cost > 0 && (
              <Text style={styles.bad}>⚠ {preview.below_cost} کاڵا بە کەمتر لە تێچووی کڕین دەفرۆشرێن — بە زیان!</Text>
            )}
          </>
        )}
      </View>

      <View style={sheetStyles.actions}>
        <Button
          label={busy ? '…' : `جێبەجێکردنی %${percent}`}
          onPress={apply}
          disabled={busy || !preview || preview.affected === 0}
        />
        <Button label="لابردنی داشکاندنەکان" tone="danger" onPress={remove} disabled={busy} />
        <Button label="داخستن" tone="quiet" onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  preview: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  head: { ...typography.heading, color: colors.text, textAlign: 'right' },
  sample: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { ...typography.small, color: colors.text, flex: 1, textAlign: 'right' },
  after: { flexDirection: 'row', gap: spacing.sm, alignItems: 'baseline' },
  was: { ...typography.small, color: colors.textFaint, textDecorationLine: 'line-through' },
  now: { ...typography.small, color: colors.danger, fontWeight: '700' },
  warn: { ...typography.small, color: colors.warning, textAlign: 'right' },
  bad: { ...typography.small, color: colors.danger, textAlign: 'right' },
});
