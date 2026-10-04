import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';

/**
 * Getting photos up and back down.
 *
 * Every photo is uploaded twice, made on the phone: a full one for the
 * viewer and a small one for grids. Storage could resize on request, but it
 * bills per source photo and every task photo is a new one, so the phone
 * does it for free instead.
 */

/** Long edge of the full photo — sharp on any phone screen, a few hundred
 * KB as a JPEG. */
const FULL_EDGE = 1600;
/** Long edge of a grid thumbnail: a third of a screen at 3×. */
const THUMB_EDGE = 480;
/** JPEG quality. Below about 0.7 skin and skies start to band. */
const QUALITY = 0.8;
/** How long a signed link to a task photo works — a session's scrolling. */
const SIGNED_URL_SECONDS = 60 * 60;

export type Bucket = 'avatars' | 'challenge-photos' | 'task-photos';

interface Prepared {
  full: Uint8Array;
  thumb: Uint8Array;
}

/** Resizes by the long edge, whichever way the shot was held. */
async function jpeg(uri: string, edge: number, width: number, height: number): Promise<Uint8Array> {
  const size = width >= height ? { width: Math.min(edge, width) } : { height: Math.min(edge, height) };
  const image = await ImageManipulator.manipulate(uri).resize(size).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: QUALITY, base64: true });
  return decodeBase64(saved.base64!);
}

async function prepare(uri: string, width: number, height: number): Promise<Prepared> {
  const [full, thumb] = await Promise.all([
    jpeg(uri, FULL_EDGE, width, height),
    jpeg(uri, THUMB_EDGE, width, height),
  ]);
  return { full, thumb };
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** A name nobody else's upload will share, so a retake never overwrites the
 * photo a friend's phone may still have cached. */
function freshName(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function put(bucket: Bucket, path: string, bytes: Uint8Array) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
}

export interface UploadedTaskPhoto {
  photoPath: string;
  thumbPath: string;
}

/**
 * Uploads a task photo into today's folder — the only folder storage lets
 * you write to, and the one `complete_task` checks the paths against.
 * `width`/`height` are the shot's own, as the camera or library reports them.
 */
export async function uploadTaskPhoto(
  userId: string,
  membershipId: string,
  day: number,
  photo: { uri: string; width: number; height: number },
): Promise<UploadedTaskPhoto> {
  const { full, thumb } = await prepare(photo.uri, photo.width, photo.height);
  const base = `${userId}/${membershipId}/${day}/${freshName()}`;
  const photoPath = `${base}.jpg`;
  const thumbPath = `${base}_thumb.jpg`;
  await Promise.all([put('task-photos', photoPath, full), put('task-photos', thumbPath, thumb)]);
  return { photoPath, thumbPath };
}

/** A new profile photo, or a challenge's cover. Public, so the link never
 * expires. */
export async function uploadPublicPhoto(
  bucket: Exclude<Bucket, 'task-photos'>,
  userId: string,
  photo: { uri: string; width: number; height: number },
): Promise<string> {
  const { full } = await prepare(photo.uri, photo.width, photo.height);
  const path = `${userId}/${freshName()}.jpg`;
  await put(bucket, path, full);
  return path;
}

export function publicUrl(bucket: Exclude<Bucket, 'task-photos'>, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Signed links for task photos, by path. A photo behind the Community lock
 * comes back without one — storage refuses to sign it — which is the app's
 * cue to draw it blurred.
 */
export async function signedUrls(paths: readonly string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from('task-photos')
    .createSignedUrls([...paths], SIGNED_URL_SECONDS);
  if (error) throw error;
  const urls: Record<string, string> = {};
  for (const entry of data) {
    if (entry.path && entry.signedUrl && !entry.error) urls[entry.path] = entry.signedUrl;
  }
  return urls;
}

/** Removes photos a retake or an undo left behind. Best effort: an orphaned
 * file costs a few hundred KB, not a broken screen. */
export async function removePhotos(bucket: Bucket, paths: readonly string[]) {
  if (paths.length === 0) return;
  await supabase.storage.from(bucket).remove([...paths]);
}
