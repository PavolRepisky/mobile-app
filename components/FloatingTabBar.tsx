import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type View as RNView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, shadows, spacing, tabBar, type } from '@/constants/theme';
import { Text } from './Text';

export type TabIcon = 'recipes' | 'friends' | 'todo' | 'profile';

function Glyph({ icon, active }: { icon: TabIcon; active: boolean }) {
  const color = colors.ink;
  const size = 24;

  switch (icon) {
    case 'recipes':
      return (
        <Ionicons name={active ? 'grid' : 'grid-outline'} size={size} color={color} />
      );
    case 'friends':
      return (
        <Ionicons
          name={active ? 'people' : 'people-outline'}
          size={size + 2}
          color={color}
        />
      );
    case 'todo':
      return (
        <MaterialCommunityIcons
          name="format-list-checks"
          size={size + 2}
          color={color}
        />
      );
    case 'profile':
      return (
        <Ionicons
          name={active ? 'person' : 'person-outline'}
          size={size}
          color={color}
        />
      );
  }
}

export interface TabBarButtonProps extends PressableProps {
  icon: TabIcon;
  label: string;
  /** Injected by `TabTrigger asChild`. */
  isFocused?: boolean;
}

/**
 * One tab. The active tab sits inside a light pill; labels stay ink-black in
 * both states, which is what the reference does.
 */
export const TabBarButton = forwardRef<RNView, TabBarButtonProps>(
  function TabBarButton({ icon, label, isFocused, style, ...rest }, ref) {
    return (
      <Pressable
        ref={ref}
        accessibilityRole="tab"
        accessibilityState={{ selected: !!isFocused }}
        accessibilityLabel={label}
        {...rest}
        style={[styles.tab, isFocused && styles.tabActive]}
      >
        <Glyph icon={icon} active={!!isFocused} />
        <Text variant="tab" style={styles.tabLabel}>
          {label}
        </Text>
      </Pressable>
    );
  },
);

/**
 * The white pill that floats above the content near the bottom edge. Content
 * scrolls beneath it, so it is translucent rather than opaque.
 */
export const FloatingTabBar = forwardRef<RNView, { children?: React.ReactNode }>(
  function FloatingTabBar({ children }, ref) {
    const insets = useSafeAreaInsets();

    return (
      <View
        ref={ref}
        style={[
          styles.bar,
          { bottom: Math.max(insets.bottom, spacing.md) + tabBar.bottomOffset },
        ]}
      >
        {children}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: tabBar.horizontalInset,
    right: tabBar.horizontalInset,
    height: tabBar.height,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(253,252,249,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    ...shadows.floating,
  },
  tab: {
    flex: 1,
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabActive: {
    backgroundColor: colors.divider,
  },
  tabLabel: {
    ...type.tab,
    color: colors.ink,
  },
});
