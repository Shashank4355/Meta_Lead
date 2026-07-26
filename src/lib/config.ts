// Central runtime configuration + capability detection.
// Every integration degrades to a working mock when its keys are absent,
// so the whole app is demoable with zero credentials and goes live
// automatically as each key is added to .env.local.

export const config = {
    supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
    vapi: {
        apiKey: process.env.VAPI_API_KEY || '',
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID || '',
        assistantId: process.env.VAPI_ASSISTANT_ID || '',
    },
    anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
    },
    meta: {
        appId: process.env.META_APP_ID || '',
        appSecret: process.env.META_APP_SECRET || '',
        verifyToken: process.env.META_VERIFY_TOKEN || '',
        redirectUri: process.env.META_REDIRECT_URI || '',
    },
    n8n: {
        // When set, the app delegates the call→score→notify pipeline to this
        // n8n webhook instead of running it internally.
        callWebhookUrl: process.env.N8N_CALL_WEBHOOK_URL || '',
        // Shared secret: sent on outbound calls to n8n, and required on
        // inbound callbacks from n8n (x-n8n-secret header).
        secret: process.env.N8N_WEBHOOK_SECRET || '',
    },
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    // Force mock mode even when keys exist, e.g. MOCK_MODE=1 for local demos.
    forceMock: process.env.MOCK_MODE === '1' || process.env.MOCK_MODE === 'true',
};

/** True when Supabase (with a service-role key for server writes) is fully configured. */
export const hasSupabase = () =>
    !config.forceMock &&
    Boolean(config.supabase.url && config.supabase.anonKey && config.supabase.serviceRoleKey);

/** True when auth can be enforced from the browser client (anon key present). */
export const hasSupabaseAuth = () =>
    !config.forceMock && Boolean(config.supabase.url && config.supabase.anonKey);

export const hasVapi = () =>
    !config.forceMock && Boolean(config.vapi.apiKey && config.vapi.phoneNumberId);

export const hasAnthropic = () => !config.forceMock && Boolean(config.anthropic.apiKey);

export const hasMeta = () =>
    !config.forceMock && Boolean(config.meta.appId && config.meta.appSecret);

/** True when the pipeline should be delegated to an n8n workflow. */
export const hasN8n = () => !config.forceMock && Boolean(config.n8n.callWebhookUrl);

/** Fixed identity used for all data in mock mode (no real auth). */
export const DEMO_USER = { id: 'demo-user', email: 'demo@vectorlead.app' };
