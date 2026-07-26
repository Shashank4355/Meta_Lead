import { withAuth, json } from '@/lib/http';
import { getAnalytics } from '@/lib/store';

export const runtime = 'nodejs';

export const GET = withAuth(async (_req, user) => {
    const analytics = await getAnalytics(user.id);
    return json(analytics);
});
