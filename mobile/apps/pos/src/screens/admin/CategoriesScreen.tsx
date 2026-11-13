import { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { Alert, backoffice, catalogue, type Category } from '@galokids/core';
import { Button, Empty, Loading, NeedsConnection, Problem, Screen } from '@/components/kit';
import { Pill, Table, Titled, type Column } from '@/components/Table';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/** The shop's sections, and how many garments are in each. */
export default function CategoriesScreen() {
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const list = useFetch<Category[]>(() => catalogue.categories(), []);
  const offline = useNeedsConnection(list.error);

  return (
    <Screen
      title="بەشەکان"
      subtitle="پۆلەکانی فرۆشگا"
      scroll={false}
      actions={<Button label="نوێ" onPress={() => setEditing('new')} />}
    >
      {offline ? (
        <NeedsConnection what="بەشەکان" />
      ) : list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <Problem error={list.error} onRetry={list.reload} />
      ) : (list.data?.length ?? 0) === 0 ? (
        <Empty title="هیچ بەشێک نییە" />
      ) : (
        <Table
          rows={list.data!}
          keyFor={category => String(category.id)}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          onPress={setEditing}
          columns={COLUMNS}
        />
      )}

      <CategorySheet
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); list.refresh(); }}
      />
    </Screen>
  );
}

// The shop's departments: the name in each language, and how much is in it.
const COLUMNS: Column<Category>[] = [
  {
    title: 'بەش',
    width: 2,
    primary: true,
    render: category => <Titled title={category.name_ku || category.name} sub={category.slug} />,
  },
  { title: 'ئینگلیزی', width: 1.4, render: category => category.name || '—' },
  { title: 'عەرەبی', width: 1.4, render: category => category.name_ar || '—' },
  {
    title: 'بەرهەم',
    width: 0.9,
    align: 'center',
    render: category => (
      <Pill
        label={String(category.products_count ?? 0)}
        tone={(category.products_count ?? 0) > 0 ? 'info' : 'neutral'}
      />
    ),
  },
];

function CategorySheet({
  target,
  onClose,
  onSaved,
}: {
  target: Category | 'new' | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const existing = target && target !== 'new' ? target : null;
  const [name, setName] = useState(existing?.name ?? '');
  const [nameKu, setNameKu] = useState(existing?.name_ku ?? '');
  const [nameAr, setNameAr] = useState(existing?.name_ar ?? '');
  const [saving, setSaving] = useState(false);

  if (!target) return null;

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('ناتەواو', 'ناوێک پێویستە.');
      return;
    }

    setSaving(true);
    try {
      await backoffice.saveCategory(
        {
          name: name.trim(),
          name_ku: nameKu.trim() || null,
          name_ar: nameAr.trim() || null,
          // The server needs a slug for a new one; derive it rather than
          // asking the shopkeeper for something they have no view on.
          slug: existing?.slug ?? name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
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
    Alert.alert('سڕینەوەی بەش', `«${existing.name_ku || existing.name}» دەسڕدرێتەوە. دڵنیایت؟`, [
      { text: 'نەخێر', style: 'cancel' },
      {
        text: 'بیسڕەوە',
        style: 'destructive',
        onPress: async () => {
          try {
            await backoffice.deleteCategory(existing.id);
            onSaved();
          } catch (error) {
            // A section that still has products is refused, and the server says why.
            Alert.alert('نەتوانرا بسڕدرێتەوە', (error as Error).message);
          }
        },
      },
    ]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{existing ? 'دەستکاریکردن' : 'بەشی نوێ'}</Text>

          <TextInput style={styles.input} placeholder="ناو (ئینگلیزی)"
            placeholderTextColor={colors.textFaint} value={name} onChangeText={setName} textAlign="right" />
          <TextInput style={styles.input} placeholder="ناو (کوردی)"
            placeholderTextColor={colors.textFaint} value={nameKu} onChangeText={setNameKu} textAlign="right" />
          <TextInput style={styles.input} placeholder="ناو (عەرەبی)"
            placeholderTextColor={colors.textFaint} value={nameAr} onChangeText={setNameAr} textAlign="right" />

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
    backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.lg, gap: spacing.sm,
  },
  sheetTitle: { ...typography.title, color: colors.text, textAlign: 'right' },
  input: {
    minHeight: TOUCH_TARGET, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, ...typography.body, color: colors.text,
  },
  sheetActions: { flexDirection: 'row-reverse', gap: spacing.sm, marginTop: spacing.sm },
});
