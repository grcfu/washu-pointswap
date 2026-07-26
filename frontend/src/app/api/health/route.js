import { supabaseServer } from '@/lib/apiAuth'

// Touches Postgres so that pinging this URL counts as Supabase activity, which is
// what keeps a free-tier project from being paused after ~7 days idle.
// Point a free uptime monitor at /api/health every 15 minutes.
export async function GET() {
  const { error } = await supabaseServer.from('offers').select('id').limit(1)

  if (error) {
    console.error('Health check failed:', error.message)
    return Response.json({ status: 'error', database: 'unreachable' }, { status: 503 })
  }
  return Response.json({ status: 'ok', database: 'reachable' })
}
