import { describe, expect, it } from 'vitest'
import { addRM, sumRM, toSen } from './money'

describe('sumRM', () => {
  it('adds amounts exactly, where plain JavaScript drifts', () => {
    expect(5 + 29.01 + 15.99).not.toBe(50) // 50.00000000000001
    expect(sumRM([5, 29.01, 15.99])).toBe(50)
    expect(sumRM([0.1, 0.2])).toBe(0.3)
  })

  it('cancels out to exactly zero, never -0.00', () => {
    expect(sumRM([50, -5, -29.01, -15.99])).toBe(0)
    expect(Object.is(sumRM([50, -5, -29.01, -15.99]), -0)).toBe(false)
  })

  it('is 0 for no amounts', () => {
    expect(sumRM([])).toBe(0)
  })

  it('keeps large totals exact', () => {
    expect(sumRM(Array.from({ length: 1000 }, () => 1234.56))).toBe(1234560)
  })
})

describe('addRM and toSen', () => {
  it('adds two amounts exactly', () => {
    expect(addRM(0.1, 0.2)).toBe(0.3)
    expect(addRM(29.01, 15.99)).toBe(45)
  })

  it('converts to whole sen', () => {
    expect(toSen(12.34)).toBe(1234)
    expect(toSen(1.005)).toBe(100) // 1.005 is really 1.00499999… in binary
    expect(toSen(0)).toBe(0)
  })
})
