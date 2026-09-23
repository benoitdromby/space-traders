import { describe, expect, it } from 'vitest'

import { computeVisibleRange } from '@/utils/virtualRange'

describe('computeVisibleRange', () => {
  it('returns an empty range when there are no items', () => {
    expect(computeVisibleRange(0, 300, 50, 0)).toEqual({ start: 0, end: 0 })
  })

  it('returns an empty range when the container has no measured height yet', () => {
    expect(computeVisibleRange(0, 0, 50, 100)).toEqual({ start: 0, end: 0 })
  })

  it('does not overshoot by one row at an exact boundary', () => {
    // 300 / 50 = 6.0 exactly: rows 0..5 fill the box exactly, with no 7th row peeking in.
    expect(computeVisibleRange(0, 300, 50, 100, 0)).toEqual({ start: 0, end: 6 })
  })

  it('includes the partially-visible row just past the boundary', () => {
    expect(computeVisibleRange(1, 300, 50, 100, 0)).toEqual({ start: 0, end: 7 })
  })

  it('pads both ends by the overscan amount', () => {
    expect(computeVisibleRange(500, 300, 50, 100, 3)).toEqual({ start: 7, end: 19 })
  })

  it('clamps the start to 0 near the top', () => {
    expect(computeVisibleRange(0, 300, 50, 100, 3)).toEqual({ start: 0, end: 9 })
  })

  it('clamps the end to the item count near the bottom', () => {
    // 20 rows of 50px = 1000px total; 700 is the furthest a 300px-tall box can scroll.
    expect(computeVisibleRange(700, 300, 50, 20, 3)).toEqual({ start: 11, end: 20 })
  })

  it('clamps to the full list when everything fits on screen', () => {
    expect(computeVisibleRange(0, 1000, 50, 5, 3)).toEqual({ start: 0, end: 5 })
  })
})
