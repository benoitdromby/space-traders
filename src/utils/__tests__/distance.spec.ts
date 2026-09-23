import { describe, expect, it } from 'vitest'

import { distanceBetween } from '@/utils/distance'

describe('distanceBetween', () => {
  it('is zero for the same point', () => {
    expect(distanceBetween({ x: 5, y: -3 }, { x: 5, y: -3 })).toBe(0)
  })

  it('computes a classic 3-4-5 triangle', () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('does not care which point comes first', () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(
      distanceBetween({ x: 3, y: 4 }, { x: 0, y: 0 }),
    )
  })

  it('handles negative coordinates', () => {
    expect(distanceBetween({ x: -10, y: -10 }, { x: -7, y: -6 })).toBe(5)
  })

  it('rounds to the nearest whole unit', () => {
    // hypot(1, 1) ≈ 1.41 → 1; hypot(2, 2) ≈ 2.83 → 3
    expect(distanceBetween({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(1)
    expect(distanceBetween({ x: 0, y: 0 }, { x: 2, y: 2 })).toBe(3)
  })
})
