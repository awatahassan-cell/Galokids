import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { canEncodeCode128, formatIQD, useLayout } from '@galokids/core';
import { Button, Card, Chips, Empty, Screen, SearchField } from '@/components/kit';
import { Barcode } from '@/components/Barcode';
import {
  catalogueSize,
  searchProducts,
  variationsFor,
  type LocalProduct,
  type LocalVariation,
} from '@/offline';
import { canPrintToPdf, labelSheetToPdf, printLabelSheet } from '@/labels/print';
import {
  LABEL_PRESETS,
  labelCount,
  labelSheetHtml,
  type LabelPaper,
  type LabelSpec,
} from '@/labels/sheet';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * Printing price stickers.
 *
 * Reads the till's own catalogue, so this works with the connection down —
 * the same promise as the rest of the till, and the moment a shop is most
 * likely to be labelling new stock is while it is being unpacked in a back
 * room with no signal.
 *
 * What the cashier sees on screen is drawn from the same barcode the sheet is
 * printed from, so the preview is not an impression of the label. It is the
 * label.
 */
export default function LabelsScreen() {
  const { wide } = useLayout();

  const [term, setTerm] = useState('');
  const [found, setFound] = useState<LocalProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [stocked, setStocked] = useState<number | null>(null);

  const [open, setOpen] = useState<LocalProduct | null>(null);
  const [variations, setVariations] = useState<LocalVariation[]>([]);

  const [chosen, setChosen] = useState<LabelSpec[]>([]);

  const [preset, setPreset] = useState(LABEL_PRESETS[0]!.id);
  const [paper, setPaper] = useState<LabelPaper>('roll');
  const [showShop, setShowShop] = useState(true);
  const [showName, setShowName] = useState(true);
  const [showVariant, setShowVariant] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showCode, setShowCode] = useState(true);

  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    catalogueSize()
      .then(size => setStocked(size.products))
      .catch(() => setStocked(0));
  }, []);

  // Searching the device, so there is no network to debounce for — but a
  // keystroke still should not outrun the one before it.
  useEffect(() => {
    let current = true;

    if (term.trim().length < 2) {
      setFound([]);
      return;
    }

    setSearching(true);

    searchProducts(term, 25)
      .then(results => {
        if (current) setFound(results);
      })
      .catch(() => {
        if (current) setFound([]);
      })
      .finally(() => {
        if (current) setSearching(false);
      });

    return () => {
      current = false;
    };
  }, [term]);

  const expand = async (product: LocalProduct) => {
    if (open?.id === product.id) {
      setOpen(null);
      setVariations([]);
      return;
    }

    setOpen(product);
    setVariations(await variationsFor(product.id).catch(() => []));
  };

  /**
   * What goes under the bars.
   *
   * A variation's own barcode first, because that is the code on the garment's
   * label and it identifies the exact colour and size — the same order the
   * scanner looks them up in, so a sticker printed here is found by the till.
   *
   * A product has no barcode of its own in this shop: the backend's `barcode`
   * field on a product is its SKU under another name, so the SKU is the
   * product-level code.
   */
  const codeFor = (product: LocalProduct, variation: LocalVariation | null): string =>
    variation?.barcode?.trim() ||
    variation?.sku?.trim() ||
    product.sku?.trim() ||
    // Last resort. Every product has an id, so there is always something to
    // print — and a sticker that scans to the right product beats no sticker.
    `GALO${String(product.id).padStart(6, '0')}`;

  const add = (product: LocalProduct, variation: LocalVariation | null) => {
    const barcode = codeFor(product, variation);

    setChosen(previous => {
      const existing = previous.findIndex(spec => spec.barcode === barcode);

      // The same code twice is one sticker printed more often, not two rows.
      if (existing >= 0) {
        return previous.map((spec, index) =>
          index === existing ? { ...spec, copies: spec.copies + 1 } : spec
        );
      }

      return [
        ...previous,
        {
          name: product.name_ku || product.name,
          barcode,
          price: variation?.price_override ?? product.discount_price ?? product.price,
          color: variation?.color ?? null,
          size: variation?.size ?? null,
          copies: 1,
        },
      ];
    });
  };

  const setCopies = (barcode: string, copies: number) => {
    setChosen(previous =>
      copies <= 0
        ? previous.filter(spec => spec.barcode !== barcode)
        : previous.map(spec => (spec.barcode === barcode ? { ...spec, copies } : spec))
    );
  };

  const size = LABEL_PRESETS.find(entry => entry.id === preset) ?? LABEL_PRESETS[0]!;

  const options = useMemo(
    () => ({
      widthMm: size.widthMm,
      heightMm: size.heightMm,
      paper,
      shopName: showShop ? 'Galo Kids' : null,
      showName,
      showVariant,
      showPrice,
      showBarcodeText: showCode,
    }),
    [size, paper, showShop, showName, showVariant, showPrice, showCode]
  );

  const total = labelCount(chosen);
  const unprintable = chosen.filter(spec => !canEncodeCode128(spec.barcode));

  const print = async (asPdf = false) => {
    const html = labelSheetHtml(chosen, options);
    if (!html || printing) return;

    setPrinting(true);

    try {
      if (asPdf) {
        const uri = await labelSheetToPdf(html);
        Alert.alert('PDF دروستکرا', uri);
      } else {
        await printLabelSheet(html);
      }
    } catch (error) {
      Alert.alert('نەتوانرا چاپ بکرێت', (error as Error).message);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Screen title="لەیبل و بارکۆد" subtitle={`چاپکردنی ستیکەر · ${size.label} mm`}>
      <View style={[styles.layout, wide && styles.layoutWide]}>
        {/* ----------------------------------------------- picking --- */}
        <View style={styles.column}>
          <Text style={styles.sectionTitle}>بەرهەم هەڵبژێرە</Text>

          <SearchField value={term} onChange={setTerm} placeholder="ناو، بارکۆد یان SKU…" />

          {stocked === 0 && (
            <View style={styles.warn}>
              <Text style={styles.warnText}>
                کاتالۆگی ئەم دەزگایە بەتاڵە. سەرەتا هاوکاتگەری بکە (Sync) بۆ ئەوەی بەرهەمەکان
                لێرە دەربکەون.
              </Text>
            </View>
          )}

          {term.trim().length < 2 ? (
            <Text style={styles.hint}>
              بۆ گەڕان لانیکەم دوو پیت بنووسە.
              {stocked ? ` ${stocked} بەرهەم لەسەر ئەم دەزگایە هەیە.` : ''}
            </Text>
          ) : searching ? (
            <Text style={styles.hint}>گەڕان…</Text>
          ) : found.length === 0 ? (
            <Empty title="هیچ نەدۆزرایەوە" body="ناوێکی تر یان بارکۆدێک تاقی بکەرەوە." />
          ) : (
            <View style={styles.results}>
              {found.map(product => (
                <View key={product.id}>
                  <Card onPress={() => expand(product)}>
                    <View style={styles.resultRow}>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultName} numberOfLines={1}>
                          {product.name_ku || product.name}
                        </Text>
                        <Text style={styles.resultCode}>
                          {product.sku || `#${product.id}`}
                        </Text>
                      </View>
                      <Text style={styles.resultPrice}>
                        {formatIQD(product.discount_price ?? product.price)}
                      </Text>
                    </View>
                  </Card>

                  {open?.id === product.id && (
                    <View style={styles.variants}>
                      <Pressable style={styles.variant} onPress={() => add(product, null)}>
                        <Text style={styles.variantAdd}>زیادکردن +</Text>
                        <Text style={styles.variantLabel}>بەرهەمەکە خۆی</Text>
                      </Pressable>

                      {variations.map(variation => (
                        <Pressable
                          key={variation.id}
                          style={styles.variant}
                          onPress={() => add(product, variation)}
                        >
                          <Text style={styles.variantAdd}>زیادکردن +</Text>
                          <Text style={styles.variantLabel}>
                            {[variation.color, variation.size].filter(Boolean).join(' · ') ||
                              `#${variation.id}`}
                            {'  '}
                            <Text style={styles.variantStock}>({variation.stock_quantity})</Text>
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ------------------------------------------------ sheet --- */}
        <View style={styles.column}>
          <Text style={styles.sectionTitle}>
            پەڕەی چاپکردن {total > 0 ? `· ${total} ستیکەر` : ''}
          </Text>

          {chosen.length === 0 ? (
            <Empty
              title="هێشتا هیچ هەڵنەبژێردراوە"
              body="لە لای تر بەرهەمێک بگەڕێ و زیادی بکە."
            />
          ) : (
            <View style={styles.chosen}>
              {chosen.map(spec => (
                <View key={spec.barcode} style={styles.chosenRow}>
                  <View style={styles.chosenInfo}>
                    <Text style={styles.chosenName} numberOfLines={1}>
                      {spec.name}
                    </Text>
                    <Text style={styles.chosenMeta}>
                      {[spec.color, spec.size].filter(Boolean).join(' · ')}
                      {spec.color || spec.size ? ' · ' : ''}
                      {spec.barcode}
                    </Text>
                    {!canEncodeCode128(spec.barcode) && (
                      <Text style={styles.chosenBad}>
                        ئەم کۆدە ناتوانرێت بکرێت بە بارکۆد — تەنها پیت و ژمارەی ئینگلیزی.
                      </Text>
                    )}
                  </View>

                  <View style={styles.stepper}>
                    <Pressable
                      style={styles.step}
                      onPress={() => setCopies(spec.barcode, spec.copies - 1)}
                    >
                      <Text style={styles.stepText}>−</Text>
                    </Pressable>
                    <Text style={styles.copies}>{spec.copies}</Text>
                    <Pressable
                      style={styles.step}
                      onPress={() => setCopies(spec.barcode, spec.copies + 1)}
                    >
                      <Text style={styles.stepText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              ))}

              <Pressable style={styles.clear} onPress={() => setChosen([])}>
                <Text style={styles.clearText}>سڕینەوەی هەمووی</Text>
              </Pressable>
            </View>
          )}

          {/* ------------------------------------------ settings --- */}
          <Text style={styles.sectionTitle}>قەبارەی ستیکەر (mm)</Text>
          <Chips
            options={LABEL_PRESETS.map(entry => ({ id: entry.id, label: entry.label }))}
            value={preset}
            onChange={setPreset}
          />

          <Chips
            options={[
              { id: 'roll' as LabelPaper, label: 'ڕۆڵ (یەک لەیبل بۆ هەر پەڕە)' },
              { id: 'a4' as LabelPaper, label: 'A4 (چەند لەیبل لەسەر پەڕە)' },
            ]}
            value={paper}
            onChange={setPaper}
          />

          <View style={styles.toggles}>
            <Toggle label="ناوی فرۆشگا" value={showShop} onChange={setShowShop} />
            <Toggle label="ناوی بەرهەم" value={showName} onChange={setShowName} />
            <Toggle label="ڕەنگ و قەبارە" value={showVariant} onChange={setShowVariant} />
            <Toggle label="نرخ" value={showPrice} onChange={setShowPrice} />
            <Toggle label="ژمارەی بارکۆد" value={showCode} onChange={setShowCode} />
          </View>

          {/* ------------------------------------------- preview --- */}
          {chosen[0] && (
            <>
              <Text style={styles.sectionTitle}>پێشبینین</Text>
              <LabelPreview spec={chosen[0]} options={options} />
            </>
          )}

          <View style={styles.actions}>
            <Button
              label={printing ? 'ئامادەکردن…' : `چاپکردنی ${total} ستیکەر`}
              onPress={() => print(false)}
              disabled={printing || total === 0 || unprintable.length > 0}
            />

            {canPrintToPdf && (
              <Button
                label="PDF"
                tone="quiet"
                onPress={() => print(true)}
                disabled={printing || total === 0 || unprintable.length > 0}
              />
            )}
          </View>

          {unprintable.length > 0 && (
            <Text style={styles.blocked}>
              {unprintable.length} کۆد ناتوانرێت چاپ بکرێت. لایان بە بۆ ئەوەی بەردەوام بی.
            </Text>
          )}

          <Text style={styles.note}>
            {Platform.OS === 'web'
              ? 'لە دیالۆگی چاپکردندا قەبارەی پەڕە بکە «ڕۆڵ» یان هەمان قەبارەی ستیکەرەکە، و Margins بکە None.'
              : 'چاپکردن بە پرینتەری سیستەم (AirPrint / Android) دەکرێت. پرینتەری بلوتوسی تایبەت پێویستی بە وەشانێکی تایبەتی ئەپەکە هەیە.'}
          </Text>
        </View>
      </View>
    </Screen>
  );
}

/**
 * The sticker, at roughly the size it prints.
 *
 * Scaled from millimetres at about 3.8 points to the millimetre, which is
 * close enough on a phone screen to tell whether a long product name is going
 * to be cut off — which is the one thing a preview is for.
 */
function LabelPreview({
  spec,
  options,
}: {
  spec: LabelSpec;
  options: {
    widthMm: number;
    heightMm: number;
    shopName?: string | null;
    showName: boolean;
    showVariant: boolean;
    showPrice: boolean;
    showBarcodeText: boolean;
  };
}) {
  const scale = 3.8;
  const variant = [spec.color, spec.size].filter(Boolean).join(' · ');

  return (
    <View style={styles.previewFrame}>
      <View
        style={[
          styles.preview,
          { width: options.widthMm * scale, height: options.heightMm * scale },
        ]}
      >
        {options.shopName && <Text style={styles.pvShop}>{options.shopName}</Text>}
        {options.showName && (
          <Text style={styles.pvName} numberOfLines={2}>
            {spec.name}
          </Text>
        )}
        {options.showVariant && variant.length > 0 && (
          <Text style={styles.pvVariant}>{variant}</Text>
        )}
        {options.showPrice && <Text style={styles.pvPrice}>{formatIQD(spec.price)}</Text>}

        {/* Fitted to the sticker's own width, less the padding, so a long
            code is squeezed rather than running off the edge. */}
        <Barcode
          value={spec.barcode}
          height={options.heightMm * scale * 0.3}
          maxWidth={options.widthMm * scale - 10}
        />

        {options.showBarcodeText && <Text style={styles.pvCode}>{spec.barcode}</Text>}
      </View>
    </View>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Pressable style={styles.toggle} onPress={() => onChange(!value)}>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.brand, false: colors.border }}
        thumbColor="#fff"
      />
      <Text style={styles.toggleLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  layout: { gap: spacing.lg, paddingBottom: spacing.xxl },
  layoutWide: { flexDirection: 'row-reverse', alignItems: 'flex-start' },
  column: { flex: 1, gap: spacing.sm },

  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  hint: { ...typography.small, color: colors.textMuted, textAlign: 'right' },

  warn: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warnText: { ...typography.small, color: colors.warning, textAlign: 'right', lineHeight: 20 },

  results: { gap: spacing.xs },
  resultRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  resultInfo: { flex: 1, alignItems: 'flex-end' },
  resultName: { ...typography.body, color: colors.text, textAlign: 'right' },
  resultCode: { ...typography.tiny, ...typography.mono, color: colors.textFaint },
  resultPrice: { ...typography.heading, color: colors.brand },

  variants: {
    marginTop: spacing.xs,
    marginEnd: spacing.lg,
    gap: spacing.xs,
    paddingEnd: spacing.md,
    borderEndWidth: 2,
    borderEndColor: colors.brandSoft,
  },
  variant: {
    minHeight: TOUCH_TARGET - 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  variantLabel: { ...typography.small, color: colors.text, textAlign: 'right' },
  variantStock: { ...typography.tiny, color: colors.textFaint },
  variantAdd: { ...typography.tiny, color: colors.brand },

  chosen: { gap: spacing.xs },
  chosenRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chosenInfo: { flex: 1, alignItems: 'flex-end' },
  chosenName: { ...typography.body, color: colors.text, textAlign: 'right' },
  chosenMeta: { ...typography.tiny, color: colors.textMuted, textAlign: 'right' },
  chosenBad: { ...typography.tiny, color: colors.danger, textAlign: 'right', marginTop: 2 },

  stepper: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.xs },
  step: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { ...typography.title, color: colors.brand },
  copies: { minWidth: 28, textAlign: 'center', ...typography.heading, color: colors.text },

  clear: { alignSelf: 'flex-start', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  clearText: { ...typography.tiny, color: colors.danger },

  toggles: { gap: spacing.xs },
  toggle: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, minHeight: 40 },
  toggleLabel: { ...typography.small, color: colors.text },

  previewFrame: { alignItems: 'center', paddingVertical: spacing.md },
  preview: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 1,
    overflow: 'hidden',
  },
  pvShop: { fontSize: 8, fontWeight: '700', color: colors.text },
  pvName: { fontSize: 10, fontWeight: '700', color: colors.text, textAlign: 'center' },
  pvVariant: { fontSize: 8, fontWeight: '600', color: colors.textMuted },
  pvPrice: { fontSize: 13, fontWeight: '800', color: colors.text },
  pvCode: { fontSize: 8, ...typography.mono, color: colors.text },

  actions: { flexDirection: 'row-reverse', gap: spacing.sm, marginTop: spacing.md },
  blocked: { ...typography.small, color: colors.danger, textAlign: 'right' },
  note: {
    ...typography.tiny,
    color: colors.textFaint,
    textAlign: 'right',
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
