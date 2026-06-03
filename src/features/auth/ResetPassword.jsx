import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Loader2, Eye, EyeOff, CheckCircle2, ShieldAlert } from 'lucide-react';
import styles from './AuthPage.module.css';
import logo from '../../assets/shields/Logo_BeeLesson.png';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    // sessionReady: null = still checking, true = valid session ready, false = invalid/expired
    const [sessionReady, setSessionReady] = useState(null);
    const navigate = useNavigate();
    const initStarted = useRef(false);

    useEffect(() => {
        if (initStarted.current) return;
        initStarted.current = true;

        let isMounted = true;

        const initRecovery = async () => {
            try {
                // Check for explicit error parameters in the URL first
                // (e.g. Supabase sends ?error=access_denied&error_description=... for expired links)
                const params = new URLSearchParams(window.location.search);
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const errorDescription =
                    hashParams.get('error_description') || params.get('error_description');

                if (errorDescription) {
                    if (isMounted) {
                        setError('লিঙ্কটি ইতিমধ্যে ব্যবহার করা হয়েছে বা এর মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে আবার পাসওয়ার্ড রিসেট করার অনুরোধ পাঠান।');
                        setSessionReady(false);
                        setTimeout(() => navigate('/auth'), 4000);
                    }
                    return;
                }

                // IMPORTANT: Because detectSessionInUrl: true is set in supabaseClient.js,
                // Supabase automatically exchanges the ?code= PKCE token when the client
                // initialises. We must NOT call exchangeCodeForSession() ourselves —
                // doing so would attempt to use an already-consumed code and fail.
                //
                // Strategy:
                //   1. getSession() — if the exchange already completed, we get the session.
                //   2. If not yet ready, listen for PASSWORD_RECOVERY via onAuthStateChange.
                //   3. Safety timeout after 6 s to catch truly invalid links.

                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    // Clean the URL so a page-refresh doesn't cause issues
                    if (params.get('code')) {
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                    if (isMounted) setSessionReady(true);
                    return;
                }

                // Session not ready yet — wait for the event
                const safetyTimeout = setTimeout(() => {
                    if (isMounted) {
                        setError('অবৈধ বা মেয়াদোত্তীর্ণ লিঙ্ক। অনুগ্রহ করে আবার পাসওয়ার্ড রিসেট করার অনুরোধ পাঠান।');
                        setSessionReady(false);
                        setTimeout(() => navigate('/auth'), 4000);
                    }
                }, 6000);

                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
                        clearTimeout(safetyTimeout);
                        subscription.unsubscribe();
                        // Clean the URL
                        window.history.replaceState({}, document.title, window.location.pathname);
                        if (isMounted) setSessionReady(true);
                    }
                });

                // If there is no ?code= and no hash token at all, the URL is simply invalid
                const hasCode = Boolean(params.get('code'));
                const hasHashToken = window.location.hash.includes('access_token=');
                if (!hasCode && !hasHashToken) {
                    clearTimeout(safetyTimeout);
                    subscription.unsubscribe();
                    if (isMounted) {
                        setError('অবৈধ বা মেয়াদোত্তীর্ণ লিঙ্ক। অনুগ্রহ করে আবার পাসওয়ার্ড রিসেট করার অনুরোধ পাঠান।');
                        setSessionReady(false);
                        setTimeout(() => navigate('/auth'), 4000);
                    }
                }
            } catch (err) {
                console.error('Recovery init error:', err);
                if (isMounted) {
                    setError('একটি সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
                    setSessionReady(false);
                    setTimeout(() => navigate('/auth'), 4000);
                }
            }
        };

        initRecovery();

        return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

    const handleReset = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            setError('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;

            setSuccess(true);
            // Sign out cleanly so they land on a fresh login page
            setTimeout(async () => {
                try { await supabase.auth.signOut(); } catch (_) { /* ignore */ }
            }, 300);
            setTimeout(() => navigate('/auth'), 3000);
        } catch (err) {
            console.error('Password update error:', err);
            const lower = (err.message || '').toLowerCase();
            let msg = 'পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।';
            if (lower.includes('different from the old') || lower.includes('different from old')) {
                msg = 'নতুন পাসওয়ার্ডটি অবশ্যই পূর্বের পাসওয়ার্ড থেকে ভিন্ন হতে হবে।';
            } else if (lower.includes('session') || lower.includes('not authenticated') || lower.includes('jwt')) {
                msg = 'সেশন মেয়াদোত্তীর্ণ। অনুগ্রহ করে রিসেট লিঙ্কটি আবার ব্যবহার করুন।';
            } else if (err.message) {
                msg = err.message;
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // ── Success screen ────────────────────────────────────────────────────────
    if (success) {
        return (
            <div className={styles.authWrapper}>
                <div className={styles.authContainer} style={{ textAlign: 'center' }}>
                    <div className={styles.logoWrapper}>
                        <img src={logo} alt="BeeLesson" className={styles.authLogo} />
                    </div>
                    <div style={{ color: 'var(--color-primary)', marginBottom: '16px' }}>
                        <CheckCircle2 size={64} style={{ margin: '0 auto' }} />
                    </div>
                    <h2 style={{ marginBottom: '12px' }}>পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!</h2>
                    <p style={{ color: 'var(--color-text-muted)' }}>আপনাকে লগইন পেজে নিয়ে যাওয়া হচ্ছে...</p>
                </div>
            </div>
        );
    }

    // ── Invalid / expired link screen ─────────────────────────────────────────
    if (sessionReady === false) {
        return (
            <div className={styles.authWrapper}>
                <div className={styles.authContainer} style={{ textAlign: 'center' }}>
                    <div className={styles.logoWrapper}>
                        <img src={logo} alt="BeeLesson" className={styles.authLogo} />
                    </div>
                    <div style={{ color: 'var(--color-error, #ef4444)', marginBottom: '16px' }}>
                        <ShieldAlert size={64} style={{ margin: '0 auto' }} />
                    </div>
                    <h2 style={{ marginBottom: '12px' }}>লিঙ্কটি অবৈধ বা মেয়াদোত্তীর্ণ</h2>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        {error || 'অনুগ্রহ করে আবার পাসওয়ার্ড রিসেট করার অনুরোধ পাঠান।'}
                    </p>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '8px' }}>
                        আপনাকে লগইন পেজে নিয়ে যাওয়া হচ্ছে...
                    </p>
                </div>
            </div>
        );
    }

    // ── Session still loading screen ──────────────────────────────────────────
    if (sessionReady === null) {
        return (
            <div className={styles.authWrapper}>
                <div className={styles.authContainer} style={{ textAlign: 'center' }}>
                    <div className={styles.logoWrapper}>
                        <img src={logo} alt="BeeLesson" className={styles.authLogo} />
                    </div>
                    <Loader2
                        size={40}
                        className={styles.spinner}
                        style={{ margin: '24px auto', display: 'block', color: 'var(--color-primary)' }}
                    />
                    <p style={{ color: 'var(--color-text-muted)' }}>লিঙ্ক যাচাই করা হচ্ছে...</p>
                </div>
            </div>
        );
    }

    // ── Password entry form (sessionReady === true) ───────────────────────────
    return (
        <div className={styles.authWrapper}>
            <div className={styles.authContainer}>
                <div className={styles.logoWrapper}>
                    <img src={logo} alt="BeeLesson" className={styles.authLogo} />
                </div>
                <div className={styles.header}>
                    <h1>নতুন পাসওয়ার্ড <span className={styles.highlight}>সেট</span> করুন</h1>
                </div>

                {error && <div className={styles.errorMessage}>{error}</div>}

                <form className={styles.form} onSubmit={handleReset}>
                    <div className={styles.field}>
                        <div className={styles.passwordWrapper}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="new-password"
                                placeholder="আপনার নতুন পাসওয়ার্ড"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoFocus
                                className={styles.input}
                            />
                            <button
                                type="button"
                                className={styles.eyeBtn}
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label="Toggle password visibility"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={styles.submitBtn}
                    >
                        {loading
                            ? <Loader2 className={styles.spinner} size={20} />
                            : 'পাসওয়ার্ড পরিবর্তন করুন'
                        }
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
