import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { TextInput } from '@/components/TextInput';
import { Alert, shop } from '@galokids/core';
import { Button, Loading, NeedsConnection, Problem, Screen } from '@/components/kit';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { colors, radius, shadow, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * The banner at the top of the shop.
 *
 * One editor, two places: the slides saved here are what the website's hero
 * shows and what the customer app shows, because both read `hero_slides` from
 * the same settings. That is the point of editing it here rather than in two
 * panels that drift.
 *
 * Nothing is saved until the shopkeeper says so. A banner is the first thing
 * every customer sees, and a half-typed headline going live the moment
 * somebody's thumb slipped is not a risk worth taking for the convenience of
 * not pressing a button.
 */

interface Slide {
  id: string;
  badgeKu: string;
  titleKu: string;
  subtitleKu: string;
  cta1Ku: string;
  link: string;
  image: string;
  discountTag: string;
}

const BLANK: Omit<Slide, 'id'> = {
  badgeKu: '',
  titleKu: '',
  subtitleKu: '',
  cta1Ku: '',
  link: '/products',
  image: '',
  discountTag: '',
};

export default function BannerScreen() {
  const loaded = useFetch<Record<string, unknown>>(() => shop.settings(), []);
  const offline = useNeedsConnection(loaded.error);

  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (loaded.data && slides === null) setSlides(parse(loaded.data.hero_slides));
  }, [loaded.data, slides]);

  const edit = (index: number, field: keyof Omit<Slide, 'id'>, value: string) => {
    setSlides(current =>
      (current ?? []).map((slide, at) => (at === index ? { ...slide, [field]: value } : slide))
    );
    setDirty(true);
  };

  const add = () => {
    setSlides(current => [
      ...(current ?? []),
      { ...BLANK, id: `slide-${Date.now().toString(36)}` },
    ]);
    setDirty(true);
  };

  const remove = (index: number) => {
    setSlides(current => (current ?? []).filter((_, at) => at !== index));
    setDirty(true);
  };

  const move = (index: number, by: number) => {
    setSlides(current => {
      const list = [...(current ?? [])];
      const to = index + by;
      if (to < 0 || to >= list.length) return list;

      [list[index], list[to]] = [list[to]!, list[index]!];

      return list;
    });
    setDirty(true);
  };

  const save = async () => {
    if (saving || !slides) return;

    // A slide with no headline shows an empty card to every customer, which
    // is worse than one fewer slide.
    const usable = slides.filter(slide => slide.titleKu.trim() || slide.image.trim());

    setSaving(true);

    try {
      await shop.updateSettings({ hero_slides: usable });

      setSlides(usable);
      setDirty(false);
      Alert.alert('پاشەکەوت کرا', 'بانەرەکە لە وێبسایت و ئەپەکەدا نوێ بووەوە.');
    } catch (error) {
      Alert.alert('نەتوانرا پاشەکەوت بکرێت', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loaded.loading) {
    return (
      <Screen title="بانەری سەرەکی" subtitle="ڕیکلامی سەرەوەی ئەپ و وێبسایت">
        <Loading />
      </Screen>
    );
  }

  if (offline) {
    return (
      <Screen title="بانەری سەرەکی" subtitle="ڕیکلامی سەرەوەی ئەپ و وێبسایت">
        <NeedsConnection what="بانەرەکە" />
      </Screen>
    );
  }

  if (loaded.error) {
    return (
      <Screen title="بانەری سەرەکی" subtitle="ڕیکلامی سەرەوەی ئەپ و وێبسایت">
        <Problem error={loaded.error} onRetry={loaded.reload} />
      </Screen>
    );
  }

  const list = slides ?? [];

  return (
    <Screen
      title="بانەری سەرەکی"
      subtitle={`${list.length} ڕیکلام · لە وێبسایت و ئەپەکەدا`}
      actions={
        dirty ? (
          <Button label={saving ? 'پاشەکەوت…' : 'پاشەکەوتکردن'} onPress={save} disabled={saving} />
        ) : undefined
      }
    >
      <Text style={styles.lead}>
        ئەمانە لە سەرەوەی فرۆشگا دەردەکەون — هەم لە وێبسایت و هەم لە ئەپی کڕیار. ئەگەر هیچ
        ڕیکلامێک نەبێت، هیچ بانەرێک پیشان نادرێت.
      </Text>

      {list.map((slide, index) => (
        <View key={slide.id} style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.cardTools}>
              <Tool label="↑" onPress={() => move(index, -1)} disabled={index === 0} />
              <Tool label="↓" onPress={() => move(index, 1)} disabled={index === list.length - 1} />
              <Tool label="✕" onPress={() => remove(index)} danger />
            </View>

            <Text style={styles.cardTitle}>ڕیکلامی {index + 1}</Text>
          </View>

          {slide.image.trim() ? (
            <Image source={{ uri: slide.image }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={[styles.preview, styles.previewEmpty]}>
              <Text style={styles.previewText}>وێنە نییە</Text>
            </View>
          )}

          <Field
            label="بەستەری وێنە"
            value={slide.image}
            onChange={text => edit(index, 'image', text)}
            placeholder="https://…"
          />
          <Field
            label="ناونیشانی بچووک"
            value={slide.badgeKu}
            onChange={text => edit(index, 'badgeKu', text)}
            placeholder="نوێترین مۆدێلەکانی وەرز"
          />
          <Field
            label="ناونیشانی سەرەکی"
            value={slide.titleKu}
            onChange={text => edit(index, 'titleKu', text)}
            placeholder="پۆشاکی جوان بۆ منداڵەکانتان"
          />
          <Field
            label="ڕوونکردنەوە"
            value={slide.subtitleKu}
            onChange={text => edit(index, 'subtitleKu', text)}
            multiline
          />
          <Field
            label="نووسینی دوگمە"
            value={slide.cta1Ku}
            onChange={text => edit(index, 'cta1Ku', text)}
            placeholder="بڕۆ بۆ فرۆشگا"
          />
          <Field
            label="نیشانەی داشکاندن"
            value={slide.discountTag}
            onChange={text => edit(index, 'discountTag', text)}
            placeholder="25% OFF"
          />
        </View>
      ))}

      <Pressable style={styles.add} onPress={add}>
        <Text style={styles.addText}>+ زیادکردنی ڕیکلام</Text>
      </Pressable>

      {dirty && (
        <View style={styles.unsaved}>
          <Text style={styles.unsavedText}>
            گۆڕانکارییەکان هێشتا پاشەکەوت نەکراون. تا کلیکی «پاشەکەوتکردن» نەکەیت، کڕیارەکان
            بانەری کۆن دەبینن.
          </Text>
        </View>
      )}

      <View style={styles.saveRow}>
        <Button
          label={saving ? 'پاشەکەوت…' : 'پاشەکەوتکردن'}
          onPress={save}
          disabled={saving || !dirty}
        />
      </View>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputTall]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        multiline={multiline}
        textAlign="right"
      />
    </View>
  );
}

function Tool({
  label,
  onPress,
  disabled,
  danger,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={[styles.tool, disabled && styles.toolOff, danger && styles.toolDanger]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.toolText, danger && styles.toolTextDanger]}>{label}</Text>
    </Pressable>
  );
}

/**
 * The saved slides, whatever shape they arrive in.
 *
 * Stored as JSON in a text column and handed back either parsed or as a
 * string depending on how it was written, so both are accepted. Anything
 * unreadable is treated as no slides rather than throwing: a corrupt setting
 * should cost the shop its banner, not its back office.
 */
function parse(raw: unknown): Slide[] {
  if (!raw) return [];

  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(value)) return [];

    return value.map((entry: Record<string, unknown>, index: number) => ({
      id: String(entry.id ?? `slide-${index}`),
      badgeKu: String(entry.badgeKu ?? entry.badgeEn ?? ''),
      titleKu: String(entry.titleKu ?? entry.titleEn ?? ''),
      subtitleKu: String(entry.subtitleKu ?? entry.subtitleEn ?? ''),
      cta1Ku: String(entry.cta1Ku ?? entry.ctaKu ?? entry.cta1En ?? ''),
      link: String(entry.link ?? entry.btn1Link ?? '/products'),
      image: String(entry.image ?? entry.imageUrl ?? ''),
      discountTag: String(entry.discountTag ?? ''),
    }));
  } catch {
    return [];
  }
}

const styles = StyleSheet.create({
  lead: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  cardHead: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { ...typography.heading, color: colors.text },
  cardTools: { flexDirection: 'row-reverse', gap: spacing.xs },
  tool: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolOff: { opacity: 0.35 },
  toolDanger: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft },
  toolText: { ...typography.small, color: colors.text },
  toolTextDanger: { color: colors.danger },

  preview: {
    width: '100%',
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  previewEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  previewText: { ...typography.tiny, color: colors.textFaint },

  field: { gap: 2 },
  fieldLabel: { ...typography.tiny, color: colors.textMuted, textAlign: 'right' },
  input: {
    minHeight: TOUCH_TARGET - 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  inputTall: { minHeight: 76, paddingTop: spacing.sm, textAlignVertical: 'top' },

  add: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { ...typography.small, color: colors.brand },

  unsaved: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  unsavedText: { ...typography.small, color: colors.warning, textAlign: 'right' },

  saveRow: { marginTop: spacing.lg, marginBottom: spacing.xxl },
});
