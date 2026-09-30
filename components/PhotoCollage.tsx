import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, shadows, spacing } from '@/constants/theme';
import { Placeholder } from './Placeholder';
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
   * posts: photos and blanks only, no discs, names or times, a hairline seam.
   */
  bare?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Drawn over the block — the Day stamp once the post is complete. */
  children?: React.ReactNode;
}

/** The line between pieces of today's post. Thin and grey rather than a
 * white cut: the page no longer shows through the grid, so it reads as one
 * post, but two open tiles side by side still read as two squares to fill. */
const MOSAIC_SEAM = 1;
/** A thumbnail's seam: at 40pt the full cut would eat the photos. */
const BARE_SEAM = 1;

/** Every piece of the mosaic takes an equal share of whatever row or column
 * it falls in, whatever shape that row or column ends up. */
const MOSAIC_PIECE = { flex: 1 } as const;

/** The camera disc on an open tile — a thumb's target. */
const DISC = 44;

/** One piece of the mosaic: the photo, or the open tile asking for it. */
function MosaicTile({ cell, bare }: { cell: CollageCell; bare?: boolean }) {
  const filled = !!(cell.photo || cell.seed);

  const content = cell.photo ? (
    <Image source={cell.photo} style={MOSAIC_PIECE} contentFit="cover" />
  ) : filled ? (
    <Placeholder seed={cell.seed ?? cell.key} radius={0} style={MOSAIC_PIECE} />
  ) : (
    <View style={[MOSAIC_PIECE, styles.empty, bare && styles.emptyBare]}>
      {bare ? null : (
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
        <Text variant="micro" color={colors.inkInverse}>
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
 * Cuts a set of cells into the same shape the calendar's day cell uses: one
 * fills it, two split it top and bottom, three put one over a pair, and four
 * take a corner each. Past four there is no such fixed arrangement, so a
 * fifth cell and beyond fall in behind the first the same way the third does,
 * stacked in rows of two under it.
 *
 * Generic over what a cell renders as, and pulled out of `PhotoCollage` so
 * other grids — a post, a story, a profile tile — lay their cells out
 * identically without re-deriving the split.
 */
export function MosaicArrangement<T extends { key: string }>({
  cells,
  renderCell,
  seam,
}: MosaicArrangementProps<T>) {
  const gap = seam ?? MOSAIC_SEAM;
  const column = { flex: 1, flexDirection: 'column', gap } as const;
  const row = { flex: 1, flexDirection: 'row', gap } as const;

  if (cells.length === 1) {
    return renderCell(cells[0]);
  }

  if (cells.length === 2) {
    return <View style={column}>{cells.map(renderCell)}</View>;
  }

  if (cells.length === 4) {
    return (
      <View style={column}>
        {[cells.slice(0, 2), cells.slice(2, 4)].map((pair, r) => (
          <View key={r} style={row}>
            {pair.map(renderCell)}
          </View>
        ))}
      </View>
    );
  }

  const [head, ...rest] = cells;
  const pairs: T[][] = [];
  for (let i = 0; i < rest.length; i += 2) pairs.push(rest.slice(i, i + 2));

  return (
    <View style={column}>
      {renderCell(head)}
      {pairs.map((pair, r) => (
        <View key={r} style={row}>
          {pair.map(renderCell)}
        </View>
      ))}
    </View>
  );
}

/**
 * Today's post as a square of its photos, the Tasks tab's grid: the tasks
 * already shot show their photo and the time it was taken, the rest wait as
 * light tiles with a camera and the task's name. Measured rather than
 * proportioned, so the square follows the width it is actually given.
 */
export function PhotoCollage({ cells, radius = radii.lg, bare, style, children }: PhotoCollageProps) {
  const [width, setWidth] = useState(0);

  if (cells.length === 0) return null;

  return (
    <View style={style} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <View
          style={[
            styles.block,
            !bare && [styles.blockLined, shadows.soft],
            { width, height: width, borderRadius: radius },
          ]}
        >
          <MosaicArrangement
            cells={cells}
            seam={bare ? BARE_SEAM : MOSAIC_SEAM}
            renderCell={(cell) => <MosaicTile key={cell.key} cell={cell} bare={bare} />}
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
  // A thumbnail's open squares are white: it sits on the week's grey strip,
  // where the fill grey would melt into the strip around it.
  emptyBare: {
    backgroundColor: colors.surface,
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
