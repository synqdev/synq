import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { theme } from '../theme';
import { registerCustomer } from '../api/client';
import { useCustomer } from '../context/CustomerContext';
import { useI18n } from '../i18n';
import { saveJson, storageKeys } from '../storage';
import type { RootStackParamList } from '../navigation/types';

export function SignupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setCustomer } = useCustomer();
  const { t, locale, setLocale } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email) {
      Alert.alert(t('error'), t('signupSubtitle'));
      return;
    }

    try {
      setLoading(true);
      const customer = await registerCustomer({
        name,
        email,
        phone: phone.trim() || undefined,
        locale,
      });
      setCustomer(customer);
      await saveJson(storageKeys.customer, customer);
      await saveJson(storageKeys.locale, locale);
      navigation.reset({ index: 0, routes: [{ name: 'Booking' }] });
    } catch (error) {
      Alert.alert(t('error'), error instanceof Error ? error.message : t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{t('signupTitle')}</Text>
        <Text style={styles.subtitle}>{t('signupSubtitle')}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.localeRow}>
          <Text style={styles.localeLabel}>{t('language')}</Text>
          <View style={styles.localeSwitch}>
            <Button
              label="日本語"
              variant={locale === 'ja' ? 'primary' : 'outline'}
              onPress={() => setLocale('ja')}
              style={styles.localeButton}
            />
            <Button
              label="English"
              variant={locale === 'en' ? 'primary' : 'outline'}
              onPress={() => setLocale('en')}
              style={styles.localeButton}
            />
          </View>
        </View>

        <Input label={t('name')} value={name} onChangeText={setName} />
        <Input
          label={t('email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label={t('phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Button
          label={loading ? t('submitting') : t('submit')}
          onPress={handleSubmit}
          disabled={loading}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8,
  },
  title: {
    ...theme.text.h1,
  },
  subtitle: {
    ...theme.text.body,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    borderWidth: 2,
    borderColor: theme.colors.black,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  localeRow: {
    gap: theme.spacing.sm,
  },
  localeLabel: {
    fontSize: 14,
    color: theme.colors.secondary[700],
  },
  localeSwitch: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  localeButton: {
    flex: 1,
  },
});
