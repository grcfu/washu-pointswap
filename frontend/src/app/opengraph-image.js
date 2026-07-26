import { ImageResponse } from 'next/og'

export const alt = 'WashU Pointswap — buy and sell WashU MarketPoints'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/*
  Link preview card for LinkedIn, Slack, iMessage, X, etc.

  Rendered by Satori, which supports only a subset of CSS: flexbox only (no grid),
  inline styles only, and no CSS custom properties. That is why the palette is
  repeated as literals here instead of reading --color-brand. Keep these in sync
  with globals.css.

  The bear is built from positioned divs rather than inline SVG because Satori's
  SVG support is partial, while border-radius circles are reliable. Geometry is
  the BearMark 100-unit viewBox scaled by 2.6.
*/
const BRAND = '#215732'
const CREAM = '#fdfbf9'
const ACCENT = '#A51417'

const S = 2.6
const dot = (cx, cy, r, fill) => ({
  position: 'absolute',
  left: (cx - r) * S,
  top: (cy - r) * S,
  width: r * 2 * S,
  height: r * 2 * S,
  borderRadius: '50%',
  background: fill,
})

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: BRAND,
          padding: '64px 80px',
        }}
      >
        {/* flex:1 + centered so the mark and wordmark sit optically centered
            rather than pinned to the top with dead space beneath */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
          {/* bear mark */}
          <div style={{ display: 'flex', position: 'relative', width: 260, height: 260 }}>
            <div style={dot(50, 54, 26, CREAM)} />
            <div style={dot(32, 34, 12, CREAM)} />
            <div style={dot(68, 34, 12, CREAM)} />
            <div style={dot(32, 34, 6.5, BRAND)} />
            <div style={dot(68, 34, 6.5, BRAND)} />
            <div style={dot(42, 49, 3.6, BRAND)} />
            <div style={dot(58, 49, 3.6, BRAND)} />
            <div
              style={{
                position: 'absolute',
                left: (50 - 4.6) * S,
                top: (60 - 3.2) * S,
                width: 9.2 * S,
                height: 6.4 * S,
                borderRadius: '50%',
                background: BRAND,
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 56 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ fontSize: 104, color: CREAM, letterSpacing: '-0.03em' }}>Pointswap</div>
              {/* the red period, same nod to WashU red as the site wordmark.
                  Negative margin closes the gap Satori leaves between flex children. */}
              <div style={{ fontSize: 104, color: ACCENT, marginLeft: -26 }}>.</div>
            </div>
            <div style={{ display: 'flex', width: 132, height: 5, background: ACCENT, marginTop: 18 }} />
            <div style={{ display: 'flex', fontSize: 38, color: CREAM, opacity: 0.85, marginTop: 26 }}>
              Buy &amp; sell WashU MarketPoints
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 22,
            color: CREAM,
            opacity: 0.6,
            letterSpacing: '0.28em',
          }}
        >
          WASHINGTON UNIVERSITY IN ST. LOUIS
        </div>
      </div>
    ),
    size
  )
}
