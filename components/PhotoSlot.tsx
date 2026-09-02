import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  Pressable,
  StyleSheet,
  View,
  type DimensionValue,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, shadows, spacing } from '@/constants/theme';
import { Placeholder } from './Placeholder';
import { Text } from './Text';

/** The done tick on a filled slot. Hangs a quarter of itself off the corner. */
const BADGE = 26;

/**
 * What an empty slot shows, and how big. The plus runs a touch larger than the
 * camera because it is drawn from thin strokes with nothing but air around
 * them; the picture runs smaller than either, because it is marking a place
 * rather than offering an action and should not be the first thing the eye
 * lands on in a block of them.
 */
const EMPTY_GLYPHS = {
  camera: { name: 'camera', size: 26 },
  add: { name: 'add', size: 28 },
  image: { name: 'image-outline', size: 22 },
} as const;

export interface PhotoSlotProps {
  /** A bundled photo. Takes precedence over `seed`, which stands in for one. */
  photo?: ImageSourcePropType | null;
  /** When set, the slot shows a "photo"; otherwise the empty camera tile. */
  seed?: string | null;
  /**
   * A point width, or a share of the parent — the collage lays its prints out
   * in flexed columns, so its tiles are sized by the column rather than by a
   * number this component could know.
   */
  width?: DimensionValue;
  height?: number;
  radius?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /**
   * Empty slots on the profile wall show a `+` rather than a camera, and
   * `'none'` leaves the tile blank.
   *
   * `'image'` is the quiet one: an outlined picture rather than a camera or a
   * plus, drawn a size down. It marks where a photograph is going to go
   * without asking for one — for the day's block, which is a record, and where
   * the camera is opened from the task rows instead. A camera on a tile that
   * does not answer to a tap is an invitation the tile cannot honour.
   */
  emptyIcon?: 'camera' | 'add' | 'image' | 'none';
  /**
   * Turns the empty tile from a flat grey block into an invitation: a dashed
   * field outline with this caption under the glyph. For the task rows, where
   * the slot is the only control on the row and has to say so. Slots that are
   * merely decorative — a friend's list, the wall's own tiles — leave it off.
   */
  emptyLabel?: string;
  /**
   * The dashed field outline on its own, without a caption under the glyph.
   * Defaults to whether there is an `emptyLabel` — the two arrived together —
   * but the collage wants the outline and no words: its prints have no room
   * for a caption, and the task rows underneath already say what a tap does.
   */
  emptyOutline?: boolean;
  /**
   * `'warm'` trades the cool grey fill for the shell's own muted tone inside a
   * hairline. The grey is right where an empty slot is a thing to press — it
   * reads as a well waiting to be filled. In a block that is a record of a day
   * it is wrong twice over: it is a cold grey on a warm page, and early in a
   * day most of the block is made of it, so the gaps end up louder than the
   * photographs. The hairline is what keeps the quieter fill from reading as a
   * patch where something failed to load.
   */
  emptyTone?: 'sunken' | 'warm';
  /**
   * Marks a filled slot with a tick in the corner. The to-do list has no check
   * circle: a task is done because it was photographed, so the proof carries
   * the status rather than a control sitting next to it.
   */
  done?: boolean;
  /** Degrees off straight. A shade of tilt reads as a photo laid on the page
   * rather than a thumbnail placed in a grid. */
  tilt?: number;
  /**
   * `'card'` is the diffuse lift the wall tiles use; `'hard'` is the tight,
   * offset near-black drop the task rows use, so the photos read as prints
   * laid on the page rather than thumbnails set into it.
   */
  shadow?: boolean | 'card' | 'hard';
  /**
   * Overrides the read-out label. Slots that sit beside their task's text
   * don't need one; a tile standing on its own in the collage does, or the
   * whole day reads out as a row of identical "Add photo" buttons.
   */
  accessibilityLabel?: string;
}

/**
 * The rounded thumbnail attached to every task row, and the "add" tiles on the
 * profile wall. Filled state is the photo itself, optionally ticked; empty
 * state is a sunken grey tile with a glyph, or — where the slot is something
 * to press — a dashed outline captioned with what pressing it does.
 */
export function PhotoSlot({
  photo,
  seed,
  width = 88,
  height = 118,
  radius = radii.lg,
  onPress,
  style,
  emptyIcon = 'camera',
  emptyLabel,
  emptyOutline = !!emptyLabel,
  emptyTone = 'sunken',
  done,
  tilt,
  shadow = true,
  accessibilityLabel,
}: PhotoSlotProps) {
  const box: ViewStyle = { width, height, borderRadius: radius };
  const filled = !!photo || !!seed;

  const inner = photo ? (
    <View style={[box, styles.clip]}>
      <Image
        source={photo}
        contentFit="cover"
        transition={200}
        style={StyleSheet.absoluteFill}
      />
    </View>
  ) : filled ? (
    <Placeholder seed={seed!} radius={radius} style={box} />
  ) : (
    <View
      style={[
        styles.empty,
        emptyTone === 'warm' ? styles.emptyWarm : null,
        box,
        emptyOutline ? styles.emptyOutlined : null,
      ]}
    >
      {emptyIcon === 'none' ? null : (
        <Ionicons
          name={EMPTY_GLYPHS[emptyIcon].name}
          size={EMPTY_GLYPHS[emptyIcon].size}
          color={emptyOutline ? colors.inkMuted : colors.field}
        />
      )}
      {emptyLabel ? (
        <Text variant="micro" color={colors.inkMuted} center style={styles.emptyLabel}>
          {emptyLabel}
        </Text>
      ) : null}
    </View>
  );

  // The shadow needs a shape to cast from: on iOS a transparent wrapper
  // squares the shadow off at the bounds instead of following the corner.
  const wrapper = [
    shadow && [
      { borderRadius: radius, backgroundColor: colors.surface },
      shadow === 'hard' ? shadows.hard : shadows.card,
    ],
    tilt ? { transform: [{ rotate: `${tilt}deg` }] } : null,
    style,
  ];

  // Sits on the print's corner like something stuck there afterwards, ring
  // and all, so it holds against a dark photo as readily as a pale one.
  const badge =
    done && filled ? (
      <View style={[styles.badge, shadows.soft]}>
        <Ionicons name="checkmark" size={15} color={colors.inkInverse} />
      </View>
    ) : null;

  if (!onPress)
    return (
      <View style={wrapper}>
        {inner}
        {badge}
      </View>
    );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ?? (filled ? 'View photo' : 'Add photo')
      }
      onPress={onPress}
      style={({ pressed }) => [wrapper, pressed && styles.pressed]}
    >
      {inner}
      {badge}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  empty: {
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * The shell's own muted tone, held by a hairline. The fill sits only a shade
   * off the page it is on, which is the point — a gap should recede — but a
   * shape that pale with no edge stops looking like a place and starts looking
   * like a smudge, so the rule is what draws it.
   */
  emptyWarm: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  /**
   * The dash is what separates "nothing here yet" from "nothing goes here":
   * a solid tile of the same grey reads as a disabled thumbnail.
   */
  emptyOutlined: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.field,
    // The dashed rule needs air around the glyph, or it crops the caption on
    // the narrow task tiles.
    paddingHorizontal: spacing.sm,
  },
  emptyLabel: {
    marginTop: spacing.xs,
  },
  badge: {
    position: 'absolute',
    right: -BADGE / 4,
    bottom: -BADGE / 4,
    width: BADGE,
    height: BADGE,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});

export default PhotoSlot;
