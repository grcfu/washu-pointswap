import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  // Fail loudly at startup rather than with an opaque error on the first request.
  throw new Error(
    'Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and ' +
    'NEXT_PUBLIC_SUPABASE_ANON_KEY (see frontend/.env.example).'
  )
}

// One client is shared across every request this serverless instance handles, so it
// must never persist or refresh a session — otherwise one user's token could leak
// into another user's request. Per-request identity comes from getCurrentUser below.
export const supabaseServer = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// `detail` matches FastAPI's error shape, which is what page.js already reads.
export class ApiError extends Error {
  constructor(status, detail) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

// Google OAuth will happily issue a session to any Google account, so the WashU-only
// rule has to be enforced here. page.js runs the same check to sign non-WashU users
// out, but that is only UX — a browser-side check is not an authorization boundary.
const ALLOWED_EMAIL_DOMAIN = '@wustl.edu'

// Verify the Supabase access token, confirm the account is WashU, and return its id.
// Every write path goes through here, so the restriction fails closed by default.
export async function getCurrentUser(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing or invalid Authorization header')
  }

  const token = authHeader.slice('Bearer '.length)
  const { data, error } = await supabaseServer.auth.getUser(token)
  if (error || !data?.user) {
    throw new ApiError(401, 'Invalid or expired token')
  }

  // A token with no email at all is a provider configuration problem, not a user
  // error -- Entra ID omits the email claim unless the scope is requested. Say so
  // distinctly, otherwise a legitimate WashU student sees "wrong domain" and there
  // is nothing they can do about it.
  const email = data.user.email?.toLowerCase()
  if (!email) {
    throw new ApiError(403, 'Your account did not share an email address, so we cannot verify you are a WashU student.')
  }

  // 403, not 401: the token is genuine, the account just isn't allowed to post.
  if (!email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
    throw new ApiError(403, `Only ${ALLOWED_EMAIL_DOMAIN} accounts can post or remove listings.`)
  }

  return data.user.id
}

export function errorResponse(err) {
  if (err instanceof ApiError) {
    return Response.json({ detail: err.detail }, { status: err.status })
  }
  // Log the real cause server-side; don't leak internals to the browser.
  console.error('Unexpected API error:', err)
  return Response.json({ detail: 'Something went wrong on our end.' }, { status: 500 })
}
