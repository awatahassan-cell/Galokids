import { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { backoffice, catalogue, type Category } from '@galokids/core';
import { Button, Empty, Loading, NeedsConnection, Problem, Screen } from '@/components/kit';
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
        <FlatList
          data={list.data!}
          keyExtractor={category => String(category.id)}
          contentContainerStyle={styles.list}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => setEditing(item)}>
              <Text style={styles.count}>{item.products_count ?? 0}</Text>
              <Text style={styles.name}>{item.name_ku || item.name}</Text>
            </Pressable>
          )}
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

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{existing ? 'دەستکاریکردن' : 'بەشی نوێ'}</Text>

          <TextInput style={styles.input} placeholder="ناو (ئینگلیزی)"
            placeholderTextColor={colors.textFaint} value={name} onChangeText={setName} textAlign="right" />
          <TextInput style={styles.input} placeholder="ناو (کوردی)"
            placeholderTextColor={colors.textFaint} value={nameKu} onChangeText={setNameKu} textAlign="right" />

          <View style={styles.sheetActions}>
            <Button label="داخستن" tone="quiet" onPress={onClose} />
            <Button label={saving ? 'پاشەکەوت…' : 'پاشەکەوتکردن'} onPress={save} disabled={saving} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm,
    minHeight: TOUCH_TARGET + 6, paddingHorizontal: spacing.md,
    borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  name: { flex: 1, ...typography.body, color: colors.text, textAlign: 'right' },
  count: {
    minWidth: 34, textAlign: 'center', ...typography.small,
    color: colors.brand, ...typography.mono,
  },
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
