import { withAuth, json } from '@/lib/http';

export const runtime = 'nodejs';

export const GET = withAuth(async (_req, user) => {
    return json({ user });
});
