import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, Share, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing } from '../../src/theme';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { useCart } from '../../src/store/CartProvider';
import { fetchProduct, fetchProducts } from '../../src/api/endpoints';
import type { Product, ProductVariation } from '../../src/api/types';
import { colourHex, localisedColour, localisedSize } from '../../src/utils/variations';
import { discountPercent, formatPrice, unitPrice, wasPrice } from '../../src/utils/money';
import { webUrlForProduct } from '../../src/utils/links';
import { ProductCard } from '../../src/components/ProductCard';
import { Button, Divider, EmptyState, Loading, Row, T } from '../../src/components/ui';

const { width: SCREEN } = Dimensions.get('window');

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language, pick, isRTL } = useLanguage();
  const { add, toggleWishlist, isWishlisted, itemCount } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [colour, setColour] = useState('');
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [gallery, setGallery] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);

    fetchProduct(id, controller.signal)
      .then(found => {
        setProduct(found);
        // Preselect the first combination that is actually in stock, so the
        // buy button is live on arrival rather than after two taps.
        const available = found.variations.find(v => v.stockQuantity > 0) ?? found.variations[0];
        if (available) {
          setColour(available.color);
          setSize(available.size);
        }

        return fetchProducts({ categoryId: found.categoryId, limit: 10, signal: controller.signal });
      })
      .then(result => {
        if (!result) return;
        setRelated(result.data.filter(item => item.id !== id).slice(0, 8));
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  const colours = useMemo(
    () => Array.from(new Set((product?.variations ?? []).map(v => v.color).filter(Boolean))),
    [product]
  );

  // Only the sizes that exist in the chosen colour: offering a size that was
  // never made in that colour leads to a dead "out of stock" every time.
  const sizes = useMemo(() => {
    const source = colours.length
      ? (product?.variations ?? []).filter(v => v.color === colour)
      : (product?.variations ?? []);
    return Array.from(new Set(source.map(v => v.size).filter(Boolean)));
  }, [product, colour, colours.length]);

  const selected: ProductVariation | null = useMemo(() => {
    if (!product) return null;
    if (product.variations.length === 0) return null;
    return (
      product.variations.find(
        v => (!colours.length || v.color === colour) && (!sizes.length || v.size === size)
      ) ?? null
    );
  }, [product, colour, size, colours.length, sizes.length]);

  const stock = selected ? selected.stockQuantity : product?.variations.length ? 0 : Infinity;
  const canBuy = stock > 0;

  const price = unitPrice(product, selected);
  const was = wasPrice(product, selected);
  const off = discountPercent(product, selected);

  const onAdd = useCallback(() => {
    if (!product || !canBuy) return;
    add(product, selected, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
  }, [product, selected, quantity, canBuy, add]);

  const onShare = useCallback(() => {
    if (!product) return;
    const name = pick(product.nameKu, product.nameAr, product.name) || product.name;
    // The website address, not the app scheme: a shared link has to open for
    // someone who does not have the app.
    Share.share({ message: `${name}\n${webUrlForProduct(product.id)}` }).catch(() => {});
  }, [product, pick]);

  if (loading) return <Loading label={t('loading')} />;

  if (failed || !product) {
    return (
      <EmptyState
        emoji="🧸"
        title={t('notFound')}
        action={<Button title={t('back')} variant="secondary" onPress={() => router.back()} />}
      />
    );
  }

  const name = pick(product.nameKu, product.nameAr, product.name) || product.name;
  const description = pick(product.descriptionKu, product.descriptionAr, product.description);
  const saved = isWishlisted(product.id);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Gallery */}
        <View style={{ height: SCREEN, maxHeight: 420, backgroundColor: colors.candy[50] }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={event =>
              setGallery(Math.round(event.nativeEvent.contentOffset.x / SCREEN))
            }
          >
            {(product.images.length ? product.images : ['']).map((source, index) => (
              <Image
                key={`${source}-${index}`}
                source={source || undefined}
                style={{ width: SCREEN, height: '100%' }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
            ))}
          </ScrollView>

          <View
            style={{
              position: 'absolute',
              top: insets.top + spacing.sm,
              left: spacing.lg,
              right: spacing.lg,
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'space-between',
            }}
          >
            <CircleButton label={isRTL ? '→' : '←'} onPress={() => router.back()} />
            <Row gap={spacing.sm} style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              <CircleButton label="↗" onPress={onShare} />
              <CircleButton
                label={saved ? '♥' : '♡'}
                tint={saved ? colors.candy[500] : undefined}
                foreground={saved ? colors.white : colors.candy[600]}
                onPress={() => toggleWishlist(product.id)}
              />
            </Row>
          </View>

          {product.images.length > 1 ? (
            <Row
              gap={6}
              justify="center"
              style={{ position: 'absolute', bottom: spacing.lg, left: 0, right: 0 }}
            >
              {product.images.map((_, dot) => (
                <View
                  key={dot}
                  style={{
                    width: dot === gallery ? 18 : 6,
                    height: 6,
                    borderRadius: radius.pill,
                    backgroundColor: dot === gallery ? colors.candy[500] : 'rgba(255,255,255,0.85)',
                  }}
                />
              ))}
            </Row>
          ) : null}
        </View>

        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <T size="2xl" weight="black">
            {name}
          </T>

          <Row gap={spacing.md} align="baseline">
            <T size="xl" weight="black" color={colors.candy[700]}>
              {formatPrice(price, language)}
            </T>
            {was ? (
              <T
                size="base"
                weight="bold"
                color={colors.slate[400]}
                style={{ textDecorationLine: 'line-through' }}
              >
                {formatPrice(was, language)}
              </T>
            ) : null}
            {off > 0 ? (
              <View
                style={{
                  backgroundColor: colors.sunny[100],
                  borderRadius: radius.sm,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <T size="xs" weight="black" color={colors.sunny[700]}>
                  {language === 'en' ? `Save ${off}%` : `داشکانی %${off}`}
                </T>
              </View>
            ) : null}
          </Row>

          {Number.isFinite(stock) ? (
            <T size="sm" weight="bold" color={stock > 0 ? colors.mint[700] : colors.rose[600]}>
              {stock > 0
                ? stock <= 5
                  ? t('onlyLeft', { n: stock })
                  : t('inStock')
                : t('outOfStock')}
            </T>
          ) : null}

          {description ? (
            <>
              <Divider spacingY={spacing.sm} />
              <T size="sm" weight="bold" color={colors.slate[600]}>
                {description}
              </T>
            </>
          ) : null}

          {colours.length > 0 ? (
            <View style={{ marginTop: spacing.sm }}>
              <T size="xs" weight="black" color={colors.slate[500]}>
                {t('selectColor')}: {localisedColour(colour, language)}
              </T>
              <Row gap={spacing.md} style={{ marginTop: spacing.md, flexWrap: 'wrap' }}>
                {colours.map(option => (
                  <Pressable
                    key={option}
                    onPress={() => setColour(option)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radius.pill,
                      backgroundColor: colourHex(option),
                      borderWidth: colour === option ? 3 : 1,
                      borderColor: colour === option ? colors.candy[500] : colors.slate[200],
                    }}
                  />
                ))}
              </Row>
            </View>
          ) : null}

          {sizes.length > 0 ? (
            <View style={{ marginTop: spacing.md }}>
              <T size="xs" weight="black" color={colors.slate[500]}>
                {t('selectSize')}
              </T>
              <Row gap={spacing.sm} style={{ marginTop: spacing.md, flexWrap: 'wrap' }}>
                {sizes.map(option => {
                  const active = size === option;
                  const optionStock = product.variations.find(
                    v => v.size === option && (!colours.length || v.color === colour)
                  )?.stockQuantity;
                  const gone = optionStock !== undefined && optionStock <= 0;

                  return (
                    <Pressable
                      key={option}
                      onPress={() => setSize(option)}
                      style={{
                        paddingHorizontal: spacing.lg,
                        paddingVertical: spacing.sm,
                        borderRadius: radius.pill,
                        backgroundColor: active ? colors.candy[500] : colors.surface,
                        borderWidth: 1,
                        borderColor: active ? colors.candy[500] : colors.slate[200],
                        opacity: gone ? 0.4 : 1,
                      }}
                    >
                      <T size="xs" weight="black" color={active ? colors.white : colors.slate[700]}>
                        {localisedSize(option, language)}
                      </T>
                    </Pressable>
                  );
                })}
              </Row>
            </View>
          ) : null}

          {/* Quantity */}
          <Row
            justify="space-between"
            style={{
              marginTop: spacing.lg,
              backgroundColor: colors.slate[50],
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.slate[200],
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
            }}
          >
            <T size="sm" weight="bold" color={colors.slate[700]}>
              {t('quantity')}
            </T>
            <Row gap={spacing.lg}>
              <Stepper label="−" onPress={() => setQuantity(q => Math.max(1, q - 1))} />
              <T size="base" weight="black" style={{ minWidth: 24, textAlign: 'center' }}>
                {quantity}
              </T>
              <Stepper
                label="+"
                onPress={() => setQuantity(q => (Number.isFinite(stock) ? Math.min(stock, q + 1) : q + 1))}
              />
            </Row>
          </Row>
        </View>

        {related.length > 0 ? (
          <View style={{ marginTop: spacing.lg }}>
            <T size="lg" weight="black" style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
              {t('relatedProducts')}
            </T>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: spacing.lg,
                gap: spacing.md,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }}
            >
              {related.map(item => (
                <ProductCard key={item.id} product={item} width={158} compact />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* The four promises, below the buy controls — the same order the
            website settled on. */}
        <View
          style={{
            margin: spacing.lg,
            padding: spacing.xl,
            borderRadius: radius['2xl'],
            backgroundColor: colors.bubble[50],
            borderWidth: 1,
            borderColor: colors.bubble[200],
            gap: spacing.md,
          }}
        >
          {(
            [
              ['🚚', t('deliveryNationwide')],
              ['💵', t('cashOnDelivery')],
              ['↩️', t('returns14')],
              ['🧵', t('naturalFabric')],
            ] as const
          ).map(([emoji, label]) => (
            <Row key={label} gap={spacing.md}>
              <T size="base">{emoji}</T>
              <T size="sm" weight="bold" color={colors.slate[700]} style={{ flex: 1 }}>
                {label}
              </T>
            </Row>
          ))}
        </View>
      </ScrollView>

      {/* The buy bar stays on screen: on a long page the button should never
          be something the customer has to scroll back to find. */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: Math.max(insets.bottom, spacing.md),
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.slate[100],
          ...shadow.md,
        }}
      >
        <Button
          full
          size="lg"
          title={justAdded ? t('added') : canBuy ? t('addToCart') : t('outOfStock')}
          disabled={!canBuy}
          onPress={onAdd}
        />
        {itemCount > 0 ? (
          <Pressable onPress={() => router.push('/cart' as never)} style={{ marginTop: spacing.sm }}>
            <T size="xs" weight="black" color={colors.candy[700]} center>
              {t('cart')} ({itemCount}) →
            </T>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function CircleButton({
  label,
  onPress,
  tint,
  foreground,
}: {
  label: string;
  onPress: () => void;
  tint?: string;
  foreground?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 38,
        height: 38,
        borderRadius: radius.pill,
        backgroundColor: tint ?? 'rgba(255,255,255,0.94)',
        alignItems: 'center',
        justifyContent: 'center',
        ...shadow.sm,
      }}
    >
      <T size="base" weight="black" color={foreground ?? colors.slate[700]}>
        {label}
      </T>
    </Pressable>
  );
}

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 34,
        height: 34,
        borderRadius: radius.pill,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.slate[200],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <T size="base" weight="black" color={colors.slate[700]}>
        {label}
      </T>
    </Pressable>
  );
}
