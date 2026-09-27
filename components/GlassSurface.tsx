import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { absoluteFill, colors, glass, radii, shadows } from '@/constants/theme';

/**
 * Android had no cheap backdrop blur before API 31 (Android 12). Below that the
 * BlurView renders as a hole, so those devices get a flat wash instead. Exported
 * for any caller reaching for a bare `BlurView` directly rather than through
 * this component — the to-do grid's camera cells, for one.
 */
export const CAN_BLUR = Platform.OS !== 'android' || Number(Platform.Version) >= 31;

/**
 * The frost's body without its edge: a blur of whatever passes behind, and
 * the flat frosted white over it. Absolutely filled, so it lays under the
 * content of any surface that clips it to its own shape — the sheet's
 * top-rounded panel and the dialog's card, as well as `GlassSurface` itself.
 *
 * Without a backdrop blur the page would read straight through a 42% white,
 * so it goes solid white underneath the frost instead.
 */
export function FrostLayer() {
  return (
    <>
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
      <View style={[absoluteFill, styles.fill]} />
    </>
  );
}

export interface GlassSurfaceProps {
  radius?: number;
  /** Dropped when the surface sits inside something already casting one. */
  shadow?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * The app's frosted material, taken off the canvas's lock pill and worn by
 * everything that floats over the page: the tab bar, the pinned buttons, the
 * pills over photos, the popover. A blur of what passes behind, a flat
 * frosted white over it and a solid bright rim round the edge, lifted on the
 * `glass` shadow — frosted plastic laid over the page rather than a lens
 * bending it.
 *
 * `overflow: 'hidden'` has to live on the inner view rather than the shadow
 * host: on iOS a view cannot both clip its children and cast a shadow.
 */
export function GlassSurface({
  radius = radii.pill,
  shadow = true,
  style,
  children,
}: GlassSurfaceProps) {
  return (
    <View style={[shadow && shadows.glass, { borderRadius: radius }, style]}>
      <View style={[styles.body, { borderRadius: radius }]}>
        <FrostLayer />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The rim is a plain border, drawn round the clip.
  body: {
    overflow: 'hidden',
    borderWidth: glass.rimWidth,
    borderColor: colors.frostRim,
  },
  solid: {
    backgroundColor: colors.surface,
  },
  fill: {
    backgroundColor: colors.frost,
  },
});

export default GlassSurface;
