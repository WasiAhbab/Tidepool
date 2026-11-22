import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { invitation } from '@/features/events/invitation'
import { cover, day } from '@/lib/events'
import { apiUrl } from '@/lib/site'
const size = { width: 1200, height: 630 }

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const e = await invitation((await params).slug),
    src = cover(e),
    art = src.startsWith('/art/')
      ? await readFile(path.join(process.cwd(), 'public', src))
      : Buffer.from(await (await fetch(apiUrl(src))).arrayBuffer())
  const sharp = (await import('sharp')).default
  const jpg = await sharp(art).jpeg().toBuffer()
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: '#fbf9f4',
        color: '#203d49',
      }}
    >
      <div
        style={{
          width: '51%',
          padding: 55,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 28 }}>Tidepool · {e.category}</span>
        <strong style={{ fontSize: 64, lineHeight: 1.05 }}>{e.title}</strong>
        <span style={{ fontSize: 29 }}>
          {day(e.starts_at, e.timezone)} · {e.venue}
        </span>
      </div>
      <img
        width={590}
        height={630}
        style={{ objectFit: 'cover' }}
        src={'data:image/jpeg;base64,' + jpg.toString('base64')}
      />
    </div>,
    size,
  )
}
