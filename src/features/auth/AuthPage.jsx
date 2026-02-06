import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, X, Chrome, Github, Loader2, User } from 'lucide-react';
import Button from '../../components/ui/Button';
import styles from './AuthPage.module.css';
import { useAuth } from '../../context/AuthContext';
import { courseService } from '../../services/courseService';
import { surveyService } from '../../services/surveyService';
import { supabase } from '../../lib/supabaseClient';
import ConfirmationModal from './ConfirmationModal';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const { user, signIn, signUp, signInWithOAuth } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        const checkPendingAction = async () => {
            if (user) {
                const pendingEnrollment = localStorage.getItem('pending_enrollment');
                if (pendingEnrollment) {
                    try {
                        const { courseId, selections } = JSON.parse(pendingEnrollment);

                        // If we have survey selections, use surveyService which saves both survey and enrollment
                        if (selections) {
                            await surveyService.saveSurveyResponse(courseId, selections);
                        } else {
                            // Fallback to just enrollment if no survey data
                            await courseService.enrollUserInCourse(user.id, courseId);
                        }

                        localStorage.removeItem('pending_enrollment');
                        navigate(`/learn/${courseId}`);
                        return;
                    } catch (err) {
                        console.error('Error in post-auth enrollment:', err);
                    }
                }
                navigate('/');
            }
        };
        checkPendingAction();
    }, [user, navigate]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isLogin) {
                const { error: signInError } = await signIn({ email, password });
                if (signInError) throw signInError;
            } else {
                const { data, error: signUpError } = await signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name,
                            display_name: name
                        }
                    }
                });
                if (signUpError) throw signUpError;

                if (!data?.user || data?.session === null) {
                    setShowConfirmModal(true);
                }
            }
        } catch (err) {
            console.error('Auth error:', err);
            setError(err.message || 'একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।');
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider) => {
        try {
            const { error } = await signInWithOAuth({ provider });
            if (error) throw error;
        } catch (err) {
            console.error(`${provider} login error:`, err);
            setError(`${provider} দিয়ে লগইন করতে সমস্যা হয়েছে।`);
        }
    };

    return (
        <div className={styles.authWrapper}>
            <div className={styles.backgroundGlow}></div>

            <div className={styles.authCard}>
                <button className={styles.closeBtn} onClick={() => navigate('/')} aria-label="Close">
                    <X size={24} />
                </button>
                <div className={styles.cardHeader}>
                    <div className={styles.logo}>
                        <div className={styles.logoIcon}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                        </div>
                        <span className={styles.logoText}>প্ল্যাটফর্ম</span>
                    </div>
                    <h1>{isLogin ? 'স্বাগতম!' : 'অ্যাকাউন্ট তৈরি করুন'}</h1>
                    <p>{isLogin ? 'চালিয়ে যেতে আপনার অ্যাকাউন্টে লগইন করুন।' : 'নতুন অ্যাকাউন্ট তৈরি করে শেখা শুরু করুন।'}</p>
                </div>

                {error && <div className={styles.errorMessage}>{error}</div>}

                <form className={styles.authForm} onSubmit={handleSubmit}>

                    {!isLogin && (
                        <div className={styles.inputGroup}>
                            <label htmlFor="name">আপনার নাম</label>
                            <div className={styles.inputWrapper}>
                                <User className={styles.inputIcon} size={18} />
                                <input
                                    type="text"
                                    id="name"
                                    placeholder="আপনার পুরো নাম লিখুন"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required={!isLogin}
                                />
                            </div>
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label htmlFor="email">ইমেইল</label>
                        <div className={styles.inputWrapper}>
                            <Mail className={styles.inputIcon} size={18} />
                            <input
                                type="email"
                                id="email"
                                placeholder="example@mail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <div className={styles.labelRow}>
                            <label htmlFor="password">পাসওয়ার্ড</label>
                            {isLogin && <a href="#" className={styles.forgotPass}>পাসওয়ার্ড ভুলে গেছেন?</a>}
                        </div>
                        <div className={styles.inputWrapper}>
                            <Lock className={styles.inputIcon} size={18} />
                            <input
                                type="password"
                                id="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <Button
                        variant="primary"
                        className={styles.submitBtn}
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className={styles.spinner} size={20} /> : (isLogin ? 'লগইন করুন' : 'সাইন আপ করুন')}
                    </Button>
                </form>

                <div className={styles.divider}>
                    <span>অথবা</span>
                </div>

                <div className={styles.socialAuth}>
                    <button className={styles.socialBtn} onClick={() => handleSocialLogin('google')}>
                        <Chrome size={20} />
                        <span>গুগল</span>
                    </button>
                    <button className={styles.socialBtn} onClick={() => handleSocialLogin('github')}>
                        <Github size={20} />
                        <span>গিটহাব</span>
                    </button>
                </div>

                <div className={styles.cardFooter}>
                    <p>
                        {isLogin ? 'নতুন কোনো অ্যাকাউন্ট নেই?' : 'আগেই অ্যাকাউন্ট আছে?'}
                        <button
                            className={styles.toggleBtn}
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                        >
                            {isLogin ? 'নিবন্ধন করুন' : 'লগইন করুন'}
                        </button>
                    </p>
                </div>
            </div>

            <ConfirmationModal
                email={email}
                isVisible={showConfirmModal}
                onClose={() => {
                    setShowConfirmModal(false);
                    setIsLogin(true);
                }}
            />
        </div>
    );
};

export default AuthPage;
