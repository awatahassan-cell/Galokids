import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Alert,
  backoffice,
  displayPhone,
  formatDay,
  formatIQD,
  toDateKey,
  type NewPurchase,
  type Paginated,
  type Purchase,
  type Supplier,
} from '@galokids/core';
import { Button, Chips, Empty, Loading, NeedsConnection, Problem, Screen, SearchField, Stat } from '@/components/kit';
import { DateRange, sendable, type Range } from '@/components/DateRange';
import { ProductGrid } from '@/components/ProductGrid';
import { Fact, Field, Group, Sheet, sheetStyles } from '@/components/Sheet';
import { Pill, Table, Titled, type Column } from '@/components/Table';
import { variationsFor, type LocalProduct, type LocalVariation } from '@/offline';
import { VariationPicker } from '@/screens/TillScreen';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { useSession } from '@/state/useSession';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * What the shop bought in.
 *
 * The unpaid balance is the figure that matters — a delivery taken on credit
 * is money owed, and it is easy to lose track of when the stock has already
 * been put on the shelves. Recording a purchase puts the goods into stock and
 * moves the product's cost, so it is a stock event as much as a money one.
 */
export default function PurchasesScreen() {
  const { can } = useSession();
  const [term, setTerm] = useState('');
  const [payStatus, setPayStatus] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [range, setRange] = useState<Range>({ from: '', to: '' });

  const list = useFetch<Paginated<Purchase>>(
    () =>
      backoffice.purchases({
        limit: 50,
        search: term.trim() || undefined,
        status: payStatus === 'all' ? undefined : payStatus,
        ...sendable(range),
      }),
    [term, payStatus, range.from, range.to]
  );
  const offline = useNeedsConnection(list.error);
  const [open, setOpen] = useState<Purchase | null>(null);
  const [creating, setCreating] = useState(false);

  const rows = list.data?.data ?? [];
  const owed = rows.reduce((sum, p) => sum + Math.max(0, p.total_amount - p.paid_amount), 0);
  const paidTotal = rows.reduce((sum, p) => sum + Number(p.paid_amount), 0);
  const pieces = rows.reduce((sum, p) => sum + (p.items ?? []).reduce((n, item) => n + item.quantity, 0), 0);
  const spent = rows.reduce((sum, p) => sum + Number(p.total_amount), 0);

  return (
    <Screen
      title="کڕین"
      subtitle="وەصڵی کڕین و تێچووی کۆگا"
      scroll={false}
      actions={can('purchases.manage') ? <Button tone="ink" label="کڕینی نوێ" onPress={() => setCreating(true)} /> : undefined}
    >
      <SearchField value={term} onChange={setTerm} placeholder="گەڕان بە ژمارەی پسووڵە، دابینکەر یان تێبینی…" />
      <DateRange value={range} onChange={setRange} />
      <Chips
        value={payStatus}
        onChange={setPayStatus}
        options={[
          { id: 'all', label: 'هەموو' },
          { id: 'paid', label: 'دراوە' },
          { id: 'partial', label: 'بەشێکی دراوە' },
          { id: 'unpaid', label: 'نەدراوە' },
        ]}
      />

      {offline ? (
        <NeedsConnection what="کڕینەکان" />
      ) : list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <Problem error={list.error} onRetry={list.reload} />
      ) : (
        <>
          <View style={styles.stats}>
            <Stat label="کۆی کڕینەکان" value={formatIQD(spent)} hint={`${rows.length} پسووڵە`} />
            <Stat label="بڕی پارەی دراو" value={formatIQD(paidTotal)} tone="good" />
            <Stat label="کۆی قەرزی سەپلایەرەکان" value={formatIQD(owed)} tone={owed > 0 ? 'bad' : 'good'} />
            <Stat label="کۆی دانەی هاتووی عەمبار" value={`${pieces} دانە`} />
          </View>

          {rows.length === 0 ? (
            <Empty title="هیچ کڕینێک تۆمار نەکراوە" />
          ) : (
            <Table
              rows={rows}
              keyFor={purchase => String(purchase.id)}
              refreshing={list.refreshing}
              onRefresh={list.refresh}
              columns={COLUMNS}
              onPress={setOpen}
            />
          )}
        </>
      )}

      {open && <PurchaseDetail purchase={open} onClose={() => setOpen(null)} onChanged={list.refresh} />}
      {creating && <PurchaseForm onClose={() => setCreating(false)} onSaved={list.refresh} />}
    </Screen>
  );
}

// The panel's purchase list: the invoice, who it was bought from, when, what
// it came to, what has been paid, and what is still owed.
const COLUMNS: Column<Purchase>[] = [
  {
    title: 'ژمارەی پسووڵە',
    width: 1.4,
    primary: true,
    render: purchase => (
      <Titled title={purchase.invoice_number || `کڕینی #${purchase.id}`} sub={`${purchase.items?.length ?? 0} بەرهەم`} />
    ),
  },
  { title: 'دابینکەر', width: 1.6, render: purchase => purchase.supplier_name || '—' },
  { title: 'بەروار', width: 1.2, render: purchase => formatDay(purchase.purchase_date) },
  {
    title: 'کۆی پسووڵە',
    width: 1.1,
    align: 'center',
    render: purchase => <Text style={styles.total}>{formatIQD(purchase.total_amount)}</Text>,
  },
  { title: 'بڕی دراو', width: 1.1, align: 'center', render: purchase => formatIQD(purchase.paid_amount) },
  {
    title: 'قەرزی ماوە',
    width: 1.1,
    align: 'center',
    render: purchase => {
      const remaining = Math.max(0, purchase.total_amount - purchase.paid_amount);

      return remaining > 0 ? <Pill label={formatIQD(remaining)} tone="bad" /> : <Pill label="دراوە" tone="good" />;
    },
  },
];

const METHODS: Record<string, string> = { cash: 'کاش', transfer: 'گواستنەوە', credit: 'قەرز' };

/* ------------------------------------------------------------ detail --- */

function PurchaseDetail({
  purchase,
  onClose,
  onChanged,
}: {
  purchase: Purchase;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { can } = useSession();
  const [busy, setBusy] = useState(false);
  const remaining = Math.max(0, purchase.total_amount - purchase.paid_amount);

  const remove = () =>
    Alert.alert(
      'سڕینەوەی کڕین',
      'کاڵاکانی ئەم کڕینە لە کۆگا دەکرێنەوە و پسووڵەکە دەسڕدرێتەوە. دڵنیایت؟',
      [
        { text: 'نەخێر', style: 'cancel' },
        {
          text: 'بیسڕەوە',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await backoffice.deletePurchase(purchase.id);
              onChanged();
              onClose();
            } catch (error) {
              Alert.alert('نەتوانرا بسڕدرێتەوە', (error as Error).message);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );

  return (
    <Sheet title={purchase.invoice_number} onClose={onClose}>
      <Group title="پسووڵە">
        <Fact label="دابینکەر" value={purchase.supplier_name} />
        {purchase.supplier_phone ? <Fact label="مۆبایل" value={displayPhone(purchase.supplier_phone)} /> : null}
        <Fact label="بەروار" value={formatDay(purchase.purchase_date)} />
        <Fact label="شێوازی پارەدان" value={METHODS[purchase.payment_method ?? ''] ?? purchase.payment_method ?? '—'} />
        {purchase.notes ? <Fact label="تێبینی" value={purchase.notes} /> : null}
      </Group>

      <Group title="بەرهەمەکان">
        {purchase.items.map(item => (
          <View key={item.id} style={styles.line}>
            <Text style={styles.lineTotal}>{formatIQD(item.subtotal)}</Text>
            <View style={styles.lineText}>
              <Text style={styles.lineName}>{item.product?.name_ku || item.product?.name || 'بەرهەم'}</Text>
              <Text style={styles.lineSub}>
                {[
                  [item.variation?.color, item.variation?.size].filter(Boolean).join(' · '),
                  `${item.quantity} × ${formatIQD(item.cost_price)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </View>
        ))}
      </Group>

      <Group title="پارە">
        <Fact label="کۆی پسووڵە" value={formatIQD(purchase.total_amount)} />
        <Fact label="دراوە" value={formatIQD(purchase.paid_amount)} tone="good" />
        <Fact label="ماوە" value={formatIQD(remaining)} tone={remaining > 0 ? 'bad' : 'good'} />
      </Group>

      {can('purchases.manage') && <Button label="سڕینەوەی کڕین" tone="danger" onPress={remove} disabled={busy} />}
    </Sheet>
  );
}

/* -------------------------------------------------------------- form --- */

interface Line {
  key: string;
  product: LocalProduct;
  variation: LocalVariation;
  quantity: string;
  cost: string;
  retail: string;
}

function PurchaseForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const suppliers = useFetch<Supplier[]>(() => backoffice.suppliers(), []);

  const [supplierId, setSupplierId] = useState<string>('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [date, setDate] = useState(toDateKey());
  const [method, setMethod] = useState<'cash' | 'transfer' | 'credit'>('cash');
  const [paid, setPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState<{ product: LocalProduct; options: LocalVariation[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.cost) || 0), 0);
  // Left empty, the whole invoice is paid. "Credit" means nothing paid yet.
  const paidValue = method === 'credit' ? 0 : paid.trim() === '' ? total : Math.min(Number(paid) || 0, total);

  const chooseSupplier = (id: string) => {
    setSupplierId(id);
    const found = (suppliers.data ?? []).find(s => String(s.id) === id);
    if (found) {
      setSupplierName(found.name);
      setSupplierPhone(found.phone ?? '');
    }
  };

  const addLine = (product: LocalProduct, variation: LocalVariation) => {
    setLines(list => {
      const existing = list.find(l => l.variation.id === variation.id);
      if (existing) {
        return list.map(l => (l === existing ? { ...l, quantity: String((Number(l.quantity) || 0) + 1) } : l));
      }

      return [
        ...list,
        {
          key: `${variation.id}`,
          product,
          variation,
          quantity: '1',
          // The cost the product already has, so only a change needs typing.
          cost: product.cost ? String(product.cost) : '',
          retail: '',
        },
      ];
    });
  };

  const pick = async (product: LocalProduct, variation: LocalVariation | null) => {
    if (variation) {
      addLine(product, variation);
      return setAdding(false);
    }

    const options = await variationsFor(product.id);
    if (options.length === 1) {
      addLine(product, options[0]!);
      setAdding(false);
    } else if (options.length > 1) {
      setPicking({ product, options });
    } else {
      Alert.alert('بێ جۆر', 'ئەم بەرهەمە هیچ ڕەنگ و قەبارەیەکی نییە. سەرەتا جۆرێکی بۆ زیاد بکە.');
    }
  };

  const save = async () => {
    if (!supplierName.trim()) return Alert.alert('دابینکەر', 'ناوی دابینکەر بنووسە.');
    if (lines.length === 0) return Alert.alert('بەرهەم', 'کەمیی یەک بەرهەم زیاد بکە.');
    if (lines.some(l => !(Number(l.quantity) >= 1) || l.cost.trim() === '')) {
      return Alert.alert('بەرهەمەکان', 'بڕ و تێچووی هەموو بەرهەمەکان بنووسە.');
    }

    const body: NewPurchase = {
      supplier_id: supplierId ? Number(supplierId) : null,
      supplier_name: supplierName.trim(),
      supplier_phone: supplierPhone.trim() || null,
      purchase_date: date,
      payment_method: method,
      paid_amount: paidValue,
      notes: notes.trim() || null,
      items: lines.map(l => ({
        product_id: l.product.id,
        product_variation_id: l.variation.id,
        quantity: Math.round(Number(l.quantity)),
        cost_price: Number(l.cost),
        retail_price: l.retail.trim() ? Number(l.retail) : null,
      })),
    };

    setBusy(true);
    try {
      await backoffice.savePurchase(body);
      onSaved();
      onClose();
    } catch (error) {
      Alert.alert('نەتوانرا تۆمار بکرێت', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="کڕینی نوێ" onClose={onClose}>
      <Group title="دابینکەر">
        {(suppliers.data?.length ?? 0) > 0 && (
          <Chips
            value={supplierId}
            onChange={chooseSupplier}
            options={[{ id: '', label: 'نوێ' }, ...(suppliers.data ?? []).map(s => ({ id: String(s.id), label: s.name }))]}
          />
        )}
        <Field value={supplierName} onChange={setSupplierName} placeholder="ناوی دابینکەر *" />
        <Field value={supplierPhone} onChange={setSupplierPhone} placeholder="مۆبایل" phone />
        <Field value={date} onChange={setDate} placeholder="بەروار (YYYY-MM-DD)" />
      </Group>

      <Group title={`بەرهەمەکان · ${lines.length}`}>
        {lines.map(line => (
          <View key={line.key} style={styles.formLine}>
            <View style={styles.lineText}>
              <Text style={styles.lineName}>{line.product.name_ku || line.product.name}</Text>
              <Text style={styles.lineSub}>{[line.variation.color, line.variation.size].filter(Boolean).join(' · ')}</Text>
            </View>
            <View style={sheetStyles.pair}>
              <Field value={line.quantity} onChange={v => setLines(l => l.map(x => (x === line ? { ...x, quantity: v } : x)))} placeholder="بڕ" numeric half />
              <Field value={line.cost} onChange={v => setLines(l => l.map(x => (x === line ? { ...x, cost: v } : x)))} placeholder="تێچوو" numeric half />
              <Field value={line.retail} onChange={v => setLines(l => l.map(x => (x === line ? { ...x, retail: v } : x)))} placeholder="نرخی فرۆشتن" numeric half />
            </View>
            <Pressable onPress={() => setLines(l => l.filter(x => x !== line))}>
              <Text style={styles.remove}>لابردن</Text>
            </Pressable>
          </View>
        ))}
        <Button label="زیادکردنی بەرهەم" tone="quiet" onPress={() => setAdding(true)} />
      </Group>

      <Group title="پارەدان">
        <Chips
          value={method}
          onChange={setMethod}
          options={[
            { id: 'cash', label: 'کاش' },
            { id: 'transfer', label: 'گواستنەوە' },
            { id: 'credit', label: 'قەرز' },
          ]}
        />
        {method !== 'credit' && (
          <Field value={paid} onChange={setPaid} placeholder={`بڕی دراو (بەتاڵ = ${formatIQD(total)})`} numeric />
        )}
        <Field value={notes} onChange={setNotes} placeholder="تێبینی" multiline />
        <Fact label="کۆی پسووڵە" value={formatIQD(total)} />
        <Fact label="ماوە" value={formatIQD(Math.max(0, total - paidValue))} tone={total - paidValue > 0 ? 'bad' : 'good'} />
      </Group>

      <Button label={busy ? 'تۆمار دەکرێت…' : 'تۆمارکردن'} onPress={save} disabled={busy} />

      <Modal visible={adding} transparent animationType="slide" onRequestClose={() => setAdding(false)}>
        <View style={styles.backdrop}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHead}>
              <Pressable onPress={() => setAdding(false)} hitSlop={12}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
              <Text style={styles.pickerTitle}>هەڵبژاردنی بەرهەم</Text>
            </View>
            <View style={{ flex: 1, padding: spacing.md }}>
              <ProductGrid onPick={pick} columns={2} />
            </View>
            {picking && (
              <View style={styles.pickerLayer}>
                <VariationPicker
                  product={picking.product}
                  options={picking.options}
                  onPick={option => {
                    addLine(picking.product, option);
                    setPicking(null);
                    setAdding(false);
                  }}
                  onCancel={() => setPicking(null)}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row-reverse', gap: spacing.sm },
  total: { ...typography.heading, color: colors.text },
  line: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  lineText: { flex: 1, alignItems: 'flex-end' },
  lineName: { ...typography.small, color: colors.text, textAlign: 'right' },
  lineSub: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },
  lineTotal: { ...typography.small, color: colors.text },
  formLine: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  remove: { ...typography.tiny, color: colors.danger, textAlign: 'right' },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end', alignItems: 'center' },
  pickerSheet: {
    width: '100%',
    maxWidth: 820,
    height: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
  },
  pickerHead: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: { ...typography.title, color: colors.text },
  close: { fontSize: 20, color: colors.textMuted },
  pickerLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
});
