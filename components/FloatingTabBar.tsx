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

import { colors, radii, shadows, tabBar, tabBarBottom, type } from '@/constants/theme';
import { GlassSurface } from './GlassSurface';
import { Text } from './Text';

export type TabIcon = 'discover' | 'friends' | 'todo' | 'calendar' | 'profile';

/** The filled centre tab's disc. Sized to sit inside the bar with air around it. */
const FILLED_SIZE = 52;

function Glyph({
  icon,
  active,
  color = colors.ink,
}: {
  icon: TabIcon;
  active: boolean;
  color?: string;
}) {
  const size = 24;

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
    // The month grid of proof photos is a record of the days gone by, so the
    // tab is dated rather than starred.
    case 'calendar':
      return (
        <Ionicons
          name={active ? 'calendar' : 'calendar-outline'}
          size={size}
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
  /**
   * Draw the tab as a solid ink disc with no label — the centre tab, which
   * reads as the bar's one action rather than as another destination.
   */
  filled?: boolean;
  /** Injected by `TabTrigger asChild`. */
  isFocused?: boolean;
}

/**
 * One tab. The active tab sits inside a light pill; labels stay ink-black in
 * both states, which is what the reference does.
 */
export const TabBarButton = forwardRef<RNView, TabBarButtonProps>(
  function TabBarButton({ icon, label, filled, isFocused, style, ...rest }, ref) {
    return (
      <Pressable
        ref={ref}
        accessibilityRole="tab"
        accessibilityState={{ selected: !!isFocused }}
        accessibilityLabel={label}
        {...rest}
        style={[styles.tab, !filled && isFocused && styles.tabActive]}
      >
        {filled ? (
          // The disc carries the emphasis on its own, so it looks the same
          // focused or not — like the shutter button it is modelled on.
          <View style={styles.disc}>
            <Glyph icon={icon} active color={colors.inkInverse} />
          </View>
        ) : (
          <>
            <Glyph icon={icon} active={!!isFocused} />
            <Text variant="tab" style={styles.tabLabel}>
              {label}
            </Text>
          </>
        )}
      </Pressable>
    );
  },
);

/**
 * The pill that floats above the content near the bottom edge. Content scrolls
 * beneath it, so it is the liquid-glass lens rather than a tinted fill — the
 * page melts through it as it passes.
 */
export const FloatingTabBar = forwardRef<RNView, { children?: React.ReactNode }>(
  function FloatingTabBar({ children }, ref) {
    const insets = useSafeAreaInsets();

    return (
      <View
        ref={ref}
        style={[styles.bar, { bottom: tabBarBottom(insets.bottom) }]}
      >
        {/* The lens takes its height from the row inside it, so the bar's own
            height lives on that row rather than on the surface. */}
        <GlassSurface radius={radii.pill} shadow={false} style={styles.lens}>
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
    ...shadows.floating,
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
  tabLabel: {
    ...type.tab,
    color: colors.ink,
  },
  disc: {
    width: FILLED_SIZE,
    height: FILLED_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
