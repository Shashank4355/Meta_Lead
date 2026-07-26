import { NextRequest, NextResponse } from 'next/server';
import { requireUser, UnauthorizedError, AuthUser } from './auth';

export function json(data: unknown, status = 200) {
    return NextResponse.json(data, { status });
}

export function apiError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

/**
 * Wrap an authenticated route handler: resolves the user, and turns
 * auth failures / thrown errors into clean JSON responses.
 */
export function withAuth(
    handler: (req: NextRequest, user: AuthUser, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>
) {
    return async (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => {
        try {
            const user = await requireUser(req);
            return await handler(req, user, ctx);
        } catch (err) {
            if (err instanceof UnauthorizedError) return apiError(err.message, 401);
            console.error('[api] unhandled error:', err);
            return apiError('Internal server error', 500);
        }
    };
}
