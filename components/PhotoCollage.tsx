import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  PixelRatio,
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, colorsFor, radii, shadows, spacing } from '@/constants/theme';
import type { ImageSourcePropType } from '@/lib/imageSource';
import { Placeholder } from './Placeholder';
import { NATIVE_HEADER } from './Screen';
import { Text } from './Text';

/** One piece of the mosaic — a task's proof photo, or the gap where it goes. */
export interface CollageCell {
  /** Stable across renders: the arrangement is derived from it. */
  key: string;
  photo?: ImageSourcePropType | null;
  seed?: string | null;
  /**
   * When the task behind this tile was completed, e.g. "7:19am". Only stamped
   * on a tile that actually carries a photo — a shot still waiting to be
   * taken has no moment to report.
   */
  time?: string;
  /** The task's name, read out on a filled tile. An open tile isn't any one
   * task's yet — its task is picked in the camera — so it isn't named. */
  label?: string;
  /** Written across the middle of an open tile, for a page whose open
   * squares say which slot of the post they are. */
  placeholder?: string;
  /** The open tile to take next — its camera disc is drawn in ink. */
  next?: boolean;
  onPress?: () => void;
}

export interface PhotoCollageProps {
  cells: readonly CollageCell[];
  /** Corner radius of the block. Defaults to the signature `lg` cut. */
  radius?: number;
  /**
   * A thumbnail of the day rather than the day itself — the week row's small
   * the same grid as the full post, seams and grey open squares alike, only
   * without discs, names or times, which wouldn't fit at that size.
   */
  bare?: boolean;
  /**
   * Open squares as the plain grey alone, without their camera — for a page
   * whose own shutter takes the photo. They still answer a tap.
   */
  plainOpen?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Drawn over the block — the day's cover once the post is complete. */
  children?: React.ReactNode;
}

/** The line between pieces of today's post. Thin and grey rather than a
 * white cut: the page no longer shows through the grid, so it reads as one
 * post, but two open tiles side by side still read as two squares to fill. */
const MOSAIC_SEAM = 1;

/** Every piece of the mosaic takes an equal share of whatever row or column
 * it falls in, whatever shape that row or column ends up. */
const MOSAIC_PIECE = { flex: 1 } as const;

/**
 * The block's side, trimmed by at most a few pixels so every row and column
 * of the mosaic lands on whole device pixels. Left fractional, a 1pt seam
 * falls between two pixels and draws as a paler, blurred line, so the seams
 * of one grid look like different greys.
 */
function snapSide(width: number, count: number, seam: number) {
  const ratio = PixelRatio.get();
  const seamPx = Math.round(seam * ratio);
  const splits = mosaicSplits(count);
  let px = Math.floor(width * ratio);
  while (px > 0 && splits.some((n) => (px - (n - 1) * seamPx) % n !== 0)) px--;
  return px / ratio;
}

/** Every way the mosaic for `count` cuts the block's side — into halves,
 * thirds or both — so `snapSide` can find a side all of them divide. */
function mosaicSplits(count: number) {
  if (count <= 1) return [];
  if (count <= 4) return [2];
  if (count <= 6) return [2, 3];
  if (count <= 9) return [3];
  return [3, Math.ceil(count / 3)];
}

/** The camera disc on an open tile — a thumb's target. */
const DISC = 44;
/** The iPhone's camera symbol on an open tile, at about the disc's glyph
 * plus the weight the disc gave it. */
const OPEN_SYMBOL = 26;

/** One piece of the mosaic: the photo, or the open tile asking for it. */
function MosaicTile({
  cell,
  bare,
  plainOpen,
}: {
  cell: CollageCell;
  bare?: boolean;
  plainOpen?: boolean;
}) {
  const filled = !!(cell.photo || cell.seed);
  const scheme = colorsFor(useColorScheme());

  const content = cell.photo ? (
    <Image source={cell.photo} style={MOSAIC_PIECE} contentFit="cover" />
  ) : filled ? (
    <Placeholder seed={cell.seed ?? cell.key} radius={0} style={MOSAIC_PIECE} />
  ) : (
    <View style={[MOSAIC_PIECE, styles.empty]}>
      {bare ? null : plainOpen ? (
        cell.placeholder ? (
          <Text variant="meta" color={colors.inkGhost} center>
            {cell.placeholder}
          </Text>
        ) : null
      ) : NATIVE_HEADER && cell.onPress ? (
        // On the iPhone an open square is the system's own add-a-photo
        // tile: the camera symbol in the system blue on the grey, the way
        // a tappable placeholder reads there, rather than a drawn disc.
        <SymbolView
          name="camera.fill"
          size={OPEN_SYMBOL}
          tintColor={scheme.systemAccent}
          weight="medium"
        />
      ) : (
        // The next square to take carries the ink disc; the rest wait on
        // white, so the eye lands on one place to start.
        <View style={[styles.disc, cell.next ? styles.discNext : styles.discWaiting]}>
          <Ionicons
            name="camera-outline"
            size={20}
            color={cell.next ? colors.inkInverse : colors.ink}
          />
        </View>
      )}
    </View>
  );

  // The moment the task was finished, stamped on its own corner the way a
  // print's own timestamp would sit.
  const timeBadge =
    !bare && filled && cell.time ? (
      <View style={styles.time} pointerEvents="none">
        <Text variant="micro" color={colors.onMedia}>
          {cell.time}
        </Text>
      </View>
    ) : null;

  if (!cell.onPress)
    return (
      <View style={MOSAIC_PIECE}>
        {content}
        {timeBadge}
      </View>
    );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={filled ? `${cell.label ?? 'Photo'}${cell.time ? `, ${cell.time}` : ''}` : 'Take a photo for this square'}
      onPress={cell.onPress}
      style={({ pressed }) => [MOSAIC_PIECE, pressed && styles.pressed]}
    >
      {content}
      {timeBadge}
    </Pressable>
  );
}

export interface MosaicArrangementProps<T extends { key: string }> {
  cells: readonly T[];
  /** Must set `key={cell.key}` on the element it returns. */
  renderCell: (cell: T) => React.ReactElement;
  /**
   * Overrides the seam width in px, for a caller that needs no gap at all —
   * a grid that draws its own border per cell, where a real gap would show a
   * sliver of whatever sits behind the grid rather than a seam.
   */
  seam?: number;
}

/**
 * Cuts a set of cells into one square, a fixed arrangement for each count
 * from one to nine:
 *
 *   1 the whole square      4 a corner each         7 tall · two · tall, over three
 *   2 two tall halves       5 two over three        8 one tall, then squares
 *   3 a tall half, two      6 three across, twice   9 three by three
 *     squares beside it
 *
 * Every piece is square or taller than wide, because the photos are shot
 * upright on a phone and a wide strip would cut the person out of them; and
 * none is narrower than a third, so the grid still reads at a calendar cell's
 * size. Seven to nine sit on a three-by-three lattice, a task taking two of
 * its cells where the count leaves some over. The first task always holds the
 * top-left piece. Past nine — the database allows a few more than the create
 * screen offers — the lattice simply keeps going in rows of three.
 *
 * Generic over what a cell renders as, and pulled out of `PhotoCollage` so
 * other grids — a post, a story, a profile tile, a calendar day — lay their
 * cells out identically without re-deriving the split.
 */
export function MosaicArrangement<T extends { key: string }>({
  cells,
  renderCell,
  seam,
}: MosaicArrangementProps<T>) {
  const gap = seam ?? MOSAIC_SEAM;
  const column = { flex: 1, flexDirection: 'column', gap } as const;
  const row = { flex: 1, flexDirection: 'row', gap } as const;
  const c = cells;

  // A piece two lattice cells long: twice the share of a single one, plus the
  // seam it swallows, so its edges land on the lattice's own lines.
  const tall = (cell: T) => (
    <View key={cell.key} style={{ flexGrow: 2, flexShrink: 1, flexBasis: gap }}>
      {renderCell(cell)}
    </View>
  );
  const line = (style: typeof row | typeof column, items: React.ReactNode[], key?: string) => (
    <View key={key} style={style}>
      {items}
    </View>
  );

  switch (c.length) {
    case 1:
      return renderCell(c[0]);
    case 2:
      return line(row, c.map(renderCell));
    case 3:
      return line(row, [renderCell(c[0]), line(column, [renderCell(c[1]), renderCell(c[2])], 'side')]);
    case 4:
    case 5:
    case 6: {
      const top = c.length === 6 ? 3 : 2;
      return line(column, [
        line(row, c.slice(0, top).map(renderCell), 'top'),
        line(row, c.slice(top).map(renderCell), 'bottom'),
      ]);
    }
    // Seven and eight are drawn column by column, so a tall piece and the
    // squares beside it share the lattice's vertical lines exactly.
    case 7:
      return line(row, [
        line(column, [tall(c[0]), renderCell(c[4])], 'left'),
        line(column, [renderCell(c[1]), renderCell(c[3]), renderCell(c[5])], 'middle'),
        line(column, [tall(c[2]), renderCell(c[6])], 'right'),
      ]);
    case 8:
      return line(row, [
        line(column, [tall(c[0]), renderCell(c[5])], 'left'),
        line(column, [renderCell(c[1]), renderCell(c[3]), renderCell(c[6])], 'middle'),
        line(column, [renderCell(c[2]), renderCell(c[4]), renderCell(c[7])], 'right'),
      ]);
    default: {
      const rows: T[][] = [];
      for (let i = 0; i < c.length; i += 3) rows.push(c.slice(i, i + 3));
      return line(
        column,
        rows.map((three, r) => line(row, three.map(renderCell), `row-${r}`)),
      );
    }
  }
}

/**
 * Today's post as a square of its photos, the Tasks tab's grid: the tasks
 * already shot show their photo and the time it was taken, the rest wait as
 * light tiles with a camera and the task's name. Measured rather than
 * proportioned, so the square follows the width it is actually given.
 */
export function PhotoCollage({
  cells,
  radius = radii.lg,
  bare,
  plainOpen,
  style,
  children,
}: PhotoCollageProps) {
  const [width, setWidth] = useState(0);

  if (cells.length === 0) return null;
  const side = snapSide(width, cells.length, MOSAIC_SEAM);

  return (
    <View style={style} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <View
          style={[
            styles.block,
            styles.blockLined,
            shadows.soft,
            { width: side, height: side, borderRadius: radius, alignSelf: 'center' },
          ]}
        >
          <MosaicArrangement
            cells={cells}
            renderCell={(cell) => (
              <MosaicTile key={cell.key} cell={cell} bare={bare} plainOpen={plainOpen} />
            )}
          />
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  // What the seams show on the full-size grid: the palette's light grey,
  // dark enough to part two grey open tiles, soft enough not to cage photos.
  blockLined: {
    backgroundColor: colors.inkGhost,
  },
  empty: {
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discNext: {
    backgroundColor: colors.ink,
  },
  discWaiting: {
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  time: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.pill,
    backgroundColor: colors.scrimPhoto,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default PhotoCollage;
