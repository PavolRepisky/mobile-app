import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { bodyTracking, colors, fonts, radii, spacing } from '@/constants/theme';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  /** A trailing glyph — Add Friends' own scan icon, so far. */
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  /** Opens with the keyboard up — for a list reached from a search button,
   * where typing is the whole reason the screen was opened. */
  autoFocus?: boolean;
  /** Fired on the keyboard's search key — where a query is worth keeping. */
  onSubmit?: () => void;
  /**
   * `outline` is the hairline field on the warm-era lists. `sunken` is the
   * palette's own fill with no rim — the field heading the Challenges search,
   * which sits on white beside grey chips and wants to match them.
   */
  tone?: 'outline' | 'sunken';
}

/**
 * The rounded search field heading a list screen — Discover's own, so far.
 * A plain `TextInput` rather than something built on `Text`: an input's
 * placeholder and typed value both have to carry their own font, which is
 * exactly what `Text`'s variant system exists to avoid duplicating, but a
 * `TextInput` has no `children` for it to wrap.
 */
export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  style,
  rightIcon,
  onRightIconPress,
  autoFocus,
  onSubmit,
  tone = 'outline',
}: SearchBarProps) {
  return (
    <View style={[styles.root, tone === 'sunken' && styles.sunken, style]}>
      <Ionicons name="search" size={19} color={colors.inkMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        returnKeyType="search"
        autoFocus={autoFocus}
        onSubmitEditing={onSubmit}
        style={styles.input}
      />
      {rightIcon ? (
        onRightIconPress ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRightIconPress}
            hitSlop={spacing.sm}
          >
            <Ionicons name={rightIcon} size={19} color={colors.inkMuted} />
          </Pressable>
        ) : (
          <Ionicons name={rightIcon} size={19} color={colors.inkMuted} />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surfaceInput,
    paddingHorizontal: spacing.lg,
  },
  sunken: {
    borderWidth: 0,
    backgroundColor: colors.surfaceSunken,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    letterSpacing: bodyTracking,
    color: colors.ink,
    padding: 0,
  },
});

export default SearchBar;
