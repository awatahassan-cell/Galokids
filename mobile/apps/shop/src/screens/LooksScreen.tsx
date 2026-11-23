import { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
  colorHex,
  effectivePrice,
  formatIQD,
  looks as looksApi,
  type Look,
  type LookItem,
  type ProductVariation,
} from '@galokids/core';
import { Empty, Loading, Page, Problem } from '@/components/ui';
import { useBasket } from '@/state/useBasket';
import { colors, fonts, radius, shadow, spacing, typography } from '@/theme';

/**
 * "Try the Look": an outfit on a model, made of real products.
 *
 * Everything on it is edited from the admin — the picture, the pieces, where
 * each numbered dot sits — and the colours and sizes offered are the product's
 * own variations, so what lands in the basket is a real line the server prices
 * the same way it prices any other.
 */

type Pick = { color: string | null; size: string | null };

const GENDERS: { code: 0 | 1 | 2; label: string }[] = [
  { code: 0, label: 'هەمووی' },
  { code: 1, label: 'کوڕان' },
  { code: 2, label: 'کچان' },
];

const find = (item: LookItem, pick: Pick): ProductVariation | undefined =>
  item.product.variations.find(v => v.color === pick.color && v.size === pick.size);

/** The first colour and size that can actually be bought, so a piece opens ready to add. */
const initialPick = (item: LookItem): Pick => {
  const list = item.product.variations;
  const best = list.find(v => v.stock_quantity > 0) ?? list[0];
  return { color: best?.color ?? null, size: best?.size ?? null };
};

export default function LooksScreen() {
  const router = useRouter();
  const basket = useBasket();
  const { width } = useWindowDimensions();

  const [all, setAll] = useState<Look[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [gender, setGender] = useState<0 | 1 | 2>(0);
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [added, setAdded] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = () => {
    setError(null);
    looksApi.list().then(setAll).catch(setError);
  };
  useEffect(load, []);

  const visible = useMemo(
    () => (all ?? []).filter(l => gender === 0 || l.gender === 0 || l.gender === gender),
    [all, gender]
  );

  const look = visible[Math.min(index, Math.max(visible.length - 1, 0))];

  if (error) return <Page title="ستایلەکان"><Problem error={error} onRetry={load} /></Page>;
  if (!all) return <Page title="ستایلەکان"><Loading /></Page>;

  const pickFor = (item: LookItem): Pick => picks[`${look!.id}:${item.product_id}`] ?? initialPick(item);

  const setPick = (item: LookItem, patch: Partial<Pick>) => {
    const next = { ...pickFor(item), ...patch };
    const list = item.product.variations;

    // A colour change can leave the chosen size without stock; move to one that has it.
    if (!find(item, next)) {
      next.size =
        list.find(v => v.color === next.color && v.stock_quantity > 0)?.size ??
        list.find(v => v.color === next.color)?.size ??
        next.size;
    }
    setPicks(prev => ({ ...prev, [`${look!.id}:${item.product_id}`]: next }));
  };

  const buyable = (item: LookItem) => {
    const v = find(item, pickFor(item));
    return v && v.stock_quantity > 0 ? v : undefined;
  };

  const go = (delta: number) => {
    if (!visible.length) return;
    setIndex(i => (i + delta + visible.length) % visible.length);
    setActive(null);
  };

  const addOne = (item: LookItem) => {
    const v = buyable(item);
    if (!v) return;
    basket.add(item.product, v, 1);
    setAdded(item.product_id);
    setTimeout(() => setAdded(null), 1400);
  };

  const addAll = () => {
    if (!look) return;
    let skipped = 0;
    look.items.forEach(item => {
      const v = buyable(item);
      if (v) basket.add(item.product, v, 1);
      else skipped += 1;
    });
    setNotice(skipped ? 'هەندێک پارچە نەماون و نەخران' : 'ستایلەکە خرایە سەبەتەوە');
    setTimeout(() => setNotice(null), 2400);
  };

  const total = look
    ? look.items.reduce((sum, item) => {
        const v = buyable(item);
        return v ? sum + effectivePrice(item.product, v) : sum;
      }, 0)
    : 0;

  const stage = Math.min(width - spacing.lg * 2, 460);

  return (
    <Page title="ستایلەکە تاقی بکەرەوە" subtitle="هەموو جلەکان لەسەر یەک مۆدێل ببینە">
      <View style={styles.pills}>
        {GENDERS.map(g => (
          <Pressable
            key={g.code}
            onPress={() => { setGender(g.code); setIndex(0); setActive(null); }}
            style={[styles.pill, gender === g.code && styles.pillOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: gender === g.code }}
          >
            <Text style={[styles.pillText, gender === g.code && styles.pillTextOn]}>{g.label}</Text>
          </Pressable>
        ))}
      </View>

      {!look ? (
        <Empty mark="✨" title="هێشتا هیچ ستایلێک نییە" body="دوای زیادکردنی ستایل لە بەڕێوەبەر لێرە دەردەکەوێت" />
      ) : (
        <>
          <View style={[styles.stage, { width: stage, height: stage * 1.25, backgroundColor: `${look.accent_color}1f` }]}>
            <Image source={{ uri: look.image_url }} style={StyleSheet.absoluteFill} contentFit="contain" />

            {look.items.map((item, i) => (
              <Pressable
                key={item.product_id}
                onPress={() => setActive(item.product_id)}
                style={[
                  styles.dot,
                  active === item.product_id && styles.dotOn,
                  { left: `${item.hotspot_x}%`, top: `${item.hotspot_y}%` },
                ]}
                accessibilityLabel={item.product.name_ku || item.product.name}
              >
                <Text style={[styles.dotText, active === item.product_id && styles.dotTextOn]}>{i + 1}</Text>
              </Pressable>
            ))}

            {visible.length > 1 && (
              <>
                <Pressable style={[styles.arrow, styles.arrowStart]} onPress={() => go(1)} accessibilityLabel="دواتر">
                  <Text style={styles.arrowText}>›</Text>
                </Pressable>
                <Pressable style={[styles.arrow, styles.arrowEnd]} onPress={() => go(-1)} accessibilityLabel="پێشوو">
                  <Text style={styles.arrowText}>‹</Text>
                </Pressable>
              </>
            )}
          </View>

          <View style={styles.caption}>
            <Text style={styles.captionMeta}>
              {`ستایلی ${index + 1} لە ${visible.length}`}
              {look.age_range ? `  ·  \u2066${look.age_range}\u2069` : ''}
            </Text>
            <Text style={styles.captionTitle}>{look.title_ku || look.title}</Text>
            {look.subtitle_ku || look.subtitle ? (
              <Text style={styles.captionSub}>{look.subtitle_ku || look.subtitle}</Text>
            ) : null}
            {visible.length > 1 && (
              <View style={styles.dots}>
                {visible.map((l, i) => (
                  <Pressable key={l.id} onPress={() => { setIndex(i); setActive(null); }} hitSlop={6}>
                    <View style={[styles.pager, i === index && styles.pagerOn]} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.section}>پارچەکانی ئەم ستایلە</Text>

          {look.items.map((item, i) => {
            const p = item.product;
            const pick = pickFor(item);
            const list = p.variations;
            const colorsList = [...new Set(list.map(v => v.color).filter((c): c is string => !!c))];
            const sizes = [...new Set(list.filter(v => v.color === pick.color).map(v => v.size).filter((s): s is string => !!s))];
            const v = find(item, pick);
            const inStock = !!v && v.stock_quantity > 0;

            return (
              <View key={item.product_id} style={[styles.piece, active === item.product_id && styles.pieceOn]}>
                <View style={styles.pieceTop}>
                  <Pressable onPress={() => router.push(`/product/${p.id}` as never)} style={styles.thumbWrap}>
                    {p.image_url ? <Image source={{ uri: p.image_url }} style={styles.thumb} contentFit="cover" /> : null}
                    <View style={styles.thumbNo}><Text style={styles.thumbNoText}>{i + 1}</Text></View>
                  </Pressable>

                  <View style={styles.pieceBody}>
                    <Text style={styles.pieceName} numberOfLines={2}>{p.name_ku || p.name}</Text>
                    <Text style={styles.piecePrice}>{formatIQD(effectivePrice(p, v))}</Text>

                    {colorsList.length > 0 && (
                      <View style={styles.row}>
                        {colorsList.map(c => (
                          <Pressable key={c} onPress={() => setPick(item, { color: c })} hitSlop={4}
                                     style={[styles.swatchRing, pick.color === c && styles.swatchRingOn]}>
                            <View style={[styles.swatch, { backgroundColor: colorHex(c) }]} />
                          </Pressable>
                        ))}
                      </View>
                    )}

                    {sizes.length > 0 && (
                      <View style={styles.row}>
                        {sizes.map(s => {
                          const sv = find(item, { color: pick.color, size: s });
                          const out = !sv || sv.stock_quantity <= 0;
                          return (
                            <Pressable key={s} onPress={() => setPick(item, { size: s })}
                                       style={[styles.size, pick.size === s && styles.sizeOn]}>
                              <Text style={[styles.sizeText, pick.size === s && styles.sizeTextOn, out && styles.sizeOut]}>{s}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>

                <Pressable
                  onPress={() => addOne(item)}
                  disabled={!inStock}
                  style={[styles.add, !inStock && styles.addOff, added === item.product_id && styles.addDone]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.addText, !inStock && styles.addTextOff]}>
                    {!inStock ? 'نەماوە' : added === item.product_id ? '✓ زیادکرا' : '+ زیادکردن'}
                  </Text>
                </Pressable>
              </View>
            );
          })}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>کۆی ستایلەکە</Text>
            <Text style={styles.totalValue}>{formatIQD(total)}</Text>
          </View>

          <Pressable onPress={addAll} disabled={total === 0} style={[styles.addAll, total === 0 && styles.addOff]} accessibilityRole="button">
            <Text style={styles.addAllText}>هەموو ستایلەکە بخە سەبەتەوە</Text>
          </Pressable>

          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row-reverse', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  pill: { paddingHorizontal: 18, height: 38, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, justifyContent: 'center' },
  pillOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { ...typography.small, color: colors.textMuted },
  pillTextOn: { color: '#fff', fontFamily: fonts.bold },

  stage: { alignSelf: 'center', borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  dot: { position: 'absolute', width: 30, height: 30, marginLeft: -15, marginTop: -15, borderRadius: 15, backgroundColor: '#fff', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.card },
  dotOn: { backgroundColor: colors.ink, transform: [{ scale: 1.2 }] },
  dotText: { fontSize: 12, fontFamily: fonts.bold, color: colors.ink, lineHeight: 18 },
  dotTextOn: { color: '#fff' },
  arrow: { position: 'absolute', top: '45%', width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', ...shadow.card },
  arrowStart: { left: 10 },
  arrowEnd: { right: 10 },
  arrowText: { fontSize: 26, color: colors.text, lineHeight: 30 },

  caption: { alignItems: 'center', paddingVertical: spacing.lg },
  captionMeta: { ...typography.tiny, color: colors.textFaint },
  captionTitle: { ...typography.title, color: colors.text, marginTop: 2 },
  captionSub: { ...typography.small, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6, marginTop: spacing.md },
  pager: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.borderStrong },
  pagerOn: { width: 24, backgroundColor: colors.ink },

  section: { ...typography.heading, color: colors.textMuted, textAlign: 'right', marginBottom: spacing.md },

  piece: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md, ...shadow.card },
  pieceOn: { borderColor: colors.ink },
  pieceTop: { flexDirection: 'row-reverse', gap: spacing.md },
  thumbWrap: { width: 84, height: 104, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.border },
  thumb: { width: '100%', height: '100%' },
  thumbNo: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  thumbNoText: { fontSize: 10, fontFamily: fonts.bold, color: colors.ink, lineHeight: 15 },
  pieceBody: { flex: 1, alignItems: 'flex-end' },
  pieceName: { ...typography.heading, color: colors.text, textAlign: 'right' },
  piecePrice: { ...typography.price, color: colors.brandText, marginTop: 2 },
  row: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  swatchRing: { padding: 2, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  swatchRingOn: { borderColor: colors.ink },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.borderStrong },
  size: { minWidth: 38, height: 30, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  sizeOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  sizeText: { ...typography.tiny, color: colors.text },
  sizeTextOn: { color: '#fff' },
  sizeOut: { opacity: 0.4, textDecorationLine: 'line-through' },

  add: { marginTop: spacing.md, height: 44, borderRadius: radius.md, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  addOff: { backgroundColor: colors.borderStrong },
  addDone: { backgroundColor: colors.mint },
  addText: { ...typography.heading, color: '#fff' },
  addTextOff: { color: colors.textFaint },

  totalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm },
  totalLabel: { ...typography.heading, color: colors.textMuted },
  totalValue: { ...typography.title, color: colors.text },
  addAll: { height: 52, borderRadius: radius.lg, backgroundColor: colors.brandDeep, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  addAllText: { ...typography.heading, color: '#fff' },
  notice: { ...typography.small, color: colors.mintText, textAlign: 'center', marginBottom: spacing.lg },
});
