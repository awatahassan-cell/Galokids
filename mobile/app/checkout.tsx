import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing } from '../src/theme';
import { useLanguage } from '../src/i18n/LanguageProvider';
import { useCart } from '../src/store/CartProvider';
import { useAuth } from '../src/store/AuthProvider';
import { useShop } from '../src/store/ShopProvider';
import { fetchShippingQuote, placeOrder, validateCoupon } from '../src/api/endpoints';
import { formatPrice, roundIQD } from '../src/utils/money';
import { isValidPhone, normalizePhone } from '../src/utils/phone';
import { composeAddress, districtsOf, governorates, subdistrictsOf } from '../src/utils/locations';
import { Field } from '../src/components/Field';
import { Select } from '../src/components/Select';
import { Button, Divider, Row, T } from '../src/components/ui';

/**
 * Checkout.
 *
 * The delivery charge is quoted by the server, from the governorate, rather
 * than worked out here. The server recalculates it when the order is saved,
 * so anything computed on the phone would only be a second opinion — and when
 * the two disagree the customer is shown one total and charged another.
 *
 * For the same reason the coupon is validated server-side and only the code
 * is sent: an app that posts its own discount amount is an app that can be
 * told to post any discount amount.
 */
export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language, isRTL } = useLanguage();
  const { lines, subtotal, clear } = useCart();
  const { user, isSignedIn, loading: authLoading } = useAuth();
  const { settings } = useShop();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [governorate, setGovernorate] = useState('');
  const [governorateLabel, setGovernorateLabel] = useState('');
  const [district, setDistrict] = useState('');
  const [districtLabel, setDistrictLabel] = useState('');
  const [subdistrict, setSubdistrict] = useState('');
  const [subdistrictLabel, setSubdistrictLabel] = useState('');
  const [detail, setDetail] = useState(user?.address ?? '');

  const [coupon, setCoupon] = useState('');
  const [couponPercent, setCouponPercent] = useState(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const [deliveryFee, setDeliveryFee] = useState(0);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (user?.name && !name) setName(user.name);
    if (user?.phone && !phone) setPhone(user.phone);
  }, [user, name, phone]);

  // Sending someone to sign in only once the session is known: doing it while
  // the stored token is still being checked bounces a signed-in customer.
  useEffect(() => {
    if (!authLoading && !isSignedIn) {
      router.replace('/auth/sign-in?next=/checkout' as never);
    }
  }, [authLoading, isSignedIn, router]);

  const governorateOptions = useMemo(() => governorates(language), [language]);
  const districtOptions = useMemo(
    () => (governorate ? districtsOf(governorate, language) : []),
    [governorate, language]
  );
  const subdistrictOptions = useMemo(
    () => (governorate && district ? subdistrictsOf(governorate, district, language) : []),
    [governorate, district, language]
  );

  // Ask the server what delivery costs as soon as a governorate is chosen,
  // and again if the basket total crosses the free-delivery threshold.
  useEffect(() => {
    if (!governorate) {
      setDeliveryFee(0);
      return;
    }

    const controller = new AbortController();
    setQuoting(true);

    fetchShippingQuote(governorate, subtotal, controller.signal)
      .then(quote => setDeliveryFee(quote.fee))
      .catch(() => {
        // Fall back to what the shop's settings say rather than showing zero,
        // which would read as free delivery.
        setDeliveryFee(Number(settings.shippingDefaultFee ?? 0));
      })
      .finally(() => setQuoting(false));

    return () => controller.abort();
  }, [governorate, subtotal, settings.shippingDefaultFee]);

  const discount = useMemo(
    () => (couponPercent > 0 ? roundIQD((subtotal * couponPercent) / 100) : 0),
    [subtotal, couponPercent]
  );

  const total = useMemo(
    () => roundIQD(Math.max(0, subtotal - discount) + deliveryFee),
    [subtotal, discount, deliveryFee]
  );

  const onApplyCoupon = useCallback(async () => {
    const code = coupon.trim();
    if (!code) return;

    setCheckingCoupon(true);
    setCouponMessage(null);

    const result = await validateCoupon(code, subtotal);
    setCheckingCoupon(false);

    if (result.valid && result.discountPercentage) {
      setCouponPercent(result.discountPercentage);
      setCouponMessage(t('couponApplied'));
    } else {
      setCouponPercent(0);
      setCouponMessage(result.message || t('couponInvalid'));
    }
  }, [coupon, subtotal, t]);

  const validate = useCallback(() => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = t('required');
    if (!isValidPhone(phone)) next.phone = t('invalidPhone');
    if (!governorate) next.governorate = t('required');
    if (!detail.trim()) next.detail = t('required');
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [name, phone, governorate, detail, t]);

  const onSubmit = useCallback(async () => {
    setFailure(null);
    if (!validate() || lines.length === 0) return;

    setSubmitting(true);
    try {
      const order = await placeOrder({
        items: lines.map(line => ({
          productId: line.product.id,
          productVariationId: line.variation?.id,
          quantity: line.quantity,
        })),
        customerName: name.trim(),
        customerPhone: normalizePhone(phone) ?? phone,
        shippingAddress: composeAddress({
          governorateLabel,
          districtLabel,
          subdistrictLabel,
          detail: detail.trim(),
        }),
        governorate,
        couponCode: couponPercent > 0 ? coupon.trim() : undefined,
      });

      // Only empty the basket once the server has the order. Clearing first
      // and then failing loses the basket and the sale together.
      clear();
      router.replace(`/order/${order.id}?placed=1` as never);
    } catch (error) {
      setFailure((error as Error).message || t('somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }, [
    validate,
    lines,
    name,
    phone,
    governorate,
    governorateLabel,
    districtLabel,
    subdistrictLabel,
    detail,
    coupon,
    couponPercent,
    clear,
    router,
    t,
  ]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Row
        justify="space-between"
        style={{ paddingHorizontal: spacing.lg, paddingTop: insets.top + spacing.sm, paddingBottom: spacing.md }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <T size="lg" weight="black" color={colors.slate[700]}>
            {isRTL ? '→' : '←'}
          </T>
        </Pressable>
        <T size="lg" weight="black">
          {t('checkout')}
        </T>
        <View style={{ width: 20 }} />
      </Row>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 220, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Field
          label={t('fullName')}
          value={name}
          onChangeText={setName}
          error={errors.name}
          autoComplete="name"
        />

        <Field
          label={t('phone')}
          value={phone}
          onChangeText={setPhone}
          error={errors.phone}
          keyboardType="phone-pad"
          placeholder="0770 000 0000"
          autoComplete="tel"
        />

        <Select
          label={t('governorate')}
          placeholder={t('governorate')}
          value={governorate}
          options={governorateOptions}
          error={Boolean(errors.governorate)}
          onChange={(value, label) => {
            setGovernorate(value);
            setGovernorateLabel(label);
            // A district from the previous governorate is not a valid address.
            setDistrict('');
            setDistrictLabel('');
            setSubdistrict('');
            setSubdistrictLabel('');
          }}
        />

        <Select
          label={t('city')}
          placeholder={t('city')}
          value={district}
          options={districtOptions}
          disabled={!governorate}
          onChange={(value, label) => {
            setDistrict(value);
            setDistrictLabel(label);
            setSubdistrict('');
            setSubdistrictLabel('');
          }}
        />

        {subdistrictOptions.length > 0 ? (
          <Select
            label={t('subdistrict')}
            placeholder={t('subdistrict')}
            value={subdistrict}
            options={subdistrictOptions}
            disabled={!district}
            onChange={(value, label) => {
              setSubdistrict(value);
              setSubdistrictLabel(label);
            }}
          />
        ) : null}

        <Field
          label={t('addressDetail')}
          value={detail}
          onChangeText={setDetail}
          error={errors.detail}
          multiline
        />

        <Divider spacingY={spacing.xs} />

        <View style={{ gap: spacing.sm }}>
          <T size="xs" weight="black" color={colors.slate[500]}>
            {t('couponCode')}
          </T>
          <Row gap={spacing.md}>
            <View style={{ flex: 1 }}>
              <Field
                label=""
                value={coupon}
                onChangeText={setCoupon}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="GALO10"
              />
            </View>
            <Button
              title={t('couponApply')}
              variant="secondary"
              size="md"
              loading={checkingCoupon}
              onPress={onApplyCoupon}
              style={{ marginTop: 20 }}
            />
          </Row>
          {couponMessage ? (
            <T
              size="xs"
              weight="bold"
              color={couponPercent > 0 ? colors.mint[700] : colors.rose[600]}
            >
              {couponMessage}
            </T>
          ) : null}
        </View>

        <View
          style={{
            backgroundColor: colors.bubble[50],
            borderColor: colors.bubble[200],
            borderWidth: 1,
            borderRadius: radius.xl,
            padding: spacing.lg,
          }}
        >
          <Row gap={spacing.md}>
            <T size="base">💵</T>
            <T size="sm" weight="black" color={colors.slate[700]}>
              {t('codOnly')}
            </T>
          </Row>
        </View>

        {failure ? (
          <T size="sm" weight="bold" color={colors.rose[600]}>
            {failure}
          </T>
        ) : null}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: spacing.lg,
          paddingBottom: Math.max(insets.bottom, spacing.lg),
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.slate[100],
          gap: spacing.sm,
          ...shadow.md,
        }}
      >
        <SummaryRow label={t('subtotal')} value={formatPrice(subtotal, language)} />
        {discount > 0 ? (
          <SummaryRow
            label={`${t('discount')} (${couponPercent}%)`}
            value={`− ${formatPrice(discount, language)}`}
            tone={colors.mint[700]}
          />
        ) : null}
        <SummaryRow
          label={t('delivery')}
          value={
            quoting
              ? '…'
              : deliveryFee > 0
                ? formatPrice(deliveryFee, language)
                : governorate
                  ? t('freeDelivery')
                  : '—'
          }
        />

        <Divider spacingY={spacing.xs} />

        <Row justify="space-between">
          <T size="base" weight="black">
            {t('total')}
          </T>
          <T size="xl" weight="black" color={colors.candy[700]}>
            {formatPrice(total, language)}
          </T>
        </Row>

        <Button
          full
          size="lg"
          title={t('placeOrder')}
          loading={submitting}
          disabled={lines.length === 0 || quoting}
          onPress={onSubmit}
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Row justify="space-between">
      <T size="sm" weight="bold" color={colors.slate[600]}>
        {label}
      </T>
      <T size="sm" weight="black" color={tone ?? colors.slate[800]}>
        {value}
      </T>
    </Row>
  );
}
