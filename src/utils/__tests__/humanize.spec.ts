import { describe, expect, it } from 'vitest'

import { humanize } from '@/utils/humanize'

describe('humanize', () => {
  it.each([
    ['PLANET', 'Planet'],
    ['FUEL_STATION', 'Fuel station'],
    ['ENGINEERED_ASTEROID', 'Engineered asteroid'],
  ])('turns %s into %s', (input, expected) => {
    expect(humanize(input)).toBe(expected)
  })
})
