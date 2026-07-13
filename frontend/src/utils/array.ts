/**
 * Immutable, bounds-safe array helpers. Each returns the input unchanged when
 * an index is out of range (so React state updaters stay no-ops on bad input).
 */

/** Move the item at `from` to `to`. */
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Toggle a value: remove it if present, otherwise append it. */
export function toggleInArray<T>(arr: readonly T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

/** Replace the item at `index` via an updater function. */
export function updateAt<T>(
  arr: T[],
  index: number,
  update: (item: T) => T,
): T[] {
  if (index < 0 || index >= arr.length) return arr;
  const next = [...arr];
  next[index] = update(next[index]);
  return next;
}
