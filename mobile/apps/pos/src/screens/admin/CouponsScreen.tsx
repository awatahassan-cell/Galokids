import { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { backoffice, formatIQD, type Coupon } from '@galokids/core';
import { Button, Empty, Loading, NeedsConnection, Problem, Screen } from '@/components/kit';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * Discount codes.
 *
 * A code that has run out still has to be visible, not hidden — a customer
 * will read it off an old post and ask, and the shop needs to see why it is
 * being refused rather than wonder whether it ever existed.
 */
export default function CouponsScreen() {
  const [editing, setEditing] = useState<Coupon | 'new' | null>(null);
  const list = useFetch<Coupon[]>(() => backoffice.coupons(), []);
  const offline = useNeedsConnection(list.error);

  return (
    <Screen
      title="کوپۆنەکان"
      subtitle="کۆدی داشکاندن"
      scroll={false}
      actions={<Button label="نوێ" onPress={() => setEditing('new')} />}
    >
      {offline ? (
        <NeedsConnection what="کوپۆنەکان" />
      ) : list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <Problem error={list.error} onRetry={list.reload} />
      ) : (list.data?.length ?? 0) === 0 ? (
        <Empty title="هیچ کوپۆنێک نییە" body="کۆدێکی داشکاندن دروست بکە." />
      ) : (
        <FlatList
          data={list.data!}
          keyExtractor={coupon => String(coupon.id)}
          contentContainerStyle={styles.list}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          renderItem={({ item }) => {
            const exhausted = item.usage_limit != null && item.used_count >= item.usage_limit;

            return (
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.percent}>{item.discount_percentage}%</Text>

                  <View style={styles.cardHeadText}>
                    <Text style={styles.code}>{item.code}</Text>
                    <Text style={styles.used}>
                      {item.used_count} جار بەکارهاتووە
                      {item.usage_limit != null ? ` لە ${item.usage_limit}` : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.tags}>
                  {!item.isActive && <Tag text="ناچالاک" tone="danger" />}
                  {exhausted && <Tag text="تەواو بووە" tone="warning" />}
                  {item.min_subtotal ? <Tag text={`لە ${formatIQD(item.min_subtotal)} زیاتر`} /> : null}
                </View>
              </View>
            );
          }}
        />
      )}

      <CouponSheet
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); list.refresh(); }}
      />
    </Screen>
  );
}

function Tag({ text, tone }: { text: string; tone?: 'danger' | 'warning' }) {
  const bg = tone === 'danger' ? colors.dangerSoft : tone === 'warning' ? colors.warningSoft : colors.brandSoft;
  const fg = tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : colors.brand;

  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.tagText, { color: fg }]}>{text}</Text>
    </View>
  );
}

function CouponSheet({
  target,
  onClose,
  onSaved,
}: {
  target: Coupon | 'new' | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState('');
  const [limit, setLimit] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  if (!target) return null;

  const save = async () => {
    const value = Number(percent);

    if (!code.trim() || !Number.isFinite(value) || value <= 0 || value > 100) {
      Alert.alert('ناتەواو', 'کۆد و ڕێژەیەکی دروست (١ تا ١٠٠) پێویستە.');
      return;
    }

    setSaving(true);
    try {
      await backoffice.saveCoupon({
        code: code.trim().toUpperCase(),
        discount_percentage: value,
        isActive: active,
        usage_limit: limit.trim() ? Number(limit) : null,
      });
      setCode(''); setPercent(''); setLimit('');
      onSaved();
    } catch (error) {
      Alert.alert('نەتوانرا پاشەکەوت بکرێت', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>کوپۆنی نوێ</Text>

          <TextInput style={styles.input} placeholder="کۆد (نموونە: EID20)"
            placeholderTextColor={colors.textFaint} autoCapitalize="characters"
            value={code} onChangeText={setCode} textAlign="right" />
          <TextInput style={styles.input} placeholder="ڕێژەی داشکاندن %"
            placeholderTextColor={colors.textFaint} keyboardType="number-pad"
            value={percent} onChangeText={setPercent} textAlign="right" />
          <TextInput style={styles.input} placeholder="سنووری بەکارهێنان (ئارەزوومەندانە)"
            placeholderTextColor={colors.textFaint} keyboardType="number-pad"
            value={limit} onChangeText={setLimit} textAlign="right" />

          <View style={styles.switchRow}>
            <Switch value={active} onValueChange={setActive} />
            <Text style={styles.switchLabel}>چالاک</Text>
          </View>

          <View style={styles.sheetActions}>
            <Button label="پاشگەزبوونەوە" tone="quiet" onPress={onClose} />
            <Button label={saving ? 'پاشەکەوت…' : 'پاشەکەوتکردن'} onPress={save} disabled={saving} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  card: {
    padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, gap: spacing.xs,
  },
  cardHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  cardHeadText: { flex: 1 },
  code: { ...typography.heading, color: colors.text, textAlign: 'right', ...typography.mono },
  used: { ...typography.tiny, color: colors.textMuted, textAlign: 'right' },
  percent: { ...typography.title, color: colors.brand, ...typography.mono },
  tags: { flexDirection: 'row-reverse', gap: spacing.xs, flexWrap: 'wrap' },
  tag: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  tagText: { ...typography.tiny },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.lg, gap: spacing.sm,
  },
  sheetTitle: { ...typography.title, color: colors.text, textAlign: 'right' },
  input: {
    minHeight: TOUCH_TARGET, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, ...typography.body, color: colors.text,
  },
  switchRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  switchLabel: { ...typography.body, color: colors.text },
  sheetActions: { flexDirection: 'row-reverse', gap: spacing.sm, marginTop: spacing.sm },
});
