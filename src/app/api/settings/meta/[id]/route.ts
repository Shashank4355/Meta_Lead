import { NextRequest } from 'next/server';
import { withAuth, json, apiError } from '@/lib/http';
import { deleteMetaAccount } from '@/lib/store';

export const runtime = 'nodejs';

export const DELETE = withAuth(async (_req: NextRequest, user, ctx) => {
    const { id } = await ctx.params;
    const ok = await deleteMetaAccount(user.id, id);
    if (!ok) return apiError('Account not found', 404);
    return json({ success: true });
});
