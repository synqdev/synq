import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SignupScreen } from './src/screens/SignupScreen';
import { BookingScreen } from './src/screens/BookingScreen';
import { PreviewScreen } from './src/screens/PreviewScreen';
import { ConfirmationScreen } from './src/screens/ConfirmationScreen';
import { I18nProvider } from './src/i18n';
import { CustomerProvider, useCustomer } from './src/context/CustomerContext';
import { readJson, storageKeys } from './src/storage';
import { theme } from './src/theme';
import type { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppStack() {
  const { customer, setCustomer } = useCustomer();
  const [initialLocale, setInitialLocale] = useState<'ja' | 'en'>('ja');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      const storedCustomer = await readJson<{
        id: string;
        name: string;
        email: string;
        phone?: string | null;
        locale: 'ja' | 'en';
      }>(storageKeys.customer);
      const storedLocale = await readJson<'ja' | 'en'>(storageKeys.locale);

      if (storedCustomer) {
        setCustomer(storedCustomer);
      }
      if (storedLocale) {
        setInitialLocale(storedLocale);
      } else if (storedCustomer?.locale) {
        setInitialLocale(storedCustomer.locale);
      }

      setReady(true);
    };
    load();
  }, [setCustomer]);

  const initialRouteName = useMemo(
    () => (customer ? 'Booking' : 'Signup'),
    [customer]
  );

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={theme.colors.primary[500]} />
      </View>
    );
  }

  return (
    <I18nProvider initialLocale={initialLocale}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRouteName}
          screenOptions={{
            headerTitleAlign: 'center',
            headerStyle: { backgroundColor: theme.colors.secondary[50] },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="Signup" component={SignupScreen} options={{ title: '' }} />
          <Stack.Screen name="Booking" component={BookingScreen} options={{ title: '' }} />
          <Stack.Screen name="Preview" component={PreviewScreen} options={{ title: '' }} />
          <Stack.Screen
            name="Confirmation"
            component={ConfirmationScreen}
            options={{ title: '' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </I18nProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <CustomerProvider>
        <AppStack />
      </CustomerProvider>
    </SafeAreaProvider>
  );
}
