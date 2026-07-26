'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchLead, triggerCall } from '@/lib/api';

export default function LeadDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [lead, setLead] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(true);
    const [calling, setCalling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadLead();
    }, [params.id]);

    async function loadLead() {
        try {
            const data = await fetchLead(params.id as string);
            setLead(data.lead as Record<string, unknown>);
        } catch {
            console.error('Failed to load lead');
        } finally {
            setLoading(false);
        }
    }

    async function handleCall() {
        if (!lead) return;
        setCalling(true);
        setError(null);
        try {
            await triggerCall(lead.id as string);
            await loadLead();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start call');
        } finally {
            setCalling(false);
        }
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!lead) {
        return <div className="p-8 text-slate-400">Lead not found.</div>;
    }

    const aiSummary: Record<string, any> | null = lead.aiSummary ? (() => { try { return JSON.parse(lead.aiSummary as string); } catch { return null; } })() : null;
    const callAttempts = (lead.callAttempts || []) as Array<Record<string, unknown>>;

    return (
        <div className="p-8 max-w-5xl">
            <button onClick={() => router.back()} className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition">
                ← Back to leads
            </button>

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">{lead.name as string}</h1>
                    <p className="text-slate-400 mt-1">{lead.phone as string} {(lead.email as string) ? `• ${lead.email as string}` : ''}</p>
                </div>
                <button
                    onClick={handleCall}
                    disabled={lead.status === 'CALLING' || calling}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg transition disabled:opacity-30 shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-purple-500"
                >
                    {calling || lead.status === 'CALLING' ? '⏳ Calling…' : '📞 Call Now'}
                </button>
            </div>

            {error && (
                <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lead Info */}
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Lead Information</h2>
                    <dl className="space-y-3">
                        <InfoRow label="Status" value={lead.status as string} />
                        <InfoRow label="Score" value={lead.score != null ? `${lead.score}/100` : 'Not scored'} />
                        <InfoRow label="Project Type" value={(lead.projectType as string) || 'Not specified'} />
                        <InfoRow label="Budget" value={(lead.budget as string) || 'Not specified'} />
                        <InfoRow label="Created" value={new Date(lead.createdAt as string).toLocaleString()} />
                    </dl>
                </div>

                {/* AI Summary */}
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">AI Qualification Summary</h2>
                    {aiSummary ? (
                        <dl className="space-y-3">
                            <InfoRow label="Qualification" value={(aiSummary.qualificationStatus as string) || 'N/A'} />
                            <InfoRow label="Budget Confirmed" value={(aiSummary.confirmedBudget as string) || 'N/A'} />
                            <InfoRow label="Timeline" value={(aiSummary.timeline as string) || 'N/A'} />
                            <InfoRow label="Decision Maker" value={aiSummary.isDecisionMaker ? 'Yes' : 'No'} />
                            <InfoRow label="Location" value={(aiSummary.location as string) || 'N/A'} />
                            <InfoRow label="Requirements" value={(aiSummary.keyRequirements as string) || 'N/A'} />
                            <InfoRow label="Notes" value={(aiSummary.notes as string) || 'N/A'} />
                        </dl>
                    ) : (
                        <p className="text-slate-500 text-sm">No AI summary available yet.</p>
                    )}
                </div>

                {/* Call Recording */}
                {Boolean(lead.recordingUrl) && (
                    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">📼 Call Recording</h2>
                        <audio controls className="w-full" src={lead.recordingUrl as string}>
                            Your browser does not support the audio element.
                        </audio>
                    </div>
                )}

                {/* Transcript */}
                {Boolean(lead.transcript) && (
                    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 lg:col-span-2">
                        <h2 className="text-lg font-semibold text-white mb-4">📝 Call Transcript</h2>
                        <pre className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-900/50 rounded-lg p-4 max-h-96 overflow-y-auto font-mono leading-relaxed">
                            {lead.transcript as string}
                        </pre>
                    </div>
                )}

                {/* Call Attempts */}
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 lg:col-span-2">
                    <h2 className="text-lg font-semibold text-white mb-4">📞 Call History</h2>
                    {callAttempts.length > 0 ? (
                        <div className="space-y-3">
                            {callAttempts.map((attempt, i) => (
                                <div key={attempt.id as string} className="flex items-center justify-between bg-slate-900/30 rounded-lg p-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-500 text-sm">#{callAttempts.length - i}</span>
                                        <span className="text-sm text-slate-300">{attempt.status as string}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        {Boolean(attempt.duration) && <span>{attempt.duration as number}s</span>}
                                        <span>{new Date(attempt.startedAt as string).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm">No call attempts yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between">
            <dt className="text-sm text-slate-400">{label}</dt>
            <dd className="text-sm text-white font-medium">{value}</dd>
        </div>
    );
}
