import { NextRequest } from 'next/server';
import { hasSupabaseAuth, DEMO_USER } from './config';
import { getUserFromToken } from './supabase-server';
import { ensureUser } from './store';

export interface AuthUser {
    id: string;
    email: string | null;
}

/** Thrown by requireUser() when the caller is not authenticated. */
export class UnauthorizedError extends Error {
    constructor(message = 'Unauthorized') {
        super(message);
        this.name = 'UnauthorizedError';
    }
}

/**
 * Resolve the authenticated user for an API request.
 * - Real mode: validates the `Authorization: Bearer <jwt>` against Supabase.
 * - Mock mode (no Supabase keys): returns the fixed demo user so the app
 *   is fully usable without credentials.
 */
export async function requireUser(request: NextRequest): Promise<AuthUser> {
    if (!hasSupabaseAuth()) {
        return { id: DEMO_USER.id, email: DEMO_USER.email };
    }

    const header = request.headers.get('authorization') || '';
    const token = header.toLowerCase().startsWith('bearer ')
        ? header.slice(7).trim()
        : '';

    if (!token) throw new UnauthorizedError('Missing bearer token');

    const user = await getUserFromToken(token);
    if (!user) throw new UnauthorizedError('Invalid or expired session');

    // Map the Supabase auth id to the internal User.id used by the data model.
    const internalId = await ensureUser(user.id, user.email ?? null);
    return { id: internalId, email: user.email ?? null };
}
