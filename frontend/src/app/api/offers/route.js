import { supabaseServer, getCurrentUser, errorResponse, ApiError } from '@/lib/apiAuth'
// Shared with the client form, so the two cannot drift apart. This route is the
// authority; the client copies only provide immediate feedback.
import { MIN_AMOUNT, MAX_AMOUNT, MAX_PRICE_PER_POINT } from '@/lib/offerRules'

// Route handlers are not cached by default in Next.js 16, so listings are always live.
export async function GET() {
  try {
    // Removed listings are kept as rows with `deleted_at` set (see the delete
    // route), so every read of the live marketplace has to exclude them. Miss this
    // filter and pulled listings reappear on the site.
    const { data, error } = await supabaseServer
      .from('offers')
      .select('*, profiles(first_name, last_name, contact_info)')
      .eq('status', 'active')
      .is('deleted_at', null)

    if (error) throw new ApiError(500, error.message)
    return Response.json(data)
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(request) {
  try {
    // `supabase` here acts as the caller; the shared anon client cannot satisfy RLS.
    const { userId, supabase } = await getCurrentUser(request)

    let body
    try {
      body = await request.json()
    } catch {
      throw new ApiError(400, 'Request body must be valid JSON')
    }

    // `price` is per-point; the client divides the seller's total by the amount.
    const amount = Number(body?.amount)
    const price = Number(body?.price)

    if (!Number.isInteger(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      throw new ApiError(400, `Amount must be between ${MIN_AMOUNT} and ${MAX_AMOUNT} MP`)
    }
    if (!Number.isFinite(price) || price <= 0) {
      throw new ApiError(400, 'Price must be greater than 0')
    }
    if (price > MAX_PRICE_PER_POINT) {
      throw new ApiError(400, `Price cannot exceed $${MAX_PRICE_PER_POINT.toFixed(2)} per point`)
    }

    // supabase-js returns no rows from insert unless .select() is chained.
    const { data, error } = await supabase
      .from('offers')
      .insert({
        seller_id: userId,
        amount,
        price_per_point: price,
        status: 'active',
      })
      .select()

    if (error) throw new ApiError(500, error.message)
    return Response.json({ message: 'Offer created!', data })
  } catch (err) {
    return errorResponse(err)
  }
}
