import { Image } from 'expo-image';
import { useState } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { absoluteFill, colors, colorsFor, layout } from '@/constants/theme';
import type { ImageSourcePropType } from '@/lib/imageSource';
import { MosaicArrangement } from './PhotoCollage';
import { Placeholder } from './Placeholder';
import { Text } from './Text';

/**
 * The width a cover is laid out at before it's scaled into its tile — the
 * size of a shared card, so the lettering keeps the proportions it was set
 * at whatever size of grid it lands in.
 */
const COVER_WIDTH = 280;
/** A post's shape, width over height: 3:4 upright, the BeReal frame — a
 * phone shot's own shape, so a single photo isn't cropped to a square,
 * while still short of a full-page photo in a feed of many posts. Shared
 * by the post on Community and its tile on a profile, so a day keeps one
 * shape wherever it shows. */
export const POST_RATIO = 3 / 4;
/** The shade behind the day and era name: a wide, soft oval, about the
 * size of the two lines with room to fade out well past them. */
const SHADE_WIDTH = 200;
const SHADE_HEIGHT = 110;
/** How dark the shade is at its middle — enough to hold white script over a
 * bright photo, faint enough to read as a shadow rather than a patch. */
const SHADE_OPACITY = 0.55;
/** The era's name let down onto the day: the script's line box leaves
 * room over its letters, and the name reads as the day's own when it
 * sits close. */
const ERA_DROP = 4;
/** "selfera" at the foot, held back so it signs the cover without being
 * read before the day. */
const MARK_OPACITY = 0.6;

/** Past this many photos a piece is too small to carry its time. */
const MAX_CAPTIONED = 6;
/** Scaled below this — a tile three to a row — the small print shrinks to
 * specks that read as noise, so a tile carries the day alone. */
const CAPTION_MIN_SCALE = 0.6;
/** Blur on the lettering's drop shadow — the day stamp's own. */
const CAPTION_SHADOW_RADIUS = 12;
/** Room either side of a caption inside its piece, at the card's width. */
const CAPTION_INSET = 6;

/** Handed to `Image`/`Placeholder` as often as the arrangement itself. */
const PIECE = { flex: 1 } as const;

export interface DayCoverCell {
  key: string;
  photo?: ImageSourcePropType | null;
  seed?: string | null;
  /** When the task was shot, "7:57am" — laid over its photo. */
  time?: string;
  /** The task the photo proves — under its time, where `tasks` asks for it. */
  label?: string;
}

/** "7:57am" or "7:57 a.m." as the app prints a shot's time everywhere —
 * the cover and a post's own photos alike: "7:57 AM". Anything that isn't
 * a 12-hour time is left as it came. */
export const shotClock = (time: string) => {
  const match = /^(\d{1,2}:\d{2})\s*([ap])\.?m\.?$/i.exec(time.trim());
  return match ? `${match[1]} ${match[2].toUpperCase()}M` : time;
};

export interface DayCoverProps {
  /** The day's photos, in its grid's order. */
  cells: readonly DayCoverCell[];
  day: number;
  /** The era's length — "/75" after the day. */
  totalDays?: number;
  /** Over the day: the era's name. */
  kicker: string;
  /** The cover's height over its width — 1 for a square tile, 4/3 for an
   * upright one. */
  ratio?: number;
  /** Each photo's time in its middle — on unless a shared cover leaves it
   * off. */
  times?: boolean;
  /** Each photo's task under its time — only on a cover made to share,
   * which is seen big enough to read it. */
  tasks?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A finished day as its cover — the face a day wears in a grid, before it's
 * opened: its photos edge to edge with no seam; in the middle of each photo
 * the time it was shot, very small; across the
 * middle of the cover the day in script over the era's name, on a soft
 * shadow; and "selfera", faint, at its foot.
 *
 * Laid out at a fixed card width and scaled whole into whatever box it's
 * given, so a tile in any grid is a true miniature of the same cover.
 */
export function DayCover({
  cells,
  day,
  totalDays,
  kicker,
  ratio = 1,
  times = true,
  tasks = false,
  style,
}: DayCoverProps) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const { width, height } = box;
  const scale = width / COVER_WIDTH;
  const coverHeight = COVER_WIDTH * ratio;
  const small = scale < CAPTION_MIN_SCALE;
  const captioned = !small && cells.length <= MAX_CAPTIONED;
  // A plain string for the SVG — the same in light and dark, since it sits
  // on the photos.
  const shade = colorsFor('light').coverShade;

  return (
    <View
      style={[styles.root, style]}
      pointerEvents="none"
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        setBox({ width: w, height: h });
      }}
    >
      {width > 0 ? (
        <View
          style={[
            styles.inner,
            {
              width: COVER_WIDTH,
              height: coverHeight,
              // Centred on the box, then scaled about that centre — which
              // lands it exactly edge to edge.
              left: (width - COVER_WIDTH) / 2,
              top: (height - coverHeight) / 2,
              transform: [{ scale }],
            },
          ]}
        >
          <MosaicArrangement
            cells={cells}
            seam={0}
            renderCell={(cell) => (
              <View key={cell.key} style={PIECE}>
                {cell.photo ? (
                  <Image source={cell.photo} style={absoluteFill} contentFit="cover" />
                ) : (
                  <Placeholder seed={cell.seed ?? cell.key} radius={0} style={absoluteFill} />
                )}
                {captioned && ((times && cell.time) || (tasks && cell.label)) ? (
                  <View style={styles.caption}>
                    {times && cell.time ? (
                      <Text variant="coverCaption" color={colors.onMedia} style={styles.shadow}>
                        {shotClock(cell.time)}
                      </Text>
                    ) : null}
                    {tasks && cell.label ? (
                      <Text
                        variant="coverCaption"
                        color={colors.onMedia}
                        numberOfLines={2}
                        style={[styles.shadow, styles.centred]}
                      >
                        {cell.label}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            )}
          />
          <View style={styles.dim} />

          <View style={styles.middle}>
            <Svg width={SHADE_WIDTH} height={SHADE_HEIGHT} style={styles.shade}>
              <Defs>
                <RadialGradient id="coverShade" cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop offset="0" stopColor={shade} stopOpacity={SHADE_OPACITY} />
                  <Stop offset="1" stopColor={shade} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse
                cx={SHADE_WIDTH / 2}
                cy={SHADE_HEIGHT / 2}
                rx={SHADE_WIDTH / 2}
                ry={SHADE_HEIGHT / 2}
                fill="url(#coverShade)"
              />
            </Svg>
            <Text
              variant="coverEra"
              color={colors.onMedia}
              numberOfLines={1}
              style={[styles.shadow, styles.centred, styles.era]}
            >
              {kicker}
            </Text>
            <Text variant="coverDay" color={colors.onMedia} style={styles.shadow}>
              {totalDays ? `Day ${day}/${totalDays}` : `Day ${day}`}
            </Text>
          </View>

          {small ? null : (
            <View style={styles.foot}>
              <Text variant="coverMark" color={colors.onMedia} style={styles.mark}>
                selfera
              </Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...absoluteFill,
    overflow: 'hidden',
  },
  inner: {
    position: 'absolute',
  },
  dim: {
    ...absoluteFill,
    backgroundColor: colors.coverDim,
  },
  // A photo's time in the middle of its piece, as the reference prints it.
  caption: {
    ...absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: CAPTION_INSET,
  },
  shadow: {
    textShadowColor: colors.onMediaShadow,
    textShadowRadius: CAPTION_SHADOW_RADIUS,
  },
  centred: {
    textAlign: 'center',
  },
  era: {
    marginBottom: -ERA_DROP,
  },
  middle: {
    ...absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.gutter,
  },
  // Centred behind the two lines, whatever their length.
  shade: {
    position: 'absolute',
  },
  foot: {
    ...absoluteFill,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: layout.stack,
  },
  mark: {
    opacity: MARK_OPACITY,
  },
});

export default DayCover;
