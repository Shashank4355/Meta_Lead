import { NextRequest, NextResponse } from 'next/server';
import { json, apiError } from '@/lib/http';
import { config, DEMO_USER } from '@/lib/config';
import { getMetaAccountByPageId, createLead } from '@/lib/store';

export const runtime = 'nodejs';

/**
 * Meta webhook verification handshake (GET). Meta calls this once with a
 * challenge when you register the webhook; echo it back if the token matches.
 */
export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams;
    const mode = sp.get('hub.mode');
    const token = sp.get('hub.verify_token');
    const challenge = sp.get('hub.challenge') ?? '';

    if (mode === 'subscribe' && (!config.meta.verifyToken || token === config.meta.verifyToken)) {
        return new NextResponse(challenge, { status: 200 });
    }
    return apiError('Verification failed', 403);
}

/**
 * Lead ingestion (POST). Accepts either a real Meta Lead Ads envelope
 * (with inline field_data) or a simplified test payload:
 *   { pageId, name, phone, email?, projectType?, budget? }
 * so you can create leads via curl without a live Meta app.
 *
 * Note: production Meta webhooks send only a `leadgen_id`; retrieving the
 * field values requires a Graph API call with the page access token. That
 * fetch plugs in where marked below.
 */
export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);
    if (!body) return apiError('Invalid JSON', 400);

    const parsed = extractLead(body);
    if (!parsed) {
        // Acknowledge unrecognized events so Meta doesn't retry forever.
        return json({ received: true, ingested: false });
    }

    const account = parsed.pageId ? await getMetaAccountByPageId(parsed.pageId) : null;
    const userId = account?.userId ?? DEMO_USER.id;

    const lead = await createLead(userId, {
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email ?? null,
        projectType: parsed.projectType ?? null,
        budget: parsed.budget ?? null,
        source: 'meta',
        status: 'NEW',
    });

    return json({ received: true, ingested: true, leadId: lead.id }, 201);
}

interface ParsedLead {
    pageId?: string;
    name: string;
    phone: string;
    email?: string | null;
    projectType?: string | null;
    budget?: string | null;
}

function extractLead(body: Record<string, unknown>): ParsedLead | null {
    // Simplified test payload.
    if (body.name && body.phone) {
        return {
            pageId: body.pageId ? String(body.pageId) : undefined,
            name: String(body.name),
            phone: String(body.phone),
            email: body.email ? String(body.email) : null,
            projectType: body.projectType ? String(body.projectType) : null,
            budget: body.budget ? String(body.budget) : null,
        };
    }

    // Real Meta envelope with inline field_data (test-tool shape).
    const entry = (body.entry as Array<Record<string, unknown>>)?.[0];
    const change = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = change?.value as Record<string, unknown> | undefined;
    const fields = value?.field_data as Array<{ name: string; values: string[] }> | undefined;
    if (!fields) return null; // e.g. leadgen_id-only event → needs Graph fetch here.

    const get = (keys: string[]) =>
        fields.find((f) => keys.includes(f.name.toLowerCase()))?.values?.[0];

    const name = get(['full_name', 'name', 'first_name']) ?? '';
    const phone = get(['phone_number', 'phone']) ?? '';
    if (!name || !phone) return null;

    return {
        pageId: value?.page_id ? String(value.page_id) : undefined,
        name,
        phone,
        email: get(['email']) ?? null,
        projectType: get(['project_type', 'project', 'interest']) ?? null,
        budget: get(['budget']) ?? null,
    };
}
