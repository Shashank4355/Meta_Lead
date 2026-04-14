'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    fetchMetaAccounts, getMetaLoginUrl, disconnectMeta,
    fetchAgentConfig, updateAgentConfig,
    fetchNotificationConfig, updateNotificationConfig,
} from '@/lib/api';

type Tab = 'meta' | 'agent' | 'notifications';

export default function SettingsPage() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<Tab>('meta');

    useEffect(() => {
        if (searchParams.get('meta') === 'connected') setActiveTab('meta');
    }, [searchParams]);

    const tabs: { key: Tab; label: string; icon: string }[] = [
        { key: 'meta', label: 'Meta Account', icon: '🔗' },
        { key: 'agent', label: 'Voice Agent', icon: '🤖' },
        { key: 'notifications', label: 'Notifications', icon: '🔔' },
    ];

    return (
        <div className="p-8 max-w-4xl">
            <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

            <div className="flex gap-2 mb-8 bg-slate-800/30 rounded-lg p-1 border border-slate-700/50">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition ${activeTab === tab.key ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-white'}`}
                    >
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'meta' && <MetaTab />}
            {activeTab === 'agent' && <AgentTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
        </div>
    );
}

// ═══════════════════════════════════════
// Meta Account Tab
// ═══════════════════════════════════════
function MetaTab() {
    const [accounts, setAccounts] = useState<Array<Record<string, unknown>>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadAccounts(); }, []);

    async function loadAccounts() {
        try {
            const data = await fetchMetaAccounts();
            setAccounts(data.accounts as Array<Record<string, unknown>>);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }

    async function handleConnect() {
        try {
            const data = await getMetaLoginUrl();
            window.location.href = data.url;
        } catch (err) { console.error(err); }
    }

    async function handleDisconnect(id: string) {
        await disconnectMeta(id);
        loadAccounts();
    }

    return (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Connected Meta Accounts</h2>

            {loading ? (
                <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {accounts.length > 0 ? (
                        <div className="space-y-3 mb-6">
                            {accounts.map((acc) => (
                                <div key={acc.id as string} className="flex items-center justify-between bg-slate-900/30 rounded-lg p-4">
                                    <div>
                                        <p className="text-white font-medium">{acc.pageName as string || acc.pageId as string}</p>
                                        <p className="text-xs text-slate-500">Connected {new Date(acc.connectedAt as string).toLocaleDateString()}</p>
                                    </div>
                                    <button onClick={() => handleDisconnect(acc.id as string)} className="px-3 py-1.5 text-xs text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition">
                                        Disconnect
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm mb-6">No Meta accounts connected yet.</p>
                    )}

                    <button onClick={handleConnect} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg transition hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25">
                        🔗 Connect Meta Account
                    </button>
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════
// Voice Agent Config Tab
// ═══════════════════════════════════════
function AgentTab() {
    const [config, setConfig] = useState<Record<string, unknown>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [questions, setQuestions] = useState<Array<{ question: string; required: boolean }>>([]);

    useEffect(() => { loadConfig(); }, []);

    async function loadConfig() {
        try {
            const data = await fetchAgentConfig();
            setConfig(data.config);
            const q = data.config.customQuestions as Array<{ question: string; required: boolean }>;
            if (Array.isArray(q)) setQuestions(q);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }

    async function handleSave() {
        setSaving(true);
        try {
            await updateAgentConfig({ ...config, customQuestions: questions });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    }

    function addQuestion() {
        setQuestions([...questions, { question: '', required: false }]);
    }

    function removeQuestion(index: number) {
        setQuestions(questions.filter((_, i) => i !== index));
    }

    function updateQuestion(index: number, field: string, value: string | boolean) {
        const updated = [...questions];
        (updated[index] as Record<string, unknown>)[field] = value;
        setQuestions(updated);
    }

    if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="space-y-6">
            {/* Agent Persona */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Agent Persona</h2>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Agent Name" value={config.agentName as string || ''} onChange={(v) => setConfig({ ...config, agentName: v })} placeholder="Priya" />
                    <FormField label="Company Name" value={config.companyName as string || ''} onChange={(v) => setConfig({ ...config, companyName: v })} placeholder="Your Company" />
                </div>
            </div>

            {/* Voice & Model */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Voice & AI Model</h2>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Voice Provider" value={config.voiceProvider as string || 'vapi'} onChange={(v) => setConfig({ ...config, voiceProvider: v })} />
                    <FormField label="Voice ID" value={config.voiceId as string || 'Elliot'} onChange={(v) => setConfig({ ...config, voiceId: v })} />
                    <FormField label="AI Model" value={config.aiModel as string || ''} onChange={(v) => setConfig({ ...config, aiModel: v })} placeholder="claude-3-5-sonnet-20241022" />
                    <FormField label="Max Call Duration (sec)" value={String(config.maxCallDuration || 600)} onChange={(v) => setConfig({ ...config, maxCallDuration: parseInt(v) || 600 })} />
                </div>
            </div>

            {/* First Message */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">First Message</h2>
                <p className="text-xs text-slate-500 mb-2">Use {"{{name}}"} for lead&apos;s name</p>
                <textarea
                    value={config.firstMessage as string || ''}
                    onChange={(e) => setConfig({ ...config, firstMessage: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition resize-none"
                    rows={2}
                    placeholder="Hi, am I speaking with {{name}}?"
                />
            </div>

            {/* Custom Questions */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Custom Questions</h2>
                    <button onClick={addQuestion} className="px-3 py-1.5 text-xs text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/10 transition">
                        + Add Question
                    </button>
                </div>
                <div className="space-y-3">
                    {questions.map((q, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <span className="text-slate-500 text-sm w-6">{i + 1}.</span>
                            <input
                                value={q.question}
                                onChange={(e) => updateQuestion(i, 'question', e.target.value)}
                                className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                placeholder="Enter your question..."
                            />
                            <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
                                <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(i, 'required', e.target.checked)} className="rounded" />
                                Required
                            </label>
                            <button onClick={() => removeQuestion(i)} className="text-red-400 hover:text-red-300 text-sm">✕</button>
                        </div>
                    ))}
                    {questions.length === 0 && (
                        <p className="text-slate-500 text-sm">No custom questions. Default questions will be used.</p>
                    )}
                </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4">
                <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg transition disabled:opacity-50 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/25">
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>
                {saved && <span className="text-emerald-400 text-sm">✓ Saved successfully</span>}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════
// Notifications Tab
// ═══════════════════════════════════════
function NotificationsTab() {
    const [config, setConfig] = useState<Record<string, unknown>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetchNotificationConfig()
            .then((data) => setConfig(data.config))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    async function handleSave() {
        setSaving(true);
        try {
            await updateNotificationConfig({
                slackWebhookUrl: config.slackWebhookUrl,
                telegramBotToken: config.telegramBotToken,
                telegramChatId: config.telegramChatId,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    }

    if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Slack</h2>
                <FormField label="Webhook URL" value={config.slackWebhookUrl as string || ''} onChange={(v) => setConfig({ ...config, slackWebhookUrl: v })} placeholder="https://hooks.slack.com/services/..." />
            </div>

            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Telegram</h2>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Bot Token" value={config.telegramBotToken as string || ''} onChange={(v) => setConfig({ ...config, telegramBotToken: v })} placeholder="123456:ABC-DEF..." />
                    <FormField label="Chat ID" value={config.telegramChatId as string || ''} onChange={(v) => setConfig({ ...config, telegramChatId: v })} placeholder="-100123456789" />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg transition disabled:opacity-50 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/25">
                    {saving ? 'Saving...' : 'Save Notifications'}
                </button>
                {saved && <span className="text-emerald-400 text-sm">✓ Saved successfully</span>}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════
// Shared Form Field Component
// ═══════════════════════════════════════
function FormField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
                placeholder={placeholder}
            />
        </div>
    );
}
