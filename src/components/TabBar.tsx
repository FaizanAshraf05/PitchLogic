import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

const TAB_ICONS: Record<string, string> = {
  Home: '🏠',
  Squad: '👥',
  Match: '⚽',
  League: '🏆',
  More: '⚙️',
};

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = route.name;
          const isFocused = state.index === index;
          const isMatch = route.name === 'Match';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={[
                styles.tab,
                isMatch && styles.matchTab,
              ]}
              activeOpacity={0.7}
            >
              {isMatch ? (
                <View style={[styles.matchButton, isFocused && styles.matchButtonActive]}>
                  <Text style={styles.matchIcon}>{TAB_ICONS[route.name]}</Text>
                </View>
              ) : (
                <>
                  <Text style={[
                    styles.icon,
                    isFocused && styles.iconActive,
                  ]}>
                    {TAB_ICONS[route.name]}
                  </Text>
                  <Text style={[
                    styles.label,
                    isFocused && styles.labelActive,
                  ]}>
                    {label}
                  </Text>
                  {isFocused && <View style={styles.indicator} />}
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.transparent,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingHorizontal: Spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['2xl'],
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    position: 'relative',
  },
  matchTab: {
    marginTop: -28,
  },
  icon: {
    fontSize: 20,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: Typography.fontWeight.medium,
  },
  labelActive: {
    color: Colors.green,
    fontWeight: Typography.fontWeight.bold,
  },
  indicator: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  matchButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.surface,
  },
  matchButtonActive: {
    backgroundColor: Colors.greenDim,
    borderColor: Colors.accent,
  },
  matchIcon: {
    fontSize: 24,
  },
});
