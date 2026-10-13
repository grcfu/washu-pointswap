import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // Mirror the `@/*` alias from jsconfig.json so tests import exactly what the app does.
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // apiAuth.js throws at import without these. Every test replaces supabase-js with a
    // fake (tests/helpers/fakeSupabase.js), so nothing ever reaches this URL.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://supabase.test',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
