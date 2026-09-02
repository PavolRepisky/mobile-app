import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import type { View } from 'react-native';
import type { RefObject } from 'react';

/**
 * Turning a rendered card into a file and handing it to the share sheet.
 *
 * Everything native about the feature lives here on purpose: the card itself
 * is ordinary views that render anywhere, so if capture misbehaves on a device
 * this is the only file to look at.
 */

/**
 * Instagram's own upload ceiling on the long edge. Anything wider is
 * recompressed on their side, which is what puts mush in the shadows under the
 * prints — the one part of the card that has to stay clean.
 */
const LONG_EDGE = 1350;

/** 4:5 for a feed post, 9:16 for a story. The card renders both. */
export type ShareShape = 'post' | 'story';

const SIZES: Record<ShareShape, { width: number; height: number }> = {
  post: { width: Math.round(LONG_EDGE * (4 / 5)), height: LONG_EDGE },
  story: { width: 1080, height: 1920 },
};

/**
 * Snapshots the view behind `ref` at share resolution.
 *
 * The card is laid out once, at screen size, and scaled on the way out rather
 * than re-rendered at 1080 — a second layout is a second set of line breaks
 * and a second set of rounding, which is how a preview and its export end up
 * being different pictures.
 */
export async function captureDayCard(
  ref: RefObject<View | null>,
  shape: ShareShape,
): Promise<string> {
  if (!ref.current) throw new Error('The card has not been laid out yet.');

  return captureRef(ref, {
    format: 'png',
    quality: 1,
    ...SIZES[shape],
  });
}

/**
 * Captures the card and opens the system share sheet on it.
 *
 * Returns false where there is no share sheet to open — a simulator, or a web
 * build — so the caller can say so rather than failing silently.
 */
export async function shareDayCard(
  ref: RefObject<View | null>,
  shape: ShareShape = 'post',
): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;

  const uri = await captureDayCard(ref, shape);
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    UTI: 'public.png',
    dialogTitle: 'Share your day',
  });

  return true;
}

/**
 * Captures the card and writes it to the camera roll.
 *
 * Saving needs the same permission as reading the library, which the photo
 * sheet already asks for; asked again here because the two can be reached in
 * either order. Returns false if it is refused.
 */
export async function saveDayCard(
  ref: RefObject<View | null>,
  shape: ShareShape = 'post',
): Promise<boolean> {
  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) return false;

  const uri = await captureDayCard(ref, shape);
  await MediaLibrary.saveToLibraryAsync(uri);

  return true;
}
