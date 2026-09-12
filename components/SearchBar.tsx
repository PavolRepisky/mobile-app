import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { bodyTracking, colors, fonts, radii, spacing } from '@/constants/theme';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The rounded search field heading a list screen — Discover's own, so far.
 * A plain `TextInput` rather than something built on `Text`: an input's
 * placeholder and typed value both have to carry their own font, which is
 * exactly what `Text`'s variant system exists to avoid duplicating, but a
 * `TextInput` has no `children` for it to wrap.
 */
export function SearchBar({ value, onChangeText, placeholder = 'Search', style }: SearchBarProps) {
  return (
    <View style={[styles.root, style]}>
      <Ionicons name="search" size={19} color={colors.inkMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        returnKeyType="search"
        style={styles.input}
      />
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
    backgroundColor: colors.surfaceSunken,
    paddingHorizontal: spacing.lg,
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
