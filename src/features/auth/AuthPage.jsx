import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, X, Chrome, Facebook, Loader2, User, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import logo from '../../assets/shields/Logo_BeeLesson.png';
import styles from './AuthPage.module.css';
import { useAuth } from '../../context/AuthContext';
import { courseService } from '../../services/courseService';
import { surveyService } from '../../services/surveyService';
import { supabase } from '../../lib/supabaseClient';
import ConfirmationModal from './ConfirmationModal';
import CustomSelect from '../../components/ui/CustomSelect';

const GENDER_OPTIONS = [
    { value: 'male', label: 'পুরুষ' },
    { value: 'female', label: 'নারী' },
    { value: 'other', label: 'অন্যান্য' }
];

const LOCATION_OPTIONS = [
    { value: 'Dhaka', label: 'ঢাকা' },
    { value: 'Chattogram', label: 'চট্টগ্রাম' },
    { value: 'Rajshahi', label: 'রাজশাহী' },
    { value: 'Khulna', label: 'খুলনা' },
    { value: 'Barishal', label: 'বরিশাল' },
    { value: 'Sylhet', label: 'সিলেট' },
    { value: 'Rangpur', label: 'রংপুর' },
    { value: 'Mymensingh', label: 'ময়মনসিংহ' },
    { value: 'Overseas', label: 'দেশের বাইরে' }
];

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [gender, setGender] = useState('');
    const [location, setLocation] = useState('');
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
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
            if (isForgotPassword) {
                const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                });
                if (resetError) throw resetError;
                setError('');
                setSuccess('পাসওয়ার্ড রিসেট লিঙ্ক আপনার ইমেইলে পাঠানো হয়েছে। অনুগ্রহ করে ইনবক্স চেক করুন।');

                // Hide success message and go back to login after 5 seconds
                setTimeout(() => {
                    setSuccess('');
                    setIsForgotPassword(false);
                    setIsLogin(true);
                }, 5000);

                setLoading(false);
                return;
            }

            if (isLogin) {
                const { error: signInError } = await signIn({ email, password });
                if (signInError) throw signInError;
            } else {
                if (!agreeToTerms) {
                    setError('আমাদের টার্মস এবং কন্ডিশনস এর সাথে সম্মত হওয়া আবশ্যক।');
                    setLoading(false);
                    return;
                }

                // Manual check for existing user if email enumeration protection is on
                const { data: existingUser } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', email)
                    .maybeSingle();

                if (existingUser) {
                    setError('এই ইমেইল দিয়ে ইতঃপূর্বেই অ্যাকাউন্ট তৈরি করা হয়েছে।');
                    setLoading(false);
                    return;
                }

                const { data, error: signUpError } = await signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name,
                            display_name: name,
                            email: email,
                            gender: gender,
                            location: location
                        }
                    }
                });
                if (signUpError) throw signUpError;

                if (!data?.user || (data?.session === null && !data?.user?.identities?.length)) {
                    // This is another way Supabase indicates existing user with protection on
                    setError('এই ইমেইল দিয়ে ইতঃপূর্বেই অ্যাকাউন্ট তৈরি করা হয়েছে।');
                    setLoading(false);
                    return;
                }

                if (!data?.session) {
                    setSuccess('সাইন আপ সফল হয়েছে! আপনার ইমেইল ইনবক্স চেক করে অ্যাকাউন্ট ভেরিফাই করুন।');
                    // Go back to login after showing message
                    setTimeout(() => {
                        setSuccess('');
                        setIsLogin(true);
                    }, 6000);
                }
            }
        } catch (err) {
            console.error('Auth error:', err);
            let message = err.message || 'একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।';

            const lowMessage = message.toLowerCase();
            if (lowMessage.includes('invalid login credentials')) {
                message = 'ভুল ইমেইল বা পাসওয়ার্ড। আবার চেষ্টা করুন।';
            } else if (lowMessage.includes('at least 6 characters')) {
                message = 'পাসওয়ার্ড অন্তত 6 অক্ষরের হতে হবে।';
            } else if (lowMessage.includes('email not confirmed')) {
                message = 'আপনার ইমেইলটি এখনো ভেরিফাই করা হয়নি। অনুগ্রহ করে ইনবক্স চেক করুন।';
            } else if (lowMessage.includes('already registered') ||
                lowMessage.includes('already been registered') ||
                lowMessage.includes('email already in use')) {
                message = 'এই ইমেইল দিয়ে ইতঃপূর্বেই অ্যাকাউন্ট তৈরি করা হয়েছে।';
            }

            setError(message);
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
            const providerName = provider === 'google' ? 'Google' : provider === 'facebook' ? 'Facebook' : provider;
            setError(`${providerName} দিয়ে লগইন করতে সমস্যা হয়েছে।`);
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
                        {isForgotPassword ? (
                            <>
                                পাসওয়ার্ড <span className={styles.highlight}>রিসেট</span> করুন
                            </>
                        ) : isLogin ? (
                            <>
                                মধু আহরণ করতে <span className={styles.highlight}>লগইন</span> করুন
                            </>
                        ) : (
                            <>
                                মৌচাকে <span className={styles.highlight}>সাইন আপ</span> করুন
                            </>
                        )}
                    </h1>
                </div>

                {error && <div className={styles.errorMessage}>{error}</div>}
                {success && (
                    <div className={styles.successMessage}>
                        <CheckCircle2 size={24} />
                        <span>{success}</span>
                    </div>
                )}

                <form className={styles.form} onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className={styles.field}>
                            <input
                                type="text"
                                id="name"
                                placeholder="আপনার পূর্ণ নাম"
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
                            placeholder="আপনার ইমেইল ঠিকানা"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={styles.input}
                        />
                    </div>

                    {!isForgotPassword && (
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
                                <button
                                    type="button"
                                    className={styles.forgotLink}
                                    onClick={() => setIsForgotPassword(true)}
                                >
                                    পাসওয়ার্ড ভুলে গেছেন?
                                </button>
                            )}
                        </div>
                    )}

                    {!isLogin && !isForgotPassword && (
                        <div className={styles.row}>
                            <div className={styles.field}>
                                <CustomSelect
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    options={GENDER_OPTIONS}
                                    placeholder="লিঙ্গ নির্বাচন করুন"
                                    required
                                />
                            </div>

                            <div className={styles.field}>
                                <CustomSelect
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    options={LOCATION_OPTIONS}
                                    placeholder="অবস্থান"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {!isLogin && !isForgotPassword && (
                        <div className={styles.agreement}>
                            <input
                                type="checkbox"
                                id="agree"
                                checked={agreeToTerms}
                                onChange={(e) => setAgreeToTerms(e.target.checked)}
                                className={styles.checkbox}
                            />
                            <label htmlFor="agree">
                                আমি <a href="/terms" target="_blank">টার্মস এবং কন্ডিশনস</a> ও <a href="/privacy" target="_blank">প্রাইভেসি</a> পলিসির সাথে একমত
                            </label>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={styles.submitBtn}
                    >
                        {loading ? <Loader2 className={styles.spinner} size={20} /> : (isForgotPassword ? 'রিসেট লিঙ্ক পাঠান' : isLogin ? 'লগইন' : 'সাইন আপ')}
                    </button>
                </form>

                <div className={styles.divider}>
                    <span>অথবা</span>
                </div>

                <div className={styles.socialButtons}>
                    <button className={styles.socialBtn} onClick={() => handleSocialLogin('google')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                        </svg>
                        <span>Google</span>
                    </button>
                    <button className={styles.socialBtn} onClick={() => handleSocialLogin('facebook')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        <span>Facebook</span>
                    </button>
                </div>

                <div className={styles.footer}>
                    {isForgotPassword ? (
                        <button
                            className={styles.switchBtn}
                            onClick={() => setIsForgotPassword(false)}
                        >
                            লগইন পেজে ফিরে যান
                        </button>
                    ) : (
                        <>
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
                        </>
                    )}
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
