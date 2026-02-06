import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '../theme';

export function Screen({
  children,
  scroll = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
}) {
  if (!scroll) {
    return <View style={styles.container}>{children}</View>;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.secondary[50],
  },
  container: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.secondary[50],
    gap: theme.spacing.lg,
  },
});
