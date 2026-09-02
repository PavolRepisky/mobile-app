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
import { Text } from './Text';

/** One print in the collage — a task's proof photo, or the gap where it goes. */
export interface CollageCell {
  /** Stable across renders: the arrangement is derived from it. */
  key: string;
  photo?: ImageSourcePropType | null;
  seed?: string | null;
  done?: boolean;
  /**
   * What the tile is read out as. The collage shows no text of its own, so
   * without this a screen reader gets five identical "Add photo" tiles.
   */
  label?: string;
  /**
   * A word or two written on the print itself in the dump — the time a task
   * was photographed. Kept short by the caller: there is one line of it across
   * the foot of a picture, and the list below carries the full label.
   */
  caption?: string;
  onPress?: () => void;
}

export interface PhotoCollageProps {
  cells: readonly CollageCell[];
  /** Two columns for a short day, three once it runs longer than four tasks. */
  columns?: number;
  /**
   * `'collage'` is the scattered page of prints. `'grid'` is the same photos
   * laid out plain — equal tiles, straight, in task order. `'dice'` is the
   * five-task arrangement: four square tiles with the fifth laid over the
   * middle, the way the five is pipped on a die. A day that is not five tasks
   * long has no such arrangement, so it falls back to the plain grid.
   *
   * `'dump'` is the collage's scatter turned all the way up: every picture in
   * a white print border, tilted harder, overlapping its neighbours, with the
   * time written across its foot. A page of photographs thrown down rather
   * than a set of tiles.
   */
  layout?: 'collage' | 'grid' | 'dice' | 'dump';
  style?: StyleProp<ViewStyle>;
}

/**
 * The heights a print can take. Four of them rather than a range: a set this
 * small keeps the column edges landing on a handful of lines, which is what
 * separates a scatter from noise. Picked per cell off its key, so a task keeps
 * its size for the whole challenge instead of resizing every render.
 */
const CELL_HEIGHTS = [104, 126, 142, 116];

/**
 * How far a print laps over the one above it in its column. Small — enough to
 * close the gap and read as one print laid partly across another, not enough
 * to hide anything.
 */
const LAP = 7;

/**
 * Sideways nudges dealt out by position, so no two prints in a row start on
 * the same line and the collage's edges come out faintly ragged.
 */
const NUDGES = [-5, 4, -3, 6, 2, -6];

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
const DICE_CENTRE = 0.58;

/** White margin around the centre print, so it reads as laid on top. */
const MAT = 4;

/**
 * The white border a print carries in the dump, deeper at the foot the way a
 * developed photograph is: that band is what makes a picture read as a thing
 * that was printed rather than a thumbnail that was cropped.
 */
const PRINT_MAT = 6;
const PRINT_MAT_FOOT = 15;

/**
 * How much harder the dump tilts, laps and nudges than the collage. The
 * collage's settings are deliberately almost imperceptible — a degree or so,
 * so the block reads as very slightly hand-laid. A dump is the opposite claim:
 * prints dropped on a page, and at a degree apiece that just looks like the
 * grid failed to line up.
 */
const DUMP_TILT = 2.8;
const DUMP_LAP = 15;
const DUMP_NUDGES = [-9, 7, -5, 10, 4, -8];

/** Stable per key, so the arrangement survives a re-render. */
function hash(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Magnitude off the key, direction off the position — the same bargain the
 * task rows strike. Seeding the sign as well leaves neighbours landing on the
 * same angle often enough to look like they had simply been set straight.
 */
function tiltFor(key: string, index: number): number {
  const magnitude = 0.6 + (hash(key) % 5) * 0.32;
  return index % 2 === 0 ? magnitude : -magnitude;
}

/** One print, laid out the same way wherever it is dealt. */
function Print({
  cell,
  height,
  tilt,
  tick = true,
  invite = true,
  shadow = 'hard',
}: {
  cell: CollageCell;
  height: number;
  tilt?: number;
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
 * One picture in the dump: the photograph inside a white print border, with
 * the time written across its foot.
 *
 * The writing goes on the picture rather than on the border below it, which is
 * where a photo page puts it — the printed border carries a lab's serial, the
 * hand goes over the image. White with a dark edge, because it lands on
 * whatever the photograph happens to be.
 */
function Polaroid({
  cell,
  height,
  tilt,
}: {
  cell: CollageCell;
  height: number;
  tilt: number;
}) {
  const filled = !!(cell.photo || cell.seed);

  return (
    <View
      style={[
        styles.print,
        shadows.hard,
        { transform: [{ rotate: `${tilt}deg` }] },
      ]}
    >
      <View>
        <PhotoSlot
          width="100%"
          height={height}
          photo={cell.photo}
          seed={cell.seed}
          radius={radii.sm}
          // The border is the shadow's shape here: a second one around the
          // picture inside it would read as a print stuck onto a print.
          shadow={false}
          emptyIcon="none"
          emptyOutline={false}
          onPress={cell.onPress}
          accessibilityLabel={cell.label}
        />

        {filled && cell.caption ? (
          <Text
            variant="scriptSm"
            color={colors.inkInverse}
            numberOfLines={1}
            style={styles.printCaption}
          >
            {cell.caption}
          </Text>
        ) : null}
      </View>
    </View>
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
                  <Print cell={cell} height={tile} tick={false} invite={false} />
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
 * The day's proof photos as a page of prints rather than a grid of thumbnails:
 * unequal sizes, each one off straight by a degree or so, lapping over its
 * neighbour. Tasks with nothing photographed yet hold their place as dashed
 * slots, so the collage is the shape of the whole day from the first tap and
 * fills in as the day is worked through.
 *
 * Prints are dealt into whichever column is currently shortest, the way
 * `MasonryGrid` does it, so the block stays balanced whatever the day's length.
 *
 * `layout="grid"` drops all of that for equal tiles in task order — the plain
 * arrangement, for when the scatter is doing the photos no favours.
 */
export function PhotoCollage({
  cells,
  columns,
  layout = 'collage',
  style,
}: PhotoCollageProps) {
  if (cells.length === 0) return null;

  if (layout === 'dice' && cells.length === 5) {
    return <DiceGrid cells={cells} style={style} />;
  }

  const columnCount = columns ?? (cells.length <= 4 ? 2 : 3);

  if (layout === 'grid' || layout === 'dice') {
    // Row-major, so the tiles run in the order the tasks are listed below —
    // the collage's shortest-column dealing scrambles that, which a grid
    // regular enough to be read as a table cannot afford.
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

  // The dump is the same dealing as the collage, with every setting that makes
  // the scatter visible turned up.
  const dump = layout === 'dump';
  const lap = dump ? DUMP_LAP : LAP;
  const nudges = dump ? DUMP_NUDGES : NUDGES;

  const buckets: { cell: CollageCell; index: number; height: number }[][] =
    Array.from({ length: columnCount }, () => []);
  const filled = new Array(columnCount).fill(0);

  cells.forEach((cell, index) => {
    const height = CELL_HEIGHTS[hash(cell.key) % CELL_HEIGHTS.length];
    let shortest = 0;
    for (let c = 1; c < columnCount; c += 1) {
      if (filled[c] < filled[shortest]) shortest = c;
    }
    buckets[shortest].push({ cell, index, height });
    filled[shortest] += height - lap;
  });

  return (
    <View style={[dump ? styles.dumpRow : styles.row, style]}>
      {buckets.map((bucket, c) => (
        <View
          key={c}
          // Left columns paint over right ones for the same reason cells do:
          // the nudges can close the gutter, and the tick belongs on top.
          style={[styles.column, { zIndex: columnCount - c }]}
        >
          {bucket.map(({ cell, index, height }, i) => (
            <View
              key={cell.key}
              style={[
                // The first print in a column sits on the top line; every one
                // after it rides up over the one before.
                i === 0 ? null : { marginTop: -lap },
                { left: nudges[index % nudges.length] },
                // Earlier prints sit on top of later ones, so the tick hanging
                // off a photo's corner is never buried under the print below.
                { zIndex: bucket.length - i },
              ]}
            >
              {dump ? (
                <Polaroid
                  cell={cell}
                  height={height}
                  tilt={tiltFor(cell.key, index) * DUMP_TILT}
                />
              ) : (
                <Print
                  cell={cell}
                  height={height}
                  tilt={tiltFor(cell.key, index)}
                />
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    // Tighter than a grid gutter on purpose: with the nudges on top of it the
    // columns very nearly touch, which is what makes the block read as one
    // collage instead of two lists side by side.
    gap: spacing.sm,
  },
  /**
   * Tighter still than the collage's row: with the print borders on and the
   * nudges pushing sideways, the columns have to actually overlap or the
   * scatter reads as three neat piles standing next to each other.
   */
  dumpRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  column: {
    flex: 1,
  },
  print: {
    backgroundColor: colors.surface,
    padding: PRINT_MAT,
    // The foot is the deep one, the way a developed print is.
    paddingBottom: PRINT_MAT_FOOT,
    borderRadius: radii.sm,
  },
  printCaption: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.xs,
    // The dark edge that lets white writing hold against whatever the
    // photograph underneath it happens to be.
    textShadowColor: colors.ink,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
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
