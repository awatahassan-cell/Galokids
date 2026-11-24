import { useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
  colorHex,
  effectivePrice,
  formatIQD,
  inStock,
  looks as looksApi,
  resolveChoice,
  sizesOf,
  sortSizes,
  type Look,
  type LookItem,
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

const GENDERS: { code: 0 | 1 | 2; label: string }[] = [
  { code: 0, label: 'هەمووی' },
  { code: 1, label: 'کوڕان' },
  { code: 2, label: 'کچان' },
];

export default function LooksScreen() {
  const router = useRouter();
  const basket = useBasket();
  const { width } = useWindowDimensions();

  const [all, setAll] = useState<Look[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [gender, setGender] = useState<0 | 1 | 2>(0);
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [picks, setPicks] = useState<Record<string, { color?: string | null; size?: string | null }>>({});
  // One size for the whole outfit: a parent knows their child's size once.
  const [childSize, setChildSize] = useState<string | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const scroller = useRef<ScrollView>(null);
  const pieceY = useRef<Record<number, number>>({});

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

  const lookSizes = useMemo(() => (look ? sizesOf(look.items.map(i => i.product)) : []), [look]);
  // A size chosen on one look may not exist on the next.
  useEffect(() => {
    if (childSize && look && !lookSizes.includes(childSize)) setChildSize(null);
  }, [look, lookSizes, childSize]);

  const go = (delta: number) => {
    if (!visible.length) return;
    setIndex(i => (i + delta + visible.length) % visible.length);
    setActive(null);
  };

  // Swiping the picture changes look. The page reads right to left, so a drag
  // towards the right brings the next one in from the left.
  const goRef = useRef(go);
  goRef.current = go;
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) > 50) goRef.current(g.dx > 0 ? 1 : -1);
        },
      }),
    []
  );

  if (error) return <Page title="ستایلەکان"><Problem error={error} onRetry={load} /></Page>;
  if (!all) return <Page title="ستایلەکان"><Loading /></Page>;

  const key = (item: LookItem) => `${look!.id}:${item.product_id}`;
  const choiceOf = (item: LookItem) => resolveChoice(item.product, picks[key(item)], childSize);
  const setOwn = (item: LookItem, patch: { color?: string | null; size?: string | null }) =>
    setPicks(prev => ({ ...prev, [key(item)]: { ...prev[key(item)], ...patch } }));

  const buyable = (item: LookItem) => {
    const v = choiceOf(item).variation;
    return inStock(v) ? v : undefined;
  };

  // The pieces are below the picture, so tapping a dot has to bring its piece up.
  const showPiece = (productId: number) => {
    setActive(productId);
    const y = pieceY.current[productId];
    if (y != null) scroller.current?.scrollTo({ y: Math.max(0, y - 90), animated: true });
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
    <Page title="ستایلەکە تاقی بکەرەوە" subtitle="هەموو جلەکان لەسەر یەک مۆدێل ببینە" scroll={false}>
      <ScrollView ref={scroller} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          <View {...swipe.panHandlers} style={[styles.stage, { width: stage, height: stage * 1.25, backgroundColor: `${look.accent_color}1f` }]}>
            <Image source={{ uri: look.image_url }} style={StyleSheet.absoluteFill} contentFit="contain" />

            {look.items.map((item, i) => (
              <Pressable
                key={item.product_id}
                onPress={() => showPiece(item.product_id)}
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

          {lookSizes.length > 0 && (
            <View style={styles.sizeBar}>
              <View style={styles.sizeHead}>
                <Text style={styles.sizeTitle}>قەبارەی منداڵەکەت</Text>
                {!childSize && <Text style={styles.sizeHint}>یەکجار هەڵیبژێرە بۆ هەموو پارچەکان</Text>}
              </View>
              <View style={styles.row}>
                {lookSizes.map(s => (
                  <Pressable key={s} onPress={() => setChildSize(childSize === s ? null : s)}
                             style={[styles.bigSize, childSize === s && styles.sizeOn]} accessibilityRole="radio"
                             accessibilityState={{ selected: childSize === s }}>
                    <Text style={[styles.sizeText, childSize === s && styles.sizeTextOn]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <Text style={styles.section}>پارچەکانی ئەم ستایلە</Text>

          {look.items.map((item, i) => {
            const p = item.product;
            const pick = choiceOf(item);
            const list = p.variations;
            const colorsList = [...new Set(list.map(v => v.color).filter((c): c is string => !!c))];
            const sizes = sortSizes([...new Set(list.filter(v => v.color === pick.color).map(v => v.size).filter((s): s is string => !!s))]);
            const v = pick.variation;
            const available = inStock(v);
            const unit = effectivePrice(p, v);
            const was = p.price > unit && !(v?.price_override && v.price_override > 0) ? p.price : 0;

            return (
              <View key={item.product_id}
                    onLayout={e => { pieceY.current[item.product_id] = e.nativeEvent.layout.y; }}
                    style={[styles.piece, active === item.product_id && styles.pieceOn]}>
                <View style={styles.pieceTop}>
                  <Pressable onPress={() => router.push(`/product/${p.id}` as never)} style={styles.thumbWrap}>
                    {p.image_url ? <Image source={{ uri: p.image_url }} style={styles.thumb} contentFit="cover" /> : null}
                    <View style={styles.thumbNo}><Text style={styles.thumbNoText}>{i + 1}</Text></View>
                  </Pressable>

                  <View style={styles.pieceBody}>
                    <Text style={styles.pieceName} numberOfLines={2}>{p.name_ku || p.name}</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.piecePrice}>{formatIQD(unit)}</Text>
                      {was > 0 && <Text style={styles.wasPrice}>{formatIQD(was)}</Text>}
                    </View>

                    {colorsList.length > 0 && (
                      <View style={styles.row}>
                        {colorsList.map(c => (
                          <Pressable key={c} onPress={() => setOwn(item, { color: c })} hitSlop={4}
                                     style={[styles.swatchRing, pick.color === c && styles.swatchRingOn]}>
                            <View style={[styles.swatch, { backgroundColor: colorHex(c) }]} />
                          </Pressable>
                        ))}
                      </View>
                    )}

                    {childSize ? (
                      <Text style={[styles.sizeNote, !available && styles.sizeNoteBad]}>
                        {available ? `قەبارە: ${childSize}` : 'لەم قەبارەیەدا نەماوە'}
                      </Text>
                    ) : (
                      sizes.length > 0 && (
                        <View style={styles.row}>
                          {sizes.map(s => {
                            const sv = list.find(x => x.color === pick.color && x.size === s);
                            return (
                              <Pressable key={s} onPress={() => setOwn(item, { size: s })}
                                         style={[styles.size, pick.size === s && styles.sizeOn]}>
                                <Text style={[styles.sizeText, pick.size === s && styles.sizeTextOn, !inStock(sv) && styles.sizeOut]}>{s}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      )
                    )}
                  </View>
                </View>

                <Pressable
                  onPress={() => addOne(item)}
                  disabled={!available}
                  style={[styles.add, !available && styles.addOff, added === item.product_id && styles.addDone]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.addText, !available && styles.addTextOff]}>
                    {!available ? (childSize ? 'لەم قەبارەیەدا نەماوە' : 'نەماوە') : added === item.product_id ? '✓ زیادکرا' : '+ زیادکردن'}
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
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  // What `Page` gives its own scroller, since this screen owns the scrolling.
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

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

  sizeBar: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.lg },
  sizeHead: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 },
  sizeTitle: { ...typography.heading, color: colors.text },
  sizeHint: { ...typography.tiny, color: colors.textMuted },
  bigSize: { minWidth: 52, height: 38, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  sizeNote: { ...typography.tiny, color: colors.textMuted, marginTop: spacing.sm },
  sizeNoteBad: { color: colors.danger },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: spacing.sm },
  wasPrice: { ...typography.tiny, color: colors.textFaint, textDecorationLine: 'line-through' },

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
