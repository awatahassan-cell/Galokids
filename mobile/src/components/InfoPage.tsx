import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { useLanguage } from '../i18n/LanguageProvider';
import type { Page } from '../i18n/pages';
import { Card, Row, T } from './ui';

/** The frame every one of the shop's own pages is drawn in. */
export const InfoPage: React.FC<{ page: Page; children?: React.ReactNode }> = ({ page, children }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingTop: insets.top + spacing.md,
        paddingBottom: spacing['3xl'],
        gap: spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Row gap={spacing.md}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <T size="lg" weight="black" color={colors.slate[700]}>{isRTL ? '→' : '←'}</T>
        </Pressable>
        <T size="xl" weight="black" style={{ flex: 1 }}>{page.title}</T>
      </Row>

      {page.intro ? (
        <T size="sm" weight="bold" color={colors.slate[600]}>{page.intro}</T>
      ) : null}

      {page.sections.map(section => (
        <Card key={section.heading} style={{ padding: spacing.lg, gap: 6 }}>
          <T size="sm" weight="black" color={colors.candy[700]}>{section.heading}</T>
          <T size="sm" weight="bold" color={colors.slate[600]}>{section.body}</T>
        </Card>
      ))}

      {children}
    </ScrollView>
  );
};
