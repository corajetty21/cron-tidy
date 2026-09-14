export { normalizeCronExpression, CronFormatError } from './cron'

import { normalizeCronExpression } from './cron'

function main(): void {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('usage: cron-tidy "<cron expression>"')
    process.exitCode = 1
    return
  }

  const input = args.join(' ')
  try {
    console.log(normalizeCronExpression(input))
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exitCode = 1
  }
}

if (require.main === module) {
  main()
}
