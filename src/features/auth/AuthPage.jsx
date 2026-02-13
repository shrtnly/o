import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, X, Chrome, Phone, Loader2, User, Eye, EyeOff } from 'lucide-react';
import Button from '../../components/ui/Button';
import logo from '../../assets/shields/Logo_BeeLesson.png';
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
    const [showPassword, setShowPassword] = useState(false);
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
            <button className={styles.closeBtn} onClick={() => navigate('/')} aria-label="Close">
                <X size={24} />
            </button>

            <div className={styles.authContainer}>
                <div className={styles.logoWrapper}>
                    <img src={logo} alt="BeeLesson" className={styles.authLogo} />
                </div>
                <div className={styles.header}>
                    <h1>
                        {isLogin ? (
                            <>
                                <span className={styles.highlight}>লগইন</span> করুন
                            </>
                        ) : (
                            <>
                                <span className={styles.highlight}>সাইন আপ</span> করুন
                            </>
                        )}
                    </h1>
                    <p>{isLogin ? 'আপনার শেখার যাত্রা চালিয়ে যেতে' : 'নতুন অ্যাকাউন্ট তৈরি করুন'}</p>
                </div>

                {error && <div className={styles.errorMessage}>{error}</div>}

                <form className={styles.form} onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className={styles.field}>
                            <input
                                type="text"
                                id="name"
                                placeholder="আপনার নাম"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required={!isLogin}
                                className={styles.input}
                            />
                        </div>
                    )}

                    <div className={styles.field}>
                        <input
                            type="email"
                            id="email"
                            placeholder="ইমেইল"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.field}>
                        <div className={styles.passwordWrapper}>
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                placeholder="পাসওয়ার্ড"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
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
                        {isLogin && (
                            <a href="#" className={styles.forgotLink}>পাসওয়ার্ড ভুলে গেছেন?</a>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={styles.submitBtn}
                    >
                        {loading ? <Loader2 className={styles.spinner} size={20} /> : (isLogin ? 'লগইন' : 'সাইন আপ')}
                    </button>
                </form>

                <div className={styles.divider}>
                    <span>অথবা</span>
                </div>

                <div className={styles.socialButtons}>
                    <button className={styles.socialBtn} onClick={() => handleSocialLogin('google')}>
                        <Chrome size={18} />
                        <span>Google</span>
                    </button>
                    <button className={styles.socialBtn} onClick={() => handleSocialLogin('phone')}>
                        <Phone size={18} />
                        <span>Phone</span>
                    </button>
                </div>

                <div className={styles.footer}>
                    <span>{isLogin ? 'নতুন ব্যবহারকারী?' : 'আগে থেকেই অ্যাকাউন্ট আছে?'}</span>
                    <button
                        className={styles.switchBtn}
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                        }}
                    >
                        {isLogin ? 'সাইন আপ করুন' : 'লগইন করুন'}
                    </button>
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
