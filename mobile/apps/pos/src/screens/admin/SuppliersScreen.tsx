import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Alert,
  backoffice,
  displayPhone,
  formatDay,
  formatIQD,
  toDateKey,
  type Supplier,
  type SupplierStatement,
} from '@galokids/core';
import { Button, Chips, Empty, Loading, NeedsConnection, Problem, Screen, Stat } from '@/components/kit';
import { Fact, Field, Group, Sheet, sheetStyles } from '@/components/Sheet';
import { Pill, Table, type Column } from '@/components/Table';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { useSession } from '@/state/useSession';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Who the shop buys from, and what it still owes them.
 *
 * The balance counts direct payments as well as purchases. Leaving those out
 * showed a debt the shop had already settled, which is the kind of error that
 * gets argued about at the door.
 */
export default function SuppliersScreen() {
  const { can } = useSession();
  const manage = can('purchases.manage');

  const [open, setOpen] = useState<Supplier | null>(null);
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null);
  const [paying, setPaying] = useState<Supplier | null>(null);

  const list = useFetch<Supplier[]>(() => backoffice.suppliers(), []);
  const offline = useNeedsConnection(list.error);

  const owed = (list.data ?? []).reduce((sum, s) => sum + Math.max(0, Number(s.debt_balance ?? 0)), 0);

  // Who the shop buys from, how to reach them, and what it still owes each.
  const columns: Column<Supplier>[] = [
    { title: 'دابینکەر', width: 2, primary: true, render: supplier => supplier.name },
    { title: 'مۆبایل', width: 1.3, align: 'center', render: supplier => displayPhone(supplier.phone) || '—' },
    { title: 'تێبینی', width: 2, render: supplier => supplier.notes || '—' },
    {
      title: 'قەرزی ماوە',
      width: 1.2,
      align: 'center',
      render: supplier => {
        const balance = Number(supplier.debt_balance ?? 0);

        return <Pill label={formatIQD(balance)} tone={balance > 0 ? 'bad' : 'good'} />;
      },
    },
    {
      title: 'کردار',
      width: 1.1,
      align: 'center',
      render: supplier =>
        manage && Number(supplier.debt_balance ?? 0) > 0 ? (
          <Pressable style={styles.payButton} onPress={() => setPaying(supplier)}>
            <Text style={styles.payButtonText}>پارەدان</Text>
          </Pressable>
        ) : (
          <Text style={styles.noAction}>—</Text>
        ),
    },
  ];

  return (
    <Screen
      title="دابینکەران"
      subtitle="هەژمار و قەرزەکان"
      scroll={false}
      actions={manage ? <Button label="دابینکەری نوێ" onPress={() => setEditing('new')} /> : undefined}
    >
      {offline ? (
        <NeedsConnection what="دابینکەران" />
      ) : list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <Problem error={list.error} onRetry={list.reload} />
      ) : (
        <>
          <Stat label="کۆی قەرز" value={formatIQD(owed)} tone={owed > 0 ? 'bad' : 'good'} />

          {(list.data?.length ?? 0) === 0 ? (
            <Empty title="هیچ دابینکەرێک نییە" />
          ) : (
            <Table
              rows={list.data!}
              keyFor={supplier => String(supplier.id)}
              refreshing={list.refreshing}
              onRefresh={list.refresh}
              columns={columns}
              onPress={setOpen}
            />
          )}
        </>
      )}

      {open && (
        <Statement
          supplier={open}
          canManage={manage}
          onClose={() => setOpen(null)}
          onEdit={() => {
            setEditing(open);
            setOpen(null);
          }}
          onPay={() => {
            setPaying(open);
            setOpen(null);
          }}
          onChanged={list.refresh}
        />
      )}
      {editing && <SupplierForm target={editing} onClose={() => setEditing(null)} onSaved={list.refresh} />}
      {paying && <PaymentSheet supplier={paying} onClose={() => setPaying(null)} onSaved={list.refresh} />}
    </Screen>
  );
}

/* --------------------------------------------------------- statement --- */

function Statement({
  supplier,
  canManage,
  onClose,
  onEdit,
  onPay,
  onChanged,
}: {
  supplier: Supplier;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onPay: () => void;
  onChanged: () => void;
}) {
  const detail = useFetch<SupplierStatement>(() => backoffice.supplier(supplier.id), [supplier.id]);

  const remove = () =>
    Alert.alert('سڕینەوەی دابینکەر', `«${supplier.name}» دەسڕدرێتەوە. دڵنیایت؟`, [
      { text: 'نەخێر', style: 'cancel' },
      {
        text: 'بیسڕەوە',
        style: 'destructive',
        onPress: async () => {
          try {
            await backoffice.deleteSupplier(supplier.id);
            onChanged();
            onClose();
          } catch (error) {
            // The server refuses while there are purchases or payments, and says so.
            Alert.alert('نەتوانرا بسڕدرێتەوە', (error as Error).message);
          }
        },
      },
    ]);

  const data = detail.data;
  const balance = Number(data?.debt_balance ?? supplier.debt_balance ?? 0);

  return (
    <Sheet title={supplier.name} onClose={onClose}>
      {detail.loading && !data ? (
        <Loading />
      ) : (
        <>
          <Group title="هەژمار">
            {data?.opening_balance ? <Fact label="قەرزی پێشوو" value={formatIQD(data.opening_balance)} /> : null}
            <Fact label="کۆی کڕین" value={formatIQD(data?.total_purchases ?? 0)} />
            <Fact label="کۆی پارەی دراو" value={formatIQD(data?.total_paid ?? 0)} tone="good" />
            <Fact label="قەرزی ماوە" value={formatIQD(balance)} tone={balance > 0 ? 'bad' : 'good'} />
          </Group>

          <Group title="پەیوەندی">
            <Fact label="مۆبایل" value={displayPhone(supplier.phone) || '—'} />
            {data?.company ? <Fact label="کۆمپانیا" value={data.company} /> : null}
            {data?.contact_person ? <Fact label="کەسی پەیوەندی" value={data.contact_person} /> : null}
            {data?.address ? <Fact label="ناونیشان" value={data.address} /> : null}
            {supplier.notes ? <Fact label="تێبینی" value={supplier.notes} /> : null}
          </Group>

          <Group title={`کڕینەکان · ${data?.purchases.length ?? 0}`}>
            {(data?.purchases ?? []).map(purchase => (
              <View key={purchase.id} style={styles.entry}>
                <Text style={styles.entryAmount}>{formatIQD(purchase.total_amount)}</Text>
                <View style={styles.entryText}>
                  <Text style={styles.entryTitle}>{purchase.invoice_number}</Text>
                  <Text style={styles.entrySub}>
                    {formatDay(purchase.purchase_date)} · دراوە {formatIQD(purchase.paid_amount)}
                  </Text>
                </View>
              </View>
            ))}
            {(data?.purchases.length ?? 0) === 0 && <Text style={sheetStyles.hint}>هیچ کڕینێک نییە.</Text>}
          </Group>

          <Group title={`پارەدانەکان · ${data?.payments.length ?? 0}`}>
            {(data?.payments ?? []).map(payment => (
              <View key={payment.id} style={styles.entry}>
                <Text style={[styles.entryAmount, { color: colors.success }]}>{formatIQD(payment.amount)}</Text>
                <View style={styles.entryText}>
                  <Text style={styles.entryTitle}>{formatDay(payment.payment_date)}</Text>
                  {payment.notes ? <Text style={styles.entrySub}>{payment.notes}</Text> : null}
                </View>
              </View>
            ))}
            {(data?.payments.length ?? 0) === 0 && <Text style={sheetStyles.hint}>هیچ پارەدانێک نییە.</Text>}
          </Group>

          {canManage && (
            <View style={sheetStyles.actions}>
              {balance > 0 && <Button label="پارەدان" onPress={onPay} />}
              <Button label="دەستکاری" tone="quiet" onPress={onEdit} />
              <Button label="سڕینەوە" tone="danger" onPress={remove} />
            </View>
          )}
        </>
      )}
    </Sheet>
  );
}

/* -------------------------------------------------------------- form --- */

function SupplierForm({
  target,
  onClose,
  onSaved,
}: {
  target: Supplier | 'new';
  onClose: () => void;
  onSaved: () => void;
}) {
  const existing = target === 'new' ? null : target;

  const [name, setName] = useState(existing?.name ?? '');
  const [company, setCompany] = useState(existing?.company ?? '');
  const [contact, setContact] = useState(existing?.contact_person ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [opening, setOpening] = useState(existing?.opening_balance ? String(existing.opening_balance) : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return Alert.alert('ناو', 'ناوی دابینکەر بنووسە.');

    setBusy(true);
    try {
      await backoffice.saveSupplier(
        {
          name: name.trim(),
          company: company.trim() || null,
          contact_person: contact.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          opening_balance: opening ? Number(opening) : 0,
          notes: notes.trim() || null,
        },
        existing?.id
      );
      onSaved();
      onClose();
    } catch (error) {
      Alert.alert('نەتوانرا پاشەکەوت بکرێت', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={existing ? 'دەستکاریکردنی دابینکەر' : 'دابینکەری نوێ'} onClose={onClose}>
      <Field value={name} onChange={setName} placeholder="ناو *" />
      <Field value={company} onChange={setCompany} placeholder="کۆمپانیا" />
      <Field value={contact} onChange={setContact} placeholder="کەسی پەیوەندی" />
      <View style={sheetStyles.pair}>
        <Field value={phone} onChange={setPhone} placeholder="مۆبایل" phone half />
        <Field value={email} onChange={setEmail} placeholder="ئیمەیڵ" half />
      </View>
      <Field value={address} onChange={setAddress} placeholder="ناونیشان" />
      <Field value={opening} onChange={setOpening} placeholder="قەرزی پێشوو (پێش ئەم سیستەمە)" numeric />
      <Field value={notes} onChange={setNotes} placeholder="تێبینی" multiline />
      <Button label={busy ? 'پاشەکەوت…' : 'پاشەکەوتکردن'} onPress={save} disabled={busy} />
    </Sheet>
  );
}

/* ----------------------------------------------------------- payment --- */

function PaymentSheet({
  supplier,
  onClose,
  onSaved,
}: {
  supplier: Supplier;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return Alert.alert('بڕ', 'بڕێکی دروست بنووسە.');

    setSaving(true);
    try {
      await backoffice.paySupplier(supplier.id, {
        amount: value,
        payment_date: toDateKey(),
        payment_method: method,
        notes: notes.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (error) {
      Alert.alert('نەتوانرا تۆمار بکرێت', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet title={supplier.name} onClose={onClose} maxWidth={480}>
      <Text style={sheetStyles.hint}>قەرزی ماوە: {formatIQD(Number(supplier.debt_balance ?? 0))}</Text>
      <Field value={amount} onChange={setAmount} placeholder="بڕی پارەدان" numeric />
      <Chips
        value={method}
        onChange={setMethod}
        options={[
          { id: 'cash', label: 'کاش' },
          { id: 'transfer', label: 'گواستنەوە' },
        ]}
      />
      <Field value={notes} onChange={setNotes} placeholder="تێبینی" />
      <Button label={saving ? 'تۆمار…' : 'تۆمارکردن'} onPress={save} disabled={saving} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  payButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
  },
  payButtonText: { color: '#fff', ...typography.tiny },
  noAction: { ...typography.small, color: colors.textFaint },

  entry: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  entryText: { flex: 1, alignItems: 'flex-end' },
  entryTitle: { ...typography.small, color: colors.text, textAlign: 'right' },
  entrySub: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },
  entryAmount: { ...typography.small, color: colors.text },
});
