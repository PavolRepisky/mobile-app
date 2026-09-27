import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type View as RNView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, tabBar, tabBarBottom } from '@/constants/theme';
import { GlassSurface } from './GlassSurface';
import { Text } from './Text';

export type TabIcon = 'discover' | 'community' | 'tasks' | 'profile';

function Glyph({
  icon,
  active,
  color = colors.ink,
}: {
  icon: TabIcon;
  active: boolean;
  color?: string;
}) {
  const size = 27;

  switch (icon) {
    // Challenges you have not joined yet: the tab is a bearing to take, not a
    // list to read.
    case 'discover':
      return (
        <Ionicons
          name={active ? 'compass' : 'compass-outline'}
          size={size + 2}
          color={color}
        />
      );
    case 'community':
      return (
        <Ionicons
          name={active ? 'people' : 'people-outline'}
          size={size + 2}
          color={color}
        />
      );
    case 'tasks':
      return (
        <Ionicons
          name={active ? 'camera' : 'camera-outline'}
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
 * One tab: its glyph with the label set under it in the regular-weight `tab`
 * cut, every tab alike — Tasks included, which used to stand apart as a
 * filled disc. The active tab sits inside a light pill and fills its glyph
 * in; labels stay ink-black in both states, which is what the reference does.
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
        <Text variant="tab">{label}</Text>
      </Pressable>
    );
  },
);

/**
 * The pill that floats above the content near the bottom edge. Content scrolls
 * beneath it, so it is the liquid-glass lens rather than a tinted fill — the
 * page melts through it as it passes.
 */
export interface FloatingTabBarProps {
  children?: React.ReactNode;
  /**
   * Drops the bar out rather than unmounting it — a screen wanting the tabs
   * gone (the to-do tab's full-bleed camera grid) still needs `TabTrigger`
   * routing to keep working underneath.
   */
  hidden?: boolean;
}

export const FloatingTabBar = forwardRef<RNView, FloatingTabBarProps>(
  function FloatingTabBar({ children, hidden }, ref) {
    const insets = useSafeAreaInsets();

    return (
      <View
        ref={ref}
        pointerEvents={hidden ? 'none' : 'auto'}
        style={[
          styles.bar,
          { bottom: tabBarBottom(insets.bottom) },
          hidden && styles.barHidden,
        ]}
      >
        {/* The lens takes its height from the row inside it, so the bar's own
            height lives on that row rather than on the surface. */}
        {/* The lens casts its own `glass` shadow — the lock pill's, tighter
            than a floating sheet's — so the bar reads as the same piece of
            glass as the buttons pinned at the top of the screen. */}
        <GlassSurface radius={radii.pill} style={styles.lens}>
          <View style={styles.row}>{children}</View>
        </GlassSurface>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: tabBar.horizontalInset,
    right: tabBar.horizontalInset,
    borderRadius: radii.pill,
  },
  barHidden: {
    opacity: 0,
  },
  lens: {
    borderRadius: radii.pill,
  },
  row: {
    height: tabBar.height,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
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
});
