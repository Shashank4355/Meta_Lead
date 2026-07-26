import { withAuth, json } from '@/lib/http';
import { config, hasMeta } from '@/lib/config';

export const runtime = 'nodejs';

/**
 * Returns the URL the browser should visit to connect a Meta account.
 * Real mode: the Facebook OAuth dialog. Mock mode: our own callback that
 * fakes a successful connection so the flow is demoable without a Meta app.
 */
export const GET = withAuth(async (_req, user) => {
    if (!hasMeta()) {
        const url = `${config.appUrl}/api/meta/auth/callback?mock=1`;
        return json({ url });
    }

    const redirectUri = config.meta.redirectUri || `${config.appUrl}/api/meta/auth/callback`;
    const params = new URLSearchParams({
        client_id: config.meta.appId,
        redirect_uri: redirectUri,
        // `state` carries the user id back to the callback. In production,
        // sign/encrypt this or map it server-side to prevent CSRF.
        state: user.id,
        scope: 'pages_show_list,pages_manage_metadata,leads_retrieval,pages_read_engagement',
        response_type: 'code',
    });
    const url = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
    return json({ url });
});
