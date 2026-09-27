import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import { BlurView } from 'expo-blur';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type View as RNView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  absoluteFill,
  colors,
  glass,
  radii,
  shadows,
  tabBar,
  tabBarBottom,
} from '@/constants/theme';
import { CAN_BLUR } from './GlassSurface';
import { Text } from './Text';

/** The lock pill's rim width, so the bar and the pill wear one edge. */
const FROST_RIM = 1.5;

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
 * beneath it, so it blurs what passes and frosts it over in the lock pill's
 * own white, rather than sitting on the page as a solid fill.
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
        {/* The lock pill's frost: a blur of the page passing underneath, the
            flat frosted white over it and the bright rim round the edge. The
            frame clips while the host above casts the shadow — on iOS one
            view can't do both. Without a backdrop blur the page would read
            straight through the white, so it gets a solid one instead. */}
        <View style={styles.frame}>
          {CAN_BLUR ? (
            <BlurView
              intensity={glass.blur}
              tint={glass.tint}
              experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
              style={absoluteFill}
            />
          ) : (
            <View style={[absoluteFill, styles.solid]} />
          )}
          <View style={[absoluteFill, styles.frost]} />
          <View style={styles.row}>{children}</View>
        </View>
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
    ...shadows.glass,
  },
  barHidden: {
    opacity: 0,
  },
  frame: {
    borderRadius: radii.pill,
    borderWidth: FROST_RIM,
    borderColor: colors.frostRim,
    overflow: 'hidden',
  },
  solid: {
    backgroundColor: colors.surface,
  },
  frost: {
    backgroundColor: colors.frost,
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
