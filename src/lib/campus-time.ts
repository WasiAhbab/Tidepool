import { Temporal } from '@js-temporal/polyfill'
export function wallTime(value: string, zone: string) {
  return Temporal.Instant.from(value)
    .toZonedDateTimeISO(zone)
    .toPlainDateTime()
    .toString({ smallestUnit: 'minute' })
}
export function instant(value: string, zone: string) {
  return Temporal.PlainDateTime.from(value)
    .toZonedDateTime(zone, { disambiguation: 'reject' })
    .toInstant()
    .toString({ smallestUnit: 'millisecond' })
}
