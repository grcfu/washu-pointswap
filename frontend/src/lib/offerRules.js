/*
  The marketplace's business rules, defined once.

  These limits used to be bare literals in two places: the client form in page.js and
  the API route that actually enforces them. Changing one without the other would let
  the form accept a value the server then rejects with a 400, or advertise a limit the
  server does not apply. Now that the API is same-origin route handlers in this same
  project, both sides import the same numbers.

  The server remains the authority. The client copies exist for immediate feedback.
*/
export const MIN_AMOUNT = 100
export const MAX_AMOUNT = 500
export const MAX_PRICE_PER_POINT = 3

/*
  Used only to seed the form's example values before any listing exists. Once the
  marketplace has listings the examples come from live data instead — see
  page.js, where the placeholders are derived from the median of current offers.
*/
export const FALLBACK_AMOUNT = 300
export const FALLBACK_PRICE_PER_POINT = 0.25

/** Median of a list of numbers, or null when the list is empty. */
export function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b)
  if (!sorted.length) return null
  const mid = sorted.length / 2
  return sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[mid - 1] + sorted[mid]) / 2
}
