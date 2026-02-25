import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Note: supabaseAdmin uses the SERVICE_ROLE_KEY which you must only use in a secure server context.
export const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase URL or Service Role Key is missing from environment variables')
    }

    return createClient<Database>(
        supabaseUrl,
        supabaseServiceKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}
