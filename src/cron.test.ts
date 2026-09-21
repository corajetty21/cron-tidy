import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeCronExpression, CronFormatError } from './cron'

test('collapses extra whitespace and trims', () => {
  assert.equal(normalizeCronExpression('  */5   9-17 * 1,2,3 mon-fri  '), '*/5 9-17 * 1,2,3 1-5')
})

test('dedupes and sorts list values', () => {
  assert.equal(normalizeCronExpression('0 12,9,12 * * MON,WED,FRI'), '0 9,12 * * 1,3,5')
})

test('folds day-of-week 7 to 0', () => {
  assert.equal(normalizeCronExpression('0 0 * * 7'), '0 0 * * 0')
  assert.equal(normalizeCronExpression('0 0 * * 0,7'), '0 0 * * 0')
})

test('expands macros', () => {
  assert.equal(normalizeCronExpression('@daily'), '0 0 * * *')
  assert.equal(normalizeCronExpression('@midnight'), '0 0 * * *')
  assert.equal(normalizeCronExpression('@weekly'), '0 0 * * 0')
  assert.equal(normalizeCronExpression('@annually'), normalizeCronExpression('@yearly'))
})

test('rejects unknown macro', () => {
  assert.throws(() => normalizeCronExpression('@fortnightly'), CronFormatError)
})

test('is case-insensitive on month and day-of-week aliases', () => {
  assert.equal(normalizeCronExpression('0 0 1 jan,Dec,FEB *'), '0 0 1 1,2,12 *')
  assert.equal(normalizeCronExpression('0 0 * * sun'), '0 0 * * 0')
})

test('normalizes ranges and rejects backwards ranges', () => {
  assert.equal(normalizeCronExpression('0 0 * 3-6 *'), '0 0 * 3-6 *')
  assert.throws(() => normalizeCronExpression('0 0 * 9-3 *'), CronFormatError)
})

test('keeps steps and normalizes their numeric form', () => {
  assert.equal(normalizeCronExpression('*/05 * * * *'), '*/5 * * * *')
  assert.equal(normalizeCronExpression('1-10/2 * * * *'), '1-10/2 * * * *')
})

test('rejects non-positive or non-numeric steps', () => {
  assert.throws(() => normalizeCronExpression('*/0 * * * *'), CronFormatError)
  assert.throws(() => normalizeCronExpression('*/abc * * * *'), CronFormatError)
})

test('rejects out-of-range values', () => {
  assert.throws(() => normalizeCronExpression('0 25 * * *'), CronFormatError)
  assert.throws(() => normalizeCronExpression('60 0 * * *'), CronFormatError)
  assert.throws(() => normalizeCronExpression('0 0 0 * *'), CronFormatError)
  assert.throws(() => normalizeCronExpression('0 0 * 13 *'), CronFormatError)
  assert.throws(() => normalizeCronExpression('0 0 * * 8'), CronFormatError)
})

test('rejects malformed segments', () => {
  assert.throws(() => normalizeCronExpression('0 0 * * ,'), CronFormatError)
  assert.throws(() => normalizeCronExpression('0 0 * * -'), CronFormatError)
  assert.throws(() => normalizeCronExpression(', 0 * * *'), CronFormatError)
})

test('rejects the wrong number of fields', () => {
  assert.throws(() => normalizeCronExpression('0 0 * *'), CronFormatError)
  assert.throws(() => normalizeCronExpression('0 0 * * * *'), CronFormatError)
})

test('rejects an empty expression', () => {
  assert.throws(() => normalizeCronExpression(''), CronFormatError)
  assert.throws(() => normalizeCronExpression('   '), CronFormatError)
})

test('sorts wildcard and stepped segments before plain numbers', () => {
  assert.equal(normalizeCronExpression('5 1,*/2,10 * * *'), '5 */2,1,10 * * *')
})

test('is idempotent on already-canonical input', () => {
  const canonical = '*/15 0,12 1-15 1,6,12 1-5'
  assert.equal(normalizeCronExpression(canonical), canonical)
})
