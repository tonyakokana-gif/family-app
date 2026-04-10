import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// モジュールレベルのシングルトン（ブラウザ用）
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
