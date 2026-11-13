import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TextInput } from '@/components/TextInput';
import { Alert, timeAgo } from '@galokids/core';
import { Button, Row, Screen, Stat } from '@/components/kit';
import { catalogueSize, devicePrefix, resetCatalogue, setDevicePrefix } from '@/offline';
import { useSession } from '@/state/useSession';
import { useSync } from '@/state/useSync';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * This device.
 *
 * Everything here is about the till in the person's hands — its name, what it
 * is holding, what it still owes — rather than the shop's settings, which
 * belong on one screen for the whole business and not on each device.
 *
 * The name matters more than it looks: it prefixes every receipt number this
 * till prints, and it is what stops two tills in the same shop printing the
 * same one.
 */
export default function SettingsScreen() {
  const { user, signOut } = useSession();
  const { pending, rejected, lastSynced, syncNow, syncing, online } = useSync();

  const [prefix, setPrefix] = useState('');
  const [counts, setCounts] = useState({ products: 0, variations: 0 });

  useEffect(() => {
    devicePrefix().then(setPrefix);
    catalogueSize().then(setCounts);
  }, []);

  const rename = async () => {
    await setDevicePrefix(prefix);
    setPrefix(await devicePrefix());
    Alert.alert('ناوی ئامێر', 'ناوەکە تۆمارکرا. پسووڵەکانی داهاتوو ئەمە بەکاردەهێنن.');
  };

  const rebuild = () => {
    Alert.alert(
      'داگرتنەوەی کەتەلۆگ',
      'کەتەلۆگی ناو ئامێرەکە دەسڕدرێتەوە و لە نوێوە دادەبەزێت. فرۆشتنە نەنێردراوەکان دەمێننەوە.',
      [
        { text: 'نەخێر', style: 'cancel' },
        {
          text: 'بەڵێ',
          onPress: async () => {
            await resetCatalogue();
            await syncNow();
            setCounts(await catalogueSize());
          },
        },
      ]
    );
  };

  return (
    <Screen title="ڕێکخستنەکان" subtitle="ئەم ئامێرە">
      <View style={styles.stats}>
        <Stat label="بەرهەمی داگیراو" value={String(counts.products)} />
        <Stat label="چاوەڕێی ناردن" value={String(pending)} tone={pending > 0 ? 'bad' : 'good'} />
        {rejected > 0 && <Stat label="ڕەتکراوە" value={String(rejected)} tone="bad" />}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>ناوی ئامێر</Text>
        <Text style={styles.panelHint}>
          ئەمە لە سەرەتای ژمارەی هەموو پسووڵەیەکی ئەم ئامێرە دێت، بۆیە دوو تیل لە یەک
          فرۆشگادا هەرگیز یەک ژمارە چاپ ناکەن.
        </Text>

        <View style={styles.renameRow}>
          <Button label="تۆمارکردن" onPress={rename} />
          <TextInput
            style={styles.input}
            value={prefix}
            onChangeText={setPrefix}
            autoCapitalize="characters"
            textAlign="center"
          />
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>هاوکاتکردن</Text>
        <Row label="دۆخ" value={online ? 'پەیوەست' : 'ئۆفلاین'} />
        <Row label="دوایین جار" value={timeAgo(lastSynced)} />

        <View style={styles.buttons}>
          <Button label="داگرتنەوەی کەتەلۆگ" tone="quiet" onPress={rebuild} />
          <Button label={syncing ? 'هاوکات…' : 'هاوکاتکردن'} onPress={() => syncNow()} disabled={syncing} />
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>هەژمار</Text>
        <Row label="ناو" value={user?.name ?? '—'} />
        <Row label="ئیمەیڵ" value={user?.email ?? '—'} />

        <Button label="چوونەدەرەوە" tone="danger" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm },
  panel: {
    padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  panelTitle: { ...typography.heading, color: colors.text, textAlign: 'right' },
  panelHint: { ...typography.tiny, color: colors.textMuted, textAlign: 'right', lineHeight: 20 },
  renameRow: { flexDirection: 'row-reverse', gap: spacing.sm, alignItems: 'center' },
  input: {
    flex: 1, minHeight: TOUCH_TARGET, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, ...typography.heading, color: colors.text, ...typography.mono,
  },
  buttons: { flexDirection: 'row-reverse', gap: spacing.sm },
});
