import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, type as typeScale } from '@/constants/theme';

type Variant = keyof typeof typeScale;

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

/**
 * Every string in the app goes through here so nothing falls back to the
 * platform system font.
 */
export function Text({
  variant = 'body',
  color = colors.ink,
  center,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      {...rest}
      style={[
        typeScale[variant],
        { color },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}

export default Text;
