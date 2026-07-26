import { NextRequest } from 'next/server';
import { withAuth, json } from '@/lib/http';
import { getNotificationConfig, updateNotificationConfig } from '@/lib/store';
import type { NotificationConfig } from '@/lib/types';

export const runtime = 'nodejs';

export const GET = withAuth(async (_req, user) => {
    const config = await getNotificationConfig(user.id);
    return json({ config });
});

export const PUT = withAuth(async (req: NextRequest, user) => {
    const body = (await req.json().catch(() => ({}))) as Partial<NotificationConfig>;
    const norm = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

    const config = await updateNotificationConfig(user.id, {
        slackWebhookUrl: norm(body.slackWebhookUrl),
        telegramBotToken: norm(body.telegramBotToken),
        telegramChatId: norm(body.telegramChatId),
    });
    return json({ config });
});
