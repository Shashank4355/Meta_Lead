import { NextRequest } from 'next/server';
import { withAuth, json, apiError } from '@/lib/http';
import { getLead } from '@/lib/store';
import { startCall } from '@/lib/pipeline';

export const runtime = 'nodejs';

export const POST = withAuth(async (_req: NextRequest, user, ctx) => {
    const { id } = await ctx.params;
    const lead = await getLead(user.id, id);
    if (!lead) return apiError('Lead not found', 404);
    if (lead.status === 'CALLING') return apiError('A call is already in progress', 409);

    const { attemptId } = await startCall(lead);
    return json({ success: true, attemptId });
});
