/**
 * Turns an API enum symbol into plain text: "FUEL_STATION" -> "Fuel station".
 * For values that already come with a human label (e.g. a waypoint trait's `name`), use that
 * instead — this is only for symbols the API doesn't also give a readable name for.
 */
export function humanize(symbol: string): string {
  const lower = symbol.toLowerCase().replace(/_/g, ' ')
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}
