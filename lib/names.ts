/** "Lily's", or "Lucas'" — a name ending in "s" takes the apostrophe alone.
 * Shared by a profile's title, its days heading and the days feed, so the
 * three always read the same. */
export function possessive(name: string): string {
  return `${name}${/s$/i.test(name) ? "'" : "'s"}`;
}
