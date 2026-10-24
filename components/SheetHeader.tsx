import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { Text } from './Text';

export interface SheetHeaderProps {
  title: string;
  style?: StyleProp<TextStyle>;
}

/**
 * A bottom sheet's bar: its title centred at the sheet-title size, under the
 * grabber. No close button — the sheet goes the way it came, swiped down or
 * tapped away above it. Every sheet that has a title sets it through this,
 * so Share profile and Comments open on the same bar.
 */
export function SheetHeader({ title, style }: SheetHeaderProps) {
  return (
    <Text variant="sectionHeading" center accessibilityRole="header" style={[styles.title, style]}>
      {title}
    </Text>
  );
}

export default SheetHeader;

const styles = StyleSheet.create({
  title: {
    alignSelf: 'stretch',
  },
});
