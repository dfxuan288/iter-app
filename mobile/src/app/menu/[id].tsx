import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScanningPhoto } from '@/components/scan/ScanningPhoto';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { ArrowCounterClockwiseIcon, HourglassIcon, MinusIcon, PlusIcon, ReceiptIcon, SparkleIcon, TrashIcon, WarningIcon } from '@/components/ui/icons';
import { StackScreen } from '@/components/ui/StackScreen';
import { applyCharges, chargesSummary, orderBill, type MenuCharges } from '@/domain/menuPricing';
import { convertToMyr, formatMoney, type CurrencyCode } from '@/domain/money';
import { MAX_TEXT_LENGTH } from '@/services/expenseService';
import { rateQuoteFor } from '@/services/fxService';
import type { MenuDish, ScannedMenu } from '@/services/scanService';
import { useFx } from '@/state/FxProvider';
import { useMenus } from '@/state/MenuProvider';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';

/** A photographed menu: translated dishes, Ringgit prices with tax and service, and "I ordered this" (brief §7.5). */
export default function MenuScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { menus, retry, remove } = useMenus();
  const record = menus.find((menu) => menu.id === id);

  if (!record) {
    return (
      <StackScreen title="Menu">
        <Card style={styles.card}>
          <AppText variant="heading">This menu is no longer here</AppText>
          <AppText color="muted">ITER keeps your 10 most recent menus.</AppText>
          <Button label="Back to Scan" onPress={() => router.replace('/scan')} />
        </Card>
      </StackScreen>
    );
  }

  if (record.status === 'ready' && record.scan) {
    return <TranslatedMenu menu={record.scan.menu} readBy={record.scan.readBy} imageId={record.imageId} />;
  }

  const failed = record.status === 'failed';
  return (
    <StackScreen title="Menu">
      <ScanningPhoto imageId={record.imageId ?? record.scanImageId} scanning={!failed} />
      <Card style={styles.card}>
        <View style={styles.row} aria-live="polite">
          {failed ? <WarningIcon size={24} color={colors.danger} weight="fill" /> : <HourglassIcon size={24} color={colors.teal} />}
          <AppText variant="heading" style={styles.flex}>
            {failed ? 'Could not translate this menu' : 'Translating the menu'}
          </AppText>
        </View>
        <AppText color={failed ? 'danger' : 'muted'}>{failed ? (record.failure?.message ?? 'Try again.') : 'Reading every dish and price. This usually takes a few seconds.'}</AppText>
        {failed && record.failure?.canRetry ? <Button label="Try again" icon={ArrowCounterClockwiseIcon} onPress={() => retry(record.id)} /> : null}
        {failed ? (
          <Button
            label="Remove this photo"
            icon={TrashIcon}
            variant="quiet"
            onPress={() => {
              remove(record.id);
              router.replace('/scan');
            }}
          />
        ) : null}
      </Card>
    </StackScreen>
  );
}

function TranslatedMenu({ menu, readBy, imageId }: { menu: ScannedMenu; readBy: 'ai' | 'cache' | 'demo'; imageId: string | null }) {
  const router = useRouter();
  const { rates } = useFx();
  const [order, setOrder] = useState<Record<number, number>>({});
  const charges: MenuCharges = { pricesExcludeTax: menu.pricesExcludeTax, addedTaxPercent: menu.addedTaxPercent, serviceChargePercent: menu.serviceChargePercent };
  const rate = rateQuoteFor(rates, menu.currency)?.ratePerMyr ?? null;
  const inRinggit = (minor: number) => (rate ? formatMoney(convertToMyr(minor, menu.currency, rate), 'MYR') : null);
  const summary = chargesSummary(charges);

  const lines = menu.dishes.map((dish, index) => ({ dish, quantity: order[index] ?? 0 }));
  const ordered = lines.filter((line) => line.quantity > 0 && line.dish.priceMinor !== null);
  const bill = orderBill(ordered.map((line) => ({ printed: line.dish.priceMinor ?? 0, quantity: line.quantity })), charges);
  const change = (index: number, by: number) => setOrder((current) => ({ ...current, [index]: Math.max(0, (current[index] ?? 0) + by) }));

  const logOrder = () => {
    const names = ordered.map((line) => (line.quantity > 1 ? `${line.dish.translation} ×${line.quantity}` : line.dish.translation)).join(', ');
    router.push({
      pathname: '/expense/new',
      params: {
        from: 'menu',
        amount: String(bill.total),
        currency: menu.currency,
        merchant: (menu.restaurantName ?? 'Restaurant').slice(0, MAX_TEXT_LENGTH),
        note: names.slice(0, MAX_TEXT_LENGTH),
      },
    });
  };

  return (
    <StackScreen title={menu.restaurantName ?? 'Menu'}>
      <ScanningPhoto imageId={imageId} scanning={false} height={180} />
      <Card style={styles.card}>
        <View style={styles.row}>
          <Chip tone="success" icon={SparkleIcon} label={readBy === 'demo' ? 'Sample answer (AI unavailable)' : 'Translated by AI'} />
        </View>
        {summary ? <AppText variant="bodyStrong">{summary}</AppText> : null}
        {menu.notes.map((note) => (
          <AppText key={note} color="muted">
            {note}
          </AppText>
        ))}
        <AppText variant="caption" color="muted">
          Pork and alcohol are flagged only where the menu makes it clear. If it matters to you, ask the staff.
        </AppText>
        {rate === null ? (
          <AppText variant="caption" color="warning">{`No ${menu.currency} rate on this phone yet, so prices are shown as printed.`}</AppText>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <AppText variant="heading">{`${menu.dishes.length} dishes`}</AppText>
        {lines.map(({ dish, quantity }, index) => (
          <DishRow
            key={`${dish.original}-${index}`}
            dish={dish}
            currency={menu.currency}
            withCharges={dish.priceMinor === null ? null : inRinggit(applyCharges(dish.priceMinor, charges).total)}
            quantity={quantity}
            onAdd={() => change(index, 1)}
            onRemove={() => change(index, -1)}
          />
        ))}
      </Card>

      {ordered.length > 0 ? (
        <Card style={[styles.card, styles.order]}>
          <AppText variant="heading">Your order</AppText>
          {ordered.map((line) => (
            <View key={line.dish.original} style={styles.billRow}>
              <AppText style={styles.flex}>{line.quantity > 1 ? `${line.dish.translation} × ${line.quantity}` : line.dish.translation}</AppText>
              <AppText>{formatMoney((line.dish.priceMinor ?? 0) * line.quantity, menu.currency)}</AppText>
            </View>
          ))}
          {bill.service > 0 ? <BillRow label={`Service charge ${menu.serviceChargePercent}%`} value={formatMoney(bill.service, menu.currency)} /> : null}
          {bill.tax > 0 ? <BillRow label={`Tax ${menu.addedTaxPercent}%`} value={formatMoney(bill.tax, menu.currency)} /> : null}
          <BillRow label="Total" value={formatMoney(bill.total, menu.currency)} strong />
          {inRinggit(bill.total) ? <AppText variant="title">{`≈ ${inRinggit(bill.total)}`}</AppText> : null}
          <Button label="Log this as an expense" icon={ReceiptIcon} variant="accent" onPress={logOrder} />
        </Card>
      ) : (
        <AppText color="muted" align="center">
          Tap + on what you order to add up the bill and log it.
        </AppText>
      )}
    </StackScreen>
  );
}

function DishRow(props: {
  dish: MenuDish;
  currency: CurrencyCode;
  withCharges: string | null;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const { dish, currency, withCharges, quantity, onAdd, onRemove } = props;
  const priced = dish.priceMinor !== null;
  return (
    <View style={styles.dish}>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{dish.translation}</AppText>
        <AppText variant="caption" color="muted">
          {dish.original}
        </AppText>
        {dish.description ? <AppText variant="caption">{dish.description}</AppText> : null}
        {dish.containsPork === 'yes' || dish.containsAlcohol === 'yes' ? (
          <View style={styles.flags}>
            {dish.containsPork === 'yes' ? <Chip tone="danger" label="Contains pork" /> : null}
            {dish.containsAlcohol === 'yes' ? <Chip tone="warning" label="Alcohol" /> : null}
          </View>
        ) : null}
      </View>
      <View style={styles.price}>
        <AppText variant="bodyStrong">{priced ? formatMoney(dish.priceMinor ?? 0, currency) : 'No price'}</AppText>
        {withCharges ? (
          <AppText variant="caption" color="muted">
            {`≈ ${withCharges}`}
          </AppText>
        ) : null}
        {priced ? (
          <View style={styles.stepper}>
            {quantity > 0 ? (
              <>
                <IconButton icon={MinusIcon} accessibilityLabel={`One less ${dish.translation}`} onPress={onRemove} />
                <AppText variant="bodyStrong" aria-live="polite">
                  {String(quantity)}
                </AppText>
              </>
            ) : null}
            <IconButton icon={PlusIcon} accessibilityLabel={`Add ${dish.translation} to my order`} onPress={onAdd} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function BillRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.billRow}>
      <AppText variant={strong ? 'bodyStrong' : 'body'} style={styles.flex}>
        {label}
      </AppText>
      <AppText variant={strong ? 'bodyStrong' : 'body'}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  order: { borderWidth: 2, borderColor: colors.accent },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  flex: { flex: 1 },
  dish: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  flags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  price: { alignItems: 'flex-end', gap: spacing.xxs, minWidth: 96 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: MIN_TOUCH_TARGET, marginTop: spacing.xs },
  billRow: { flexDirection: 'row', gap: spacing.md, borderRadius: radius.tile },
});
