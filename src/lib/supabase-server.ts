import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { config } from './config';

/**
 * Request-scoped Supabase client that reads the user's session from cookies.
 * Used to identify the caller. Respects RLS (uses the anon key).
 */
export async function createServerSupabase() {
    const cookieStore = await cookies();
    return createServerClient(config.supabase.url, config.supabase.anonKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                } catch {
                    // Called from a Server Component / Route Handler without a
                    // mutable cookie store — safe to ignore, proxy refreshes it.
                }
            },
        },
    });
}

/**
 * Privileged, service-role client that bypasses RLS. Server-only.
 * Never import this into client code — it holds the service-role key.
 */
let adminClient: SupabaseClient | null = null;
export function createAdminSupabase(): SupabaseClient {
    if (!adminClient) {
        adminClient = createSupabaseClient(config.supabase.url, config.supabase.serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });
    }
    return adminClient;
}

/** Validate a raw bearer JWT and return the user, or null. */
export async function getUserFromToken(token: string) {
    const client = createSupabaseClient(config.supabase.url, config.supabase.anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user;
}
