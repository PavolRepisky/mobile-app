/**
 * Her 75 — design tokens.
 *
 * Colours were sampled directly out of the reference screenshots
 * (reference/screens/**) rather than estimated. Nothing in components/ or
 * app/ may hardcode a colour, radius, shadow or font family — pull it from
 * here so the whole surface moves together.
 */

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

export const colors = {
  /** Warm off-white behind the logged-in app (home, friends, profile, settings). */
  background: '#F8F5F0',
  /** Onboarding sits on near-pure white — a deliberate split from the app shell. */
  backgroundOnboarding: '#FDFDFD',
  /** Slightly cooler off-white used by the settings stack. */
  backgroundAlt: '#F8F6F5',

  /** Cards, the tab bar, circular icon buttons. */
  surface: '#FFFFFF',
  /** Inset panels: the invite card, "Create Daily Task+" well. */
  surfaceMuted: '#F1F0EA',
  /** Empty photo slots and "add" tiles on the wall. */
  surfaceSunken: '#F2F2F2',

  /** Primary text and the solid pill buttons. */
  ink: '#141414',
  /** Softer body copy. */
  inkSoft: '#3A3A3A',
  /** Timestamps, placeholders, inactive tab labels, review bodies. */
  inkMuted: '#9C9C9C',
  /** Text on dark fills. */
  inkInverse: '#FFFFFF',

  /** Text input fills and unselected control strokes. */
  field: '#CDCDCD',
  /** Hairlines, and the light pill behind the active tab. */
  divider: '#E9E8E2',
  /** Slightly stronger separator inside cards. */
  dividerStrong: '#E2E0DA',

  /** Destructive rows and the Restart action. */
  destructive: '#FB7A8A',

  /** Disabled primary button fill / label. */
  disabled: '#EDEBE6',
  disabledInk: '#9C9C9C',

  /** Pastels — exact values from the 75-day post-it grid. */
  sage: '#D4E5C4',
  butter: '#F1DFA8',
  blush: '#EEC5BF',
  gold: '#F3D362',

  /** Handwritten numerals on the sticky notes. */
  stickyInk: '#2B2B2B',

  /** Scrims. */
  scrim: 'rgba(0,0,0,0.45)',
  scrimLight: 'rgba(28,26,24,0.18)',
} as const;

/** The four pastels, in the rotation order the post-it grid uses. */
export const stickyPalette = [
  colors.sage,
  colors.butter,
  colors.blush,
  colors.gold,
] as const;

/**
 * The Instagram-style ring around the avatar on the To-do home — the one
 * genuinely linear gradient in the app.
 */
export const gradients = {
  storyRing: ['#F58529', '#DD2A7B', '#8134AF'],
} as const;

/**
 * The "aura" tiles on the onboarding ideal-day question are radial orbs, so
 * they are described as centre-out stops rather than a colour list. `sunrise`
 * is a ring: it brightens, darkens to red, then fades back to cream.
 */
export const auras = {
  auraSunrise: [
    { offset: 0, color: '#FBD98F' },
    { offset: 0.28, color: '#F4A03A' },
    { offset: 0.5, color: '#E8452B' },
    { offset: 0.72, color: '#F6BE72' },
    { offset: 1, color: '#FBE3B0' },
  ],
  auraDusk: [
    { offset: 0, color: '#F2F0C8' },
    { offset: 0.3, color: '#BFE3EE' },
    { offset: 0.62, color: '#8FA8D2' },
    { offset: 1, color: '#6E7FB8' },
  ],
  auraEmber: [
    { offset: 0, color: '#FBB040' },
    { offset: 0.45, color: '#F58A1F' },
    { offset: 1, color: '#E85410' },
  ],
  auraMint: [
    { offset: 0, color: '#12A82B' },
    { offset: 0.4, color: '#5FD16A' },
    { offset: 1, color: '#C8F2C4' },
  ],
} as const;

export type AuraKey = keyof typeof auras;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const fonts = {
  /** Playfair Display — every headline. */
  displayBlack: 'PlayfairDisplay_900Black',
  displayBlackItalic: 'PlayfairDisplay_900Black_Italic',
  displayBold: 'PlayfairDisplay_700Bold',
  displayBoldItalic: 'PlayfairDisplay_700Bold_Italic',
  displayMedium: 'PlayfairDisplay_500Medium',
  displayMediumItalic: 'PlayfairDisplay_500Medium_Italic',

  /**
   * Quicksand — body copy, buttons, labels, everything functional. A rounded
   * geometric sans, so it keeps the soft feel the reference gets from its
   * rounded bold cut, across every weight rather than just the heavy one.
   *
   * Quicksand runs optically lighter than the Helvetica it replaced, so each
   * role is mapped one step up the ramp to hold the weights in the reference
   * screenshots: plain copy sits on Medium, not Regular. Regular is kept for
   * the muted secondary text that should recede.
   */
  body: 'Quicksand_500Medium',
  /** Same colour as `body`: the reference draws no medium/regular contrast. */
  bodyMedium: 'Quicksand_500Medium',
  /** Card titles and buttons — strong, but below the section-title bold. */
  bodySemi: 'Quicksand_600SemiBold',
  /** Section titles and the recipe category tabs. */
  bodyBold: 'Quicksand_700Bold',
  /** Muted secondary copy — amounts, timestamps, captions. */
  bodyLight: 'Quicksand_400Regular',

  /** Caveat — the hand-drawn numerals on sticky notes. */
  hand: 'Caveat_600SemiBold',
} as const;

/**
 * Type scale. Headline sizes track the reference closely: the big welcome
 * headline is ~44px on a 1170pt-wide render, the standard question headline
 * ~34px, section titles ~26px.
 */
export const type = {
  hero: { fontFamily: fonts.displayBlack, fontSize: 44, lineHeight: 48 },
  headline: { fontFamily: fonts.displayBlack, fontSize: 34, lineHeight: 40 },
  headlineSm: { fontFamily: fonts.displayBlack, fontSize: 27, lineHeight: 33 },
  title: { fontFamily: fonts.displayBold, fontSize: 30, lineHeight: 36 },

  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 23, lineHeight: 28 },
  cardTitle: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 22 },
  /** Daily-task labels, which the reference sets in the heavy cut. */
  bodyBold: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22 },
  button: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 22 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fonts.bodyLight, fontSize: 13, lineHeight: 17 },
  micro: { fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 14 },
  tab: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 15 },
} as const;

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
  '6xl': 72,
} as const;

/** Standard horizontal page gutter. */
export const screenPadding = 20;

export const radii = {
  sm: 10,
  md: 16,
  lg: 20,
  /** The signature card radius. */
  card: 26,
  xl: 32,
  /** Anything fully rounded: buttons, chips, the tab bar. */
  pill: 999,
} as const;

/**
 * Height of the floating tab bar plus its bottom offset — scroll views add
 * this to their bottom inset so content clears the bar.
 */
export const tabBar = {
  height: 68,
  bottomOffset: 12,
  horizontalInset: 20,
} as const;

export const tabBarClearance =
  tabBar.height + tabBar.bottomOffset + spacing.lg;

// ---------------------------------------------------------------------------
// Elevation
// ---------------------------------------------------------------------------

/**
 * Shadows in the reference are very soft and very low opacity — large blur,
 * small offset. Anything punchier reads wrong against the warm background.
 */
export const shadows = {
  card: {
    shadowColor: '#8C8073',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  soft: {
    shadowColor: '#8C8073',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#6F6558',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  /**
   * Liquid glass sits *on* the photo rather than on the warm background, so it
   * casts a tighter, cooler shadow than the card shadows above — enough to
   * lift the lens off the image without smudging it.
   */
  glass: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  /** Sticky notes cast a tighter, more directional shadow. */
  sticky: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 2, height: 4 },
    elevation: 4,
  },
} as const;

// ---------------------------------------------------------------------------
// Liquid glass
// ---------------------------------------------------------------------------

/**
 * The iOS 26 "liquid glass" material — a live lens rather than a tinted card.
 * Three layers stack to make it read as a physical piece of glass:
 *
 *   1. a real backdrop blur, so whatever sits behind melts and shows through,
 *   2. a vertical body wash that is brightest at the lit top edge, thinnest
 *      through the middle, and lifts again at the bottom where light bounces
 *      back up off the surface underneath,
 *   3. a specular rim that catches light on the top-left and bottom-right
 *      corners and dims across the middle of each edge.
 *
 * Every value is alpha-only on white: the material has no colour of its own,
 * it borrows whatever it floats over. That is what keeps it looking like glass
 * over a dark photo *and* over a light one.
 */
export const glass = {
  /**
   * Backdrop blur strength. Enough that the photo behind smears into colour
   * fields, not so much that it flattens to a single tone — you should still
   * be able to tell a dark card edge from a bright tortilla through the lens.
   * On web this also sets the tint opacity (expo-blur couples the two), which
   * is why `sheen` below stays restrained.
   */
  blur: 46,
  /**
   * The thinnest of Apple's light materials — the one liquid glass is actually
   * built on. Plain `light` is UIBlurEffectStyleLight, which frosts over far
   * too much to see through. On web both map to the same wash, so this is a
   * free win on iOS.
   */
  tint: 'systemUltraThinMaterialLight',
  /** Thickness of the specular edge, in px. Below ~1.5 it stops reading. */
  rimWidth: 1.5,
  /** Body wash, top to bottom. */
  sheen: [
    'rgba(255,255,255,0.42)',
    'rgba(255,255,255,0.12)',
    'rgba(255,255,255,0.28)',
  ],
  /**
   * Specular edge, run corner-to-corner so the highlight travels around the
   * rim: hot at top-left, falling away through the middle, catching again at
   * bottom-right. A flat white border reads as a stroke; this reads as glass.
   */
  rim: [
    'rgba(255,255,255,0.95)',
    'rgba(255,255,255,0.30)',
    'rgba(255,255,255,0.85)',
  ],
  /**
   * Flat stand-in for the blur. Android below API 31 and any platform where
   * the backdrop cannot be sampled falls back to this, so the badge stays
   * legible rather than disappearing into the photo.
   */
  fallback: 'rgba(255,255,255,0.42)',
} as const;

export const theme = {
  colors,
  gradients,
  stickyPalette,
  fonts,
  type,
  spacing,
  screenPadding,
  radii,
  shadows,
  glass,
  tabBar,
  tabBarClearance,
} as const;

export default theme;

/**
 * RN 0.86 no longer types `StyleSheet.absoluteFillObject`; this is the
 * spreadable equivalent.
 */
export const absoluteFill = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;
