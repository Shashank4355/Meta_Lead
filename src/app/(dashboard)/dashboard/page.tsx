'use client';

import { useEffect, useState } from 'react';
import { fetchAnalytics, fetchLeads, triggerCall } from '@/lib/api';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
    NEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    CALLING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    QUALIFIED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    FOLLOW_UP: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    DISQUALIFIED: 'bg-red-500/10 text-red-400 border-red-500/20',
    NO_ANSWER: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function DashboardPage() {
    const [analytics, setAnalytics] = useState<Record<string, number>>({});
    const [leads, setLeads] = useState<Array<Record<string, unknown>>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [analyticsData, leadsData] = await Promise.all([
                fetchAnalytics(),
                fetchLeads('limit=50'),
            ]);
            setAnalytics(analyticsData);
            setLeads(leadsData.leads as Array<Record<string, unknown>>);
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleCallNow(leadId: string) {
        try {
            await triggerCall(leadId);
            loadData();
        } catch (err) {
            console.error('Failed to trigger call:', err);
        }
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-white mb-8">Dashboard</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Leads" value={analytics.totalLeads || 0} icon="👥" />
                <StatCard label="Qualified" value={analytics.qualifiedLeads || 0} icon="✅" color="text-emerald-400" />
                <StatCard label="Qualification Rate" value={`${analytics.qualificationRate || 0}%`} icon="📈" color="text-indigo-400" />
                <StatCard label="Avg Score" value={analytics.averageScore || 0} icon="⭐" color="text-yellow-400" />
            </div>

            {/* Leads Table */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700/50">
                    <h2 className="text-lg font-semibold text-white">Recent Leads</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-700/30">
                                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Name</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Phone</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Project</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Score</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Date</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/20">
                            {leads.map((lead) => (
                                <tr key={lead.id as string} className="hover:bg-slate-800/20 transition">
                                    <td className="px-6 py-4">
                                        <Link href={`/dashboard/leads/${lead.id}`} className="text-white hover:text-indigo-400 font-medium transition">
                                            {lead.name as string}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 text-sm">{lead.phone as string}</td>
                                    <td className="px-6 py-4 text-slate-400 text-sm">{(lead.projectType as string) || '—'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[lead.status as string] || STATUS_COLORS.NEW}`}>
                                            {lead.status as string}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 text-sm">{(lead.score as number) ?? '—'}</td>
                                    <td className="px-6 py-4 text-slate-500 text-sm">
                                        {new Date(lead.createdAt as string).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleCallNow(lead.id as string)}
                                            disabled={lead.status === 'CALLING'}
                                            className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-medium hover:bg-indigo-500/20 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            📞 Call Now
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {leads.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        No leads yet. Connect your Meta account and run an ad to start receiving leads.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color = 'text-white' }: { label: string; value: string | number; icon: string; color?: string }) {
    return (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{icon}</span>
            </div>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-slate-400 mt-1">{label}</p>
        </div>
    );
}
