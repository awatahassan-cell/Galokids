import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  Alert,
  LOOK_SLOTS,
  backoffice,
  catalogue,
  lookToInput,
  looks as looksApi,
  type Look,
  type LookInput,
  type LookSlot,
  type Product,
} from '@galokids/core';
import { Button, Chips, Empty, Loading, NeedsConnection, Problem, Screen, SearchField } from '@/components/kit';
import { Field, Group, Labeled, Sheet, sheetStyles } from '@/components/Sheet';
import { Select } from '@/components/Select';
import { Pill, Table, Titled, type Column } from '@/components/Table';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Looks: the outfits shown on the website and in the shop app.
 *
 * A look is a model picture plus the real products worn in it. The picture is
 * tapped to put each numbered dot where its garment is, so the shopper's
 * numbers line up with the pieces listed beside it.
 */

const SLOT_LABEL: Record<LookSlot, string> = {
  top: 'سەرەوە', bottom: 'خوارەوە', shoes: 'پێڵاو', hat: 'کڵاو', other: 'تر',
};

const ACCENTS = ['#141518', '#ec4899', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4'];

const GENDER_LABEL = { 0: 'هەمووی', 1: 'کوڕان', 2: 'کچان' } as const;

const blank = (): LookInput => ({
  title: '', title_ku: '', title_ar: '', subtitle: '', subtitle_ku: '', subtitle_ar: '',
  gender: 0, age_range: '', accent_color: '#141518', image_url: '', is_active: true, items: [],
});

export default function LooksScreen() {
  const [editing, setEditing] = useState<{ id?: number; input: LookInput } | null>(null);
  const list = useFetch<Look[]>(() => looksApi.list(true), []);
  const offline = useNeedsConnection(list.error);

  const rows = list.data ?? [];

  const move = async (index: number, delta: number) => {
    const next = [...rows];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    list.setData(next);
    try {
      await looksApi.reorder(next.map(look => look.id));
    } catch (error) {
      Alert.alert('نەتوانرا ڕیز بکرێت', (error as Error).message);
      list.reload();
    }
  };

  const columns: Column<Look>[] = [
    {
      title: 'ستایل',
      width: 2.4,
      primary: true,
      render: look => (
        <View style={styles.cellRow}>
          <View style={[styles.thumb, { backgroundColor: `${look.accent_color}22` }]}>
            <Image source={{ uri: look.image_url }} style={StyleSheet.absoluteFill} contentFit="contain" />
          </View>
          <Titled title={look.title_ku || look.title} sub={look.title} />
        </View>
      ),
    },
    { title: 'بۆ', width: 0.9, render: look => GENDER_LABEL[look.gender] + (look.age_range ? ` · ${look.age_range}` : '') },
    { title: 'پارچە', width: 0.7, align: 'center', render: look => <Pill label={String(look.items.length)} tone="info" /> },
    {
      title: 'دۆخ',
      width: 0.9,
      align: 'center',
      render: look => <Pill label={look.is_active ? 'چالاک' : 'شاراوە'} tone={look.is_active ? 'good' : 'warn'} />,
    },
    {
      title: 'ڕیز',
      width: 0.9,
      align: 'center',
      render: look => {
        const index = rows.findIndex(row => row.id === look.id);
        return (
          <View style={styles.arrows}>
            <Pressable onPress={() => move(index, -1)} disabled={index === 0} hitSlop={8} accessibilityLabel="سەرەوە">
              <Text style={[styles.arrow, index === 0 && styles.arrowOff]}>▲</Text>
            </Pressable>
            <Pressable onPress={() => move(index, 1)} disabled={index === rows.length - 1} hitSlop={8} accessibilityLabel="خوارەوە">
              <Text style={[styles.arrow, index === rows.length - 1 && styles.arrowOff]}>▼</Text>
            </Pressable>
          </View>
        );
      },
    },
  ];

  return (
    <Screen
      title="ستایلەکان"
      subtitle="جلی تەواو لەسەر مۆدێل — لە ماڵپەڕ و ئەپی کڕیار دەردەکەون"
      scroll={false}
      actions={<Button tone="ink" label="ستایلی نوێ" onPress={() => setEditing({ input: blank() })} />}
    >
      {offline ? (
        <NeedsConnection what="ستایلەکان" />
      ) : list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <Problem error={list.error} onRetry={list.reload} />
      ) : rows.length === 0 ? (
        <Empty title="هێشتا ستایلێک نییە" body="«ستایلی نوێ» بکە بۆ دروستکردنی یەکەم ستایل" />
      ) : (
        <Table
          rows={rows}
          keyFor={look => String(look.id)}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          onPress={look => setEditing({ id: look.id, input: lookToInput(look) })}
          columns={columns}
        />
      )}

      {editing && (
        <LookEditor
          id={editing.id}
          initial={editing.input}
          known={rows.flatMap(look => look.items.map(item => item.product))}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); list.refresh(); }}
        />
      )}
    </Screen>
  );
}

function LookEditor({
  id,
  initial,
  known,
  onClose,
  onSaved,
}: {
  id?: number;
  initial: LookInput;
  known: Product[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<LookInput>(initial);
  const [busy, setBusy] = useState(false);
  const [placer, setPlacer] = useState(false);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [products, setProducts] = useState<Record<number, Product>>(
    () => Object.fromEntries(known.map(product => [product.id, product]))
  );

  const set = <K extends keyof LookInput>(key: K, value: LookInput[K]) => setDraft(d => ({ ...d, [key]: value }));

  const search = async (text: string) => {
    setTerm(text);
    if (text.trim().length < 2) return setResults([]);
    try {
      const page = await catalogue.products({ search: text.trim(), limit: 8 });
      setResults(page.data);
      setProducts(prev => ({ ...prev, ...Object.fromEntries(page.data.map(product => [product.id, product])) }));
    } catch {
      setResults([]);
    }
  };

  const pickPicture = async () => {
    // Full quality: a model cut-out is a PNG, and recompressing it as a JPEG
    // paints its transparent background black.
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled) return;

    const asset = result.assets[0]!;
    setBusy(true);
    try {
      const { urls } = await backoffice.uploadProductImages([
        { uri: asset.uri, name: asset.fileName ?? `look-${Date.now()}.png`, type: asset.mimeType ?? 'image/png' },
      ]);
      if (!urls[0]) throw new Error('وێنەکە نەنێردرا');
      set('image_url', urls[0]);
    } catch (error) {
      Alert.alert('نەتوانرا وێنە بنێردرێت', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addPiece = (product: Product) => {
    if (draft.items.some(item => item.product_id === product.id)) return;
    if (draft.items.length >= 12) return Alert.alert('زۆرە', 'ستایلێک زیاتر لە ١٢ پارچە ناگرێت.');

    setDraft(d => ({
      ...d,
      // Start inside the picture so the dot is visible; the admin taps it into place.
      items: [...d.items, { product_id: product.id, slot: 'top', hotspot_x: 50, hotspot_y: 30 + d.items.length * 12 }],
    }));
    setTerm('');
    setResults([]);
  };

  const patchItem = (index: number, patch: Partial<LookInput['items'][number]>) =>
    setDraft(d => ({ ...d, items: d.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) }));

  const save = async () => {
    if (!draft.title.trim()) return Alert.alert('ناونیشان', 'ناونیشانێک بنووسە.');
    if (!draft.image_url) return Alert.alert('وێنە', 'وێنەی مۆدێلەکە بار بکە.');
    if (!draft.items.length) return Alert.alert('پارچە', 'لانی کەم یەک پارچە زیاد بکە.');

    setBusy(true);
    try {
      const body: LookInput = {
        ...draft,
        title: draft.title.trim(),
        title_ku: draft.title_ku?.trim() || null,
        title_ar: draft.title_ar?.trim() || null,
        subtitle: draft.subtitle?.trim() || null,
        subtitle_ku: draft.subtitle_ku?.trim() || null,
        subtitle_ar: draft.subtitle_ar?.trim() || null,
        age_range: draft.age_range?.trim() || null,
      };
      if (id) await looksApi.update(id, body);
      else await looksApi.create(body);
      onSaved();
    } catch (error) {
      Alert.alert('نەتوانرا پاشەکەوت بکرێت', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = () =>
    id &&
    Alert.alert('سڕینەوەی ستایل', `«${draft.title}» دەسڕدرێتەوە. دڵنیایت؟`, [
      { text: 'نەخێر', style: 'cancel' },
      {
        text: 'بیسڕەوە',
        style: 'destructive',
        onPress: async () => {
          try {
            await looksApi.remove(id);
            onSaved();
          } catch (error) {
            Alert.alert('نەتوانرا بسڕدرێتەوە', (error as Error).message);
          }
        },
      },
    ]);

  return (
    <Sheet title={id ? 'دەستکاریکردنی ستایل' : 'ستایلی نوێ'} onClose={onClose} maxWidth={720}>
      <Group title="وێنەی مۆدێل">
        <View style={[styles.stage, { backgroundColor: `${draft.accent_color}1f` }]}>
          {draft.image_url ? (
            <Image source={{ uri: draft.image_url }} style={StyleSheet.absoluteFill} contentFit="contain" pointerEvents="none" />
          ) : (
            <Text style={styles.stageEmpty}>هیچ وێنەیەک نییە</Text>
          )}

          {draft.items.map((item, index) => (
            <View key={item.product_id} pointerEvents="none"
                  style={[styles.dot, { left: `${item.hotspot_x}%`, top: `${item.hotspot_y}%` }]}>
              <Text style={styles.dotText}>{index + 1}</Text>
            </View>
          ))}
        </View>

        <Button tone="quiet" label={busy ? '…' : draft.image_url ? 'گۆڕینی وێنە' : 'بارکردنی وێنە'} onPress={pickPicture} disabled={busy} />
        <Button tone="ink" label="دانانی خاڵەکان لەسەر وێنە" onPress={() => setPlacer(true)}
                disabled={!draft.image_url || draft.items.length === 0} />
        <Text style={sheetStyles.hint}>
          باشترین: PNG ـی بێ پاشخان و مۆدێلی تەواو. دوای زیادکردنی پارچەکان، «دانانی خاڵەکان» بکە و لەسەر وێنەکە پەنجە بنێ بۆ ئەوەی هەر ژمارەیەک لەسەر جلەکەی دابنرێت.
        </Text>
      </Group>

      <Group title="ناونیشان">
        <Labeled label="ناو (ئینگلیزی)" required><Field value={draft.title} onChange={v => set('title', v)} placeholder="Spring Garden" /></Labeled>
        <Labeled label="ناو (کوردی)"><Field value={draft.title_ku ?? ''} onChange={v => set('title_ku', v)} placeholder="باخچەی بەهار" /></Labeled>
        <Labeled label="ناو (عەرەبی)"><Field value={draft.title_ar ?? ''} onChange={v => set('title_ar', v)} placeholder="حديقة الربيع" /></Labeled>
        <Labeled label="ژێرناونیشان (کوردی)"><Field value={draft.subtitle_ku ?? ''} onChange={v => set('subtitle_ku', v)} placeholder="کراسێکی سووک بۆ ڕۆژە خۆرەکان" /></Labeled>
        <Labeled label="ژێرناونیشان (ئینگلیزی)"><Field value={draft.subtitle ?? ''} onChange={v => set('subtitle', v)} placeholder="A light dress for sunny days" /></Labeled>
        <Labeled label="ژێرناونیشان (عەرەبی)"><Field value={draft.subtitle_ar ?? ''} onChange={v => set('subtitle_ar', v)} placeholder="فستان خفيف" /></Labeled>
      </Group>

      <Group title="وردەکاری">
        <View style={sheetStyles.pair}>
          <Labeled label="بۆ" half>
            <Select
              value={String(draft.gender) as '0' | '1' | '2'}
              options={[{ id: '0', label: 'هەمووی' }, { id: '1', label: 'کوڕان' }, { id: '2', label: 'کچان' }]}
              onChange={v => set('gender', Number(v) as 0 | 1 | 2)}
            />
          </Labeled>
          <Labeled label="تەمەن" half><Field value={draft.age_range ?? ''} onChange={v => set('age_range', v)} placeholder="4-7" /></Labeled>
        </View>

        <Labeled label="ڕەنگی پاشخان">
          <View style={styles.swatches}>
            {ACCENTS.map(color => (
              <Pressable key={color} onPress={() => set('accent_color', color)}
                         style={[styles.swatchRing, draft.accent_color === color && styles.swatchRingOn]}>
                <View style={[styles.swatch, { backgroundColor: color }]} />
              </Pressable>
            ))}
          </View>
        </Labeled>

        <Labeled label="دۆخ">
          <Chips
            options={[{ id: 'on', label: 'چالاک' }, { id: 'off', label: 'شاراوە' }]}
            value={draft.is_active ? 'on' : 'off'}
            onChange={v => set('is_active', v === 'on')}
          />
        </Labeled>
      </Group>

      <Group title={`پارچەکان (${draft.items.length}/12)`}>
        <SearchField value={term} onChange={search} placeholder="گەڕان بە ناوی بەرهەم بۆ زیادکردن…" />

        {results.map(product => (
          <Pressable key={product.id} style={styles.result} onPress={() => addPiece(product)}
                     disabled={draft.items.some(item => item.product_id === product.id)}>
            {product.image_url ? <Image source={{ uri: product.image_url }} style={styles.resultImg} contentFit="cover" /> : <View style={styles.resultImg} />}
            <Text style={styles.resultName} numberOfLines={1}>{product.name_ku || product.name}</Text>
            <Text style={styles.resultAdd}>＋</Text>
          </Pressable>
        ))}

        {draft.items.map((item, index) => {
          const product = products[item.product_id];
          return (
            <View key={item.product_id} style={styles.piece}>
              <View style={styles.pieceNo}><Text style={styles.pieceNoText}>{index + 1}</Text></View>
              {product?.image_url ? <Image source={{ uri: product.image_url }} style={styles.resultImg} contentFit="cover" /> : <View style={styles.resultImg} />}
              <View style={styles.pieceBody}>
                <Text style={styles.resultName} numberOfLines={1}>{product ? product.name_ku || product.name : `#${item.product_id}`}</Text>
                <Select
                  value={item.slot}
                  options={LOOK_SLOTS.map(slot => ({ id: slot, label: SLOT_LABEL[slot] }))}
                  onChange={slot => patchItem(index, { slot })}
                />
              </View>
              <View style={styles.pieceActions}>
                <Pressable onPress={() => { setDraft(d => ({ ...d, items: d.items.filter((_, i) => i !== index) })); }}
                           hitSlop={6} style={styles.iconBtn} accessibilityLabel="لابردن">
                  <Text style={[styles.iconText, { color: colors.danger }]}>✕</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </Group>

      <View style={sheetStyles.actions}>
        <Button label={busy ? 'پاشەکەوت…' : 'پاشەکەوتکردن'} onPress={save} disabled={busy} />
        <Button label="داخستن" tone="quiet" onPress={onClose} />
        {id ? <Button label="سڕینەوە" tone="danger" onPress={remove} /> : null}
      </View>

      {placer && (
        <DotPlacer
          image={draft.image_url}
          accent={draft.accent_color}
          items={draft.items}
          names={draft.items.map(item => {
            const product = products[item.product_id];
            return product ? product.name_ku || product.name : `#${item.product_id}`;
          })}
          onMove={(index, x, y) => patchItem(index, { hotspot_x: x, hotspot_y: y })}
          onClose={() => setPlacer(false)}
        />
      )}
    </Sheet>
  );
}

/**
 * Full-screen dot placement.
 *
 * Its own view, not part of the form: with the picture in a scrolling sheet,
 * choosing a piece scrolled the picture out of sight, so the dot was being
 * placed blind. Here the picture stays put, the pieces are chips under it, and
 * a tap puts the chosen one where the finger is.
 */
function DotPlacer({
  image,
  accent,
  items,
  names,
  onMove,
  onClose,
}: {
  image: string;
  accent: string;
  items: LookInput['items'];
  names: string[];
  onMove: (index: number, x: number, y: number) => void;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const [selected, setSelected] = useState(0);
  const [box, setBox] = useState({ w: 1, h: 1 });

  // As large as fits above the chips, keeping the picture's 3:4 shape.
  const stageWidth = Math.min(width - spacing.lg * 2, (height - 230) * 0.75, 520);

  const stageRef = useRef<View>(null);

  const place = (x: number, y: number, w: number, h: number) => {
    if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return;
    const px = Math.min(100, Math.max(0, (x / w) * 100));
    const py = Math.min(100, Math.max(0, (y / h) * 100));
    onMove(selected, Math.round(px * 10) / 10, Math.round(py * 10) / 10);
  };

  // A phone reports where inside the picture the finger landed. A browser's
  // click does not — it only knows where on the page — so there the position
  // is the page point minus where the picture sits.
  const tap = (event: { nativeEvent: { locationX?: number; locationY?: number; pageX?: number; pageY?: number } }) => {
    const { locationX, locationY, pageX, pageY } = event.nativeEvent;

    if (Number.isFinite(locationX) && Number.isFinite(locationY)) {
      place(locationX!, locationY!, box.w, box.h);
    } else {
      stageRef.current?.measureInWindow((x, y, w, h) => place((pageX ?? NaN) - x, (pageY ?? NaN) - y, w, h));
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.placer}>
        <View style={styles.placerHead}>
          <Button label="تەواو" onPress={onClose} />
          <Text style={styles.placerTitle}>دانانی خاڵەکان</Text>
        </View>

        <Text style={sheetStyles.hint}>پارچەیەک هەڵبژێرە، پاشان پەنجە بنێ لەو شوێنەی جلەکەی لەسەر مۆدێلەکەیە.</Text>

        <Pressable
          ref={stageRef}
          onPress={tap}
          onLayout={(event: LayoutChangeEvent) =>
            setBox({ w: event.nativeEvent.layout.width || 1, h: event.nativeEvent.layout.height || 1 })
          }
          style={[styles.stage, styles.stagePlacing, { width: stageWidth, maxWidth: stageWidth, backgroundColor: `${accent}1f` }]}
        >
          <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="contain" pointerEvents="none" />
          {items.map((item, index) => (
            <View key={item.product_id} pointerEvents="none"
                  style={[styles.dot, selected === index && styles.dotOn, { left: `${item.hotspot_x}%`, top: `${item.hotspot_y}%` }]}>
              <Text style={[styles.dotText, selected === index && styles.dotTextOn]}>{index + 1}</Text>
            </View>
          ))}
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipStrip} contentContainerStyle={styles.chipRow}>
          {items.map((item, index) => (
            <Pressable key={item.product_id} onPress={() => setSelected(index)}
                       style={[styles.pieceChip, selected === index && styles.pieceChipOn]}>
              <View style={[styles.pieceNo, selected !== index && styles.pieceNoIdle]}>
                <Text style={styles.pieceNoText}>{index + 1}</Text>
              </View>
              <Text style={[styles.pieceChipText, selected === index && styles.pieceChipTextOn]} numberOfLines={1}>{names[index]}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cellRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  thumb: { width: 38, height: 50, borderRadius: 8, overflow: 'hidden' },
  arrows: { flexDirection: 'row', gap: spacing.md },
  arrow: { fontSize: 14, color: colors.textMuted },
  arrowOff: { opacity: 0.25 },

  stage: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 300,
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stagePlacing: { borderColor: colors.ink, borderWidth: 2 },
  stageEmpty: { ...typography.small, color: colors.textFaint },
  dot: {
    position: 'absolute', width: 28, height: 28, marginLeft: -14, marginTop: -14, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  dotOn: { backgroundColor: colors.ink },
  dotText: { fontSize: 12, fontWeight: '700', color: colors.ink, lineHeight: 18 },
  dotTextOn: { color: '#fff' },

  swatches: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm },
  swatchRing: { padding: 3, borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
  swatchRingOn: { borderColor: colors.ink },
  swatch: { width: 26, height: 26, borderRadius: 13 },

  result: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, padding: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  resultImg: { width: 40, height: 40, borderRadius: 8, backgroundColor: colors.borderSoft },
  resultName: { ...typography.small, color: colors.text, flex: 1, textAlign: 'right' },
  resultAdd: { fontSize: 18, color: colors.brand },

  piece: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, padding: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  pieceOn: { borderColor: colors.ink },
  pieceNo: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  pieceNoText: { color: '#fff', fontSize: 11, fontWeight: '700', lineHeight: 16 },
  pieceBody: { flex: 1, gap: 4 },
  pieceActions: { gap: spacing.xs },
  iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.borderSoft },
  iconBtnOn: { backgroundColor: colors.ink },
  iconText: { fontSize: 16, color: colors.textMuted },
  iconTextOn: { color: '#fff' },

  placer: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md },
  placerHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  placerTitle: { ...typography.title, color: colors.text },
  chipStrip: { flexGrow: 0, flexShrink: 0 },
  chipRow: { flexDirection: 'row-reverse', gap: spacing.sm, paddingVertical: spacing.xs },
  pieceChip: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, height: 44,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, maxWidth: 220,
  },
  pieceChipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  pieceChipText: { ...typography.small, color: colors.text },
  pieceChipTextOn: { color: '#fff' },
  pieceNoIdle: { backgroundColor: colors.textFaint },
});
