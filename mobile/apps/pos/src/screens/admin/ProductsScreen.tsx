import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { formatIQD } from '@galokids/core';
import { Empty, Loading, Screen, SearchField, Stat } from '@/components/kit';
import {
  catalogueSize,
  browseProducts,
  searchProducts,
  variationsFor,
  variationsForMany,
  type LocalProduct,
  type LocalVariation,
} from '@/offline';
import { useSession } from '@/state/useSession';
import { colors, fonts, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * The catalogue, read from the device.
 *
 * Deliberately local: this is the one back-office screen a cashier reaches for
 * mid-sale — to check a price, or whether the blue one is in — and it has to
 * answer with no connection and no wait. It shows what the till would sell,
 * which is also what the shop needs to see when a count looks wrong.
 *
 * Editing a product is not done here. That writes to the server, needs the
 * whole form, and belongs with the other things that need a signal.
 */
export default function ProductsScreen() {
  const { can } = useSession();

  const [term, setTerm] = useState('');
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [counts, setCounts] = useState({ products: 0, variations: 0 });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [variations, setVariations] = useState<LocalVariation[]>([]);
  // Every listed product's variations, for the stock figure on each row. The
  // open row still fetches its own, but a closed row was being handed an empty
  // list and so reported every product in the shop as having no variations at
  // all — in red, next to a stock count of nothing.
  const [allVariations, setAllVariations] = useState<Map<number, LocalVariation[]>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (search: string) => {
    setLoading(true);
    try {
      // An empty box lists the catalogue rather than nothing: a products
      // screen that shows no products until you guess a name is a screen
      // nobody can use to find out what the shop has.
      const found =
        search.trim().length >= 2 ? await searchProducts(search, 80) : await browseProducts(80);

      setProducts(found);
      // One query for the whole page rather than one per row.
      setAllVariations(await variationsForMany(found.map(product => product.id)));
      setCounts(await catalogueSize());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(term), 200);
    return () => clearTimeout(timer);
  }, [term, load]);

  const toggle = useCallback(
    async (product: LocalProduct) => {
      if (expanded === product.id) {
        setExpanded(null);
        return;
      }

      setExpanded(product.id);
      setVariations(await variationsFor(product.id));
    },
    [expanded]
  );

  return (
    <Screen title="بەرهەمەکان" subtitle="لەسەر ئەم ئامێرە — بێ ئینتەرنێتیش کاردەکات" scroll={false}>
      <View style={styles.stats}>
        <Stat label="بەرهەم" value={String(counts.products)} />
        <Stat label="جۆر (ڕەنگ/قەبارە)" value={String(counts.variations)} />
      </View>

      <SearchField value={term} onChange={setTerm} placeholder="ناو یان بارکۆد…" />

      {loading && products.length === 0 ? (
        <Loading />
      ) : products.length === 0 ? (
        <Empty
          title={counts.products === 0 ? 'کەتەلۆگەکە بەتاڵە' : 'هیچ نەدۆزرایەوە'}
          body={
            counts.products === 0
              ? 'کاتێک ئینتەرنێت هەبوو، بەرهەمەکان خۆیان دادەبەزن.'
              : undefined
          }
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={product => String(product.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ProductRow
              product={item}
              open={expanded === item.id}
              variations={expanded === item.id ? variations : (allVariations.get(item.id) ?? [])}
              showCost={can('reports.view')}
              onPress={() => toggle(item)}
            />
          )}
        />
      )}
    </Screen>
  );
}

function ProductRow({
  product,
  open,
  variations,
  showCost,
  onPress,
}: {
  product: LocalProduct;
  open: boolean;
  variations: LocalVariation[];
  showCost: boolean;
  onPress: () => void;
}) {
  const price = product.discount_price && product.discount_price > 0 ? product.discount_price : product.price;
  const stock = variations.reduce((sum, variation) => sum + variation.stock_quantity, 0);

  // What the shop keeps on each piece, as the panel's table shows it. Only
  // where a cost is recorded: a margin computed against a missing cost reads
  // as 100% and tells a shopkeeper something untrue about their own stock.
  const margin =
    showCost && product.cost != null && product.cost > 0 && price > 0
      ? Math.round(((price - product.cost) / price) * 100)
      : null;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHead}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Text style={styles.thumbMark}>—</Text>
          </View>
        )}

        <View style={styles.cardHeadText}>
          <Text style={styles.name} numberOfLines={1}>
            {product.name_ku || product.name}
          </Text>
          {product.sku ? <Text style={styles.sku}>{product.sku}</Text> : null}

          <View style={styles.tags}>
            <View style={[styles.tag, stock <= 0 && styles.tagOut]}>
              <Text style={[styles.tagText, stock <= 0 && styles.tagTextOut]}>
                {variations.length === 0 ? 'بێ جۆر' : `${stock} دانە`}
              </Text>
            </View>

            {product.is_active === 0 ? (
              <View style={[styles.tag, styles.tagHidden]}>
                <Text style={[styles.tagText, styles.tagTextHidden]}>لە وێبسایت نییە</Text>
              </View>
            ) : null}

            {margin !== null ? (
              <View style={[styles.tag, styles.tagMargin]}>
                <Text style={[styles.tagText, styles.tagTextMargin]}>قازانج ٪{margin}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.cardPrice}>
          <Text style={styles.price}>{formatIQD(price)}</Text>
          {showCost && product.cost != null ? (
            <Text style={styles.cost}>تێچوو {formatIQD(product.cost)}</Text>
          ) : null}
        </View>
      </View>

      {open && (
        <View style={styles.variations}>
          {variations.length === 0 ? (
            <Text style={styles.noVariations}>هیچ جۆرێکی نییە.</Text>
          ) : (
            <>
              {variations.map(variation => (
                <View key={variation.id} style={styles.variationRow}>
                  <Text
                    style={[
                      styles.variationStock,
                      variation.stock_quantity <= 0 && styles.variationOut,
                    ]}
                  >
                    {variation.stock_quantity}
                  </Text>

                  <Text style={styles.variationLabel} numberOfLines={1}>
                    {[variation.color, variation.size].filter(Boolean).join(' · ') || 'ئاسایی'}
                  </Text>

                  {variation.barcode && <Text style={styles.variationBarcode}>{variation.barcode}</Text>}
                </View>
              ))}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>کۆی ماوە: {stock} دانە</Text>
                {showCost && product.cost != null && (
                  <Text style={styles.summaryText}>تێچوو: {formatIQD(product.cost)}</Text>
                )}
              </View>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.background },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  thumbMark: { ...typography.small, color: colors.textFaint },
  cardPrice: { alignItems: 'flex-start' },
  cost: { ...typography.tiny, color: colors.textFaint },
  tags: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.successSoft,
  },
  tagOut: { backgroundColor: colors.dangerSoft },
  tagHidden: { backgroundColor: colors.warningSoft },
  tagMargin: { backgroundColor: colors.brandSoft },
  tagText: { fontSize: 9.5, fontFamily: fonts.semibold, color: colors.success, lineHeight: 15 },
  tagTextOut: { color: colors.danger },
  tagTextHidden: { color: colors.warning },
  tagTextMargin: { color: colors.brand },

  stats: { flexDirection: 'row-reverse', gap: spacing.sm },
  list: { gap: spacing.xs, paddingBottom: spacing.xxl, paddingTop: spacing.sm },
  card: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  cardHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  cardHeadText: { flex: 1 },
  name: { ...typography.body, color: colors.text, textAlign: 'right' },
  sku: { ...typography.tiny, color: colors.textFaint, textAlign: 'right', ...typography.mono },
  price: { ...typography.heading, color: colors.brand, ...typography.mono },
  hidden: { ...typography.tiny, color: colors.warning, textAlign: 'right' },

  variations: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  noVariations: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },
  variationRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  variationStock: {
    minWidth: 34,
    textAlign: 'center',
    ...typography.small,
    color: colors.success,
    ...typography.mono,
  },
  variationOut: { color: colors.danger },
  variationLabel: { flex: 1, ...typography.small, color: colors.text, textAlign: 'right' },
  variationBarcode: { ...typography.tiny, color: colors.textFaint, ...typography.mono },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  summaryText: { ...typography.tiny, color: colors.textMuted },
});
