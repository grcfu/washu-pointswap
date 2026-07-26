import { supabaseServer, getCurrentUser, errorResponse, ApiError } from '@/lib/apiAuth'

// Keep these in sync with the client-side checks in page.js and with CLAUDE.md.
const MIN_AMOUNT = 100
const MAX_AMOUNT = 500
const MAX_PRICE_PER_POINT = 3

// Route handlers are not cached by default in Next.js 16, so listings are always live.
export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('offers')
      .select('*, profiles(first_name, last_name, contact_info)')
      .eq('status', 'active')

    if (error) throw new ApiError(500, error.message)
    return Response.json(data)
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(request) {
  try {
    const userId = await getCurrentUser(request)

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
      throw new ApiError(400, 'Price cannot exceed $3.00 per point')
    }

    // supabase-js returns no rows from insert unless .select() is chained.
    const { data, error } = await supabaseServer
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
