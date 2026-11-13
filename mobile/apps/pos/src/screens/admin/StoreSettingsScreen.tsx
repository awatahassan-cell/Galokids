import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, GOVERNORATES, backoffice, shop } from '@galokids/core';
import { Button, Loading, NeedsConnection, Problem, Screen } from '@/components/kit';
import { Field, Group } from '@/components/Sheet';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * The shop's own details.
 *
 * Distinct from the device settings: these belong to the whole business and
 * every till, the website and every printed receipt read them — the name and
 * logo at the top of a receipt, the footer line at the bottom, what delivery
 * costs to each governorate and from what spend it is free.
 *
 * Saved as a partial map, so only what is on this screen is touched and the
 * hero slides and banners set elsewhere are left alone. The Instagram token is
 * write-only: the server never sends it back, and leaving the box empty keeps
 * the one that is stored.
 */

const TEXT_KEYS = [
  'store_name',
  'store_phone',
  'store_address',
  'receipt_footer',
  'store_logo',
  'whatsapp_number',
  'contact_email',
  'facebook_url',
  'instagram_url',
  'tiktok_url',
  'snapchat_url',
] as const;

type TextKey = (typeof TEXT_KEYS)[number];

export default function StoreSettingsScreen() {
  const loaded = useFetch<Record<string, unknown>>(() => shop.settings(), []);
  const offline = useNeedsConnection(loaded.error);

  return (
    <Screen title="ڕێکخستنی فرۆشگا" subtitle="ناو، لۆگۆ، پەیوەندی و گەیاندن" scroll={false}>
      {offline ? (
        <NeedsConnection what="ڕێکخستنەکان" />
      ) : loaded.loading && !loaded.data ? (
        <Loading />
      ) : loaded.error ? (
        <Problem error={loaded.error} onRetry={loaded.reload} />
      ) : (
        <Form settings={loaded.data ?? {}} onSaved={loaded.reload} />
      )}
    </Screen>
  );
}

function asText(value: unknown): string {
  return value == null ? '' : String(value);
}

function Form({ settings, onSaved }: { settings: Record<string, unknown>; onSaved: () => void }) {
  const [text, setText] = useState<Record<TextKey, string>>(() =>
    Object.fromEntries(TEXT_KEYS.map(key => [key, asText(settings[key])])) as Record<TextKey, string>
  );
  const [token, setToken] = useState('');
  const [defaultFee, setDefaultFee] = useState(asText(settings.shipping_default_fee));
  const [freeOver, setFreeOver] = useState(asText(settings.shipping_free_over));
  const [notify, setNotify] = useState(settings.notify_order_status === true || settings.notify_order_status === 'true');
  const [busy, setBusy] = useState(false);

  // The rate card arrives already decoded, but tolerate a hand-written string.
  const [rates, setRates] = useState<Record<string, string>>(() => {
    let raw = settings.shipping_rates;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = {};
      }
    }

    return Object.fromEntries(
      Object.entries((raw ?? {}) as Record<string, unknown>).map(([key, value]) => [key, asText(value)])
    );
  });

  // The server filled this in after the first render in some cases.
  useEffect(() => {
    setText(Object.fromEntries(TEXT_KEYS.map(key => [key, asText(settings[key])])) as Record<TextKey, string>);
  }, [settings]);

  const set = (key: TextKey) => (value: string) => setText(current => ({ ...current, [key]: value }));
  const tokenSaved = settings.instagram_access_token_set === true || settings.instagram_access_token_set === 'true';

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled) return;

    const asset = result.assets[0]!;
    setBusy(true);
    try {
      const { urls } = await backoffice.uploadProductImages([
        { uri: asset.uri, name: asset.fileName ?? `logo-${Date.now()}.png`, type: asset.mimeType ?? 'image/png' },
      ]);
      if (urls[0]) set('store_logo')(urls[0]);
    } catch (error) {
      Alert.alert('نەتوانرا لۆگۆ بنێردرێت', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    // Blank rows mean "use the default" and are dropped. Saved as 0 they would
    // mean free delivery to that governorate.
    const cleaned: Record<string, number> = {};
    for (const [key, raw] of Object.entries(rates)) {
      if (raw.trim() === '') continue;
      cleaned[key] = Math.max(0, Math.round(Number(raw) || 0));
    }

    setBusy(true);
    try {
      await shop.updateSettings({
        ...text,
        instagram_access_token: token,
        shipping_rates: cleaned,
        shipping_default_fee: Math.max(0, Math.round(Number(defaultFee) || 0)),
        shipping_free_over: Math.max(0, Math.round(Number(freeOver) || 0)),
        notify_order_status: notify,
      });
      setToken('');
      onSaved();
      Alert.alert('پاشەکەوتکرا', 'ڕێکخستنەکان پاشەکەوتکران.');
    } catch (error) {
      Alert.alert('نەتوانرا پاشەکەوت بکرێت', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <ScrollBody>
        <Group title="زانیاری فرۆشگا (لەسەر پسووڵە)">
          <View style={styles.logoRow}>
            <Button label="گۆڕینی لۆگۆ" tone="quiet" onPress={pickLogo} disabled={busy} />
            {text.store_logo ? (
              <Pressable onPress={() => set('store_logo')('')}>
                <Image source={{ uri: text.store_logo }} style={styles.logo} contentFit="contain" />
              </Pressable>
            ) : (
              <View style={[styles.logo, styles.logoEmpty]} />
            )}
          </View>
          <Field value={text.store_name} onChange={set('store_name')} placeholder="ناوی فرۆشگا" />
          <Field value={text.store_phone} onChange={set('store_phone')} placeholder="مۆبایل" phone />
          <Field value={text.store_address} onChange={set('store_address')} placeholder="ناونیشان" />
          <Field value={text.receipt_footer} onChange={set('receipt_footer')} placeholder="دێڕی کۆتایی پسووڵە" />
        </Group>

        <Group title="پەیوەندی و سۆشیاڵ میدیا">
          <Field value={text.whatsapp_number} onChange={set('whatsapp_number')} placeholder="ژمارەی واتساپ (9647501234567)" phone />
          <Field value={text.contact_email} onChange={set('contact_email')} placeholder="ئیمەیڵ" />
          <Field value={text.facebook_url} onChange={set('facebook_url')} placeholder="لینکی Facebook" />
          <Field value={text.instagram_url} onChange={set('instagram_url')} placeholder="لینکی Instagram" />
          <Field
            value={token}
            onChange={setToken}
            placeholder={tokenSaved ? '•••••••• تۆکنێک پاشەکەوتکراوە — بەتاڵ = هێشتنەوە' : 'Instagram access token'}
          />
          <Field value={text.tiktok_url} onChange={set('tiktok_url')} placeholder="لینکی TikTok" />
          <Field value={text.snapchat_url} onChange={set('snapchat_url')} placeholder="لینکی Snapchat" />
        </Group>

        <Group title="گەیاندن">
          <View style={styles.pair}>
            <Field value={defaultFee} onChange={setDefaultFee} placeholder="کرێی ئاسایی" numeric half />
            <Field value={freeOver} onChange={setFreeOver} placeholder="خۆڕایی لە سەرووی" numeric half />
          </View>
          <Text style={styles.hint}>کرێی هەر پارێزگایەک. بەتاڵ = کرێی ئاسایی.</Text>
          {GOVERNORATES.map(gov => (
            <View key={gov.id} style={styles.rateRow}>
              <View style={{ width: 130 }}>
                <Field
                  value={rates[gov.en] ?? ''}
                  onChange={value => setRates(current => ({ ...current, [gov.en]: value }))}
                  placeholder="کرێ"
                  numeric
                />
              </View>
              <Text style={styles.rateName}>{gov.ku}</Text>
            </View>
          ))}
        </Group>

        <Group title="ئاگادارکردنەوەی کڕیار">
          <View style={styles.switchRow}>
            <Switch value={notify} onValueChange={setNotify} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>SMS بۆ کڕیار لەگەڵ گۆڕینی دۆخی داواکاری</Text>
              <Text style={styles.hint}>هەر نامەیەک تێچووی هەیە.</Text>
            </View>
          </View>
        </Group>

        <Button label={busy ? 'پاشەکەوت دەکرێت…' : 'پاشەکەوتکردنی هەموو ڕێکخستنەکان'} onPress={save} disabled={busy} />
      </ScrollBody>
    </View>
  );
}

function ScrollBody({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      contentContainerStyle={styles.body}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  body: { gap: spacing.md, paddingBottom: spacing.xxl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  pair: { flexDirection: 'row-reverse', gap: spacing.sm },
  hint: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },
  label: { ...typography.small, color: colors.text, textAlign: 'right' },
  logoRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 84, height: 56, borderRadius: radius.sm },
  logoEmpty: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
  rateRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  rateName: { ...typography.small, color: colors.text },
  switchRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.md },
});
