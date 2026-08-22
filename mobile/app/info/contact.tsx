import React, { useCallback } from 'react';
import { Linking, Pressable } from 'react-native';
import { colors, spacing } from '../../src/theme';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { useShop } from '../../src/store/ShopProvider';
import { InfoPage } from '../../src/components/InfoPage';
import { Card, Row, T } from '../../src/components/ui';

/**
 * How to reach the shop.
 *
 * Every line comes from store settings, so changing the phone number or the
 * Instagram handle in the admin panel changes it here — nothing is hardcoded.
 */
export default function ContactScreen() {
  const { t, language } = useLanguage();
  const { settings } = useShop();

  const open = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {});
  }, []);

  const whatsapp = String(settings.whatsappNumber ?? '').replace(/\D/g, '');
  const whatsappUrl = whatsapp
    ? `https://wa.me/${whatsapp.startsWith('964') ? whatsapp : `964${whatsapp.replace(/^0/, '')}`}`
    : null;

  const rows: { emoji: string; label: string; value: string; url?: string }[] = [
    settings.storePhone
      ? { emoji: '📞', label: t('phone'), value: settings.storePhone, url: `tel:${settings.storePhone.replace(/\s/g, '')}` }
      : null,
    whatsappUrl ? { emoji: '💬', label: t('whatsapp'), value: settings.whatsappNumber!, url: whatsappUrl } : null,
    settings.contactEmail
      ? { emoji: '✉️', label: 'Email', value: settings.contactEmail, url: `mailto:${settings.contactEmail}` }
      : null,
    settings.storeAddress ? { emoji: '📍', label: language === 'ku' ? 'ناونیشان' : language === 'ar' ? 'العنوان' : 'Address', value: settings.storeAddress } : null,
    settings.instagramUrl ? { emoji: '📸', label: 'Instagram', value: settings.instagramUrl, url: settings.instagramUrl } : null,
    settings.facebookUrl ? { emoji: '👍', label: 'Facebook', value: settings.facebookUrl, url: settings.facebookUrl } : null,
    settings.tiktokUrl ? { emoji: '🎵', label: 'TikTok', value: settings.tiktokUrl, url: settings.tiktokUrl } : null,
  ].filter(Boolean) as { emoji: string; label: string; value: string; url?: string }[];

  return (
    <InfoPage page={{ title: t('contactUs'), sections: [] }}>
      {rows.map(row => (
        <Pressable key={row.label} onPress={() => row.url && open(row.url)} disabled={!row.url}>
          <Card style={{ padding: spacing.lg }}>
            <Row gap={spacing.md}>
              <T size="lg">{row.emoji}</T>
              <Row style={{ flex: 1 }} justify="space-between">
                <T size="xs" weight="black" color={colors.slate[500]}>{row.label}</T>
                <T size="sm" weight="black" numberOfLines={1} style={{ flex: 1, marginHorizontal: spacing.md }}>
                  {row.value}
                </T>
              </Row>
            </Row>
          </Card>
        </Pressable>
      ))}
    </InfoPage>
  );
}
