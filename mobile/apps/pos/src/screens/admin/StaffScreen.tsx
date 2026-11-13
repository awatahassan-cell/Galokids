import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { TextInput } from '@/components/TextInput';
import { Alert, backoffice, displayPhone, ROLE, type Paginated, type Role, type User } from '@galokids/core';
import { Button, Empty, Loading, NeedsConnection, Problem, Screen } from '@/components/kit';
import { BulkBar, reportBulk } from '@/components/BulkBar';
import { useSelection } from '@/state/useSelection';
import { Pill, Table, Titled, type Column } from '@/components/Table';
import { useSession } from '@/state/useSession';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { ALL_PERMISSIONS, PRESETS } from '@/navigation/permissions';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * Staff, and what each may do.
 *
 * The form opens on Staff, not Admin. On the website it opened on Admin with
 * every box ticked, so filling in a name and a password — the whole of the
 * form — created a second full administrator of the shop, and nothing on
 * screen said so.
 *
 * Ticking boxes here only changes what the server will allow; it is the server
 * that refuses, and these checkboxes describe that decision rather than making
 * it.
 */

const ROLES: { id: Role; label: string }[] = [
  { id: ROLE.STAFF, label: '📦 کارمەند' },
  { id: ROLE.CASHIER, label: '💳 کاشێر' },
  { id: ROLE.ADMIN, label: '👑 بەڕێوەبەر' },
];

export default function StaffScreen() {
  const [editing, setEditing] = useState<User | 'new' | null>(null);

  const list = useFetch<Paginated<User>>(() => backoffice.users({ limit: 100 }), []);
  const offline = useNeedsConnection(list.error);

  const staff = (list.data?.data ?? []).filter(user => user.role !== ROLE.CUSTOMER);

  // Ticking rows and acting on them is the admin's: one slip removes a lot,
  // and the server refuses it to anyone else.
  const { user: sessionUser } = useSession();
  const isAdmin = sessionUser?.role === 1;
  const selection = useSelection(staff.map(user => String(user.id)));

  return (
    <Screen
      title="ستاف و دەسەڵاتەکان"
      subtitle="کێ دەتوانێت چی بکات"
      scroll={false}
      actions={<Button tone="ink" label="زیادکردن" onPress={() => setEditing('new')} />}
    >
      {offline ? (
        <NeedsConnection what="بەڕێوەبردنی ستاف" />
      ) : list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <Problem error={list.error} onRetry={list.reload} />
      ) : staff.length === 0 ? (
        <Empty title="هیچ ستافێک نییە" />
      ) : (
        <Table
          rows={staff}
          keyFor={user => String(user.id)}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          onPress={setEditing}
          selection={isAdmin ? selection : undefined}
          columns={COLUMNS}
        />
      )}

      <StaffSheet
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); list.refresh(); }}
      />
      {isAdmin && (
        <BulkBar
          count={selection.count}
          noun="کارمەند"
          onClear={selection.clear}
          onDelete={async () => {
            try {
              reportBulk(await backoffice.bulkDelete('users', selection.ids.map(id => (/^\d+$/.test(id) ? Number(id) : id))), 'کارمەند');
              selection.clear();
              list.refresh();
            } catch (error) {
              Alert.alert('نەتوانرا بسڕدرێتەوە', (error as Error).message);
            }
          }}
        />
      )}
    </Screen>
  );
}

// The panel's users table: who, how to reach them, what they are, and what
// they are allowed to do. Tapping a row opens the same editor.
const COLUMNS: Column<User>[] = [
  {
    title: 'ناو',
    width: 1.8,
    primary: true,
    render: user => <Titled title={user.name} sub={user.email} />,
  },
  { title: 'مۆبایل', width: 1.3, align: 'center', render: user => displayPhone(user.phone) || '—' },
  {
    title: 'ڕۆڵ',
    width: 1,
    align: 'center',
    render: user => (
      <Pill
        label={ROLES.find(role => role.id === user.role)?.label ?? '—'}
        tone={user.role === ROLE.ADMIN ? 'info' : 'neutral'}
      />
    ),
  },
  {
    title: 'دەسەڵاتەکان',
    width: 2,
    render: user =>
      user.role === ROLE.ADMIN
        ? 'دەسەڵاتی تەواو'
        : Array.isArray(user.permissions)
          ? `${user.permissions.length} دەسەڵاتی دیاریکراو`
          : 'دەسەڵاتە بنەڕەتییەکانی ڕۆڵەکەی',
  },
];

function StaffSheet({
  target,
  onClose,
  onSaved,
}: {
  target: User | 'new' | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const existing = target && target !== 'new' ? target : null;

  const [name, setName] = useState(existing?.name ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [password, setPassword] = useState('');
  // Staff, never Admin. See the note on the screen above.
  const [role, setRole] = useState<Role>(existing?.role ?? ROLE.STAFF);
  const [granted, setGranted] = useState<string[]>(
    Array.isArray(existing?.permissions) ? existing!.permissions! : PRESETS.warehouse
  );
  const [saving, setSaving] = useState(false);

  if (!target) return null;

  const toggle = (id: string) =>
    setGranted(previous =>
      previous.includes(id) ? previous.filter(p => p !== id) : [...previous, id]
    );

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('ناتەواو', 'ناوی تەواو پێویستە.');
      return;
    }

    if (!existing && !password.trim()) {
      Alert.alert('تێپەڕەوشە', 'هەژماری ستاف پێویستی بە تێپەڕەوشەیە.');
      return;
    }

    setSaving(true);
    try {
      await backoffice.saveUser(
        {
          name: name.trim(),
          phone: phone.trim() || null,
          role,
          permissions: role === ROLE.ADMIN ? null : granted,
          ...(password.trim() ? { password: password.trim() } : {}),
        },
        existing?.id
      );
      onSaved();
    } catch (error) {
      Alert.alert('نەتوانرا پاشەکەوت بکرێت', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = () =>
    existing &&
    Alert.alert('سڕینەوەی کارمەند', `«${existing.name}» دەسڕدرێتەوە و ناتوانێت بچێتە ژوورەوە. دڵنیایت؟`, [
      { text: 'نەخێر', style: 'cancel' },
      {
        text: 'بیسڕەوە',
        style: 'destructive',
        onPress: async () => {
          try {
            await backoffice.deleteUser(existing.id);
            onSaved();
          } catch (error) {
            Alert.alert('نەتوانرا بسڕدرێتەوە', (error as Error).message);
          }
        },
      },
    ]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{existing ? existing.name : 'ستافی نوێ'}</Text>

          <ScrollView contentContainerStyle={styles.sheetScroll}>
            <TextInput style={styles.input} placeholder="ناوی تەواو" placeholderTextColor={colors.textFaint}
              value={name} onChangeText={setName} textAlign="right" />
            <TextInput style={styles.input} placeholder="ژمارەی مۆبایل" placeholderTextColor={colors.textFaint}
              keyboardType="phone-pad" value={phone} onChangeText={setPhone} textAlign="right" />
            <TextInput style={styles.input}
              placeholder={existing ? 'تێپەڕەوشەی نوێ (ئارەزوومەندانە)' : 'تێپەڕەوشە'}
              placeholderTextColor={colors.textFaint} secureTextEntry
              value={password} onChangeText={setPassword} textAlign="right" />

            <Text style={styles.label}>ڕۆڵ</Text>
            <View style={styles.roleRow}>
              {ROLES.map(option => (
                <Pressable
                  key={option.id}
                  style={[styles.roleOption, role === option.id && styles.roleOptionActive]}
                  onPress={() => {
                    setRole(option.id);
                    if (option.id === ROLE.CASHIER) setGranted(PRESETS.cashier);
                    if (option.id === ROLE.STAFF) setGranted(PRESETS.warehouse);
                  }}
                >
                  <Text style={[styles.roleOptionText, role === option.id && styles.roleOptionTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {role === ROLE.ADMIN ? (
              <Text style={styles.adminNote}>
                بەڕێوەبەر هەموو دەسەڵاتەکانی هەیە و ناتوانرێت سنووردار بکرێت.
              </Text>
            ) : (
              <>
                <Text style={styles.label}>دەسەڵاتەکان ({granted.length})</Text>

                {ALL_PERMISSIONS.map(permission => (
                  <View key={permission.id} style={styles.permRow}>
                    <Switch
                      value={granted.includes(permission.id)}
                      onValueChange={() => toggle(permission.id)}
                    />
                    <View style={styles.permText}>
                      <Text style={styles.permLabel}>{permission.label}</Text>
                      <Text style={styles.permHint}>{permission.hint}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </ScrollView>

          <View style={styles.sheetActions}>
            <Button label="داخستن" tone="quiet" onPress={onClose} />
            {existing && <Button label="سڕینەوە" tone="danger" onPress={remove} />}
            <Button label={saving ? 'پاشەکەوت…' : 'پاشەکەوتکردن'} onPress={save} disabled={saving} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%', backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.sm,
  },
  sheetScroll: { gap: spacing.sm, paddingBottom: spacing.md },
  sheetTitle: { ...typography.title, color: colors.text, textAlign: 'right' },
  input: {
    minHeight: TOUCH_TARGET, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, ...typography.body, color: colors.text,
  },
  label: { ...typography.heading, color: colors.text, textAlign: 'right', marginTop: spacing.sm },
  roleRow: { flexDirection: 'row-reverse', gap: spacing.sm, flexWrap: 'wrap' },
  roleOption: {
    minHeight: TOUCH_TARGET - 8, justifyContent: 'center', paddingHorizontal: spacing.md,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
  },
  roleOptionActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  roleOptionText: { ...typography.small, color: colors.textMuted },
  roleOptionTextActive: { color: '#fff' },
  adminNote: { ...typography.small, color: colors.warning, textAlign: 'right' },
  permRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  permText: { flex: 1 },
  permLabel: { ...typography.small, color: colors.text, textAlign: 'right' },
  permHint: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },
  sheetActions: { flexDirection: 'row-reverse', gap: spacing.sm },
});
