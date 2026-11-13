import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { TextInput } from '@/components/TextInput';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  Alert,
  backoffice,
  catalogue,
  inventory,
  type Category,
  type Product,
  type ProductVariation,
} from '@galokids/core';
import { Button, Chips, Loading } from '@/components/kit';
import { useFetch } from '@/state/useFetch';
import { useSession } from '@/state/useSession';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * Adding and editing a product.
 *
 * The panel's product form: names in three languages, descriptions, section,
 * who it is for, price, discount, cost, photos, and the colours and sizes with
 * their own stock and barcode. Needs the server — a product is shared by the
 * website, every till and the reports, so there is no offline version of
 * changing one.
 *
 * Saving an existing product sends the product's own fields only and then each
 * changed variation by itself. Sending the whole list back would make the
 * server rebuild every variation under a new id, and the stock history and
 * past orders would point at ones that no longer exist.
 */

interface Row {
  /** Absent on a row that has not been saved yet. */
  id?: number;
  color: string;
  size: string;
  stock: string;
  barcode: string;
}

const GENDERS: { id: '0' | '1' | '2'; label: string }[] = [
  { id: '0', label: 'هەردوو' },
  { id: '1', label: 'کوڕان' },
  { id: '2', label: 'کچان' },
];

const newBarcode = () => `GK${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;

const toRow = (v: ProductVariation): Row => ({
  id: v.id,
  color: v.color ?? '',
  size: v.size ?? '',
  stock: String(v.stock_quantity ?? 0),
  barcode: v.barcode ?? v.sku ?? '',
});

export function ProductEditor({
  target,
  onClose,
  onSaved,
}: {
  /** An id to edit, or 'new'. */
  target: number | 'new' | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (target === null) return null;

  return <Editor key={String(target)} target={target} onClose={onClose} onSaved={onSaved} />;
}

function Editor({
  target,
  onClose,
  onSaved,
}: {
  target: number | 'new';
  onClose: () => void;
  onSaved: () => void;
}) {
  const { can } = useSession();
  const isNew = target === 'new';

  const loaded = useFetch<Product | null>(() => (isNew ? Promise.resolve(null) : backoffice.product(target as number)), [target]);
  const categories = useFetch<Category[]>(() => catalogue.categories(), []);

  if (loaded.loading && !loaded.data && !isNew) {
    return (
      <Shell title="بەرهەم" onClose={onClose}>
        <Loading />
      </Shell>
    );
  }

  if (loaded.error) {
    return (
      <Shell title="بەرهەم" onClose={onClose}>
        <Text style={styles.hint}>نەتوانرا بەرهەمەکە بخوێندرێتەوە. ئینتەرنێتەکەت بپشکنە.</Text>
      </Shell>
    );
  }

  return (
    <Form
      product={loaded.data}
      categories={categories.data ?? []}
      canDelete={can('products.delete')}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function Form({
  product,
  categories,
  canDelete,
  onClose,
  onSaved,
}: {
  product: Product | null;
  categories: Category[];
  canDelete: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [nameKu, setNameKu] = useState(product?.name_ku ?? '');
  const [nameAr, setNameAr] = useState(product?.name_ar ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [descriptionKu, setDescriptionKu] = useState(product?.description_ku ?? '');
  const [descriptionAr, setDescriptionAr] = useState(product?.description_ar ?? '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [discount, setDiscount] = useState(product?.discount_price ? String(product.discount_price) : '');
  const [cost, setCost] = useState(product?.cost != null ? String(product.cost) : '');
  const [categoryId, setCategoryId] = useState(product?.category_id ? String(product.category_id) : '');
  const [gender, setGender] = useState<'0' | '1' | '2'>(String(product?.gender ?? 0) as '0' | '1' | '2');
  const [active, setActive] = useState(product ? product.is_active : true);
  const [barcode, setBarcode] = useState(product?.barcode ?? product?.sku ?? '');
  const [images, setImages] = useState<string[]>(
    product?.images?.length ? product.images : product?.image_url ? [product.image_url] : []
  );
  const [rows, setRows] = useState<Row[]>((product?.variations ?? []).map(toRow));
  const [busy, setBusy] = useState(false);

  const original = useMemo(() => new Map((product?.variations ?? []).map(v => [v.id, toRow(v)])), [product]);

  const setRow = (index: number, patch: Partial<Row>) =>
    setRows(list => list.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled) return;

    setBusy(true);
    try {
      const { urls } = await backoffice.uploadProductImages(
        result.assets.map((asset, index) => ({
          uri: asset.uri,
          name: asset.fileName ?? `photo-${Date.now()}-${index}.jpg`,
          type: asset.mimeType ?? 'image/jpeg',
        }))
      );
      setImages(list => [...list, ...urls]);
    } catch (error) {
      Alert.alert('نەتوانرا وێنە بنێردرێت', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const priceValue = Number(price);
    if (!name.trim()) return Alert.alert('ناو', 'ناوی بەرهەمەکە بنووسە.');
    if (!Number.isFinite(priceValue) || priceValue <= 0) return Alert.alert('نرخ', 'نرخێکی دروست بنووسە.');
    if (!categoryId) return Alert.alert('بەش', 'بەشی بەرهەمەکە هەڵبژێرە.');
    if (discount && Number(discount) > priceValue) {
      return Alert.alert('داشکاندن', 'نرخی داشکاندن نابێت لە نرخی ئاسایی زیاتر بێت.');
    }

    const body = {
      name: name.trim(),
      name_ku: nameKu.trim() || null,
      name_ar: nameAr.trim() || null,
      description: description.trim() || null,
      description_ku: descriptionKu.trim() || null,
      description_ar: descriptionAr.trim() || null,
      price: priceValue,
      discount_price: discount ? Number(discount) : null,
      cost: cost ? Number(cost) : 0,
      category_id: Number(categoryId),
      gender: Number(gender),
      is_active: active,
      barcode: barcode.trim() || null,
      sku: barcode.trim() || null,
      image_url: images[0] ?? null,
      images,
    } as unknown as Partial<Product>;

    setBusy(true);
    try {
      if (!product) {
        // A new product carries its variations in the one request.
        await backoffice.saveProduct({
          ...body,
          variations: rows.map(row => ({
            color: row.color.trim() || 'Default',
            size: row.size.trim() || 'One Size',
            stock_quantity: Number(row.stock) || 0,
            barcode: row.barcode.trim() || newBarcode(),
            sku: row.barcode.trim() || newBarcode(),
          })),
        } as unknown as Partial<Product>);
      } else {
        await backoffice.saveProduct(body, product.id);

        // Each variation on its own: only what changed, so the rest keep their
        // ids, their stock history and their place on past orders.
        const kept = new Set(rows.filter(r => r.id).map(r => r.id));
        for (const id of original.keys()) {
          if (!kept.has(id)) await backoffice.deleteVariation(id);
        }

        for (const row of rows) {
          const payload = {
            color: row.color.trim() || 'Default',
            size: row.size.trim() || 'One Size',
            stock_quantity: Number(row.stock) || 0,
            sku: row.barcode.trim() || newBarcode(),
          };

          if (row.id) {
            const before = original.get(row.id)!;
            const changed =
              before.color !== row.color || before.size !== row.size || before.stock !== row.stock || before.barcode !== row.barcode;
            if (changed) await inventory.updateVariation(row.id, { ...payload, barcode: payload.sku } as Partial<ProductVariation>);
          } else {
            await backoffice.createVariation({ product_id: product.id, ...payload });
          }
        }
      }

      onSaved();
      onClose();
    } catch (error) {
      Alert.alert('نەتوانرا پاشەکەوت بکرێت', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = () =>
    product &&
    Alert.alert('سڕینەوەی بەرهەم', `«${product.name_ku || product.name}» دەسڕدرێتەوە. دڵنیایت؟`, [
      { text: 'نەخێر', style: 'cancel' },
      {
        text: 'بیسڕەوە',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await backoffice.deleteProduct(product.id);
            onSaved();
            onClose();
          } catch (error) {
            Alert.alert('نەتوانرا بسڕدرێتەوە', (error as Error).message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  return (
    <Shell title={product ? 'دەستکاریکردنی بەرهەم' : 'بەرهەمی نوێ'} onClose={onClose}>
      <Section title="وێنە">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.photos}>
          {images.map((url, index) => (
            <View key={url + index} style={styles.photo}>
              <Image source={{ uri: url }} style={styles.photoImg} contentFit="cover" />
              <Pressable style={styles.photoX} onPress={() => setImages(list => list.filter((_, i) => i !== index))}>
                <Text style={styles.photoXText}>✕</Text>
              </Pressable>
              {index === 0 && <Text style={styles.photoMain}>سەرەکی</Text>}
            </View>
          ))}
          <Pressable style={[styles.photo, styles.photoAdd]} onPress={pickPhotos} disabled={busy}>
            <Text style={styles.photoPlus}>＋</Text>
          </Pressable>
        </ScrollView>
      </Section>

      <Section title="ناو">
        <Field value={name} onChange={setName} placeholder="ناو (ئینگلیزی) *" />
        <Field value={nameKu} onChange={setNameKu} placeholder="ناو (کوردی)" />
        <Field value={nameAr} onChange={setNameAr} placeholder="ناو (عەرەبی)" />
      </Section>

      <Section title="وەسف">
        <Field value={descriptionKu} onChange={setDescriptionKu} placeholder="وەسف (کوردی)" multiline />
        <Field value={descriptionAr} onChange={setDescriptionAr} placeholder="وەسف (عەرەبی)" multiline />
        <Field value={description} onChange={setDescription} placeholder="وەسف (ئینگلیزی)" multiline />
      </Section>

      <Section title="بەش و ڕەگەز">
        <Chips
          value={categoryId}
          onChange={setCategoryId}
          options={categories.map(c => ({ id: String(c.id), label: c.name_ku || c.name }))}
        />
        <Chips value={gender} onChange={setGender} options={GENDERS} />
      </Section>

      <Section title="نرخ">
        <View style={styles.pair}>
          <Field value={price} onChange={setPrice} placeholder="نرخ *" numeric half />
          <Field value={discount} onChange={setDiscount} placeholder="نرخی داشکاندن" numeric half />
        </View>
        <Field value={cost} onChange={setCost} placeholder="تێچوو (کڕین)" numeric />
        <Field value={barcode} onChange={setBarcode} placeholder="بارکۆد / SKU" />
        <View style={styles.switchRow}>
          <Switch value={active} onValueChange={setActive} />
          <Text style={styles.label}>لە وێبسایت پیشان بدرێت</Text>
        </View>
      </Section>

      <Section title="ڕەنگ و قەبارە">
        {rows.map((row, index) => (
          <View key={row.id ?? `n${index}`} style={styles.variation}>
            <View style={styles.pair}>
              <Field value={row.color} onChange={v => setRow(index, { color: v })} placeholder="ڕەنگ" half />
              <Field value={row.size} onChange={v => setRow(index, { size: v })} placeholder="قەبارە" half />
            </View>
            <View style={styles.pair}>
              <Field value={row.stock} onChange={v => setRow(index, { stock: v })} placeholder="ستۆک" numeric half />
              <Field value={row.barcode} onChange={v => setRow(index, { barcode: v })} placeholder="بارکۆد (خۆکار)" half />
            </View>
            <Pressable onPress={() => setRows(list => list.filter((_, i) => i !== index))}>
              <Text style={styles.remove}>سڕینەوەی ئەم جۆرە</Text>
            </Pressable>
          </View>
        ))}
        <Button
          label="زیادکردنی جۆر"
          tone="quiet"
          onPress={() => setRows(list => [...list, { color: '', size: '', stock: '0', barcode: '' }])}
        />
      </Section>

      <View style={styles.actions}>
        {product && canDelete && <Button label="سڕینەوە" tone="danger" onPress={remove} disabled={busy} />}
        <Button label={busy ? 'پاشەکەوت دەکرێت…' : 'پاشەکەوتکردن'} onPress={save} disabled={busy} />
      </View>
    </Shell>
  );
}

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
            <Text style={styles.title}>{title}</Text>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({
  value,
  onChange,
  placeholder,
  numeric,
  multiline,
  half,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  numeric?: boolean;
  multiline?: boolean;
  half?: boolean;
}) {
  return (
    <TextInput
      style={[styles.input, multiline && styles.multiline, half && styles.half]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      keyboardType={numeric ? 'number-pad' : 'default'}
      multiline={multiline}
      textAlign="right"
    />
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '94%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...typography.title, color: colors.text },
  close: { fontSize: 20, color: colors.textMuted },
  body: { padding: spacing.lg, gap: spacing.md },
  hint: { ...typography.small, color: colors.textMuted, textAlign: 'right' },

  section: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  sectionTitle: { ...typography.eyebrow, color: colors.textMuted, textAlign: 'right' },
  pair: { flexDirection: 'row-reverse', gap: spacing.sm },
  half: { flex: 1, flexBasis: 0, minWidth: 0 },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.small,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 70, paddingTop: spacing.sm, textAlignVertical: 'top' },
  label: { ...typography.small, color: colors.text },
  switchRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.md },

  photos: { flexDirection: 'row-reverse', gap: spacing.sm },
  photo: { width: 84, height: 84, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.border },
  photoImg: { width: '100%', height: '100%' },
  photoX: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(15,23,42,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoXText: { color: '#fff', fontSize: 11 },
  photoMain: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    textAlign: 'center',
    backgroundColor: 'rgba(79,70,229,0.85)',
    color: '#fff',
    ...typography.tiny,
  },
  photoAdd: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  photoPlus: { fontSize: 26, color: colors.textMuted },

  variation: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  remove: { ...typography.tiny, color: colors.danger, textAlign: 'right' },
  actions: { flexDirection: 'row-reverse', gap: spacing.sm, flexWrap: 'wrap' },
});
