import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { TextInput } from '@/components/TextInput';
import { Alert, backoffice, formatIQD, type Coupon } from '@galokids/core';
import { Button, Empty, Loading, NeedsConnection, Problem, Screen } from '@/components/kit';
import { Pill, Table, type Column } from '@/components/Table';
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

  const remove = (coupon: Coupon) => {
    Alert.alert('سڕینەوەی کۆپۆن', `کۆپۆنی ${coupon.code} بسڕدرێتەوە؟`, [
      { text: 'نەخێر', style: 'cancel' },
      {
        text: 'سڕینەوە',
        style: 'destructive',
        onPress: async () => {
          try {
            await backoffice.deleteCoupon(coupon.id);
            list.refresh();
          } catch (error) {
            Alert.alert('نەتوانرا بسڕدرێتەوە', (error as Error).message);
          }
        },
      },
    ]);
  };

  // The panel's coupon table: the code, what it takes off, how often it has
  // been used, whether it still works, and what you can do to it.
  const columns: Column<Coupon>[] = [
    {
      title: 'کۆد',
      width: 1.6,
      primary: true,
      render: coupon => <Text style={styles.code}>{coupon.code}</Text>,
    },
    {
      title: 'داشکاندن',
      width: 0.9,
      align: 'center',
      render: coupon => <Pill label={`٪${coupon.discountPercentage}`} tone="info" />,
    },
    {
      title: 'بەکارهێنان',
      width: 1.2,
      align: 'center',
      render: coupon =>
        `${coupon.timesUsed}${coupon.maxUses != null ? ` / ${coupon.maxUses}` : ''}`,
    },
    {
      title: 'کەمترین بڕ',
      width: 1.2,
      align: 'center',
      render: coupon => (coupon.minOrderAmount > 0 ? formatIQD(coupon.minOrderAmount) : '—'),
    },
    {
      title: 'دۆخ',
      width: 1,
      align: 'center',
      render: coupon => {
        const exhausted = coupon.maxUses != null && coupon.timesUsed >= coupon.maxUses;

        if (!coupon.isActive) return <Pill label="ناچالاک" tone="bad" />;
        if (exhausted) return <Pill label="تەواو بووە" tone="warn" />;

        return <Pill label="چالاک" tone="good" />;
      },
    },
    {
      title: 'کردار',
      width: 0.9,
      align: 'center',
      render: coupon => <RowAction label="سڕینەوە" danger onPress={() => remove(coupon)} />,
    },
  ];

  return (
    <Screen
      title="کوپۆنەکان"
      subtitle="کۆدی داشکاندن"
      scroll={false}
      actions={<Button tone="ink" label="نوێ" onPress={() => setEditing('new')} />}
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
        <Table
          rows={list.data!}
          keyFor={coupon => String(coupon.id)}
          onPress={setEditing}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          columns={columns}
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

function RowAction({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={[actionStyles.button, danger && actionStyles.danger]}
      onPress={onPress}
      hitSlop={4}
    >
      <Text style={[actionStyles.text, danger && actionStyles.dangerText]}>{label}</Text>
    </Pressable>
  );
}

const actionStyles = StyleSheet.create({
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
  },
  danger: { backgroundColor: colors.dangerSoft },
  text: { ...typography.tiny, color: colors.brand },
  dangerText: { color: colors.danger },
});

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

  const existing = target && target !== 'new' ? target : null;

  // Fill the form from the coupon being edited, and empty it for a new one.
  // Without this the sheet opened blank whichever row was tapped, so editing
  // an existing coupon meant retyping all of it.
  useEffect(() => {
    if (!target) return;

    setCode(existing?.code ?? '');
    setPercent(existing ? String(existing.discountPercentage) : '');
    setLimit(existing?.maxUses != null ? String(existing.maxUses) : '');
    setActive(existing?.isActive ?? true);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!target) return null;

  const save = async () => {
    const value = Number(percent);

    if (!code.trim() || !Number.isFinite(value) || value <= 0 || value > 100) {
      Alert.alert('ناتەواو', 'کۆد و ڕێژەیەکی دروست (١ تا ١٠٠) پێویستە.');
      return;
    }

    setSaving(true);
    try {
      await backoffice.saveCoupon(
        {
          code: code.trim().toUpperCase(),
          discountPercentage: value,
          isActive: active,
          maxUses: limit.trim() ? Number(limit) : null,
        },
        // The id is what makes this an edit. Without it the server treats the
        // request as a new coupon and refuses the code as already taken.
        existing?.id
      );
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
          <Text style={styles.sheetTitle}>{existing ? `دەستکاری ${existing.code}` : 'کوپۆنی نوێ'}</Text>

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
  code: { ...typography.heading, color: colors.text, textAlign: 'right', ...typography.mono },

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
