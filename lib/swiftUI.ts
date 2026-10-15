import { font, tint as libraryTint } from '@expo/ui/swift-ui/modifiers';

/**
 * SwiftUI's `tint`, readable by whichever native `@expo/ui` the phone runs.
 *
 * The library's JS sends the colour as `tint` (57.0.17 on, where it became a
 * ShapeStyle), but Expo Go is built against the SDK's bundled 57.0.16, whose
 * native side reads it as `color` — so it found nothing, dropped the tint,
 * and every system button, switch and picker fell back to iOS blue. Sending
 * both keeps either build reading its own; a native modifier ignores fields
 * it doesn't declare.
 *
 * Takes a plain colour string (`colorsFor(scheme).ink`): the older build
 * reads a `Color`, which has no notion of SwiftUI's semantic `primary`.
 */
export function tint(color: string) {
  return { ...libraryTint(color), color };
}

/**
 * Quicksand's cuts by the names SwiftUI finds them under. expo-font registers
 * each file with the system, but the `Quicksand_700Bold` names the app's
 * styles use are its own aliases, read only by React Native's text — SwiftUI
 * looks a font up by its PostScript name.
 */
const QUICKSAND_CUTS = {
  medium: 'Quicksand-Medium',
  semibold: 'Quicksand-SemiBold',
  bold: 'Quicksand-Bold',
} as const;

/** Each Apple text style at the size the app's own level for it is set in
 * (`hierarchy` in theme.ts), so SwiftUI's text matches the drawn text. */
const QUICKSAND_SIZES = {
  title2: 23, // pageTitle
  title3: 21, // sectionHeading
  headline: 18, // itemTitle
  body: 16, // copy
  subheadline: 14, // meta
  footnote: 13,
  caption: 12, // badge
} as const;

/**
 * SwiftUI text in Quicksand, the app's face, rather than the system's San
 * Francisco: at the app's size for the given text style, growing with Dynamic
 * Type along that style's curve.
 */
export function quicksand(
  textStyle: keyof typeof QUICKSAND_SIZES = 'body',
  weight: keyof typeof QUICKSAND_CUTS = 'semibold',
) {
  return font({ family: QUICKSAND_CUTS[weight], size: QUICKSAND_SIZES[textStyle], textStyle });
}
