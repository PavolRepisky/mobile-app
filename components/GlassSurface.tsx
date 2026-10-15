import { BlurView } from 'expo-blur';
import {
  GlassContainer,
  GlassView,
  isLiquidGlassAvailable,
  type GlassColorScheme,
} from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  View,
  useColorScheme,
  type ColorValue,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { absoluteFill, glass, radii, shadows } from '@/constants/theme';
import { NATIVE_HEADER } from './Screen';

/** Settled once: whether this phone draws the system's liquid glass (iOS 26
 * and up). Everywhere else glass is the drawn lens below. */
export const LIQUID_GLASS = NATIVE_HEADER && isLiquidGlassAvailable();

/** How far apart two glass shapes in one `LiquidGlassGroup` can sit and
 * still reach for each other — about a button's gap, so a row's neighbours
 * melt together as they come and go, the way the system's own bar items do. */
const GROUP_SPACING = 12;

/** The content's fade, kept to the system's own materialise so the glyph
 * and its glass arrive and leave together. */
const MATERIALISE_MS = 250;

export interface LiquidGlassProps {
  /** Takes the system's touch response — the swell and the glow under the
   * finger — for anything that can be tapped. */
  interactive?: boolean;
  /** Dissolved back into the page when false, rather than unmounted, so it
   * can go the way it came; it stops taking touches while gone. */
  visible?: boolean;
  /** Materialises as it first mounts. On by default for controls only, as
   * the system's own do: a label on a photo is simply there, and a list of
   * cover badges all condensing at once as it scrolls would be noise. */
  appear?: boolean;
  tintColor?: ColorValue;
  /** Pins the glass to one appearance, for glass over the camera, which is
   * dark whatever the phone is set to. Otherwise it follows the app's. */
  colorScheme?: GlassColorScheme;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * The system's own liquid glass, on iPhones that have it. It materialises
 * when it first appears — the lens condensing out of the page rather than a
 * shape popping in — and dissolves the same way when `visible` turns off.
 * The animation is the system's: the style starts at `none` and is animated
 * to `regular`.
 */
export function LiquidGlass({
  interactive = false,
  visible = true,
  appear = interactive,
  tintColor,
  colorScheme,
  style,
  children,
}: LiquidGlassProps) {
  // The app's own light or dark, set on the glass itself rather than left to
  // the system: the theme can be switched inside the app, and glass on a page
  // out of sight only caught up as the page came back, visibly turning from
  // the old appearance to the new one.
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [mounted, setMounted] = useState(!appear);
  const fade = useRef(new Animated.Value(appear || !visible ? 0 : 1)).current;
  const shown = mounted && visible;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    Animated.timing(fade, {
      toValue: shown ? 1 : 0,
      duration: MATERIALISE_MS,
      useNativeDriver: true,
    }).start();
  }, [fade, shown]);

  // The fade sits between the glass and what it holds, so it takes over how
  // the glass lays its content out — a pill's row, a button's centred glyph.
  const { flexDirection, alignItems, justifyContent, gap, columnGap, rowGap } =
    StyleSheet.flatten(style) ?? {};
  const arrange = { flexDirection, alignItems, justifyContent, gap, columnGap, rowGap };

  return (
    <GlassView
      glassEffectStyle={{ style: shown ? 'regular' : 'none', animate: true }}
      // The touch response is set once, as the view is made, and can't be
      // switched later, so a change of it makes the glass afresh.
      key={interactive ? 'interactive' : 'still'}
      isInteractive={interactive}
      tintColor={tintColor}
      colorScheme={colorScheme ?? scheme}
      pointerEvents={visible ? 'auto' : 'none'}
      style={style}
    >
      <Animated.View style={[styles.content, arrange, { opacity: fade }]}>
        {children}
      </Animated.View>
    </GlassView>
  );
}

/**
 * Glass shapes that sit side by side — a photo's action row, a story's task
 * pill and its reactions button — gathered so the system treats them as one
 * material: close neighbours merge, and one appearing or leaving morphs out
 * of the others. A plain row wherever glass is drawn.
 */
export function LiquidGlassGroup(props: ViewProps) {
  if (!LIQUID_GLASS) return <View {...props} />;
  return (
    <GlassContainer spacing={GROUP_SPACING} {...props} />
  );
}

/**
 * Android had no cheap backdrop blur before API 31 (Android 12). Below that the
 * BlurView renders as a hole, so those devices get a flat wash instead. Exported
 * for any caller reaching for a bare `BlurView` directly rather than through
 * this component — the to-do grid's camera cells, for one.
 */
const CAN_BLUR = Platform.OS !== 'android' || Number(Platform.Version) >= 31;

export interface GlassSurfaceProps {
  radius?: number;
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
  shadow = true,
  style,
  children,
}: GlassSurfaceProps) {
  const innerRadius = Math.max(0, radius - glass.rimWidth);

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
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rim: {
    overflow: 'hidden',
  },
  body: {
    overflow: 'hidden',
  },
  fallback: {
    backgroundColor: glass.fallback,
  },
});

export default GlassSurface;
