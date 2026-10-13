import { describe, it, expect } from 'vitest'
import {
  MIN_AMOUNT,
  MAX_AMOUNT,
  MAX_PRICE_PER_POINT,
  FALLBACK_AMOUNT,
  FALLBACK_PRICE_PER_POINT,
  median,
} from '@/lib/offerRules'

describe('offer limits', () => {
  it('match the documented business rules', () => {
    expect(MIN_AMOUNT).toBe(100)
    expect(MAX_AMOUNT).toBe(500)
    expect(MAX_PRICE_PER_POINT).toBe(3)
  })

  // The fallbacks seed the form's example values, so they must be a listing the
  // server would actually accept.
  it('fallback example is itself a valid listing', () => {
    expect(FALLBACK_AMOUNT).toBeGreaterThanOrEqual(MIN_AMOUNT)
    expect(FALLBACK_AMOUNT).toBeLessThanOrEqual(MAX_AMOUNT)
    expect(FALLBACK_PRICE_PER_POINT).toBeGreaterThan(0)
    expect(FALLBACK_PRICE_PER_POINT).toBeLessThanOrEqual(MAX_PRICE_PER_POINT)
  })
})

describe('median', () => {
  it('returns null for an empty market, so callers fall back', () => {
    expect(median([])).toBeNull()
  })

  it('returns the middle value of an odd-length list', () => {
    expect(median([0.5, 0.15, 0.2])).toBe(0.2)
  })

  it('averages the two middle values of an even-length list', () => {
    expect(median([300, 500, 400, 500])).toBe(450)
  })

  // A default sort() compares as strings, which would put 100 before 20.
  it('sorts numerically, not lexically', () => {
    expect(median([100, 20, 3])).toBe(20)
  })

  it('does not reorder the caller’s array', () => {
    const prices = [0.3, 0.1, 0.2]
    median(prices)
    expect(prices).toEqual([0.3, 0.1, 0.2])
  })
})
