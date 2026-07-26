import { NextRequest, NextResponse } from 'next/server';
import { config, hasMeta, DEMO_USER } from '@/lib/config';
import { createMetaAccount } from '@/lib/store';

export const runtime = 'nodejs';

/**
 * OAuth redirect target. Browser lands here after the Meta dialog.
 * Mock mode: create a fake connected page and bounce back to settings.
 */
export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams;
    const settingsUrl = new URL('/settings?meta=connected', config.appUrl);

    // ── Mock mode ──
    if (!hasMeta() || sp.get('mock') === '1') {
        await createMetaAccount(DEMO_USER.id, {
            pageId: `mock-${Math.floor(Math.random() * 1e6)}`,
            pageName: 'Demo Page — Lead Ads',
        });
        return NextResponse.redirect(settingsUrl);
    }

    // ── Real mode ──
    const code = sp.get('code');
    const userId = sp.get('state') || '';
    if (!code || !userId) {
        return NextResponse.redirect(new URL('/settings?meta=error', config.appUrl));
    }

    try {
        const redirectUri = config.meta.redirectUri || `${config.appUrl}/api/meta/auth/callback`;
        // 1) Exchange code → user access token.
        const tokenRes = await fetch(
            `https://graph.facebook.com/v19.0/oauth/access_token?` +
                new URLSearchParams({
                    client_id: config.meta.appId,
                    client_secret: config.meta.appSecret,
                    redirect_uri: redirectUri,
                    code,
                }).toString()
        );
        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) throw new Error(JSON.stringify(tokenData));

        // 2) List the pages this user manages; store each with its page token.
        const pagesRes = await fetch(
            `https://graph.facebook.com/v19.0/me/accounts?access_token=${tokenData.access_token}`
        );
        const pagesData = await pagesRes.json();
        for (const page of pagesData.data ?? []) {
            await createMetaAccount(userId, {
                pageId: page.id,
                pageName: page.name,
                accessToken: page.access_token,
            });
        }
        return NextResponse.redirect(settingsUrl);
    } catch (err) {
        console.error('[meta] oauth callback failed:', err);
        return NextResponse.redirect(new URL('/settings?meta=error', config.appUrl));
    }
}
