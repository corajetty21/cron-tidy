# cron-tidy

Cron expressions that come from config files, ticket descriptions, or someone
typing them from memory tend to be inconsistent: extra whitespace, `MON` vs
`mon` vs `1`, duplicate values, unsorted lists, day-of-week written as both
`0` and `7` for Sunday. None of that is wrong, exactly, but it makes diffs
noisy and makes two expressions that mean the same thing look different.

cron-tidy takes a messy 5-field cron expression (or one of the `@daily` /
`@weekly` style macros) and rewrites it into one canonical form: numeric
values only, ranges and steps kept but normalized, lists deduplicated and
sorted, and Sunday always written as `0`.

## Usage

```ts
import { normalizeCronExpression } from './src/cron'

normalizeCronExpression('  */5   9-17 * 1,2,3 mon-fri  ')
// '*/5 9-17 * 1,2,3 1-5'

normalizeCronExpression('0 12,9,12 * * MON,WED,FRI')
// '0 9,12 * * 1,3,5'

normalizeCronExpression('0 0 * * 7')
// '0 0 * * 0'   (7 and 0 both mean Sunday; 0 is canonical)

normalizeCronExpression('@daily')
// '0 0 * * *'
```

Invalid input throws a `CronFormatError` with a message that says what was
wrong and where:

```ts
normalizeCronExpression('0 25 * * *')
// throws: hour value 25 out of range 0-23
```

## CLI

```
npx ts-node src/index.ts "0 12,9,12 * * MON,WED,FRI"
0 9,12 * * 1,3,5
```

(or run `npm run build` and invoke `dist/index.js` with node)

## What it doesn't do yet

- No support for Quartz-only syntax (`L`, `W`, `#`, `?`, seconds/year
  fields). Those fields will currently fail with an "invalid value" error
  rather than being silently accepted or mangled.
- No semantic dedup across overlapping ranges (`1-5,3-7` stays as two
  segments rather than merging into `1-7`).

## License

MIT, see [LICENSE](LICENSE).
