import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Whether real Supabase auth is configured. When false, the app runs in
 * demo/mock mode: the auth guard is bypassed and a demo identity is used,
 * so the whole product is usable without any credentials.
 */
export const isSupabaseConfigured = Boolean(url && key);

export function createClient() {
    if (!isSupabaseConfigured && typeof window !== 'undefined') {
        console.warn('Supabase not configured — running in demo mode.');
    }
    // A client is always returned; in demo mode the auth guard short-circuits
    // before any Supabase call is made (see dashboard layout / login page).
    return createBrowserClient(url, key);
}
