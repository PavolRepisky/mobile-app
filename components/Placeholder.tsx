import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii } from '@/constants/theme';

/**
 * Stand-in for the lifestyle photography throughout the reference. Everything
 * is drawn locally so the app needs no network, and the tone is derived from
 * the seed so a given "photo" looks the same on every render.
 */

/** Warm, desaturated pairs pulled from the general cast of the reference imagery. */
const TONES: readonly (readonly [string, string])[] = [
  ['#D9D2C7', '#BEB3A4'],
  ['#C9CFC4', '#A7B0A0'],
  ['#E2D3C6', '#C3AE9C'],
  ['#CFCBC6', '#ABA49C'],
  ['#DED6CB', '#C0B29F'],
  ['#C6C9CE', '#A3A8B0'],
  ['#E4DAD2', '#C8B6A8'],
  ['#CBD2CD', '#A9B2AB'],
] as const;

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export interface PlaceholderProps {
  /** Any stable string — a task id, a friend's name, a day number. */
  seed?: string;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function Placeholder({
  seed = 'her75',
  radius = radii.md,
  style,
  children,
}: PlaceholderProps) {
  const h = hash(seed);
  const tone = TONES[h % TONES.length];
  // Vary the light direction so a grid of tiles doesn't read as one flat block.
  const flip = (h >> 3) % 2 === 0;

  return (
    <View style={[styles.base, { borderRadius: radius }, style]}>
      <LinearGradient
        colors={tone}
        start={flip ? { x: 0, y: 0 } : { x: 1, y: 0 }}
        end={flip ? { x: 1, y: 1 } : { x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

/**
 * Circular variant for avatars. With no seed it falls back to the grey
 * silhouette the reference shows before a profile photo is set.
 */
export function AvatarPlaceholder({
  seed,
  size,
  style,
}: {
  seed?: string | null;
  size: number;
  style?: StyleProp<ViewStyle>;
}) {
  if (!seed) return <AvatarSilhouette size={size} style={style} />;

  return (
    <Placeholder
      seed={seed}
      radius={size / 2}
      style={[{ width: size, height: size }, style]}
    />
  );
}

/**
 * Head-and-shoulders grey silhouette on a light grey disc, the way iOS draws
 * its default profile mark: the shoulders run past the bottom of the disc and
 * are cut by its curve, so the shape blends into the circle instead of ending
 * on a hard edge floating inside it.
 */
export function AvatarSilhouette({
  size,
  style,
}: {
  size: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.silhouette,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <View
        style={{
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: size * 0.15,
          backgroundColor: '#B9B9B9',
          marginTop: size * 0.14,
        }}
      />
      <View
        style={{
          width: size * 0.58,
          // Tall enough to reach the bottom of the disc (head inset 0.14 +
          // head 0.3 + gap 0.06 leaves 0.5) with a little to spare, so the
          // circle does the trimming.
          height: size * 0.54,
          borderTopLeftRadius: size * 0.29,
          borderTopRightRadius: size * 0.29,
          backgroundColor: '#B9B9B9',
          marginTop: size * 0.06,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    backgroundColor: '#D9D2C7',
  },
  silhouette: {
    backgroundColor: '#D6D6D6',
    alignItems: 'center',
    overflow: 'hidden',
  },
});

export default Placeholder;
