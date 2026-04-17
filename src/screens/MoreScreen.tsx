import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

const MENU_ITEMS = [
  { emoji: '📊', label: 'Statistics', description: 'View detailed stats' },
  { emoji: '💰', label: 'Finances', description: 'Budget & transfers' },
  { emoji: '🏟️', label: 'Stadium', description: 'Upgrade facilities' },
  { emoji: '📰', label: 'News', description: 'Latest headlines' },
  { emoji: '⚙️', label: 'Settings', description: 'App preferences' },
  { emoji: 'ℹ️', label: 'About', description: 'App info & credits' },
];

export function MoreScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>More</Text>
          <Text style={styles.subtitle}>Settings & extras</Text>
        </View>

        <View style={styles.menuList}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} activeOpacity={0.7}>
              <Text style={styles.menuEmoji}>{item.emoji}</Text>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    color: Colors.text,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    fontSize: Typography.fontSize.md,
    color: Colors.textDim,
    marginTop: Spacing.xs,
  },
  menuList: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuEmoji: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontWeight: Typography.fontWeight.semibold,
  },
  menuDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 24,
    color: Colors.textMuted,
    fontWeight: Typography.fontWeight.light,
  },
});
