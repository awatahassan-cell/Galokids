import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { formatIQD } from '@galokids/core';
import {
  browseProducts,
  searchProducts,
  variationsForMany,
  type LocalProduct,
  type LocalVariation,
} from '@/offline';
import { NavIcon } from '@/navigation/NavIcon';
import { colors, fonts, radius, shadow, spacing, typography } from '@/theme';

/**
 * The wall of products the cashier sells from.
 *
 * The panel's till is a grid of pictures with the cart beside it, and this is
 * that grid. A scanner alone is not a till for this shop: children's clothes
 * arrive without a tag as often as with one, and a customer puts a garment on
 * the counter rather than reading its barcode aloud.
 *
 * Everything here is read from the device's own catalogue, never the network,
 * because the one thing a till must do is take money with the line down.
 *
 * Each product shows its colours and sizes as chips. Tapping a chip sells that
 * exact piece, which is the difference between a stock count that stays right
 * and one that has to be corrected by hand every week.
 */
export function ProductGrid({
  onPick,
  columns,
}: {
  onPick: (product: LocalProduct, variation: LocalVariation | null) => void;
  columns: number;
}) {
  const [term, setTerm] = useState('');
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [variations, setVariations] = useState<Map<number, LocalVariation[]>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (search: string) => {
    setLoading(true);

    try {
      const found =
        search.trim().length >= 2 ? await searchProducts(search, 60) : await browseProducts(60);

      setProducts(found);
      // One query for every variation on screen rather than one per card: at
      // sixty cards that is the difference between a grid that appears and one
      // that fills in over a second while the queue waits.
      setVariations(await variationsForMany(found.map(product => product.id)));
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(term), term ? 220 : 0);

    return () => clearTimeout(timer);
  }, [term, load]);

  const empty = !loading && products.length === 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.searchBar}>
        <NavIcon name="products" size={16} color={colors.brand} />

        <TextInput
          style={styles.search}
          value={term}
          onChangeText={setTerm}
          placeholder="گەڕان بە ناو یان کۆد…"
          placeholderTextColor={colors.textFaint}
          textAlign="right"
          returnKeyType="search"
        />

        {term.length > 0 && (
          <Pressable onPress={() => setTerm('')} hitSlop={8}>
            <Text style={styles.clear}>✕</Text>
          </Pressable>
        )}
      </View>

      {empty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            {term ? 'هیچ بەرهەمێک نەدۆزرایەوە' : 'کاتالۆگی ئەم ئامێرە بەتاڵە'}
          </Text>
          <Text style={styles.emptyBody}>
            {term
              ? 'ناوێکی تر یان بارکۆدێک تاقی بکەرەوە.'
              : 'هاوکاتگەری بکە بۆ ئەوەی بەرهەمەکان بێنە سەر ئەم ئامێرە.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          key={columns}
          numColumns={columns}
          keyExtractor={product => String(product.id)}
          columnWrapperStyle={columns > 1 ? styles.row : undefined}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ProductTile
              product={item}
              options={variations.get(item.id) ?? []}
              onPick={onPick}
            />
          )}
        />
      )}
    </View>
  );
}

function ProductTile({
  product,
  options,
  onPick,
}: {
  product: LocalProduct;
  options: LocalVariation[];
  onPick: (product: LocalProduct, variation: LocalVariation | null) => void;
}) {
  const price = product.discount_price ?? product.price;
  const stock = useMemo(
    () => options.reduce((total, option) => total + option.stock_quantity, 0),
    [options]
  );

  const soldOut = options.length > 0 && stock <= 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
      // No variations at all is a product sold as itself; one is a product
      // with nothing to choose. Either way the tap sells it, and only a real
      // choice stops to ask.
      onPress={() => {
        if (options.length === 0) onPick(product, null);
        else if (options.length === 1) onPick(product, options[0]!);
      }}
      disabled={soldOut}
    >
      <View style={styles.media}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.photoEmpty]}>
            <NavIcon name="products" size={20} color={colors.textFaint} />
          </View>
        )}

        <View style={[styles.stockBadge, soldOut && styles.stockBadgeOut]}>
          <Text style={[styles.stockText, soldOut && styles.stockTextOut]}>
            {options.length === 0 ? '—' : stock}
          </Text>
        </View>
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {product.name_ku || product.name}
      </Text>

      <View style={styles.priceRow}>
        {product.discount_price != null && product.discount_price > 0 && (
          <Text style={styles.wasPrice}>{formatIQD(product.price)}</Text>
        )}
        <Text style={styles.price}>{formatIQD(price)}</Text>
      </View>

      {options.length > 1 && (
        <View style={styles.chips}>
          {options.slice(0, 6).map(option => {
            const out = option.stock_quantity <= 0;

            return (
              <Pressable
                key={option.id}
                style={[styles.chip, out && styles.chipOut]}
                disabled={out}
                onPress={() => onPick(product, option)}
              >
                <Text style={[styles.chipText, out && styles.chipTextOut]} numberOfLines={1}>
                  {[option.color, option.size].filter(Boolean).join(' ') || '—'}
                </Text>
              </Pressable>
            );
          })}

          {options.length > 6 && <Text style={styles.more}>+{options.length - 6}</Text>}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: spacing.sm },

  searchBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  search: { flex: 1, ...typography.body, color: colors.text },
  clear: { ...typography.small, color: colors.textFaint, paddingHorizontal: spacing.xs },

  grid: { gap: spacing.sm, paddingBottom: spacing.xl },
  row: { gap: spacing.sm },

  tile: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 3,
    ...shadow.card,
  },
  tilePressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },

  media: { width: '100%', aspectRatio: 1.5, borderRadius: radius.sm, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  photoEmpty: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockBadge: {
    position: 'absolute',
    top: 4,
    insetInlineEnd: 4,
    minWidth: 20,
    paddingHorizontal: 5,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(15,23,42,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockBadgeOut: { backgroundColor: colors.danger },
  stockText: { color: '#fff', fontSize: 9, fontFamily: fonts.bold, lineHeight: 14 },
  stockTextOut: { color: '#fff' },

  name: { ...typography.tiny, color: colors.text, textAlign: 'right' },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: spacing.xs },
  price: { fontSize: 12, fontFamily: fonts.bold, color: colors.text, lineHeight: 18 },
  wasPrice: {
    fontSize: 9,
    fontFamily: fonts.medium,
    color: colors.textFaint,
    textDecorationLine: 'line-through',
    lineHeight: 14,
  },

  chips: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 4,
  },
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brandSoft,
  },
  chipOut: { backgroundColor: colors.background, borderColor: colors.border, opacity: 0.55 },
  chipText: { fontSize: 9, fontFamily: fonts.semibold, color: colors.brand, lineHeight: 14 },
  chipTextOut: { color: colors.textFaint, textDecorationLine: 'line-through' },
  more: { fontSize: 9, fontFamily: fonts.semibold, color: colors.textFaint, lineHeight: 16 },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.xl,
  },
  emptyTitle: { ...typography.heading, color: colors.text, textAlign: 'center' },
  emptyBody: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
});
