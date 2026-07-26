import { withAuth, json } from '@/lib/http';
import { listMetaAccounts } from '@/lib/store';

export const runtime = 'nodejs';

export const GET = withAuth(async (_req, user) => {
    const accounts = await listMetaAccounts(user.id);
    // Never leak stored access tokens to the client.
    const safe = accounts.map(({ accessToken: _t, ...rest }) => rest);
    return json({ accounts: safe });
});
