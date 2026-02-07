import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { theme } from '../theme';
import { useI18n } from '../i18n';
import { createBooking } from '../api/client';
import { useCustomer } from '../context/CustomerContext';
import { addMinutes, formatDate, toTokyoISOString } from '../utils/date';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Preview'>;

export function PreviewScreen({ navigation, route }: Props) {
  const { service, date, worker, slot } = route.params;
  const { customer } = useCustomer();
  const { t, locale } = useI18n();
  const [loading, setLoading] = useState(false);

  const startIso = useMemo(() => toTokyoISOString(date, slot.startTime), [date, slot.startTime]);
  const endIso = useMemo(() => {
    if (slot.endTime) {
      return toTokyoISOString(date, slot.endTime);
    }
    return addMinutes(startIso, slot.duration);
  }, [date, slot.duration, slot.endTime, startIso]);

  const startDate = new Date(startIso);
  const endDate = new Date(endIso);
  const formattedStart = formatDate(startDate, locale);
  const formattedEnd = formatDate(endDate, locale);

  const handleConfirm = async () => {
    if (!customer) {
      Alert.alert(t('error'), t('signupSubtitle'));
      return;
    }
    const resourceId = slot.availableResourceIds?.[0];
    if (!resourceId) {
      Alert.alert(t('error'), t('noAvailability'));
      return;
    }

    try {
      setLoading(true);
      const response = await createBooking({
        serviceId: service.id,
        workerId: worker.id,
        customerId: customer.id,
        resourceId,
        startsAt: startIso,
        endsAt: endIso,
      });

      navigation.replace('Confirmation', {
        service,
        date,
        worker,
        slot,
        booking: response.booking,
      });
    } catch (error) {
      Alert.alert(t('error'), error instanceof Error ? error.message : t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('previewTitle')}</Text>

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
        <View style={styles.row}>
          <Text style={styles.label}>{t('duration')}</Text>
          <Text style={styles.value}>
            {service.duration} {locale === 'ja' ? '分' : 'min'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('price')}</Text>
          <Text style={styles.value}>¥{service.price.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          label={t('back')}
          variant="outline"
          onPress={() => navigation.goBack()}
          style={styles.actionButton}
        />
        <Button
          label={loading ? t('booking') : t('confirm')}
          onPress={handleConfirm}
          disabled={loading}
          style={styles.actionButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...theme.text.h1,
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
    alignItems: 'stretch',
    marginTop: theme.spacing.lg,
  },
  actionButton: {
    width: '100%',
  },
});
