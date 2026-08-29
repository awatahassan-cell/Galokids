import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { colors, radius, spacing } from '../theme';
import { useLanguage } from '../i18n/LanguageProvider';
import { useShop } from '../store/ShopProvider';
import { resolveAppPath } from '../utils/links';
import type { HeroSlide } from '../api/types';
import { T } from './ui';

const { width: SCREEN } = Dimensions.get('window');
const CARD_WIDTH = SCREEN - spacing.lg * 2;
const CARD_HEIGHT = 190;

/**
 * The banner across the top of the home screen.
 *
 * Its content is whatever the shop has set in the admin panel — the same
 * `hero_slides` and `promo_banner` settings the website reads — so changing a
 * banner there changes it here, with no app release involved. If the shop has
 * set nothing, the strip simply does not appear rather than showing a
 * placeholder nobody chose.
 *
 * A slide can carry a link. Tapping it goes wherever that link points inside
 * the app, so a campaign pointing at a discounted category opens that
 * category rather than the home screen.
 */
export const HeroCarousel: React.FC = () => {
  const { settings } = useShop();
  const { language, isRTL, pick } = useLanguage();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const slides: HeroSlide[] = React.useMemo(() => {
    const fromSettings = settings.heroSlides ?? [];
    const banner = settings.promoBanner;

    const bannerSlides =
      banner && banner.isActive !== false
        ? banner.slides?.length
          ? banner.slides
          : banner.imageUrl
            ? [
                {
                  titleKu: banner.titleKu,
                  titleAr: banner.titleAr,
                  titleEn: banner.titleEn,
                  subtitleKu: banner.subtitleKu,
                  subtitleAr: banner.subtitleAr,
                  subtitleEn: banner.subtitleEn,
                  imageUrl: banner.imageUrl,
                  link: banner.link,
                },
              ]
            : []
        : [];

    return [...fromSettings, ...bannerSlides].filter(
      slide => slide.imageUrl || slide.titleKu || slide.titleEn || slide.titleAr
    );
  }, [settings.heroSlides, settings.promoBanner]);

  // Advance on its own, but stop as soon as there is only one slide — a
  // single-slide carousel that keeps "animating" just burns battery.
  useEffect(() => {
    if (slides.length < 2) return;

    const timer = setInterval(() => {
      setIndex(current => {
        const next = (current + 1) % slides.length;
        scrollRef.current?.scrollTo({ x: next * CARD_WIDTH, animated: true });
        return next;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

  const onSlidePress = useCallback(
    (slide: HeroSlide) => {
      const path = resolveAppPath(slide.link);
      if (path) router.push(path as never);
    },
    [router]
  );

  if (slides.length === 0) return null;

  return (
    <View style={{ marginTop: spacing.lg }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 0 }}
        onMomentumScrollEnd={event => {
          setIndex(Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH));
        }}
      >
        {slides.map((slide, position) => {
          const title = pick(slide.titleKu, slide.titleAr, slide.titleEn);
          const subtitle = pick(slide.subtitleKu, slide.subtitleAr, slide.subtitleEn);
          const badge = pick(slide.badgeKu, slide.badgeAr, slide.badgeEn);

          return (
            <Pressable
              key={slide.id ?? `${position}`}
              onPress={() => onSlidePress(slide)}
              disabled={!slide.link}
              style={{
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                borderRadius: radius['3xl'],
                overflow: 'hidden',
                backgroundColor: colors.candy[100],
              }}
            >
              {slide.imageUrl ? (
                <Image
                  source={slide.imageUrl}
                  style={{ position: 'absolute', width: '100%', height: '100%' }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
              ) : null}

              {/* A wash behind the words, so a bright photo cannot make the
                  headline unreadable. */}
              <View
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: slide.imageUrl ? 'rgba(15,23,42,0.34)' : 'transparent',
                }}
              />

              <View
                style={{
                  flex: 1,
                  padding: spacing.xl,
                  justifyContent: 'center',
                  alignItems: isRTL ? 'flex-end' : 'flex-start',
                }}
              >
                {badge ? (
                  <View
                    style={{
                      backgroundColor: colors.sunny[500],
                      borderRadius: radius.pill,
                      paddingHorizontal: spacing.md,
                      paddingVertical: 4,
                      marginBottom: spacing.sm,
                    }}
                  >
                    <T size="xs" weight="black" color={colors.sunny[700]}>
                      {badge}
                    </T>
                  </View>
                ) : null}

                {title ? (
                  <T
                    size="xl"
                    weight="black"
                    color={slide.imageUrl ? colors.white : colors.slate[900]}
                    numberOfLines={2}
                    style={{ maxWidth: '86%' }}
                  >
                    {title}
                  </T>
                ) : null}

                {subtitle ? (
                  <T
                    size="sm"
                    weight="bold"
                    color={slide.imageUrl ? 'rgba(255,255,255,0.9)' : colors.slate[600]}
                    numberOfLines={2}
                    style={{ marginTop: 4, maxWidth: '86%' }}
                  >
                    {subtitle}
                  </T>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {slides.length > 1 ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
            marginTop: spacing.md,
          }}
        >
          {slides.map((_, dot) => (
            <View
              key={dot}
              style={{
                width: dot === index ? 18 : 6,
                height: 6,
                borderRadius: radius.pill,
                backgroundColor: dot === index ? colors.candy[500] : colors.candy[200],
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};
