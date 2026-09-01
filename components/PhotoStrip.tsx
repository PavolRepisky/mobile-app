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
  /** White pill overlapping the top edge, e.g. "+10,000 joined". */
  badge?: string;
  /** Corner radius of the individual cards. */
  radius?: number;
  onPress?: () => void;
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
 * carries on both edges. The badge straddles the strip's top edge, so the
 * strip reserves exactly the half of it that hangs above the photos —
 * anything else and the pill sits high or low of the seam.
 */
const badgeHeight = pillHeights.md + glass.rimWidth * 2;

/**
 * The four-up photo row that represents a challenge everywhere it appears.
 * The tiles are separate rounded cards, each tilted its own way and lapping
 * over the one before it, so the row's edge is faintly ragged and every card
 * shows its corners — a hand-laid stack rather than a sliced panorama. The
 * joined-count badge floats over the top edge, centred.
 */
export function PhotoStrip({
  photos,
  height = 160,
  badge,
  radius = radii.md,
  onPress,
  style,
}: PhotoStripProps) {
  const body = (
    // The badge sits proud of the strip; without one there is nothing to
    // reserve room for.
    <View style={[badge && styles.wrapBadge, style]}>
      <View style={{ height }}>
        {photos.map((photo, i) => (
          <Tile
            key={i}
            photo={photo}
            index={i}
            count={photos.length}
            radius={radius}
          />
        ))}
      </View>

      {badge ? (
        <View pointerEvents="none" style={styles.badge}>
          {/* The lens rather than the white fill: the badge straddles the top
              edge of the photographs, which is exactly the sort of thing worth
              refracting — the same reason the tab bar and the prep times are
              built from it. Pill defaults to flex-start, which would beat the
              wrapper's centring. */}
          <Pill label={badge} tone="glass" bold style={styles.badgePill} />
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
}: {
  photo: PhotoSource;
  index: number;
  count: number;
  radius: number;
}) {
  const share = 100 / count;
  // Every card starts on its own division and runs over the next one, so each
  // shows the same width of photo. The last one stops at the edge instead.
  const left = index * share;
  const right = index === count - 1 ? 100 : (index + 1) * share + TILE_LAP;

  return (
    // The shadow lives out here: a rounded clip on the same view would cut it
    // off, so the photo inside carries the corners.
    <View
      style={[
        styles.tile,
        {
          left: `${left}%`,
          width: `${right - left}%`,
          transform: [{ rotate: `${TILE_TILTS[index % TILE_TILTS.length]}deg` }],
        },
      ]}
    >
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
    </View>
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
  wrapBadge: {
    // Exactly the half of the badge that hangs above the photos.
    paddingTop: badgeHeight / 2,
  },
  tile: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    ...shadows.soft,
  },
  badge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
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
