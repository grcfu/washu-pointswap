import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db, resetDb, addUser, callsOf } from './helpers/fakeSupabase.js'

vi.mock('@supabase/supabase-js', () => import('./helpers/fakeSupabase.js'))

const { GET, POST } = await import('@/app/api/offers/route')
const { POST: DELETE } = await import('@/app/api/offers/[offerId]/delete/route')

const WASHU = { Authorization: 'Bearer washu' }

function request(method, { headers = {}, body } = {}) {
  return new Request('http://localhost/api/offers', {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const post = (body, headers = WASHU) => POST(request('POST', { headers, body }))
// Next.js 16 passes route params as a Promise.
const remove = (offerId, headers = WASHU) =>
  DELETE(request('POST', { headers }), { params: Promise.resolve({ offerId }) })

const lastQuery = () => db.queries.at(-1)

beforeEach(() => {
  resetDb()
  addUser('washu', { email: 'seller@wustl.edu' })
  addUser('gmail', { email: 'someone@gmail.com' })
})

describe('GET /api/offers', () => {
  const selected = () => callsOf(lastQuery(), 'select')[0][0]

  it('hides seller contact info from signed-out visitors', async () => {
    const res = await GET(request('GET'))
    expect(res.status).toBe(200)
    expect(selected()).not.toMatch('contact_info')
    expect(selected()).toMatch('first_name')
  })

  it('hides it from a non-WashU account', async () => {
    await GET(request('GET', { headers: { Authorization: 'Bearer gmail' } }))
    expect(selected()).not.toMatch('contact_info')
  })

  it('hides it when the token is invalid, rather than erroring', async () => {
    const res = await GET(request('GET', { headers: { Authorization: 'Bearer expired' } }))
    expect(res.status).toBe(200)
    expect(selected()).not.toMatch('contact_info')
  })

  it('includes it for a verified WashU student', async () => {
    await GET(request('GET', { headers: WASHU }))
    expect(selected()).toMatch('contact_info')
  })

  // Listings are public, so the read stays on the shared anon client.
  it('reads as anon, so listings show for everyone', async () => {
    await GET(request('GET', { headers: WASHU }))
    expect(lastQuery().token).toBeNull()
  })

  it('shows only live listings', async () => {
    await GET(request('GET'))
    expect(callsOf(lastQuery(), 'eq')).toContainEqual(['status', 'active'])
    expect(callsOf(lastQuery(), 'is')).toContainEqual(['deleted_at', null])
  })

  it('returns a database error as a 500 with { detail }', async () => {
    db.result = { data: null, error: { message: 'relation does not exist' } }
    const res = await GET(request('GET'))
    expect(res.status).toBe(500)
    expect(await res.json()).toHaveProperty('detail')
  })
})

describe('POST /api/offers: who may post', () => {
  it('401s a signed-out caller and never touches the database', async () => {
    const res = await post({ amount: 300, price: 0.2 }, {})
    expect(res.status).toBe(401)
    expect(db.queries).toHaveLength(0)
  })

  it('403s a non-WashU account and never touches the database', async () => {
    const res = await post({ amount: 300, price: 0.2 }, { Authorization: 'Bearer gmail' })
    expect(res.status).toBe(403)
    expect(db.queries).toHaveLength(0)
  })
})

describe('POST /api/offers: validation', () => {
  it('400s a body that is not JSON', async () => {
    const res = await post('{not json')
    expect(res.status).toBe(400)
  })

  it.each([
    ['below the minimum', 99],
    ['above the maximum', 501],
    ['a fraction', 250.5],
    ['not a number', 'lots'],
    ['missing', undefined],
  ])('400s an amount that is %s', async (_, amount) => {
    const res = await post({ amount, price: 0.2 })
    expect(res.status).toBe(400)
    expect((await res.json()).detail).toMatch('Amount')
    expect(db.queries).toHaveLength(0)
  })

  it.each([
    ['zero', 0],
    ['negative', -0.1],
    ['not a number', 'cheap'],
    ['above $3.00 per point', 3.01],
  ])('400s a price that is %s', async (_, price) => {
    const res = await post({ amount: 300, price })
    expect(res.status).toBe(400)
    expect(db.queries).toHaveLength(0)
  })

  it.each([
    [100, 0.01],
    [500, 3],
  ])('accepts the boundary values %s points at $%s', async (amount, price) => {
    const res = await post({ amount, price })
    expect(res.status).toBe(200)
  })
})

describe('POST /api/offers: the insert', () => {
  it('takes seller_id from the verified token, never the request body', async () => {
    await post({ amount: 300, price: 0.2, seller_id: 'someone-else' })
    const [row] = callsOf(lastQuery(), 'insert')[0]
    expect(row).toEqual({ seller_id: 'id-washu', amount: 300, price_per_point: 0.2, status: 'active' })
  })

  // The bug that silently broke posting for four months: writing through the anon
  // client, which row-level security refuses.
  it('writes as the signed-in user, not as anon', async () => {
    await post({ amount: 300, price: 0.2 })
    expect(lastQuery().table).toBe('offers')
    expect(lastQuery().token).toBe('washu')
  })

  it('accepts numeric strings, since the body is coerced with Number()', async () => {
    await post({ amount: '300', price: '0.2' })
    const [row] = callsOf(lastQuery(), 'insert')[0]
    expect(row.amount).toBe(300)
    expect(row.price_per_point).toBe(0.2)
  })
})

describe('POST /api/offers/:id/delete', () => {
  it('401s a signed-out caller', async () => {
    const res = await remove('offer-1', {})
    expect(res.status).toBe(401)
  })

  it('soft-deletes: stamps deleted_at instead of destroying the row', async () => {
    db.result = { data: [{ id: 'offer-1' }], error: null }
    const res = await remove('offer-1')
    expect(res.status).toBe(200)
    const [patch] = callsOf(lastQuery(), 'update')[0]
    expect(Object.keys(patch)).toEqual(['deleted_at'])
    expect(callsOf(lastQuery(), 'delete')).toHaveLength(0)
  })

  it('only matches the caller’s own, still-live listing', async () => {
    db.result = { data: [{ id: 'offer-1' }], error: null }
    await remove('offer-1')
    expect(callsOf(lastQuery(), 'eq')).toEqual([['id', 'offer-1'], ['seller_id', 'id-washu']])
    expect(callsOf(lastQuery(), 'is')).toContainEqual(['deleted_at', null])
    expect(lastQuery().token).toBe('washu')
  })

  // Zero matched rows covers both "someone else's listing" and "already removed",
  // which is what makes a repeated or racing removal safe.
  it('404s when nothing matched instead of reporting success', async () => {
    db.result = { data: [], error: null }
    const res = await remove('someone-elses-offer')
    expect(res.status).toBe(404)
  })
})
