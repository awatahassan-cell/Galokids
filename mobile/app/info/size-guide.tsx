import React from 'react';
import { View } from 'react-native';
import { colors, radius, spacing } from '../../src/theme';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { SIZE_GUIDE_NOTE, SIZE_ROWS } from '../../src/i18n/pages';
import { InfoPage } from '../../src/components/InfoPage';
import { Card, Row, T } from '../../src/components/ui';

export default function SizeGuideScreen() {
  const { language, t } = useLanguage();

  return (
    <InfoPage page={{ title: t('sizeGuide'), intro: SIZE_GUIDE_NOTE[language], sections: [] }}>
      <Card style={{ overflow: 'hidden' }}>
        <Row
          justify="space-between"
          style={{
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            backgroundColor: colors.candy[50],
          }}
        >
          <T size="xs" weight="black" color={colors.candy[700]} style={{ width: 70 }}>
            {t('selectSize')}
          </T>
          <T size="xs" weight="black" color={colors.candy[700]} style={{ flex: 1 }}>
            {language === 'ku' ? 'تەمەن' : language === 'ar' ? 'العمر' : 'Age'}
          </T>
          <T size="xs" weight="black" color={colors.candy[700]} style={{ width: 90, textAlign: 'right' }}>
            {language === 'ku' ? 'باڵا' : language === 'ar' ? 'الطول' : 'Height'}
          </T>
        </Row>

        {SIZE_ROWS.map((row, index) => (
          <Row
            key={row.size}
            justify="space-between"
            style={{
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              backgroundColor: index % 2 === 0 ? colors.white : colors.slate[50],
            }}
          >
            <View
              style={{
                width: 70,
                paddingVertical: 2,
                paddingHorizontal: 8,
                borderRadius: radius.sm,
                backgroundColor: colors.bubble[50],
                alignSelf: 'flex-start',
              }}
            >
              <T size="xs" weight="black" color={colors.bubble[700]}>{row.size}</T>
            </View>
            <T size="xs" weight="bold" color={colors.slate[700]} style={{ flex: 1, paddingHorizontal: spacing.sm }}>
              {row.age[language]}
            </T>
            {/* Heights are always read left to right, whatever the language. */}
            <T size="xs" weight="bold" color={colors.slate[500]} style={{ width: 90, textAlign: 'right', writingDirection: 'ltr' }}>
              {row.height}
            </T>
          </Row>
        ))}
      </Card>
    </InfoPage>
  );
}
