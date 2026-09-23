export interface VisibleRange {
  /** Index of the first row to render (inclusive). */
  start: number
  /** Index one past the last row to render (exclusive) — usable directly with `Array#slice`. */
  end: number
}

/**
 * Given a scroll position inside a fixed-row-height list, works out which row indices actually
 * need to be in the DOM: the ones on screen, padded by `overscan` rows on each side so scrolling
 * doesn't flash empty space before the next frame renders.
 */
export function computeVisibleRange(
  scrollTop: number,
  containerHeight: number,
  rowHeight: number,
  itemCount: number,
  overscan = 3,
): VisibleRange {
  if (itemCount === 0 || containerHeight <= 0 || rowHeight <= 0) return { start: 0, end: 0 }

  const firstVisible = Math.floor(scrollTop / rowHeight)
  // -1: at an exact boundary (e.g. scrollTop 0, containerHeight 300, rowHeight 50 → 6.0),
  // Math.ceil alone counts one row too many — the 6 rows 0..5 fill the box exactly, there's no
  // partially-visible 7th row to include.
  const lastVisible = Math.ceil((scrollTop + containerHeight) / rowHeight) - 1

  const start = Math.max(0, firstVisible - overscan)
  const end = Math.min(itemCount, lastVisible + overscan + 1)

  return { start, end }
}
