// Canonicalizes cron expressions. Handles the standard 5-field form
// (minute hour day-of-month month day-of-week) plus the common @macros.
// Anything Quartz-specific (L, W, #, ?) is out of scope for now - see README.

interface FieldDef {
  name: string
  min: number
  max: number
  aliases?: Record<string, number>
  // day-of-week lets both 0 and 7 mean Sunday; fold 7 down to 0 so the
  // canonical form is unambiguous.
  wrap7to0?: boolean
}

const MONTH_ALIASES: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
}

const DOW_ALIASES: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
}

const FIELDS: FieldDef[] = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day of month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12, aliases: MONTH_ALIASES },
  { name: 'day of week', min: 0, max: 7, aliases: DOW_ALIASES, wrap7to0: true },
]

const MACROS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
}

export class CronFormatError extends Error {}

export function normalizeCronExpression(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, ' ')
  if (trimmed.length === 0) {
    throw new CronFormatError('empty cron expression')
  }

  if (trimmed.startsWith('@')) {
    const macro = MACROS[trimmed.toLowerCase()]
    if (!macro) {
      throw new CronFormatError(`unknown macro: ${trimmed}`)
    }
    return macro
  }

  const parts = trimmed.split(' ')
  if (parts.length !== 5) {
    throw new CronFormatError(
      `expected 5 fields (minute hour day-of-month month day-of-week), got ${parts.length}: "${trimmed}"`
    )
  }

  return parts.map((part, i) => normalizeField(part, FIELDS[i])).join(' ')
}

function normalizeField(raw: string, def: FieldDef): string {
  if (raw === '') {
    throw new CronFormatError(`empty ${def.name} field`)
  }

  const segments = raw.split(',').map((seg) => normalizeSegment(seg, def))
  const unique = Array.from(new Set(segments))
  unique.sort(compareSegments)
  return unique.join(',')
}

function normalizeSegment(seg: string, def: FieldDef): string {
  const slash = seg.indexOf('/')
  const base = slash === -1 ? seg : seg.slice(0, slash)
  const step = slash === -1 ? null : seg.slice(slash + 1)

  if (base === '') {
    throw new CronFormatError(`malformed ${def.name} value: "${seg}"`)
  }

  let normalizedBase: string
  if (base === '*') {
    normalizedBase = '*'
  } else if (base.includes('-')) {
    const dash = base.indexOf('-')
    const lo = parseValue(base.slice(0, dash), def)
    const hi = parseValue(base.slice(dash + 1), def)
    if (lo > hi) {
      throw new CronFormatError(`backwards range in ${def.name}: "${base}"`)
    }
    normalizedBase = `${lo}-${hi}`
  } else {
    normalizedBase = String(parseValue(base, def))
  }

  if (step !== null) {
    if (!/^\d+$/.test(step)) {
      throw new CronFormatError(`invalid step in ${def.name}: "${seg}"`)
    }
    const stepNum = parseInt(step, 10)
    if (stepNum <= 0) {
      throw new CronFormatError(`step must be positive in ${def.name}: "${seg}"`)
    }
    normalizedBase += `/${stepNum}`
  }

  return normalizedBase
}

function parseValue(token: string, def: FieldDef): number {
  const upper = token.toUpperCase()
  if (def.aliases && upper in def.aliases) {
    return def.aliases[upper]
  }

  if (!/^\d+$/.test(token)) {
    throw new CronFormatError(`invalid value in ${def.name}: "${token}"`)
  }

  let num = parseInt(token, 10)
  if (def.wrap7to0 && num === 7) {
    num = 0
  }

  if (num < def.min || num > def.max) {
    throw new CronFormatError(
      `${def.name} value ${num} out of range ${def.min}-${def.max}`
    )
  }

  return num
}

// '*' and '*/n' sort before numeric segments; numeric segments sort by
// their first number, then lexically as a tiebreaker.
function sortKey(seg: string): [number, number, string] {
  const isStar = seg === '*' || seg.startsWith('*/')
  const match = seg.match(/\d+/)
  const firstNum = match ? parseInt(match[0], 10) : 0
  return [isStar ? 0 : 1, firstNum, seg]
}

function compareSegments(a: string, b: string): number {
  const ka = sortKey(a)
  const kb = sortKey(b)
  if (ka[0] !== kb[0]) return ka[0] - kb[0]
  if (ka[1] !== kb[1]) return ka[1] - kb[1]
  return ka[2] < kb[2] ? -1 : ka[2] > kb[2] ? 1 : 0
}
