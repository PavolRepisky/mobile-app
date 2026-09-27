import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { absoluteFill, colors, glass, radii, shadows } from '@/constants/theme';

/**
 * Android had no cheap backdrop blur before API 31 (Android 12). Below that the
 * BlurView renders as a hole, so those devices get a flat wash instead. Exported
 * for any caller reaching for a bare `BlurView` directly rather than through
 * this component — the to-do grid's camera cells, for one.
 */
export const CAN_BLUR = Platform.OS !== 'android' || Number(Platform.Version) >= 31;

export interface GlassSurfaceProps {
  radius?: number;
  /**
   * `lens` is the full liquid glass below. `frost` is the lock pill's simpler
   * cut, taken up by the tab bar and the pinned header buttons: the same
   * backdrop blur under a flat frosted white and a solid bright rim, with no
   * sheen — it reads as frosted plastic laid over the page rather than a
   * lens bending it.
   */
  tone?: 'lens' | 'frost';
  /** Dropped when the surface sits inside something already casting one. */
  shadow?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * The liquid-glass material: a live lens over whatever sits behind it.
 *
 * Layer order matters, and matches how the light actually works —
 *
 *   rim gradient   the specular edge; drawn as the outermost view with the
 *                  body inset by `rimWidth`, so it reads as the *thickness*
 *                  of the glass rather than a stroke painted on top of it
 *   backdrop blur  the lens itself
 *   body sheen     bright at the lit top edge, thin through the middle,
 *                  lifting again where light bounces back off the surface below
 *   children       content, which must sit above all three
 *
 * `overflow: 'hidden'` has to live on the inner body rather than the shadow
 * host: on iOS a view cannot both clip its children and cast a shadow.
 */
export function GlassSurface({
  radius = radii.pill,
  tone = 'lens',
  shadow = true,
  style,
  children,
}: GlassSurfaceProps) {
  const innerRadius = Math.max(0, radius - glass.rimWidth);

  if (tone === 'frost') {
    // Without a backdrop blur the page would read straight through a 42%
    // white, so the surface goes solid white under the frost instead.
    return (
      <View style={[shadow && shadows.glass, { borderRadius: radius }, style]}>
        <View style={[styles.frost, { borderRadius: radius }]}>
          {CAN_BLUR ? (
            <BlurView
              intensity={glass.blur}
              tint={glass.tint}
              experimentalBlurMethod={
                Platform.OS === 'android' ? 'dimezisBlurView' : undefined
              }
              style={absoluteFill}
            />
          ) : (
            <View style={[absoluteFill, styles.frostSolid]} />
          )}
          <View style={[absoluteFill, styles.frostFill]} />
          {children}
        </View>
      </View>
    );
  }

  return (
    <View style={[shadow && shadows.glass, { borderRadius: radius }, style]}>
      <LinearGradient
        colors={glass.rim}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.rim, { borderRadius: radius, padding: glass.rimWidth }]}
      >
        <View style={[styles.body, { borderRadius: innerRadius }]}>
          {CAN_BLUR ? (
            <BlurView
              intensity={glass.blur}
              tint={glass.tint}
              experimentalBlurMethod={
                Platform.OS === 'android' ? 'dimezisBlurView' : undefined
              }
              // The radius is repeated here rather than left to the parent's
              // clip: Chrome does not clip a backdrop-filter to a rounded
              // ancestor, so without it the lens leaks out as a rectangle.
              style={[absoluteFill, { borderRadius: innerRadius }]}
            />
          ) : (
            <View
              style={[absoluteFill, styles.fallback, { borderRadius: innerRadius }]}
            />
          )}

          <LinearGradient
            colors={glass.sheen}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[absoluteFill, { borderRadius: innerRadius }]}
          />

          {children}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  rim: {
    overflow: 'hidden',
  },
  body: {
    overflow: 'hidden',
  },
  fallback: {
    backgroundColor: glass.fallback,
  },
  // The rim is a plain border here, drawn round the clip, where the lens
  // paints a gradient behind an inset body.
  frost: {
    overflow: 'hidden',
    borderWidth: glass.rimWidth,
    borderColor: colors.frostRim,
  },
  frostSolid: {
    backgroundColor: colors.surface,
  },
  frostFill: {
    backgroundColor: colors.frost,
  },
});

export default GlassSurface;
