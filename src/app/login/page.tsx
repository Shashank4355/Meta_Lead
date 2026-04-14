'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const supabase = createClient();

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setError('Check your email for a confirmation link!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                router.push('/dashboard');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-4">
            
            <Link href="/" className="flex items-center gap-2 mb-12">
                <div
                    className="w-8 h-8 flex items-center justify-center border-grid"
                    style={{ backgroundColor: "var(--accent)" }}
                >
                    <span
                        className="text-white text-sm font-medium"
                        style={{ fontFamily: "var(--font-mono)" }}
                    >
                    V
                    </span>
                </div>
                <span
                    className="text-lg tracking-tight font-medium uppercase"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--fg-h1)" }}
                >
                    VECTOR LEAD
                </span>
            </Link>

            <div className="w-full max-w-md">
                
                <div className="border-grid bg-[var(--bg)] shadow-none">
                    <div className="border-grid-b p-6 bg-[var(--bg-alt)]">
                        <h2 className="text-2xl font-bold tracking-tight text-[var(--fg-h1)]" style={{ fontFamily: "var(--font-display)" }}>
                            {isSignUp ? 'Create Account' : 'System Login'}
                        </h2>
                        <p className="text-sm mt-2 text-[var(--fg-muted)]" style={{ fontFamily: "var(--font-body)" }}>
                            AI-powered lead qualification system
                        </p>
                    </div>

                    <div className="p-8">
                        {error && (
                            <div className={`p-4 border-grid mb-6 text-sm font-medium ${error.includes('Check your email') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`} style={{ fontFamily: "var(--font-mono)" }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-xs font-medium uppercase tracking-wider text-[var(--fg-muted)] mb-2" style={{ fontFamily: "var(--font-mono)" }}>Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-[var(--bg)] border border-grid text-[var(--fg)] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-none rounded-none"
                                    placeholder="you@company.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium uppercase tracking-wider text-[var(--fg-muted)] mb-2" style={{ fontFamily: "var(--font-mono)" }}>Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-[var(--bg)] border border-grid text-[var(--fg)] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-none rounded-none"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full justify-center mt-2"
                            >
                                {loading ? 'PROCESSING...' : isSignUp ? 'CREATE ACCOUNT' : 'AUTHENTICATE'}
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-grid-t text-center">
                            <button
                                onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                                className="text-sm border-b border-[var(--fg-muted)] hover:border-[var(--fg)] hover:text-[var(--fg)] text-[var(--fg-muted)] transition-colors pb-0.5"
                                style={{ fontFamily: "var(--font-body)" }}
                            >
                                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
