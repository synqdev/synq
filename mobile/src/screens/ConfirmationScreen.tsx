import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { theme } from '../theme';
import { useI18n } from '../i18n';
import { formatDate, toTokyoISOString } from '../utils/date';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Confirmation'>;

export function ConfirmationScreen({ navigation, route }: Props) {
  const { service, date, worker, slot } = route.params;
  const { t, locale } = useI18n();

  const startIso = toTokyoISOString(date, slot.startTime);
  const endIso = slot.endTime
    ? toTokyoISOString(date, slot.endTime)
    : toTokyoISOString(date, slot.startTime);

  const formattedStart = formatDate(new Date(startIso), locale);
  const formattedEnd = formatDate(new Date(endIso), locale);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.successIcon}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
        <Text style={styles.title}>{t('confirmationTitle')}</Text>
        <Text style={styles.subtitle}>{t('confirmationSubtitle')}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>{t('service')}</Text>
          <Text style={styles.value}>
            {locale === 'ja' ? service.name : service.nameEn || service.name}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('staff')}</Text>
          <Text style={styles.value}>
            {locale === 'ja' ? worker.name : worker.nameEn || worker.name}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('dateTime')}</Text>
          <View style={styles.valueColumn}>
            <Text style={styles.value}>{formattedStart.date}</Text>
            <Text style={styles.caption}>
              {formattedStart.time} - {formattedEnd.time}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          label={t('bookAnother')}
          variant="outline"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Booking' }] })}
        />
        <Button
          label={t('backHome')}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Booking' }] })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: 8,
  },
  successIcon: {
    height: 64,
    width: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.success[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 28,
    color: theme.colors.success[600],
    fontWeight: '700',
  },
  title: {
    ...theme.text.h1,
  },
  subtitle: {
    ...theme.text.body,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.secondary[200],
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  label: {
    color: theme.colors.secondary[600],
    fontSize: 14,
  },
  value: {
    color: theme.colors.secondary[900],
    fontWeight: '600',
    fontSize: 15,
  },
  valueColumn: {
    alignItems: 'flex-end',
  },
  caption: {
    color: theme.colors.secondary[500],
    fontSize: 13,
  },
  actions: {
    gap: theme.spacing.md,
  },
});
