import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { backoffice, displayPhone, timeAgo, type ContactMessage, type Paginated } from '@galokids/core';
import { Empty, Loading, NeedsConnection, Problem, Screen } from '@/components/kit';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * What customers wrote in.
 *
 * Unread ones are marked and sit at the top of mind — an enquiry that reaches
 * the database and is never seen is a lost sale, and that is exactly what was
 * happening while this screen's requests were going out without a token.
 */
export default function MessagesScreen() {
  const list = useFetch<ContactMessage[] | Paginated<ContactMessage>>(
    () => backoffice.messages({ limit: 100 }),
    []
  );

  const offline = useNeedsConnection(list.error);
  const messages = Array.isArray(list.data) ? list.data : (list.data?.data ?? []);
  const unread = messages.filter(message => !message.read_at).length;

  const markRead = async (message: ContactMessage) => {
    if (message.read_at) return;

    try {
      await backoffice.markMessageRead(message.id);
      list.refresh();
    } catch (error) {
      Alert.alert('نەتوانرا نیشانە بکرێت', (error as Error).message);
    }
  };

  return (
    <Screen
      title="پەیامەکان"
      subtitle={unread > 0 ? `${unread} پەیامی نەخوێندراوە` : 'هەموویان خوێندراونەتەوە'}
      scroll={false}
    >
      {offline ? (
        <NeedsConnection what="پەیامەکان" />
      ) : list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <Problem error={list.error} onRetry={list.reload} />
      ) : messages.length === 0 ? (
        <Empty title="هیچ پەیامێک نییە" />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={message => String(message.id)}
          contentContainerStyle={styles.list}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, !item.read_at && styles.cardUnread]}
              onPress={() => markRead(item)}
            >
              <View style={styles.head}>
                {!item.read_at && <View style={styles.dot} />}

                <View style={styles.headText}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.contact}>
                    {[displayPhone(item.phone), item.email].filter(Boolean).join(' · ')}
                  </Text>
                </View>

                <Text style={styles.when}>{timeAgo(item.created_at)}</Text>
              </View>

              <Text style={styles.message}>{item.message}</Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  card: {
    padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, gap: spacing.xs,
  },
  cardUnread: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  headText: { flex: 1 },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.brand },
  name: { ...typography.heading, color: colors.text, textAlign: 'right' },
  contact: { ...typography.tiny, color: colors.textMuted, textAlign: 'right' },
  when: { ...typography.tiny, color: colors.textFaint },
  message: { ...typography.small, color: colors.text, textAlign: 'right', lineHeight: 22 },
});
