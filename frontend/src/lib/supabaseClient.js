import { createClient } from '@supabase/supabase-js'

// Next.js requires the NEXT_PUBLIC_ prefix to share variables with the browser
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment variables are missing! Check your .env local file.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)