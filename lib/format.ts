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
