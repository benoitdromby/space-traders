export interface Point {
  x: number
  y: number
}

/** Straight-line distance between two points, in the same unitless grid the API gives coordinates in. */
export function distanceBetween(a: Point, b: Point): number {
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y))
}
