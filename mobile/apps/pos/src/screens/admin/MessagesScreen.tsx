import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Alert, backoffice, displayPhone, timeAgo, type ContactMessage, type Paginated } from '@galokids/core';
import { Button, Empty, Loading, NeedsConnection, Problem, Screen } from '@/components/kit';
import { Fact, Group, Sheet, sheetStyles } from '@/components/Sheet';
import { Pill, Table, Titled, type Column } from '@/components/Table';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { colors, radius, typography } from '@/theme';

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

  const [open, setOpen] = useState<ContactMessage | null>(null);
  const offline = useNeedsConnection(list.error);
  const messages = Array.isArray(list.data) ? list.data : (list.data?.data ?? []);
  const unread = messages.filter(message => message.status === 'unread').length;

  // Opening a message reads it: the panel marks it as read the moment it is opened.
  const markRead = async (message: ContactMessage) => {
    setOpen(message);
    if (message.status !== 'unread') return;

    try {
      await backoffice.markMessageRead(message.id);
      list.refresh();
    } catch (error) {
      Alert.alert('نەتوانرا نیشانە بکرێت', (error as Error).message);
    }
  };

  const remove = (message: ContactMessage) =>
    Alert.alert('سڕینەوەی پەیام', 'ئەم پەیامە دەسڕدرێتەوە. دڵنیایت؟', [
      { text: 'نەخێر', style: 'cancel' },
      {
        text: 'بیسڕەوە',
        style: 'destructive',
        onPress: async () => {
          try {
            await backoffice.deleteMessage(message.id);
            setOpen(null);
            list.refresh();
          } catch (error) {
            Alert.alert('نەتوانرا بسڕدرێتەوە', (error as Error).message);
          }
        },
      },
    ]);

  const reply = (message: ContactMessage) => {
    let phone = (message.phone ?? '').replace(/\D/g, '');
    if (phone.startsWith('07')) phone = '964' + phone.slice(1);
    else if (phone.startsWith('7')) phone = '964' + phone;
    if (phone) Linking.openURL(`https://wa.me/${phone}`);
    else if (message.email) Linking.openURL(`mailto:${message.email}`);
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
        <Table
          rows={messages}
          keyFor={message => String(message.id)}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          onPress={markRead}
          columns={COLUMNS}
        />
      )}

      {open && (
        <Sheet title={open.name || 'پەیام'} onClose={() => setOpen(null)}>
          <Group title="کەسی نێرەر">
            <Fact label="ناو" value={open.name || '—'} />
            {open.phone ? <Fact label="مۆبایل" value={displayPhone(open.phone)} /> : null}
            {open.email ? <Fact label="ئیمەیڵ" value={open.email} /> : null}
            <Fact label="کات" value={timeAgo(open.created_at)} />
          </Group>
          <Group title="پەیام">
            <Text style={styles.body}>{open.message}</Text>
          </Group>
          <View style={sheetStyles.actions}>
            {(open.phone || open.email) && <Button label="وەڵامدانەوە" onPress={() => reply(open)} />}
            <Button label="سڕینەوە" tone="danger" onPress={() => remove(open)} />
          </View>
        </Sheet>
      )}
    </Screen>
  );
}

// The panel's inbox: who wrote, how to reach them, what they said, when, and
// whether anyone has opened it. Tapping a row marks it read.
const COLUMNS: Column<ContactMessage>[] = [
  {
    title: 'نێرەر',
    width: 1.6,
    primary: true,
    render: message => (
      <Titled
        title={message.name}
        sub={[displayPhone(message.phone), message.email].filter(Boolean).join(' · ') || null}
        leading={message.status === 'unread' ? <View style={styles.dot} /> : undefined}
      />
    ),
  },
  {
    title: 'پەیام',
    width: 3.4,
    render: message => (
      <Text style={[styles.message, message.status === 'unread' && styles.messageUnread]} numberOfLines={3}>
        {message.message}
      </Text>
    ),
  },
  { title: 'بەروار', width: 1, align: 'center', render: message => timeAgo(message.created_at) },
  {
    title: 'دۆخ',
    width: 0.9,
    align: 'center',
    render: message =>
      message.status === 'unread' ? <Pill label="نوێ" tone="info" /> : <Pill label={message.status === 'replied' ? "وەڵامدراوە" : "خوێندراوە"} tone={message.status === 'replied' ? "good" : "neutral"} />,
  },
];

const styles = StyleSheet.create({
  body: { ...typography.body, color: colors.text, textAlign: 'right', lineHeight: 26 },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.brand },
  message: { ...typography.small, color: colors.textMuted, textAlign: 'right' },
  messageUnread: { color: colors.text },
});
