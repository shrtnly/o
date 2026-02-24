import React, { useState, useEffect } from 'react';
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

    useEffect(() => {
        // Double check session to ensure user came from a valid link
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('অবৈধ বা মেয়াদোত্তীর্ণ লিঙ্ক। অনুগ্রহ করে আবার চেষ্টা করুন।');
                setTimeout(() => navigate('/auth'), 3000);
            }
        };
        checkSession();
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
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            setSuccess(true);
            setTimeout(() => navigate('/auth'), 3000);
        } catch (err) {
            console.error('Password reset error:', err);
            setError('পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
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
