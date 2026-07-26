import { supabaseServer, getCurrentUser, errorResponse, ApiError } from '@/lib/apiAuth'

// POST rather than DELETE to match the existing client call in page.js.
export async function POST(request, { params }) {
  try {
    // Next.js 16: `params` is a Promise and must be awaited.
    const { offerId } = await params
    const userId = await getCurrentUser(request)

    // The seller_id filter is the authorization check — you can only delete your own.
    const { data, error } = await supabaseServer
      .from('offers')
      .delete()
      .eq('id', offerId)
      .eq('seller_id', userId)
      .select()

    if (error) throw new ApiError(500, error.message)

    // Without .select() + this check, deleting someone else's listing matched zero
    // rows but still reported success.
    if (!data || data.length === 0) {
      throw new ApiError(404, "Listing not found, or it isn't yours to remove.")
    }

    return Response.json({ message: 'Offer removed', data })
  } catch (err) {
    return errorResponse(err)
  }
}
