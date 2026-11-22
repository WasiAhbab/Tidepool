export function icalendar(
  e: {
    id: string
    title: string
    starts_at: string
    ends_at: string
    description: string
    venue: string
  },
  created = new Date(),
) {
  const escape = (s: string) =>
    s
      .replaceAll('\\', '\\\\')
      .replace(/\r?\n/g, '\\n')
      .replaceAll(',', '\\,')
      .replaceAll(';', '\\;')
  const stamp = (s: string) =>
    new Date(s)
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z/, 'Z')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tidepool//CS Society//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:' + e.id + '@tidepool',
    'DTSTAMP:' + stamp(created.toISOString()),
    'DTSTART:' + stamp(e.starts_at),
    'DTEND:' + stamp(e.ends_at),
    'SUMMARY:' + escape(e.title),
    'LOCATION:' + escape(e.venue),
    'DESCRIPTION:' + escape(e.description),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const folded = lines.map((line) => {
    let out = '',
      count = 0
    for (const ch of line) {
      const size = new TextEncoder().encode(ch).length
      if (count + size > 74) {
        out += '\r\n '
        count = 1
      }
      out += ch
      count += size
    }
    return out
  })
  return folded.join('\r\n') + '\r\n'
}

export function icalendarFeed(events: Parameters<typeof icalendar>[0][], created = new Date()) {
  const components = events.map((event) => {
    const match = icalendar(event, created).match(/BEGIN:VEVENT\r?\n[\s\S]*?END:VEVENT/)
    return match?.[0]
  })
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tidepool//CS Society//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Computer Science Society Events',
    ...components.filter((component): component is string => !!component),
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}
