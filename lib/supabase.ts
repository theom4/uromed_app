import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yahaotcqsjlotlqpfuuj.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhaGFvdGNxc2psb3RscXBmdXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0MzUxOTAsImV4cCI6MjA1NzAxMTE5MH0.ycR8JfhX71Q1B16UM03VJ769hyXNQQb5CeA8HKhYPkY'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)