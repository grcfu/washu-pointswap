import { vi } from 'vitest'

/*
  In-memory stand-in for @supabase/supabase-js, so the API can be tested without a
  network or a real project. Install it at the top of a test file with:

    vi.mock('@supabase/supabase-js', () => import('./helpers/fakeSupabase.js'))

  It records what the code under test asked for rather than simulating Postgres:
  which client ran each query (the shared anon one, or one acting as a user), and
  every builder call in order. Tests then assert on those calls.
*/
export const db = {
  // access token -> the user Supabase Auth would return for it
  users: {},
  // what the next awaited query resolves to
  result: { data: [], error: null },
  // one entry per .from(): { table, token, calls: [[method, ...args], ...] }
  queries: [],
}

export function resetDb() {
  db.users = {}
  db.result = { data: [], error: null }
  db.queries = []
}

export function addUser(token, user) {
  db.users[token] = { id: `id-${token}`, ...user }
}

/** Calls of one builder method across a recorded query, e.g. callsOf(q, 'eq'). */
export function callsOf(query, method) {
  return query.calls.filter(([m]) => m === method).map(([, ...args]) => args)
}

function queryBuilder(table, token) {
  const query = { table, token, calls: [] }
  db.queries.push(query)
  // Every method chains; awaiting the chain resolves to db.result.
  const builder = new Proxy({}, {
    get(_, method) {
      if (method === 'then') {
        return (resolve, reject) => Promise.resolve(db.result).then(resolve, reject)
      }
      return (...args) => {
        query.calls.push([method, ...args])
        return builder
      }
    },
  })
  return builder
}

export const createClient = vi.fn((url, key, options) => {
  // A client built with a bearer token acts as that user; one without is `anon`.
  const token = options?.global?.headers?.Authorization?.replace(/^Bearer /, '') ?? null
  return {
    auth: {
      getUser: async (accessToken) => {
        const user = db.users[accessToken]
        return user
          ? { data: { user }, error: null }
          : { data: { user: null }, error: { message: 'invalid JWT' } }
      },
    },
    from: (table) => queryBuilder(table, token),
  }
})
