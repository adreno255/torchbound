// ============================================================
// common/supabase.js
// Supabase client singleton.
// Replace the two constants below with your real project values.
// ============================================================

// Both are safe to expose as long as Row Level Security (RLS) is enabled in Supabase.
const SUPABASE_URL = 'https://uuugmjnljhxruypdzozj.supabase.co';
const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1dWdtam5samh4cnV5cGR6b3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzODM4NjEsImV4cCI6MjA4OTk1OTg2MX0.0fqWUqbkVnEdOLXfn5pk8W9S11EwJ6mPxNhVW-EUfPk';

// Supabase JS v2 is loaded via CDN in index.html.
// `window.supabase` is set by the CDN bundle before this module runs.
export const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
