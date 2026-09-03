const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen',
];

const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty',
  'ninety',
];

/** 5 → "five", 42 → "forty-two". Used for the "day five" sticker headings. */
export function numberToWord(n: number): string {
  if (n < 0) return String(n);
  if (n < 20) return ONES[n];
  if (n < 100) {
    const tens = TENS[Math.floor(n / 10)];
    const ones = n % 10;
    return ones ? `${tens}-${ONES[ones]}` : tens;
  }
  return String(n);
}

const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

const MONTHS_LONG = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "aug 18" — the lowercase form used on sticker cards. */
export function shortDate(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** "Tue, Aug 18" — the form used under the ruler pickers. */
export function longDate(date: Date): string {
  return `${DAYS[date.getDay()]}, ${MONTHS_LONG[date.getMonth()]} ${date.getDate()}`;
}

/** "7:19am" — the completion stamp on task rows. */
export function timeStamp(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const suffix = hours >= 12 ? 'pm' : 'am';
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${minutes}${suffix}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** 20000 → "+20,000 joined". */
export function joinedLabel(count: number): string {
  return `+${count.toLocaleString('en-US')} joined`;
}

/**
 * A task label cut down to what fits handwritten in the chin of a print:
 * "Eat clean (no junk food and no alcohol) 🥗" becomes "eat clean".
 *
 * Parentheticals and emoji go first — they are the parts of a checklist label
 * that exist for the list rather than for a caption. What is left is cut to a
 * few words rather than to a character count: counting characters cuts "one
 * 45-minute workout per day" down to "one 45-minute", which is not a caption of
 * anything, where counting words leaves "one 45-minute workout". Nothing is
 * ellipsised — a caption that trails off reads as something truncated, where a
 * short one just reads as a short caption.
 */
export function shortLabel(label: string, maxWords = 3): string {
  const plain = label
    .replace(/\([^)]*\)/g, ' ')
    .replace(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}️]/gu,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const words = plain.split(' ');

  // "One 45-minute workout per day" is about a workout, not about one of them.
  // Dropping the leading filler buys back a word for something worth reading.
  while (words.length > 1 && LEADING_FILLER.has(words[0])) words.shift();

  return dropDanglingWord(words.slice(0, maxWords).join(' '));
}

/** Openers that carry nothing once the label is down to a few words. */
const LEADING_FILLER = new Set(['a', 'an', 'one', 'the']);

/**
 * Words a caption must not end on. Cutting "read any book or listen to a
 * podcast" at a word boundary leaves "read any book or", which reads as a
 * sentence someone stopped writing; dropping the conjunction leaves "read any
 * book", which reads as a caption.
 */
const DANGLING = new Set([
  'a', 'an', 'and', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'per',
  'the', 'to', 'with',
]);

function dropDanglingWord(text: string): string {
  const words = text.split(' ');
  while (words.length > 1 && DANGLING.has(words[words.length - 1])) {
    words.pop();
  }
  return words.join(' ');
}
