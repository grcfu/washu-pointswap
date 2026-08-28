import { getCurrentUser, errorResponse, ApiError } from '@/lib/apiAuth'

// POST rather than DELETE to match the existing client call in page.js.
export async function POST(request, { params }) {
  try {
    // Next.js 16: `params` is a Promise and must be awaited.
    const { offerId } = await params
    const { userId, supabase } = await getCurrentUser(request)

    // Soft delete: stamp deleted_at rather than destroying the row. A hard DELETE
    // threw the listing's price away with it, so the marketplace could never say
    // what points historically sold for, and a misclick was unrecoverable. Reads
    // filter on `deleted_at is null`, so this still disappears from the site.
    //
    // The seller_id filter is the authorization check — you can only remove your own.
    // Requiring deleted_at to still be null makes removing an already-removed
    // listing a 404 instead of quietly overwriting the original removal time.
    const { data, error } = await supabase
      .from('offers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', offerId)
      .eq('seller_id', userId)
      .is('deleted_at', null)
      .select()

    if (error) throw new ApiError(500, error.message)

    // Without .select() + this check, removing someone else's listing matched zero
    // rows but still reported success.
    if (!data || data.length === 0) {
      throw new ApiError(404, "Listing not found, or it isn't yours to remove.")
    }

    return Response.json({ message: 'Offer removed', data })
  } catch (err) {
    return errorResponse(err)
  }
}
