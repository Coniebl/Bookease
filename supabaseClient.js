// Replace these two values with your project's URL and anon (publishable) key
// from Supabase Dashboard -> Project Settings -> API
const SUPABASE_URL = 'https://okgmzhufrqqsnyxheqoz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SUcuQmy44-muAiZJYyJ4yQ_xav5m_Aq';

window.isSupabaseConfigured =
  Boolean(SUPABASE_URL) &&
  Boolean(SUPABASE_ANON_KEY);

window.supabaseClient = window.isSupabaseConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
