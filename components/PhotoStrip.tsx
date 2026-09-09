import type { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { glass, radii, shadows, spacing } from '@/constants/theme';
import { Pill, pillHeights } from './Pill';
import { Placeholder } from './Placeholder';
import { Text } from './Text';

/**
 * What a tile can hold: a bundled photo, or a seed standing in for one until
 * there is a real photo.
 */
export type PhotoSource = ImageSourcePropType | string;

export interface PhotoStripProps {
  /** The tiles — four across in the reference. */
  photos: readonly PhotoSource[];
  height?: number;
  /** White pill overlapping an edge of the strip, e.g. "+10,000 joined". */
  badge?: string;
  /** Which edge `badge` straddles. */
  badgePosition?: 'top' | 'bottom';
  /** Leading glyph on `badge`. */
  badgeIcon?: keyof typeof Ionicons.glyphMap;
  /**
   * `stacked` is the tilted, overlapping hand-laid look every other strip
   * uses. `flat` squares the tiles up and gives them a little air instead —
   * the Challenges list's own card.
   */
  layout?: 'stacked' | 'flat';
  /** Corner radius of the individual cards. */
  radius?: number;
  onPress?: () => void;
  /**
   * Makes each tile its own control instead of the whole strip being one —
   * fired with the tapped photo's index. Independent of `onPress`: a strip
   * only ever wires up one or the other.
   */
  onPressPhoto?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * How far each tile laps over the next, as a % of the strip's width. Wide
 * enough to close the seam, narrow enough that the rounded corners still
 * notch the edge where two cards meet.
 */
const TILE_LAP = 3;

/**
 * Degrees each tile is nudged off square, by position. Small enough to read as
 * a hand-laid stack rather than a mistake.
 */
const TILE_TILTS = [-1.2, 1.4, -0.9, 1.6];

/**
 * Outer height of the joined badge: the pill itself plus the glass rim it
 * carries on both edges. The badge straddles whichever edge it's set to, so
 * the strip reserves exactly the half of it that hangs off the photos —
 * anything else and the pill sits high or low of the seam.
 */
const badgeHeight = pillHeights.md + glass.rimWidth * 2;

/**
 * The four-up photo row that represents a challenge everywhere it appears.
 * The tiles are separate rounded cards, each tilted its own way and lapping
 * over the one before it, so the row's edge is faintly ragged and every card
 * shows its corners — a hand-laid stack rather than a sliced panorama. The
 * joined-count badge floats over an edge, centred.
 */
export function PhotoStrip({
  photos,
  height = 160,
  badge,
  badgePosition = 'top',
  badgeIcon,
  layout = 'stacked',
  radius = radii.md,
  onPress,
  onPressPhoto,
  style,
}: PhotoStripProps) {
  const body = (
    // The badge sits proud of the strip; without one there is nothing to
    // reserve room for.
    <View
      style={[
        badge && (badgePosition === 'top' ? styles.wrapBadgeTop : styles.wrapBadgeBottom),
        style,
      ]}
    >
      <View style={[{ height }, layout === 'flat' && styles.flatRow]}>
        {photos.map((photo, i) =>
          layout === 'flat' ? (
            <FlatTile
              key={i}
              photo={photo}
              index={i}
              count={photos.length}
              radius={radius}
              onPress={onPressPhoto && (() => onPressPhoto(i))}
            />
          ) : (
            <Tile
              key={i}
              photo={photo}
              index={i}
              count={photos.length}
              radius={radius}
              onPress={onPressPhoto && (() => onPressPhoto(i))}
            />
          ),
        )}
      </View>

      {badge ? (
        <View
          pointerEvents="none"
          style={[
            styles.badge,
            badgePosition === 'top' ? styles.badgeTop : styles.badgeBottom,
          ]}
        >
          {/* The lens rather than the white fill: the badge straddles an
              edge of the photographs, which is exactly the sort of thing
              worth refracting — the same reason the tab bar and the prep
              times are built from it. Pill defaults to flex-start, which
              would beat the wrapper's centring. */}
          <Pill
            label={badge}
            tone="glass"
            bold
            icon={badgeIcon}
            style={styles.badgePill}
          />
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {body}
    </Pressable>
  );
}

/**
 * One card of the strip: a bundled photo, or the drawn stand-in for one. Cards
 * are laid out by share of the strip rather than by flex so they can overlap,
 * and later ones paint over earlier ones.
 */
function Tile({
  photo,
  index,
  count,
  radius,
  onPress,
}: {
  photo: PhotoSource;
  index: number;
  count: number;
  radius: number;
  onPress?: () => void;
}) {
  const share = 100 / count;
  // Every card starts on its own division and runs over the next one, so each
  // shows the same width of photo. The last one stops at the edge instead.
  const left = index * share;
  const right = index === count - 1 ? 100 : (index + 1) * share + TILE_LAP;

  const tileStyle: StyleProp<ViewStyle> = [
    styles.tile,
    {
      left: `${left}%`,
      width: `${right - left}%`,
      transform: [{ rotate: `${TILE_TILTS[index % TILE_TILTS.length]}deg` }],
    },
  ];

  const content = (
    <>
      {typeof photo === 'string' ? (
        <Placeholder seed={photo} radius={radius} style={StyleSheet.absoluteFill} />
      ) : (
        <Image
          source={photo}
          contentFit="cover"
          transition={200}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
      )}
    </>
  );

  // The shadow lives out here: a rounded clip on the same view would cut it
  // off, so the photo inside carries the corners.
  if (!onPress) return <View style={tileStyle}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open photo"
      onPress={onPress}
      style={tileStyle}
    >
      {content}
    </Pressable>
  );
}

/**
 * Only the strip's own outer corners round off — the first tile's left pair,
 * the last tile's right pair. Everywhere in between stays square, so the gaps
 * read as cuts through one card rather than a row of separate ones.
 */
function outerCorners(index: number, count: number, radius: number) {
  if (count <= 1) return { borderRadius: radius };
  if (index === 0) {
    return {
      borderTopLeftRadius: radius,
      borderBottomLeftRadius: radius,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
    };
  }
  if (index === count - 1) {
    return {
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
      borderTopRightRadius: radius,
      borderBottomRightRadius: radius,
    };
  }
  return { borderRadius: 0 };
}

/**
 * One card of a `flat` strip: square, evenly gapped by the row's own `gap`,
 * no rotation. Simpler than `Tile` because there is no overlap to work out —
 * each card just takes an even flex share.
 */
function FlatTile({
  photo,
  index,
  count,
  radius,
  onPress,
}: {
  photo: PhotoSource;
  index: number;
  count: number;
  radius: number;
  onPress?: () => void;
}) {
  const corners = outerCorners(index, count, radius);

  const content = (
    <>
      {typeof photo === 'string' ? (
        <Placeholder seed={photo} radius={0} style={[StyleSheet.absoluteFill, corners]} />
      ) : (
        <Image
          source={photo}
          contentFit="cover"
          transition={200}
          style={[StyleSheet.absoluteFill, corners]}
        />
      )}
    </>
  );

  // Shadow out here for the same reason `Tile`'s is: a clip on this view
  // would cut it off, so the photo inside carries the corners.
  if (!onPress) return <View style={styles.flatTile}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open photo"
      onPress={onPress}
      style={styles.flatTile}
    >
      {content}
    </Pressable>
  );
}

/** Photo strip plus its title — one row of the "Select your challenge" list. */
export function ChallengeRow({
  title,
  photos,
  joined,
  onPress,
  style,
}: {
  title: string;
  photos: readonly PhotoSource[];
  joined?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      {/* The same height Discover gives its strips, so a challenge is the
          same object on both screens. */}
      <PhotoStrip photos={photos} height={167} badge={joined} />
      <Text variant="sectionTitle" style={styles.rowTitle}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapBadgeTop: {
    // Exactly the half of the badge that hangs above the photos.
    paddingTop: badgeHeight / 2,
  },
  wrapBadgeBottom: {
    // Exactly the half of the badge that hangs below the photos.
    paddingBottom: badgeHeight / 2,
  },
  tile: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    ...shadows.soft,
  },
  flatRow: {
    flexDirection: 'row',
    // A hair under `spacing.xs`: a full step read as too wide a seam once the
    // tiles sat flush and square.
    gap: spacing.xs / 2,
  },
  flatTile: {
    flex: 1,
    height: '100%',
    ...shadows.soft,
  },
  badge: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  badgeTop: {
    top: 0,
  },
  badgeBottom: {
    bottom: 0,
  },
  badgePill: {
    alignSelf: 'center',
  },
  rowTitle: {
    marginTop: spacing.md,
  },
  pressed: {
    opacity: 0.9,
  },
});

export default PhotoStrip;
