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
  /** Pure white — a deliberate split from the warm app shell. Own profile,
   * a friend's profile and a wall day all sit on it. */
  backgroundPlain: '#FFFFFF',
  /** Slightly cooler off-white used by the settings stack. */
  backgroundAlt: '#F8F6F5',
  /**
   * The warm pinkish off-white the profile-views screen sits on — a touch
   * warmer than `background`, sampled off reference/screens/profile/screen5.
   */
  backgroundWarm: '#FBF6F3',

  /** Cards, the tab bar, circular icon buttons. */
  surface: '#FFFFFF',
  /** The reaction strip's circles, which sit directly on a friend's photo —
   * held just off full white so the picture underneath still reads through. */
  surfaceOnPhoto: 'rgba(255,255,255,0.92)',
  /**
   * The white counterpart to `inkOnPhoto`, held to the same translucency —
   * the my-challenge card's days-left badge, paired against the dark category
   * chip so the two read as a matched set rather than two different fills.
   */
  surfaceOnPhotoDim: 'rgba(255,255,255,0.55)',
  /** Inset panels: the invite card, "Create Daily Task+" well. */
  surfaceMuted: '#F1F0EA',
  /** Empty photo slots and "add" tiles on the wall. */
  surfaceSunken: '#F2F2F2',
  /**
   * A search field's own fill, sitting straight on the page's own white
   * rather than the warm shell `surfaceSunken` was tuned against — held to a
   * lighter, barely-there sink so it doesn't read as a grey block on white.
   */
  surfaceInput: '#F5F5F5',
  /**
   * The face of a print that has not come up yet. A shade off the paper it is
   * printed on and a shade warm of grey, the way film looks before it develops
   * — a flat white window would read as a photograph that failed to load.
   */
  undeveloped: '#EBE7DF',

  /** Primary text and the solid pill buttons. */
  ink: '#141414',
  /** Softer body copy. */
  inkSoft: '#3A3A3A',
  /** Timestamps, placeholders, inactive tab labels, review bodies. */
  inkMuted: '#9C9C9C',
  /** A step darker than `inkMuted` — meta rows that want to stay quiet but
   * still read at a glance, like the days/tasks line on the Discover list. */
  inkFaded: '#7E7E7E',
  /**
   * Checklist labels. Sampled off the friends reference, where the task text
   * is a cool near-black rather than the flat `ink` used for titles.
   */
  inkSlate: '#2B3038',
  /**
   * The greyed-out half of the Discover/Friends switch — barely there, but a
   * touch heavier than a hairline. Sampled from the same screen.
   */
  inkGhost: '#D7D6D3',
  /** Text on dark fills. */
  inkInverse: '#FFFFFF',
  /**
   * A solid badge's own fill where it sits on a photo rather than the page —
   * held translucent so the shot underneath still shows through instead of a
   * flat block sitting on top of it. The my-challenge card's category chip.
   */
  inkOnPhoto: 'rgba(20,20,20,0.55)',

  /** Text input fills and unselected control strokes. */
  field: '#CDCDCD',
  /** Hairlines, and the light pill behind the active tab. */
  divider: '#E9E8E2',
  /** Slightly stronger separator inside cards. */
  dividerStrong: '#E2E0DA',

  /**
   * Destructive rows and the Restart action. A saturated red rather than the
   * washed-out pink it started as — it has to read as a warning at a glance.
   */
  destructive: '#E63950',

  /**
   * The rose accent on the Add Friends screen's "See all". Sampled off the
   * reference screenshot rather than reused from `destructive`: that red
   * reads as a warning, and nothing here is one.
   */
  accent: '#F04884',

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
  /**
   * The wash under a numeral or label printed straight onto a photo, where
   * there is no room for a plate behind it — the calendar's day numbers. Held
   * to a third so the picture still reads through it, which is as light as it
   * can go and still carry white text over a sunlit shot.
   */
  scrimPhoto: 'rgba(0,0,0,0.34)',
  /**
   * A locked photo's own scrim — near-opaque rather than a reading wash, so
   * the shot underneath is actually hidden rather than just dimmed. `ink`'s
   * own tone rather than flat black, so it still reads as this app's own
   * shadow and not a generic overlay.
   */
  scrimLock: 'rgba(20,20,20,0.88)',

  /**
   * Washes that sit *on* glass rather than on a background. They are black at a
   * few percent rather than a grey fill, so they darken whatever the lens is
   * sampling instead of covering it — a solid chip here would read as a card on
   * the dialog rather than a frosted pill in it.
   */
  frostField: 'rgba(0,0,0,0.06)',
  frostAction: 'rgba(0,0,0,0.07)',
  /** The barely-there dim behind a popover; the lens does the rest. */
  frostBackdrop: 'rgba(0,0,0,0.04)',

  /**
   * Full-bleed media surfaces — the story viewer, the camera, the black
   * transition behind a pushed photo route. Deliberately pure black rather than
   * the warm shell: the photo has to be the only light on the screen.
   */
  mediaBackdrop: '#000000',
  /** Secondary copy over a photo — white, pulled back so it recedes. */
  onMediaSoft: 'rgba(255,255,255,0.8)',
  /** Unfilled half of a progress track over a photo. */
  onMediaTrack: 'rgba(255,255,255,0.4)',
  /** Ring around the shutter — white held off full strength so the solid
   * button inside still reads as the brighter of the two. */
  onMediaBorder: 'rgba(255,255,255,0.55)',
  /** The soft drop under white type laid on a photo — just enough to lift it
   * off a bright patch of the shot without reading as an outline. */
  onMediaShadow: 'rgba(0,0,0,0.35)',
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
  /**
   * The band of shade behind the day stamp on a post's photo grid: clear at
   * the top and bottom edges, darkest through the middle where the type
   * sits, so the photos keep their full brightness everywhere the lettering
   * isn't.
   */
  stampBand: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.32)', 'rgba(0,0,0,0)'],
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const fonts = {
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
  /** Section titles and the underlined tab rows. */
  bodyBold: 'Quicksand_700Bold',
  /** Muted secondary copy — amounts, timestamps, captions. */
  bodyLight: 'Quicksand_400Regular',

  /** Caveat — the hand-drawn numerals on sticky notes. */
  hand: 'Caveat_600SemiBold',

  /**
   * Fraunces Black — the day number stamped across a post's photo grid, and
   * nothing else. A soft, chunky Cooper-style serif, because it sits *on* a
   * photograph like a magazine cover line: a thin-stroked face breaks up over
   * a busy image where this cut holds solid.
   */
  poster: 'Fraunces_900Black',
} as const;

/**
 * Tracking for anything set in Quicksand. The face sets wider than the
 * reference's rounded cut, so every Quicksand string is pulled a point tighter,
 * headlines included. Components that build their
 * own Quicksand style — text inputs, the oversized Discover/Friends labels —
 * pull this rather than repeating the number.
 */
export const bodyTracking = -1;

/**
 * Type scale. Headline sizes track the reference closely: the big welcome
 * headline is ~44px on a 1170pt-wide render, the standard question headline
 * ~34px, section titles ~26px. Headlines are set in Quicksand's heaviest cut
 * like everything else — the app has no separate display face; size alone
 * is what sets a headline apart.
 */
export const type = {
  hero: {
    fontFamily: fonts.bodyBold,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: bodyTracking,
  },
  headline: {
    fontFamily: fonts.bodyBold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: bodyTracking,
  },
  headlineSm: {
    fontFamily: fonts.bodyBold,
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: bodyTracking,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: bodyTracking,
  },

  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 23,
    lineHeight: 28,
    letterSpacing: bodyTracking,
  },
  /**
   * A touch under `sectionTitle`'s own default. Discover's per-challenge
   * titles and the preview page's "Daily Tasks" and "Reviews" headings all
   * share this cut, so the three read as the same weight of heading.
   */
  sectionTitleSm: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: bodyTracking,
  },
  /**
   * A further step down, for a card's own title sitting under a page-level
   * heading that already carries `sectionTitle` — the profile's "Current
   * challenge" card.
   */
  sectionTitleXs: {
    fontFamily: fonts.bodyBold,
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: bodyTracking,
  },
  cardTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: bodyTracking,
  },
  /** `cardTitle`'s own size, stepped up to true Bold — a sheet heading that
   * wants more weight than the ambient Semi carries without reading as a
   * bigger title than it is. */
  cardTitleBold: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: bodyTracking,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: bodyTracking,
  },
  bodyStrong: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: bodyTracking,
  },
  /**
   * One step under `bodyBold`: copy that wants weight without the shout — the
   * bullet list on the support card.
   */
  bodySemi: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: bodyTracking,
  },
  bodyBold: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: bodyTracking,
  },
  /**
   * The daily-task label, which the reference sets in the heavy cut. A step
   * above `bodyBold`: the to-do row lost its check circle, and the label is
   * now the only thing holding the width beside the photo.
   */
  taskLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: bodyTracking,
  },
  button: {
    fontFamily: fonts.bodySemi,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: bodyTracking,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: bodyTracking,
  },
  /**
   * `label`, one step up the weight ramp — the mosaic tile's task name, which
   * has to hold its own printed over a photo rather than sitting on plain
   * background the way most `label` copy does.
   */
  labelBold: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: bodyTracking,
  },
  caption: {
    fontFamily: fonts.bodyLight,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: bodyTracking,
  },
  micro: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: bodyTracking,
  },
  /** A step up from `micro` — the interaction counts on the profile grid's
   * own post tiles, which need to hold their own printed straight onto a
   * photo rather than fade into it. The heaviest cut Quicksand has: anything
   * lighter washes out again against a busy photo at this size. */
  microBold: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: bodyTracking,
  },
  /**
   * The uppercase stamp closing the day card — the challenge name and the
   * handle under its rule. Letterspaced open rather than set at the body
   * tracking: capitals pulled a point tighter crowd into a block instead of
   * reading as something pressed onto the page.
   */
  /**
   * The caption written in the chin of a print. Caveat, because a photograph
   * laid on a page is captioned by hand — the face runs small and loose, so it
   * sets larger than a sans would at the same optical size.
   */
  hand: {
    fontFamily: fonts.hand,
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: 0,
  },
  /**
   * "Day N" stamped across a post's photo grid, the way the reference sets
   * its cover word. Leading pulled in to the size so the kicker above tucks
   * against it rather than floating.
   */
  poster: {
    fontFamily: fonts.poster,
    fontSize: 68,
    lineHeight: 68,
    letterSpacing: -2,
  },
  stamp: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  tab: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: bodyTracking,
  },
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

/** Breathing room between the status bar and the first thing on a screen. */
export const screenTopGap = 20;

export const radii = {
  sm: 10,
  md: 16,
  lg: 20,
  /** The signature card radius. */
  card: 32,
  xl: 32,
  /** The friend card's corner. */
  '2xl': 44,
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

/**
 * Distance from the bottom of the screen to the bottom edge of the floating tab
 * bar. The pill floats *over* the home-indicator area rather than above it —
 * clearing the whole inset lifted it well off the bottom edge — while a phone
 * with no indicator keeps the plain offset.
 */
export const tabBarBottom = (insetBottom: number) =>
  Math.max(insetBottom - spacing.xl, spacing.md) + tabBar.bottomOffset;

/**
 * Distance from the bottom of the screen to the *top* edge of the bar, for
 * anything that has to sit clear of it (the invite button).
 */
export const tabBarTop = (insetBottom: number) =>
  tabBarBottom(insetBottom) + tabBar.height;

// ---------------------------------------------------------------------------
// Elevation
// ---------------------------------------------------------------------------

/**
 * Shadows in the reference are very soft and very low opacity — large blur,
 * small offset. Anything punchier reads wrong against the warm background.
 */
export const shadows = {
  /**
   * Close in and all but centred, so it shows on every edge instead of
   * pooling under one. Kept faint on purpose: the cards sit on a near-white
   * page, and anything heavier reads as a drawn outline rather than depth.
   */
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  /** The same cast, a step down: icon buttons, floating pills, photo tiles. */
  soft: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  floating: {
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  /** A step past `floating`, for the few surfaces that sit on top of a screen
   * rather than in it: the tilted friend card, the invite panel. */
  lifted: {
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
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
  /**
   * The heaviest in the set, for the two badges crowning the challenge feed.
   * They sit on the bare page rather than over a photo, so the shadow is what
   * lifts them off it — hence more of it than anything else needs.
   */
  deep: {
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
  /** Sticky notes cast a tighter, more directional shadow. */
  sticky: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 2, height: 4 },
    elevation: 4,
  },
  /**
   * A dropped cast rather than a centred one: the same soft, neutral blur as
   * `card`, weighted downward so the thing casting it reads as lifted off the
   * page. The avatar, the "Day N" badge, the task photos and the wall tiles
   * use it. Measured off the reference, where those photos carry about 7% at
   * their sides and half again as much underneath.
   */
  hard: {
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
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
  bodyTracking,
  spacing,
  screenPadding,
  screenTopGap,
  radii,
  shadows,
  glass,
  tabBar,
  tabBarClearance,
  tabBarBottom,
  tabBarTop,
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
