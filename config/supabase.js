/**
 * Supabase client — two clients:
 *  - supabase      → anon key (respects RLS, for user-facing ops)
 *  - supabaseAdmin → service_role key (bypasses RLS, for admin ops)
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY         = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

/* Public client — honours Row Level Security */
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken : true,
    persistSession   : false,   // server-side: don't persist
  },
});

/* Admin client — bypasses RLS (use only in server-side code!) */
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession  : false,
      },
    })
  : null;

if (!supabaseAdmin) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set — admin operations will be unavailable');
}

module.exports = { supabase, supabaseAdmin };
