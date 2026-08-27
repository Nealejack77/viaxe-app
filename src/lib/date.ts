// Local calendar-day helpers.
//
// `new Date().toISOString().split('T')[0]` yields the UTC date, which marks the
// WRONG day for anyone not on UTC — e.g. in the UK during BST (UTC+1) an evening
// workout logged at 23:30 local becomes the next day, so it ticks the wrong cell
// on the training calendar and can break the streak. These helpers key days by
// the device's LOCAL calendar date instead.

/** YYYY-MM-DD in the device's local timezone. */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** A day key offset by `delta` days, computed with local midnight arithmetic
 *  (so it stays correct across DST changes — unlike Date.now() - 864e5). */
export function addDaysKey(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return localDateKey(new Date(y, m - 1, d + delta));
}

/** Yesterday's local day key. */
export function yesterdayKey(): string {
  return addDaysKey(localDateKey(), -1);
}
