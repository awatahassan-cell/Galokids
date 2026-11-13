import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { formatIQD } from '@galokids/core';
import { Button, Empty, Loading, Screen, SearchField, Stat } from '@/components/kit';
import { ProductEditor } from '@/components/ProductEditor';
import { useSync } from '@/state/useSync';
import {
  catalogueSize,
  browseProducts,
  searchProducts,
  variationsFor,
  variationsForMany,
  type LocalProduct,
  type LocalVariation,
} from '@/offline';
import { Pill, Table, Titled, type Column } from '@/components/Table';
import { useSession } from '@/state/useSession';
import { colors, radius, spacing, typography } from '@/theme';

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
  const { syncNow } = useSync();
  const [editing, setEditing] = useState<number | 'new' | null>(null);

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

  const showCost = can('reports.view');

  const stockOf = (product: LocalProduct) =>
    (allVariations.get(product.id) ?? []).reduce((sum, v) => sum + v.stock_quantity, 0);

  const priceOf = (product: LocalProduct) =>
    product.discount_price && product.discount_price > 0 ? product.discount_price : product.price;

  // The panel's product table, column for column: product, barcode, stock,
  // cost, price, gross margin, and whether the website is showing it. Cost and
  // margin only for those allowed to see what the shop pays.
  const columns: Column<LocalProduct>[] = [
    {
      title: 'بەرهەم',
      width: 2.4,
      primary: true,
      render: product => (
        <Titled
          title={product.name_ku || product.name}
          sub={`${(allVariations.get(product.id) ?? []).length} جۆر`}
          leading={
            product.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbEmpty]} />
            )
          }
        />
      ),
    },
    {
      title: 'بارکۆد',
      width: 1.1,
      align: 'center',
      render: product => <Text style={styles.code}>{product.sku || `#${product.id}`}</Text>,
    },
    {
      title: 'ستۆک',
      width: 0.8,
      align: 'center',
      render: product => {
        const count = (allVariations.get(product.id) ?? []).length;
        const stock = stockOf(product);

        if (count === 0) return <Pill label="بێ جۆر" tone="neutral" />;

        return <Pill label={`${stock} دانە`} tone={stock <= 0 ? 'bad' : stock <= 5 ? 'warn' : 'good'} />;
      },
    },
    ...(showCost
      ? [
          {
            title: 'تێچوو',
            width: 1,
            align: 'center' as const,
            render: (product: LocalProduct) =>
              product.cost != null ? formatIQD(product.cost) : '—',
          },
        ]
      : []),
    {
      title: 'نرخ',
      width: 1,
      align: 'center',
      render: product => <Text style={styles.price}>{formatIQD(priceOf(product))}</Text>,
    },
    ...(showCost
      ? [
          {
            title: 'قازانجی خاو',
            width: 0.9,
            align: 'center' as const,
            // Only where a cost is recorded: a margin against a missing cost
            // reads as 100% and tells a shopkeeper something untrue.
            render: (product: LocalProduct) => {
              const price = priceOf(product);
              if (product.cost == null || product.cost <= 0 || price <= 0) return '—';

              const margin = Math.round(((price - product.cost) / price) * 100);

              return <Pill label={`٪${margin}`} tone={margin >= 30 ? 'good' : margin > 0 ? 'warn' : 'bad'} />;
            },
          },
        ]
      : []),
    {
      title: 'وێبسایت',
      width: 0.9,
      align: 'center',
      render: product =>
        product.is_active === 0 ? (
          <Pill label="شاردراوە" tone="warn" />
        ) : (
          <Pill label="چالاک" tone="good" />
        ),
    },
  ];

  return (
    <Screen
      title="بەرهەمەکان"
      subtitle="لەسەر ئەم ئامێرە — بێ ئینتەرنێتیش کاردەکات"
      scroll={false}
      actions={can('products.manage') ? <Button label="بەرهەمی نوێ" onPress={() => setEditing('new')} /> : undefined}
    >
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
        <Table
          rows={products}
          keyFor={product => String(product.id)}
          columns={columns}
          onPress={toggle}
          detailFor={product =>
            expanded === product.id ? (
              <View style={{ gap: spacing.sm }}>
                <Variations list={variations} />
                {can('products.manage') && (
                  <Button label="دەستکاریکردن" tone="quiet" onPress={() => setEditing(product.id)} />
                )}
              </View>
            ) : null
          }
        />
      )}

      <ProductEditor
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          // The device's catalogue is a copy; pull the change so this list and
          // the till both show it.
          await syncNow({ pullCatalogue: true });
          load(term);
        }}
      />
    </Screen>
  );
}

/** A product's colours and sizes, opened under its row. */
function Variations({ list }: { list: LocalVariation[] }) {
  if (list.length === 0) return <Text style={styles.noVariations}>هیچ جۆرێکی نییە.</Text>;

  return (
    <View style={styles.variations}>
      {list.map(variation => (
        <View key={variation.id} style={styles.variation}>
          <Text style={styles.variationLabel} numberOfLines={1}>
            {[variation.color, variation.size].filter(Boolean).join(' · ') || 'ئاسایی'}
          </Text>
          {variation.barcode ? <Text style={styles.code}>{variation.barcode}</Text> : null}
          <Pill
            label={String(variation.stock_quantity)}
            tone={variation.stock_quantity <= 0 ? 'bad' : 'good'}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row-reverse', gap: spacing.sm },
  thumb: { width: 42, height: 42, borderRadius: radius.sm, backgroundColor: colors.background },
  thumbEmpty: { borderWidth: 1, borderColor: colors.border },
  code: { ...typography.tiny, ...typography.mono, color: colors.textMuted },
  price: { ...typography.heading, color: colors.text },

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
  variationLabel: { ...typography.small, color: colors.text },
  noVariations: { ...typography.small, color: colors.textFaint, textAlign: 'right' },
});
