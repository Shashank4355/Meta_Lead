import { NextRequest } from 'next/server';
import { withAuth, json, apiError } from '@/lib/http';
import { getLead } from '@/lib/store';

export const runtime = 'nodejs';

export const GET = withAuth(
    async (_req: NextRequest, user, ctx) => {
        const { id } = await ctx.params;
        const lead = await getLead(user.id, id);
        if (!lead) return apiError('Lead not found', 404);
        return json({ lead });
    }
);
