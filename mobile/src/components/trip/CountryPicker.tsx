import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CheckCircleIcon, GlobeHemisphereEastIcon } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/PressableScale';
import { TextField } from '@/components/ui/TextField';
import { COUNTRIES, type Country } from '@/data/countries';
import { countryDestinationId, isCountryDestination } from '@/data/destinations';
import { currencies } from '@/domain/money';
import { MAX_CITY_LENGTH } from '@/services/tripService';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';

const MAX_RESULTS = 8;

/** Matches the start of the country's name or of any word in it, so "kor" finds South Korea and "uk" finds United Kingdom. */
export function searchCountries(query: string): Country[] {
  const text = query.trim().toLowerCase();
  if (!text) return [];
  const words = (name: string) => name.toLowerCase().split(/[\s-]+/);
  const initials = (name: string) => words(name).map((w) => w[0]).join('');
  return COUNTRIES.filter((c) => c.name.toLowerCase().startsWith(text) || words(c.name).some((w) => w.startsWith(text)) || initials(c.name) === text).slice(0, MAX_RESULTS);
}

export interface CountryPickerProps {
  /** The trip's destination id; a country is selected when it is "country:XX". */
  value: string | null;
  onChange: (destinationId: string) => void;
  city: string;
  onCityChange: (city: string) => void;
}

/**
 * "Somewhere else?": any country on the list, beyond the featured cities. Choosing one sets its
 * currency; live rates work for all of them. The traveller can name the city or place too.
 */
export function CountryPicker({ value, onChange, city, onCityChange }: CountryPickerProps) {
  const selected = value && isCountryDestination(value) ? COUNTRIES.find((c) => countryDestinationId(c.code) === value) : undefined;
  const [open, setOpen] = useState(selected !== undefined);
  const [query, setQuery] = useState('');
  const results = searchCountries(query);

  if (!open) {
    return <Button label="Somewhere else?" icon={GlobeHemisphereEastIcon} variant="quiet" onPress={() => setOpen(true)} />;
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <GlobeHemisphereEastIcon size={24} color={colors.teal} />
        <AppText variant="heading">Somewhere else</AppText>
      </View>
      {selected ? (
        <>
          <View style={styles.selected} accessibilityLiveRegion="polite">
            <CheckCircleIcon size={24} color={colors.accentText} weight="fill" />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{selected.name}</AppText>
              <AppText color="muted">{`${currencies[selected.currency].name} (${selected.currency})`}</AppText>
            </View>
          </View>
          <TextField
            label="City or place (optional)"
            value={city}
            onChangeText={onCityChange}
            placeholder="Edinburgh"
            maxLength={MAX_CITY_LENGTH}
            helper="Shown on your trip. Leave it empty to use the country's name."
          />
          <Button label="Choose another country" variant="quiet" onPress={() => setQuery('')} />
        </>
      ) : null}
      <TextField label="Search for a country" value={query} onChangeText={setQuery} placeholder="United Kingdom" />
      {query.trim() !== '' && results.length === 0 ? (
        <AppText color="muted">{`No country found for "${query.trim()}". Try another spelling.`}</AppText>
      ) : null}
      <View role="radiogroup" aria-label="Countries" style={styles.results}>
        {results.map((country) => {
          const id = countryDestinationId(country.code);
          const isOn = value === id;
          return (
            <PressableScale
              key={country.code}
              onPress={() => {
                onChange(id);
                setQuery('');
              }}
              role="radio"
              aria-checked={isOn}
              aria-label={`${country.name}. Currency: ${currencies[country.currency].name}`}
              style={[styles.row, isOn && styles.rowOn]}>
              <AppText variant="bodyStrong" style={styles.flex}>
                {country.name}
              </AppText>
              <AppText color="muted">{country.currency}</AppText>
            </PressableScale>
          );
        })}
      </View>
      <AppText variant="caption" color="muted">
        Live exchange rates work for every country here. Tax refund tracking is for Japan for now, and Community may have no trips for a new place yet.
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  selected: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.tile - 8, backgroundColor: colors.accentSoft },
  flex: { flex: 1 },
  results: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    borderRadius: radius.tile - 8,
    backgroundColor: colors.surface,
  },
  rowOn: { backgroundColor: colors.accentSoft },
});
