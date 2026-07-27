import Image from 'next/image'
import bearArt from './bear.png'

/*
  The Pointswap bear — the single source of truth for the mark, used in the nav, the
  auth loading screen and the empty state.

  This is the original hand-drawn illustration with its crimson background knocked
  out to transparency, so the same asset sits correctly on the cream light surface
  and the dark green one without needing a per-theme variant. That is why it must
  stay a transparent PNG: fill it with a background again and it will only work on
  one theme.

  The browser tab uses the same drawing with an opaque green background
  (src/app/icon*.png), because a tab icon is composited against browser chrome
  rather than the page.

  Being a raster, this no longer follows the color tokens the way the old geometric
  mark did. That is the accepted trade for using the real artwork.
*/
export default function BearMark({ size = 80, className = '', title, priority = false }) {
  return (
    <Image
      src={bearArt}
      // Decorative unless a title is given, in which case it carries the name.
      alt={title || ''}
      aria-hidden={title ? undefined : true}
      width={size}
      height={size}
      className={className}
      // Set on above-the-fold instances so lazy loading cannot flash an empty slot.
      priority={priority}
    />
  )
}
