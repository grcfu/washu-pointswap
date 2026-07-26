/*
  The Pointswap bear — the single source of truth for the mark.

  Geometry is duplicated in src/app/icon.svg for the browser tab, because that
  file is read as a static asset by Next.js's icon convention and cannot import
  React. Any change to these circles should be mirrored there.

  Colors come from the theme tokens, so the mark follows the brand automatically
  and works on any surface that sets them.
*/
export default function BearMark({ size = 80, className = '', title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {/* head and ears */}
      <circle cx="50" cy="52" r="30" fill="var(--color-brand)" />
      <circle cx="30" cy="30" r="14" fill="var(--color-brand)" />
      <circle cx="70" cy="30" r="14" fill="var(--color-brand)" />
      {/* inner ears */}
      <circle cx="30" cy="30" r="8" fill="var(--color-cream)" />
      <circle cx="70" cy="30" r="8" fill="var(--color-cream)" />
      {/* eyes and muzzle */}
      <circle cx="42" cy="46" r="4" fill="var(--color-cream)" />
      <circle cx="58" cy="46" r="4" fill="var(--color-cream)" />
      <ellipse cx="50" cy="56" rx="5" ry="3.5" fill="var(--color-cream)" />
    </svg>
  )
}
