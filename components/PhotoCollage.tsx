import { useState } from 'react';
import {
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, shadows, spacing } from '@/constants/theme';
import { PhotoSlot } from './PhotoSlot';
import { Polaroid, POLAROID_RATIO } from './Polaroid';

/** One print in the collage — a task's proof photo, or the gap where it goes. */
export interface CollageCell {
  /** Stable across renders: the arrangement is derived from it. */
  key: string;
  photo?: ImageSourcePropType | null;
  seed?: string | null;
  done?: boolean;
  /** Written by hand in the print's chin. */
  caption?: string;
  /**
   * What the tile is read out as. The grid layouts show no text of their own,
   * so without this a screen reader gets five identical "Add photo" tiles.
   */
  label?: string;
  onPress?: () => void;
}

export interface PhotoCollageProps {
  cells: readonly CollageCell[];
  /** Overrides `collageColumns`, which is what the count would choose itself. */
  columns?: number;
  /**
   * `'collage'` is the scattered page of prints. `'grid'` is the same photos
   * laid out plain — equal tiles, straight, in task order. `'dice'` is the
   * five-task arrangement: four square tiles with the fifth laid over the
   * middle, the way the five is pipped on a die. A day that is not five tasks
   * long has no such arrangement, so it falls back to the plain grid.
   */
  layout?: 'collage' | 'grid' | 'dice';
  /**
   * Ceiling on the pile's height. The pile is laid out in shares of its own
   * width, so it has one shape and one aspect; where the room is shorter than
   * that shape wants — the day card, whose height is fixed by its 4:5 — the
   * whole pile is drawn narrower rather than squashed, and centred in what is
   * left. Left off, it fills the width it is given.
   */
  maxHeight?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Tile height in the grid. One height for every print — the whole point of the
 * grid is that nothing about a photo's place says anything about the photo.
 */
const GRID_HEIGHT = 124;

/**
 * The centre print, as a share of a corner tile. Small enough to leave all
 * four corners readable underneath it, big enough not to read as a badge
 * dropped on the block.
 */
const DICE_CENTRE = 0.66;

/** White margin around the centre print, so it reads as laid on top. */
const MAT = 4;

/** Stable per key, so the arrangement survives a re-render. */
function hash(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Where each print lands, in shares of the pile's own width — so one set of
 * numbers describes the arrangement at any size.
 *
 * These are laid out by hand rather than generated. A pile is a composition:
 * which print sits on top, which corner laps over which, where the eye enters.
 * Dealt by rule it comes out evenly spaced and reads as a grid that slipped;
 * placed, it reads as a handful of prints somebody put down.
 *
 * One rule they all keep: a print may lap over another's picture, never over
 * its chin. Prints are drawn in order, so a later one covers an earlier one,
 * and a caption buried under the next photograph is worse than no caption —
 * it reads as a rendering fault rather than as a pile. Every row therefore
 * starts below the row above it has finished, chin included.
 */
interface Slot {
  x: number;
  y: number;
  w: number;
  /** Degrees off straight. Big enough to see — a print is never square on. */
  rot: number;
}

const PILES: Record<number, readonly Slot[]> = {
  1: [{ x: 0.19, y: 0, w: 0.62, rot: -2.5 }],
  2: [
    { x: 0.0, y: 0.08, w: 0.54, rot: -4 },
    { x: 0.44, y: 0.0, w: 0.54, rot: 3 },
  ],
  3: [
    { x: 0.0, y: 0.03, w: 0.5, rot: -4.5 },
    { x: 0.47, y: 0.0, w: 0.5, rot: 3.5 },
    { x: 0.23, y: 0.59, w: 0.53, rot: -1.5 },
  ],
  4: [
    { x: 0.0, y: 0.0, w: 0.44, rot: -4 },
    { x: 0.53, y: 0.03, w: 0.44, rot: 3 },
    { x: 0.03, y: 0.55, w: 0.44, rot: 2.5 },
    { x: 0.53, y: 0.58, w: 0.44, rot: -3.5 },
  ],
  5: [
    { x: 0.0, y: 0.02, w: 0.36, rot: -5 },
    { x: 0.32, y: 0.0, w: 0.36, rot: 2.5 },
    { x: 0.64, y: 0.03, w: 0.36, rot: -2 },
    { x: 0.08, y: 0.46, w: 0.4, rot: 3.5 },
    { x: 0.52, y: 0.49, w: 0.4, rot: -3 },
  ],
};

/**
 * Past five there is no composed arrangement, so prints fall into a pair of
 * staggered columns — still overlapping and still off straight, just no longer
 * arranged. A challenge that long is a list, and the pile admits it.
 */
function pileFor(count: number): readonly Slot[] {
  const preset = PILES[count];
  if (preset) return preset;

  return Array.from({ length: count }, (_, i) => {
    const right = i % 2 === 1;
    return {
      x: right ? 0.53 : 0,
      y: Math.floor(i / 2) * 0.34 + (right ? 0.03 : 0),
      w: 0.45,
      rot: right ? 3 : -3.5,
    };
  });
}

/**
 * How tall the pile comes out for a given number of prints, as a share of its
 * width. The day card works back through this from the room it has left to the
 * width the pile should be drawn at.
 */
export function collageRatio(count: number): number {
  if (count === 0) return 0;
  return Math.max(
    ...pileFor(count).map((slot) => slot.y + slot.w * POLAROID_RATIO),
  );
}

/**
 * The prints as a pile: square instant photographs in white frames, each one
 * off straight, lapping over its neighbours, captioned by hand in the chin.
 */
function Pile({
  cells,
  maxHeight,
  style,
}: {
  cells: readonly CollageCell[];
  maxHeight?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [available, setAvailable] = useState(0);

  const slots = pileFor(cells.length);
  const ratio = collageRatio(cells.length);

  // Narrower rather than shorter: the pile keeps its shape and gives up width
  // when the room is not tall enough for it.
  const width =
    maxHeight && ratio > 0
      ? Math.min(available, maxHeight / ratio)
      : available;

  return (
    <View style={style}>
      {/* Measured on a bare child rather than on the styled box itself: a
          caller's `style` may carry padding, and `onLayout` reports the box
          including it — so the pile would be drawn that much too wide and
          hang over both edges of the column it was meant to sit in. */}
      <View onLayout={(e) => setAvailable(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <View style={[styles.pile, { width, height: width * ratio }]}>
            {cells.map((cell, i) => {
              const slot = slots[i];
              return (
                <Polaroid
                  key={cell.key}
                  width={slot.w * width}
                  photo={cell.photo}
                  seed={cell.seed}
                  caption={cell.caption}
                  tilt={slot.rot}
                  onPress={cell.onPress}
                  accessibilityLabel={cell.label}
                  style={{
                    position: 'absolute',
                    left: slot.x * width,
                    top: slot.y * width,
                  }}
                />
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** One print, laid out the same way wherever it is dealt. */
function Print({
  cell,
  height,
  tilt,
  tick = true,
  invite = true,
  shadow = 'hard',
  emptyTone,
}: {
  cell: CollageCell;
  height: number;
  tilt?: number;
  /** Passed through: the warm gap the record layouts use. */
  emptyTone?: 'sunken' | 'warm';
  /** Off for a tile that is only a gap, so nothing lifts off the page. */
  shadow?: 'hard' | false;
  /** The corner tick on a photographed task. */
  tick?: boolean;
  /**
   * Whether an empty tile asks to be filled — the dashed field and its camera.
   * Off where the block is a record rather than a control, and an empty tile
   * is simply a gap in it.
   */
  invite?: boolean;
}) {
  return (
    <PhotoSlot
      width="100%"
      height={height}
      photo={cell.photo}
      seed={cell.seed}
      done={tick && cell.done}
      // Dashed rather than a flat grey block: where the gaps can be filled
      // they have to read as places still waiting for a photo, not as prints
      // that failed to load.
      emptyOutline={invite}
      emptyIcon={invite ? 'camera' : 'none'}
      emptyTone={emptyTone}
      tilt={tilt}
      // The same tight, offset drop the task photos carry: prints laid on the
      // page rather than tiles set into it.
      shadow={shadow}
      onPress={cell.onPress}
      accessibilityLabel={cell.label}
    />
  );
}

/**
 * The five of a day laid out as the five on a die: four square tiles, and the
 * fifth laid over the middle of them on its own white mat.
 *
 * The block is measured rather than proportioned, because the corner tiles
 * have to come out square and only the rendered width knows how wide that is.
 */
function DiceGrid({
  cells,
  style,
}: {
  cells: readonly CollageCell[];
  style?: StyleProp<ViewStyle>;
}) {
  const [width, setWidth] = useState(0);
  const tile = (width - spacing.sm) / 2;
  const centre = Math.round(tile * DICE_CENTRE);

  // The mat is what makes the centre read as a print laid over the seam. An
  // empty centre has no print to lay there, and a white card with a shadow
  // around a grey gap is the loudest thing on a block that is meant to be
  // quiet until it is photographed — so it waits flat until there is a photo.
  const filled = !!(cells[4].photo || cells[4].seed);

  return (
    <View style={style} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {tile > 0 ? (
        <View>
          {[cells.slice(0, 2), cells.slice(2, 4)].map((pair, r) => (
            <View key={r} style={[styles.gridRow, r > 0 && styles.gridGap]}>
              {pair.map((cell) => (
                <View key={cell.key} style={styles.gridCell}>
                  <Print
                    cell={cell}
                    height={tile}
                    tick={false}
                    invite={false}
                    // A gap has nothing to lift off the page. The corners used
                    // to carry the same hard drop as a photograph, so early in
                    // a day the block was four empty tiles standing proud of
                    // the page and one picture among them.
                    shadow={cell.photo || cell.seed ? 'hard' : false}
                    emptyTone="warm"
                  />
                </View>
              ))}
            </View>
          ))}

          {/* Centred over the seam of the four. `box-none` so the tiles
              underneath keep every tap that does not land on the mat. */}
          <View
            style={StyleSheet.absoluteFill}
            pointerEvents="box-none"
          >
            <View style={styles.centreWrap} pointerEvents="box-none">
              <View
                style={
                  filled
                    ? [styles.mat, { width: centre + MAT * 2 }]
                    : { width: centre }
                }
              >
                <Print
                  cell={cells[4]}
                  height={centre}
                  tick={false}
                  invite={false}
                  shadow={filled ? 'hard' : false}
                  emptyTone="warm"
                />
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * The day's proof photos as a pile of instant prints rather than a grid of
 * thumbnails: square pictures in white frames with the deep chin under them,
 * each off straight, lapping over its neighbours, captioned by hand.
 *
 * `layout="grid"` drops all of that for equal tiles in task order — the plain
 * arrangement, for when the pile is doing the photos no favours.
 */
export function PhotoCollage({
  cells,
  columns,
  layout = 'collage',
  maxHeight,
  style,
}: PhotoCollageProps) {
  if (cells.length === 0) return null;

  if (layout === 'dice' && cells.length === 5) {
    return <DiceGrid cells={cells} style={style} />;
  }

  const columnCount = columns ?? (cells.length <= 4 ? 2 : 3);

  if (layout === 'grid' || layout === 'dice') {
    // Row-major, in the order the tasks are listed below: a grid regular
    // enough to be read as a table cannot afford to reorder them.
    const rows: CollageCell[][] = [];
    for (let i = 0; i < cells.length; i += columnCount) {
      rows.push(cells.slice(i, i + columnCount));
    }

    return (
      <View style={style}>
        {rows.map((row, r) => (
          <View key={r} style={[styles.gridRow, r > 0 && styles.gridGap]}>
            {row.map((cell) => (
              <View key={cell.key} style={styles.gridCell}>
                <Print
                  cell={cell}
                  height={GRID_HEIGHT}
                  tick={false}
                  invite={false}
                  // The dice falls back to here on a day that is not five
                  // tasks long, so its gaps have to sit back into the page the
                  // same way.
                  shadow={cell.photo || cell.seed ? 'hard' : false}
                  emptyTone="warm"
                />
              </View>
            ))}
            {/* A short last row keeps its tiles the width of a full one's
                rather than stretching them across the page. */}
            {Array.from({ length: columnCount - row.length }, (_, i) => (
              <View key={`pad-${i}`} style={styles.gridCell} />
            ))}
          </View>
        ))}
      </View>
    );
  }

  return <Pile cells={cells} maxHeight={maxHeight} style={style} />;
}

const styles = StyleSheet.create({
  pile: {
    // Prints are placed against this box, so it has to be the thing they are
    // measured from. Centred, because a pile drawn narrower than its room
    // should sit in the middle of it rather than against one edge.
    alignSelf: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  gridGap: {
    marginTop: spacing.sm,
  },
  gridCell: {
    flex: 1,
  },
  centreWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mat: {
    padding: MAT,
    borderRadius: radii.lg + MAT,
    backgroundColor: colors.surface,
    ...shadows.hard,
  },
});

export default PhotoCollage;
