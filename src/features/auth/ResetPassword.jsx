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
    // sessionReady: null = checking, true = ready, false = invalid link
    const [sessionReady, setSessionReady] = useState(null);
    const navigate = useNavigate();
    const checkStarted = useRef(false);

    useEffect(() => {
        if (checkStarted.current) return;
        checkStarted.current = true;

        let isMounted = true;

        const initRecovery = async () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const errorDescription =
                    hashParams.get('error_description') || params.get('error_description');

                // Handle explicit error params in the URL (e.g., expired/used link)
                if (errorDescription) {
                    console.error('Password reset URL error:', errorDescription);
                    if (isMounted) {
                        setError(
                            'লিঙ্কটি ইতিমধ্যে ব্যবহার করা হয়েছে বা এর মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে আবার পাসওয়ার্ড রিসেট করার অনুরোধ পাঠান।'
                        );
                        setSessionReady(false);
                        setTimeout(() => navigate('/auth'), 4000);
                    }
                    return;
                }

                if (code) {
                    // PKCE flow: exchange the one-time code for a session
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) {
                        console.error('Code exchange error:', exchangeError);
                        if (isMounted) {
                            setError('অবৈধ বা মেয়াদোত্তীর্ণ লিঙ্ক। অনুগ্রহ করে আবার চেষ্টা করুন।');
                            setSessionReady(false);
                            setTimeout(() => navigate('/auth'), 3500);
                        }
                        return;
                    }
                    // Clean the code from the URL so a refresh doesn't re-exchange
                    window.history.replaceState({}, document.title, window.location.pathname);
                }

                // After exchangeCodeForSession (or if this is an implicit-flow hash token),
                // Supabase will fire a PASSWORD_RECOVERY event via onAuthStateChange.
                // We wait for that event (or an existing valid session) instead of proceeding
                // immediately — this guarantees updateUser() will succeed.

                // Check if a recovery session is already active (e.g., page refresh after exchange)
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    if (isMounted) setSessionReady(true);
                    return;
                }

                // No session yet — wait for the PASSWORD_RECOVERY event.
                // This covers both PKCE (exchangeCodeForSession fires it) and
                // legacy implicit flow (hash token parsed by Supabase automatically).
                const safetyTimeout = setTimeout(() => {
                    if (isMounted && sessionReady === null) {
                        setError('অবৈধ বা মেয়াদোত্তীর্ণ লিঙ্ক। অনুগ্রহ করে আবার চেষ্টা করুন।');
                        setSessionReady(false);
                        setTimeout(() => navigate('/auth'), 3500);
                    }
                }, 4000);

                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
                        clearTimeout(safetyTimeout);
                        subscription.unsubscribe();
                        if (isMounted) setSessionReady(true);
                    }
                });

                // If there's no code and no hash token, the link is simply invalid
                const hasHashToken = window.location.hash.includes('access_token=');
                if (!code && !hasHashToken) {
                    clearTimeout(safetyTimeout);
                    subscription.unsubscribe();
                    if (isMounted) {
                        setError('অবৈধ বা মেয়াদোত্তীর্ণ লিঙ্ক। অনুগ্রহ করে আবার চেষ্টা করুন।');
                        setSessionReady(false);
                        setTimeout(() => navigate('/auth'), 3500);
                    }
                }
            } catch (err) {
                console.error('Recovery init error:', err);
                if (isMounted) {
                    setError('অবৈধ বা মেয়াদোত্তীর্ণ লিঙ্ক। অনুগ্রহ করে আবার চেষ্টা করুন।');
                    setSessionReady(false);
                    setTimeout(() => navigate('/auth'), 3500);
                }
            }
        };

        initRecovery();

        return () => {
            isMounted = false;
        };
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
            // Sign out so they are taken back to a clean login state
            setTimeout(async () => {
                try { await supabase.auth.signOut(); } catch (_) { /* ignore */ }
            }, 200);
            setTimeout(() => navigate('/auth'), 3000);
        } catch (err) {
            console.error('Password update error:', err);
            let msg = 'পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।';
            const lower = (err.message || '').toLowerCase();
            if (lower.includes('different from the old') || lower.includes('different from old')) {
                msg = 'নতুন পাসওয়ার্ডটি অবশ্যই পূর্বের পাসওয়ার্ড থেকে ভিন্ন হতে হবে।';
            } else if (lower.includes('session') || lower.includes('not authenticated') || lower.includes('auth')) {
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
                    <p style={{ color: 'var(--color-text-muted)' }}>{error || 'অনুগ্রহ করে আবার পাসওয়ার্ড রিসেট করার অনুরোধ পাঠান।'}</p>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '8px' }}>আপনাকে লগইন পেজে নিয়ে যাওয়া হচ্ছে...</p>
                </div>
            </div>
        );
    }

    // ── Checking / loading session screen ─────────────────────────────────────
    if (sessionReady === null) {
        return (
            <div className={styles.authWrapper}>
                <div className={styles.authContainer} style={{ textAlign: 'center' }}>
                    <div className={styles.logoWrapper}>
                        <img src={logo} alt="BeeLesson" className={styles.authLogo} />
                    </div>
                    <Loader2
                        size={40}
                        style={{ margin: '24px auto', display: 'block', animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }}
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
