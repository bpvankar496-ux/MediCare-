import { test } from 'node:test'
import assert from 'node:assert/strict'
import { escapeRegex } from './collections.js'

test('escapeRegex leaves plain alphanumeric strings unchanged', () => {
  assert.equal(escapeRegex('hello123'), 'hello123')
})

test('escapeRegex escapes regex special characters so a filter value can never inject a pattern', () => {
  assert.equal(escapeRegex('a.b*c'), 'a\\.b\\*c')
  assert.equal(escapeRegex('(test)'), '\\(test\\)')
  assert.equal(escapeRegex('a+b'), 'a\\+b')
})

test('escapeRegex stringifies non-string input first', () => {
  assert.equal(escapeRegex(42), '42')
})
