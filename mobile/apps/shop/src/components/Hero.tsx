import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors, fonts, radius, shadow, spacing, typography } from '@/theme';

/**
 * The banner at the top of the shop.
 *
 * The slides are the shop's own, set in the back office and served in
 * `/api/settings` as `hero_slides` — so changing the banner on the website
 * changes it in the app, with nothing to rebuild and no second place to
 * remember. When the shop has set none, this draws nothing rather than
 * inventing a promotion the shop is not running.
 *
 * One short card rather than the website's full-height hero: the wide layout
 * stacks into about 620px of advertising on a phone, which is most of a screen
 * before a single price is in view.
 */

export interface HeroSlide {
  id?: string | number;
  titleKu?: string;
  titleEn?: string;
  subtitleKu?: string;
  subtitleEn?: string;
  badgeKu?: string;
  badgeEn?: string;
  cta1Ku?: string;
  ctaKu?: string;
  cta1En?: string;
  link?: string;
  btn1Link?: string;
  image?: string;
  imageUrl?: string;
  discountTag?: string;
}

/** How long a slide holds before the next one. The website uses six seconds. */
const HOLD_MS = 6000;

export function Hero({ slides }: { slides: HeroSlide[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  const usable = useMemo(
    () => slides.filter(slide => slide && (slide.image || slide.imageUrl || slide.titleKu)),
    [slides]
  );

  useEffect(() => {
    if (usable.length <= 1) return;

    const timer = setInterval(() => {
      // Out, swap, in. A crossfade leaves two headlines legible at once, which
      // reads as a rendering fault rather than as a transition.
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setIndex(current => (current + 1) % usable.length);
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      });
    }, HOLD_MS);

    return () => clearInterval(timer);
  }, [usable.length, fade]);

  if (usable.length === 0) return null;

  const slide = usable[Math.min(index, usable.length - 1)]!;

  const title = (slide.titleKu || slide.titleEn || '').replace(/[🎈✨]/g, '').trim();
  const subtitle = slide.subtitleKu || slide.subtitleEn || '';
  const badge = slide.badgeKu || slide.badgeEn || '';
  const cta = (slide.cta1Ku || slide.ctaKu || slide.cta1En || 'بڕۆ بۆ فرۆشگا')
    .replace(/[👧👦✨]/g, '')
    .trim();
  const image = slide.image || slide.imageUrl;

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Animated.View style={{ opacity: fade }}>
          {image ? (
            <Image source={{ uri: image }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={[styles.photo, styles.photoEmpty]} />
          )}

          {/* The text sits over the picture, so it needs its own ground to stay
              readable whatever photo the shop uploads. Right to left, because
              that is the side the words start on. */}
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.88)', '#ffffff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.text}>
            {badge ? <Text style={styles.badge}>{badge}</Text> : null}

            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>

            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
              onPress={() => router.replace('/products')}
            >
              <Text style={styles.ctaText}>{cta}</Text>
              <Text style={styles.ctaArrow}>←</Text>
            </Pressable>
          </View>

          {slide.discountTag ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{slide.discountTag}</Text>
            </View>
          ) : null}
        </Animated.View>

        {usable.length > 1 && (
          <View style={styles.dots}>
            {usable.map((entry, dot) => (
              <Pressable
                key={entry.id ?? dot}
                onPress={() => setIndex(dot)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`ڕیکلامی ${dot + 1}`}
              >
                <View style={[styles.dot, dot === index && styles.dotOn]} />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  card: {
    height: 190,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.brandLine,
    ...shadow.card,
  },
  photo: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  photoEmpty: { backgroundColor: colors.brandSoft },

  text: {
    height: 190,
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 3,
    paddingHorizontal: spacing.lg,
    maxWidth: '72%',
    alignSelf: 'flex-end',
  },
  badge: { fontSize: 10, fontFamily: fonts.bold, color: colors.brandText, letterSpacing: 0.5 },
  title: {
    fontSize: 18,
    lineHeight: 25,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: 'right',
  },
  subtitle: { ...typography.tiny, color: colors.textMuted, textAlign: 'right', lineHeight: 17 },
  cta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.brandDeep,
    ...shadow.card,
  },
  ctaPressed: { transform: [{ scale: 0.97 }] },
  ctaText: { color: '#fff', fontSize: 12, fontFamily: fonts.bold, lineHeight: 18 },
  ctaArrow: { color: '#fff', fontSize: 13, lineHeight: 18 },

  tag: {
    position: 'absolute',
    top: spacing.md,
    insetInlineEnd: spacing.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.sunny,
    ...shadow.card,
  },
  tagText: { color: '#5c4708', fontSize: 10, fontFamily: fonts.bold, lineHeight: 16 },

  dots: {
    position: 'absolute',
    bottom: spacing.sm,
    insetInlineStart: 0,
    insetInlineEnd: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: colors.brandLine,
  },
  dotOn: { width: 20, backgroundColor: colors.brand, borderColor: colors.brand },
});
