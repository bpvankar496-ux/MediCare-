import { describe, it, expect } from 'vitest'
import { luhnValid } from './payment'

describe('luhnValid', () => {
  it('accepts a well-known valid test card number', () => {
    expect(luhnValid('4111 1111 1111 1111')).toBe(true)
  })

  it('rejects a number with an invalid checksum', () => {
    expect(luhnValid('4111 1111 1111 1112')).toBe(false)
  })

  it('rejects strings that are too short to be a card number', () => {
    expect(luhnValid('1234')).toBe(false)
  })

  it('ignores non-digit formatting characters', () => {
    expect(luhnValid('4111-1111-1111-1111')).toBe(true)
  })
})
