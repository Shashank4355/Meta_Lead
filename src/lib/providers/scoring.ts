import { config, hasAnthropic } from '../config';
import type { AiSummary, LeadStatus, AgentConfig } from '../types';

export interface ScoringResult {
    score: number; // 0–100
    status: LeadStatus;
    summary: AiSummary;
}

function statusFromScore(score: number): LeadStatus {
    if (score >= 75) return 'QUALIFIED';
    if (score >= 45) return 'FOLLOW_UP';
    return 'DISQUALIFIED';
}

/**
 * Score a lead from its call transcript.
 * Real mode: Anthropic. Mock mode: a deterministic keyword heuristic that
 * produces a believable score + structured summary so the pipeline is demoable.
 */
export async function scoreTranscript(
    transcript: string,
    lead: { name: string; phone: string; projectType?: string | null },
    _agent: AgentConfig
): Promise<ScoringResult> {
    if (hasAnthropic()) {
        try {
            return await scoreWithAnthropic(transcript, lead);
        } catch (err) {
            console.error('[scoring] Anthropic failed, falling back to heuristic:', err);
        }
    }
    return mockScore(transcript, lead);
}

// ─── Anthropic (real) ───

async function scoreWithAnthropic(
    transcript: string,
    lead: { name: string; phone: string; projectType?: string | null }
): Promise<ScoringResult> {
    const system =
        'You are a real-estate lead qualification analyst. Read the sales call transcript ' +
        'and return ONLY a JSON object (no prose, no markdown) with keys: ' +
        'score (integer 0-100 for buying intent/fit), qualificationStatus (string), ' +
        'confirmedBudget (string), timeline (string), isDecisionMaker (boolean), ' +
        'location (string), keyRequirements (string), notes (string).';

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': config.anthropic.apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: config.anthropic.model,
            max_tokens: 1024,
            system,
            messages: [
                {
                    role: 'user',
                    content: `Lead: ${lead.name} (${lead.phone})\nProject interest: ${
                        lead.projectType ?? 'unknown'
                    }\n\nTranscript:\n${transcript}`,
                },
            ],
        }),
    });

    if (!res.ok) {
        throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? '{}';
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
    const summary: AiSummary = {
        qualificationStatus: String(parsed.qualificationStatus ?? ''),
        confirmedBudget: String(parsed.confirmedBudget ?? ''),
        timeline: String(parsed.timeline ?? ''),
        isDecisionMaker: Boolean(parsed.isDecisionMaker),
        location: String(parsed.location ?? ''),
        keyRequirements: String(parsed.keyRequirements ?? ''),
        notes: String(parsed.notes ?? ''),
    };
    return { score, status: statusFromScore(score), summary };
}

// ─── Heuristic (mock) ───

function mockScore(
    transcript: string,
    lead: { projectType?: string | null }
): ScoringResult {
    const t = transcript.toLowerCase();
    let score = 40;

    const budgetMatch = t.match(/(\d+(?:\.\d+)?)\s*(cr|crore|lakh|lac|k|million)/);
    const positives = ['yes', 'interested', 'budget', 'ready', 'buy', 'this month', 'financing', 'decision'];
    const negatives = ['not interested', 'no budget', 'just browsing', 'later', 'call back', 'busy', 'wrong number'];

    positives.forEach((w) => { if (t.includes(w)) score += 8; });
    negatives.forEach((w) => { if (t.includes(w)) score -= 12; });
    if (budgetMatch) score += 12;
    if (t.includes('decision maker') || /\bi (decide|am the)\b/.test(t)) score += 6;

    score = Math.max(0, Math.min(100, score));
    const status = statusFromScore(score);

    const summary: AiSummary = {
        qualificationStatus:
            status === 'QUALIFIED' ? 'Qualified' : status === 'FOLLOW_UP' ? 'Needs follow-up' : 'Disqualified',
        confirmedBudget: budgetMatch ? budgetMatch[0] : 'Not confirmed',
        timeline: t.includes('month') ? 'Within a few months' : 'Not specified',
        isDecisionMaker: t.includes('decision') || /\bi decide\b/.test(t),
        location: 'Not specified',
        keyRequirements: lead.projectType ? `Interested in ${lead.projectType}` : 'Not specified',
        notes: '(Mock scoring — add ANTHROPIC_API_KEY for real AI qualification.)',
    };
    return { score, status, summary };
}
