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

import { absoluteFill, colors, radii, shadows, spacing } from '@/constants/theme';
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
  /**
   * The task's name: written inside the tile, and what it is read out as.
   */
  label?: string;
  onPress?: () => void;
}

export interface PhotoCollageProps {
  cells: readonly CollageCell[];
  /**
   * Corner radius of the block. Defaults to the signature `lg` cut; a caller
   * whose photo sits flatter on the page can ask for less.
   */
  radius?: number;
  /**
   * Height as a share of width. Defaults to the calendar day cell's own
   * square; the to-do grid wants the block to stand in for the page rather
   * than sit as a cover shot on it, so it hands in the room the page actually
   * left over instead of taking the default shape.
   */
  ratio?: number;
  /** Overrides the seam between pieces. Defaults to the calendar day cell's
   * own hairline. */
  seam?: number;
  style?: StyleProp<ViewStyle>;
}

/** The cut between pieces in the mosaic — a rule of the page showing
 * through, the same seam the calendar's day cells cut their shots on. A
 * touch wider than a true hairline so it reads on a light page, not just
 * against the camera feed the live grid's own version sits on. */
const MOSAIC_SEAM = 2;

/** Every piece of the mosaic takes an equal share of whatever row or column
 * it falls in, whatever shape that row or column ends up. */
const MOSAIC_PIECE = { flex: 1 } as const;

/**
 * How tall the mosaic block sits under its own width. Square, so a handful of
 * proof shots reads as one combined photograph rather than a list of them.
 */
const MOSAIC_RATIO = 1;

/** One piece of the mosaic: the photo itself, or its drawn stand-in, filling
 * whatever share of the block it was given. */
function MosaicTile({ cell }: { cell: CollageCell }) {
  const filled = !!(cell.photo || cell.seed);

  const content = cell.photo ? (
    <Image source={cell.photo} style={MOSAIC_PIECE} contentFit="cover" />
  ) : filled ? (
    <Placeholder seed={cell.seed ?? cell.key} radius={0} style={MOSAIC_PIECE} />
  ) : (
    // No photo and nothing standing in for one: a flat, quiet fill rather
    // than a drawn print for a task that was never taken.
    <View style={[MOSAIC_PIECE, styles.mosaicEmpty]} />
  );

  // Only an untaken tile invites a tap — a photographed one already shows
  // what pressing it made, so it needs no glyph asking for one.
  const inviteIcon =
    !filled && cell.onPress ? (
      <View style={styles.mosaicInviteWrap} pointerEvents="none">
        <Ionicons name="camera" size={22} color={colors.ink} />
      </View>
    ) : null;

  // The same small pill badge the live camera grid labels its own tiles
  // with, bottom-centred over the print rather than dimming the whole tile
  // to hold a centred caption.
  const label =
    cell.label ? (
      <View style={styles.mosaicLabelWrap} pointerEvents="none">
        <View style={styles.mosaicLabelBadge}>
          <Text variant="labelBold" color={colors.inkInverse} center numberOfLines={2}>
            {cell.label}
          </Text>
        </View>
      </View>
    ) : null;

  // The moment the task was finished, stamped on its own corner the way a
  // print's own timestamp would sit — only a photographed tile has one to
  // report.
  const timeBadge =
    filled && cell.time ? (
      <View style={styles.mosaicTimeBadge} pointerEvents="none">
        <Text variant="micro" color={colors.inkInverse}>
          {cell.time}
        </Text>
      </View>
    ) : null;

  // Flush edge to edge whether or not it carries a label — the to-do grid
  // wants to read as the same merged block the calendar's own day cell cuts,
  // the moment it's standing in for rather than a set of individual cards.
  const piece = (
    <>
      {content}
      {inviteIcon}
      {label}
      {timeBadge}
    </>
  );

  if (!cell.onPress)
    return <View style={MOSAIC_PIECE}>{piece}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={cell.label}
      onPress={cell.onPress}
      style={MOSAIC_PIECE}
    >
      {piece}
    </Pressable>
  );
}

export interface MosaicArrangementProps<T extends { key: string }> {
  cells: readonly T[];
  /** Must set `key={cell.key}` on the element it returns. */
  renderCell: (cell: T) => React.ReactElement;
  /**
   * Overrides the seam width in px, for a caller that needs no gap at all —
   * the live camera grid draws its own border per cell, so a real gap here
   * would show a sliver of whatever sits behind the grid rather than a seam.
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
 * the to-do tab's live camera grid can lay its cells out identically without
 * re-deriving the split.
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
 * A day's proof photos merged edge to edge into one block behind a hairline
 * seam — the calendar day cell's cut, and the Tasks tab's grid. Measured
 * rather than proportioned, so the block's height follows the width it is
 * actually given.
 */
export function PhotoCollage({
  cells,
  radius = radii.lg,
  ratio = MOSAIC_RATIO,
  seam,
  style,
}: PhotoCollageProps) {
  const [width, setWidth] = useState(0);
  const gap = seam ?? MOSAIC_SEAM;

  if (cells.length === 0) return null;

  return (
    <View style={style}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <View
            style={[
              styles.mosaicBlock,
              {
                // The seam carried out to the block's outer edge, so a
                // caller asking for no seam gets no border either.
                borderWidth: gap,
                width,
                height: width * ratio,
                borderRadius: radius,
              },
            ]}
          >
            <MosaicArrangement
              cells={cells}
              seam={gap}
              renderCell={(cell) => (
                <MosaicTile key={cell.key} cell={cell} />
              )}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The seam is solid `ink`, the same black as the tracker's today ring and
  // kept-day discs above it, so the grid and the tracker read as one set. The
  // same line also frames the block's own outer edge, so the grid reads as
  // one complete cut rather than internal seams floating with no border.
  mosaicBlock: {
    alignSelf: 'center',
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    borderColor: colors.ink,
    ...shadows.soft,
  },
  // Sits on the photo itself, rather than hung off a card's corner the way a
  // done tick is — a time stamp is read off the print, not pinned to it as a
  // status.
  mosaicTimeBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.pill,
    backgroundColor: colors.scrimPhoto,
  },
  mosaicEmpty: {
    backgroundColor: colors.surfaceMuted,
  },
  mosaicInviteWrap: {
    ...absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The live camera grid's own badge: a small pill hugging the label rather
  // than a caption stretched across a dimmed tile.
  mosaicLabelWrap: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.xs,
    right: spacing.xs,
    alignItems: 'center',
  },
  mosaicLabelBadge: {
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.pill,
    backgroundColor: colors.scrimPhoto,
  },
});

export default PhotoCollage;
