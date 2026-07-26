import { NextRequest } from 'next/server';
import { withAuth, json, apiError } from '@/lib/http';
import { listLeads, createLead } from '@/lib/store';

export const runtime = 'nodejs';

export const GET = withAuth(async (req: NextRequest, user) => {
    const sp = req.nextUrl.searchParams;
    const limit = Math.min(Number(sp.get('limit')) || 50, 200);
    const offset = Number(sp.get('offset')) || 0;
    const status = sp.get('status') || undefined;
    const result = await listLeads(user.id, { limit, offset, status });
    return json(result);
});

// Manual lead creation (optional — used for testing without Meta).
export const POST = withAuth(async (req: NextRequest, user) => {
    const body = await req.json().catch(() => null);
    if (!body?.name || !body?.phone) {
        return apiError('name and phone are required', 422);
    }
    const lead = await createLead(user.id, {
        name: String(body.name),
        phone: String(body.phone),
        email: body.email ? String(body.email) : null,
        projectType: body.projectType ? String(body.projectType) : null,
        source: 'manual',
    });
    return json({ lead }, 201);
});
