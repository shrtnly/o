import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Loader2, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import styles from './AuthPage.module.css';
import logo from '../../assets/shields/Logo_BeeLesson.png';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();
    const checkStarted = useRef(false);

    useEffect(() => {
        if (checkStarted.current) return;
        checkStarted.current = true;

        let isMounted = true;
        let authSubscription = null;

        const checkSession = async () => {
            try {
                // Support both PKCE (?code=) and Implicit (#access_token=) recovery flows
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');
                const hasHashToken = window.location.hash.includes('access_token=');

                if (code) {
                    // Explicitly exchange the code for a session
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) {
                        console.error('Password reset code exchange error:', exchangeError);
                        if (isMounted) {
                            setError('অবৈধ বা মেয়াদোত্তীর্ণ লিঙ্ক। অনুগ্রহ করে আবার চেষ্টা করুন।');
                            setTimeout(() => navigate('/auth'), 3000);
                        }
                        return;
                    }
                    // Clean URL query parameters
                    window.history.replaceState({}, document.title, window.location.pathname);
                }

                // Check session immediately
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    return; // Session is ready!
                }

                // If no session, but we have a hash token, wait for Supabase to parse it
                if (hasHashToken) {
                    // Start a safety timer for 2.5 seconds
                    const safetyTimeout = setTimeout(() => {
                        if (isMounted) {
                            setError('অবৈধ বা মেয়াদোত্তীর্ণ লিঙ্ক। অনুগ্রহ করে আবার চেষ্টা করুন।');
                            setTimeout(() => navigate('/auth'), 3000);
                        }
                    }, 2500);

                    // Listen for the session to be populated from hash
                    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                        if (session && isMounted) {
                            clearTimeout(safetyTimeout);
                            if (subscription) subscription.unsubscribe();
                        }
                    });
                    authSubscription = subscription;
                } else {
                    // No code and no hash token - definitely invalid/expired
                    if (isMounted) {
                        setError('অবৈধ বা মেয়াদোত্তীর্ণ লিঙ্ক। অনুগ্রহ করে আবার চেষ্টা করুন।');
                        setTimeout(() => navigate('/auth'), 3000);
                    }
                }
            } catch (err) {
                console.error('Check session error:', err);
                if (isMounted) {
                    setError('অবৈধ বা মেয়াদোত্তীর্ণ লিঙ্ক। অনুগ্রহ করে আবার চেষ্টা করুন।');
                    setTimeout(() => navigate('/auth'), 3000);
                }
            }
        };

        checkSession();

        return () => {
            isMounted = false;
            if (authSubscription) {
                authSubscription.unsubscribe();
            }
        };
    }, [navigate]);

    const handleReset = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            setError('পাসওয়ার্ড অন্তত 6 অক্ষরের হতে হবে।');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            setSuccess(true);
            // Sign out the user asynchronously to prevent any auth client lock contention
            setTimeout(async () => {
                try {
                    await supabase.auth.signOut();
                } catch (err) {
                    console.error('Signout error:', err);
                }
            }, 100);
            setTimeout(() => navigate('/auth'), 3000);
        } catch (err) {
            console.error('Password reset error:', err);
            let userFriendlyError = 'পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।';
            if (err.message) {
                if (err.message.toLowerCase().includes('different from the old') || err.message.toLowerCase().includes('different from old')) {
                    userFriendlyError = 'নতুন পাসওয়ার্ডটি অবশ্যই পূর্বের পাসওয়ার্ড থেকে ভিন্ন হতে হবে।';
                } else {
                    userFriendlyError = err.message;
                }
            }
            setError(userFriendlyError);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className={styles.authWrapper}>
                <div className={styles.authContainer} style={{ textAlign: 'center' }}>
                    <div className={styles.logoWrapper}>
                        <img src={logo} alt="BeeLesson" className={styles.authLogo} />
                    </div>
                    <div className={styles.successIcon} style={{ color: 'var(--color-primary)', marginBottom: '16px' }}>
                        <CheckCircle2 size={64} style={{ margin: '0 auto' }} />
                    </div>
                    <h2 style={{ marginBottom: '12px' }}>পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!</h2>
                    <p style={{ color: 'var(--color-text-muted)' }}>আপনাকে লগইন পেজে নিয়ে যাওয়া হচ্ছে...</p>
                </div>
            </div>
        );
    }

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
                                type={showPassword ? "text" : "password"}
                                id="password"
                                placeholder="আপনার নতুন পাসওয়ার্ড"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className={styles.input}
                            />
                            <button
                                type="button"
                                className={styles.eyeBtn}
                                onClick={() => setShowPassword(!showPassword)}
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
                        {loading ? <Loader2 className={styles.spinner} size={20} /> : 'পাসওয়ার্ড পরিবর্তন করুন'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
