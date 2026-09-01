import { Image } from 'expo-image';
import {
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AvatarPlaceholder, AvatarSilhouette } from './Placeholder';

/**
 * What a profile circle can hold: a bundled photo, a seed standing in for one
 * until there is a real photo, or nothing.
 */
export type AvatarSource = ImageSourcePropType | string | null | undefined;

export interface AvatarProps {
  source: AvatarSource;
  size: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Circular profile image. Photos are bundled, so the three ways a circle can
 * be filled are settled by the source itself rather than by the caller.
 */
export function Avatar({ source, size, style }: AvatarProps) {
  if (!source) return <AvatarSilhouette size={size} style={style} />;

  if (typeof source === 'string') {
    return <AvatarPlaceholder seed={source} size={size} style={style} />;
  }

  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2 },
        styles.clip,
        style,
      ]}
    >
      <Image
        source={source}
        contentFit="cover"
        transition={200}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
});

export default Avatar;
