import { getNotificationConfig } from '../store';
import type { Lead } from '../types';

/**
 * Notify the user that a lead was qualified, via whichever channels they
 * configured (Slack webhook / Telegram bot). No-ops silently when unset.
 * Best-effort: failures are logged, never thrown into the call pipeline.
 */
export async function notifyQualified(lead: Lead): Promise<void> {
    const cfg = await getNotificationConfig(lead.userId);
    const text =
        `🎯 New qualified lead: *${lead.name}* (${lead.phone})\n` +
        `Score: ${lead.score}/100 • ${lead.projectType ?? 'N/A'} • ${lead.budget ?? 'N/A'}`;

    const jobs: Promise<unknown>[] = [];

    if (cfg.slackWebhookUrl) {
        jobs.push(
            fetch(cfg.slackWebhookUrl, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ text }),
            }).catch((e) => console.error('[notify] slack failed:', e))
        );
    }

    if (cfg.telegramBotToken && cfg.telegramChatId) {
        jobs.push(
            fetch(`https://api.telegram.org/bot${cfg.telegramBotToken}/sendMessage`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    chat_id: cfg.telegramChatId,
                    text: text.replace(/\*/g, ''),
                }),
            }).catch((e) => console.error('[notify] telegram failed:', e))
        );
    }

    await Promise.allSettled(jobs);
}
