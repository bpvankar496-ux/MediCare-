import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isStrongPassword } from './auth.js'

test('isStrongPassword rejects passwords under 8 characters', () => {
  assert.equal(isStrongPassword('ab1'), false)
})

test('isStrongPassword rejects letters-only passwords', () => {
  assert.equal(isStrongPassword('abcdefgh'), false)
})

test('isStrongPassword rejects numbers-only passwords', () => {
  assert.equal(isStrongPassword('12345678'), false)
})

test('isStrongPassword accepts a password with letters, a number, and 8+ chars', () => {
  assert.equal(isStrongPassword('abcd1234'), true)
})

test('isStrongPassword rejects non-string input', () => {
  assert.equal(isStrongPassword(12345678), false)
  assert.equal(isStrongPassword(undefined), false)
})
