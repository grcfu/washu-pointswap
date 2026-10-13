import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db, resetDb, addUser, createClient } from './helpers/fakeSupabase.js'

vi.mock('@supabase/supabase-js', () => import('./helpers/fakeSupabase.js'))

const { getCurrentUser, errorResponse, ApiError } = await import('@/lib/apiAuth')

const requestWith = (headers = {}) => new Request('http://localhost/api/offers', { headers })

// Resolves to the ApiError getCurrentUser throws, or fails the test if it doesn't throw.
async function rejection(request) {
  const err = await getCurrentUser(request).then(
    () => { throw new Error('expected getCurrentUser to reject') },
    (e) => e,
  )
  expect(err).toBeInstanceOf(ApiError)
  return err
}

beforeEach(resetDb)

describe('getCurrentUser: who is calling', () => {
  it('401s with no Authorization header', async () => {
    const err = await rejection(requestWith())
    expect(err.status).toBe(401)
  })

  it('401s on a non-Bearer scheme', async () => {
    const err = await rejection(requestWith({ Authorization: 'Basic dXNlcjpwYXNz' }))
    expect(err.status).toBe(401)
  })

  it('401s when Supabase does not recognise the token', async () => {
    const err = await rejection(requestWith({ Authorization: 'Bearer forged' }))
    expect(err.status).toBe(401)
    expect(err.detail).toBe('Invalid or expired token')
  })
})

describe('getCurrentUser: the WashU-only boundary', () => {
  // The token is genuine, so these must be 403 (not allowed), never 401 (not signed in).
  it('403s a valid token for a non-WashU account', async () => {
    addUser('gmail', { email: 'student@gmail.com' })
    const err = await rejection(requestWith({ Authorization: 'Bearer gmail' }))
    expect(err.status).toBe(403)
    expect(err.detail).toMatch('@wustl.edu')
  })

  it('403s a lookalike domain that merely contains wustl.edu', async () => {
    addUser('lookalike', { email: 'student@wustl.edu.evil.com' })
    const err = await rejection(requestWith({ Authorization: 'Bearer lookalike' }))
    expect(err.status).toBe(403)
  })

  it('403s a subdomain address, since only @wustl.edu itself is allowed', async () => {
    addUser('sub', { email: 'student@cse.wustl.edu' })
    const err = await rejection(requestWith({ Authorization: 'Bearer sub' }))
    expect(err.status).toBe(403)
  })

  // Entra ID omits the email claim unless the scope is requested; a real student
  // should be told that, not "wrong domain".
  it('403s with a distinct message when the account has no email', async () => {
    addUser('noemail', { email: undefined })
    const err = await rejection(requestWith({ Authorization: 'Bearer noemail' }))
    expect(err.status).toBe(403)
    expect(err.detail).toMatch('did not share an email')
  })

  it('accepts a WashU address regardless of case', async () => {
    addUser('caps', { email: 'Student@WUSTL.EDU' })
    const { userId } = await getCurrentUser(requestWith({ Authorization: 'Bearer caps' }))
    expect(userId).toBe('id-caps')
  })
})

describe('getCurrentUser: the client it returns', () => {
  it('acts as the caller, so row-level security sees the real user', async () => {
    addUser('washu', { email: 'student@wustl.edu' })
    const { userId, supabase } = await getCurrentUser(requestWith({ Authorization: 'Bearer washu' }))

    expect(userId).toBe('id-washu')
    const [, , options] = createClient.mock.calls.at(-1)
    expect(options.global.headers.Authorization).toBe('Bearer washu')
    // A shared serverless client must never hold on to a user's session.
    expect(options.auth).toEqual({ persistSession: false, autoRefreshToken: false })

    supabase.from('offers')
    expect(db.queries.at(-1).token).toBe('washu')
  })

  it('builds a fresh client per request, never reusing another caller’s', async () => {
    addUser('alice', { email: 'alice@wustl.edu' })
    addUser('bob', { email: 'bob@wustl.edu' })
    const a = await getCurrentUser(requestWith({ Authorization: 'Bearer alice' }))
    const b = await getCurrentUser(requestWith({ Authorization: 'Bearer bob' }))
    expect(a.supabase).not.toBe(b.supabase)
  })
})

describe('errorResponse', () => {
  it('returns an ApiError as { detail } with its status, matching FastAPI', async () => {
    const res = errorResponse(new ApiError(404, 'Listing not found'))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ detail: 'Listing not found' })
  })

  it('hides the cause of an unexpected error from the browser', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = errorResponse(new Error('connection string postgres://secret'))
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toMatch('secret')
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })
})
