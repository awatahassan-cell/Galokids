import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Category } from '@galokids/core';
import { KidsIcon, kidsIconForCategory } from '@/components/KidsIcon';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * The shop's departments, as one strip of circles.
 *
 * The website's phone layout, down to the cycled ring colours: a row of flat
 * grey circles reads as a loading state rather than as a menu, and cycling the
 * palette makes the strip look deliberate without giving any one category a
 * meaning the others do not have.
 */

/** A soft ring per category, cycled so the strip is not one flat block. */
const RINGS: { bg: string; line: string }[] = [
  { bg: colors.brandSoft, line: colors.brandLine },
  { bg: colors.bubbleSoft, line: colors.bubbleLine },
  { bg: colors.sunnySoft, line: colors.sunnyLine },
  { bg: colors.mintSoft, line: '#C6F2E3' },
  { bg: colors.grapeSoft, line: colors.grapeLine },
];

export function CategoryStrip({ categories }: { categories: Category[] }) {
  const router = useRouter();

  if (categories.length === 0) return null;

  // Five fit the strip; the sixth spot goes to "all", so nothing is hidden
  // without a way through to it.
  const strip = categories.slice(0, 5);

  // `inverted` on a FlatList rather than `row-reverse` on a ScrollView: a
  // reversed ScrollView lays its children out from the right but still opens
  // scrolled to the left, so the strip started at the last department.
  // "More" is appended, which inversion puts first on the reading side.
  const entries: (Category | 'more')[] = [...strip, 'more'];

  return (
    <FlatList
      horizontal
      inverted
      data={entries}
      keyExtractor={entry => (entry === 'more' ? 'more' : String(entry.id))}
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.content}
      renderItem={({ item, index }) => {
        if (item === 'more') {
          return (
            <Pressable
              style={styles.item}
              onPress={() => router.replace('/products')}
              accessibilityRole="button"
              accessibilityLabel="هەموو بەشەکان"
            >
              <View style={[styles.ring, styles.ringMore]}>
                <View style={styles.moreGrid}>
                  {[0, 1, 2, 3].map(dot => (
                    <View key={dot} style={styles.moreDot} />
                  ))}
                </View>
              </View>
              <Text style={styles.label} numberOfLines={2}>
                زیاتر
              </Text>
            </Pressable>
          );
        }

        const ring = RINGS[index % RINGS.length]!;
        const icon =
          kidsIconForCategory(item.icon) ??
          kidsIconForCategory(item.name_ku || item.name) ??
          'clothes';

        return (
          <Pressable
            style={styles.item}
            onPress={() =>
              router.replace({
                pathname: '/products',
                params: { category: String(item.id) },
              } as never)
            }
          >
            <View style={[styles.ring, { backgroundColor: ring.bg, borderColor: ring.line }]}>
              <KidsIcon name={icon} size={24} />
            </View>

            <Text style={styles.label} numberOfLines={2}>
              {item.name_ku || item.name}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  strip: { flexGrow: 0, marginTop: spacing.lg },
  content: { paddingHorizontal: spacing.md, gap: spacing.xs, alignItems: 'flex-start' },
  item: { width: 72, alignItems: 'center', gap: spacing.xs },
  ring: {
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ringMore: { backgroundColor: colors.background, borderColor: colors.borderStrong },
  moreGrid: { width: 22, flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
  moreDot: { width: 7, height: 7, borderRadius: 2.5, backgroundColor: colors.textMuted },
  label: { ...typography.tiny, color: colors.text, textAlign: 'center', lineHeight: 15 },
});
