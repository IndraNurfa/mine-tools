const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Whether saved data still has the shape of the default: same primitive types,
 * every default object key present, array items matching the first default item.
 * A `null` default, empty array or empty object accepts any contents.
 */
export function matchesShape(value: unknown, fallback: unknown): boolean {
  if (fallback === null || fallback === undefined) return true;
  if (Array.isArray(fallback)) {
    return Array.isArray(value) && (fallback.length === 0 || value.every((v) => matchesShape(v, fallback[0])));
  }
  if (isObject(fallback)) {
    return isObject(value) && Object.entries(fallback).every(([key, f]) => matchesShape(value[key], f));
  }
  return typeof value === typeof fallback;
}
