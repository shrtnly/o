import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { useLanguage } from '../../context/LanguageContext';

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
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [fieldErrors, setFieldErrors] = useState([]);

    const { user, signIn, signUp, signInWithOAuth } = useAuth();
    const { language, t } = useLanguage();
    const navigate = useNavigate();
    const locationHook = useLocation();

    // Capture referral from URL
    React.useEffect(() => {
        const resolveReferral = async () => {
            const params = new URLSearchParams(locationHook.search);
            const ref = params.get('ref');
            if (!ref) return;

            // Check if it's already a UUID
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
            
            if (isUUID) {
                localStorage.setItem('referral_ref', ref);
                navigate(locationHook.pathname, { replace: true });
            } else {
                // It's a username, look it up
                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('username', ref)
                        .single();
                    
                    if (data?.id) {
                        localStorage.setItem('referral_ref', data.id);
                    }
                } catch (err) {
                    console.error('Referral lookup failed:', err);
                } finally {
                    navigate(locationHook.pathname, { replace: true });
                }
            }
        };

        resolveReferral();
    }, [locationHook.search, navigate]);

    const genderDropdownOptions = GENDER_OPTIONS.map(opt => ({
        ...opt,
        label: t(opt.value === 'male' ? 'male' : opt.value === 'female' ? 'female' : 'other_gender')
    }));

    const locationDropdownOptions = LOCATION_OPTIONS.map(opt => ({
        ...opt,
        label: t(`loc_${opt.value.toLowerCase()}`)
    }));

    React.useEffect(() => {
        // Pre-fill email if remember me was checked previously
        const savedEmail = localStorage.getItem('remember_me_email');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }

        const checkPendingAction = async () => {
            if (user && !success) { // Don't redirect if we're showing a success message
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
    }, [user, navigate, success]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setFieldErrors([]);

        // Validate fields
        const errors = [];
        if (!email) errors.push('email');
        if (!isForgotPassword) {
            if (!password) errors.push('password');
        }
        if (!isLogin && !isForgotPassword) {
            if (!name) errors.push('name');
            if (!gender) errors.push('gender');
            if (!location) errors.push('location');
            if (!agreeToTerms) errors.push('agreement');
        }

        if (errors.length > 0) {
            setFieldErrors([]); // Quick clear to allow re-triggering animation
            setTimeout(() => {
                setFieldErrors(errors);
            }, 10);
            setLoading(false);
            return;
        }

        try {
            if (isForgotPassword) {
                const { data: resetResult, error: resetError } = await supabase.functions.invoke('reset-password-email', {
                    body: { 
                        email,
                        origin: window.location.origin
                    }
                });

                if (resetError) {
                    if (resetError.status === 404) {
                        setError(t('auth_email_not_found'));
                    } else {
                        throw resetError;
                    }
                    setLoading(false);
                    return;
                }

                setError('');
                setSuccess(t('auth_reset_success'));

                // Hide success message and go back to login after 3 seconds
                setTimeout(() => {
                    setSuccess('');
                    setIsForgotPassword(false);
                    setIsLogin(true);
                }, 3000);

                setLoading(false);
                return;
            }

            if (isLogin) {
                const { error: signInError } = await signIn({ email, password });
                if (signInError) throw signInError;

                // Handle Remember Me
                if (rememberMe) {
                    localStorage.setItem('remember_me_email', email);
                } else {
                    localStorage.removeItem('remember_me_email');
                }
            } else {
                if (!agreeToTerms) {
                    setError(t('auth_terms_missing'));
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
                    setError(t('auth_account_exists'));
                    setLoading(false);
                    return;
                }

                // Fetch IP for fraud prevention
                let userIP = 'unknown';
                try {
                    const response = await fetch('https://api.ipify.org?format=json');
                    const data = await response.json();
                    userIP = data.ip;
                } catch (ipErr) {
                    console.error('IP capture failed:', ipErr);
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
                            location: location,
                            referred_by: localStorage.getItem('referral_ref'),
                            client_ip: userIP
                        }
                    }
                });

                if (!signUpError) {
                    localStorage.removeItem('referral_ref');
                }
                if (signUpError) throw signUpError;

                if (!data?.user || (data?.session === null && !data?.user?.identities?.length)) {
                    // This is another way Supabase indicates existing user with protection on
                    setError(t('auth_account_exists'));
                    setLoading(false);
                    return;
                }

                const message = data?.session ? t('auth_signup_success_immediate') : t('auth_signup_success');
                setSuccess(message);
                
                // Go back to login screen so they can log in manually
                setTimeout(() => {
                    setSuccess('');
                    setIsLogin(true);
                }, 3000);
            }
        } catch (err) {
            console.error('Auth error:', err);
            let message = t('auth_generic_error');

            const lowMessage = (err.message || '').toLowerCase();
            if (lowMessage.includes('invalid login credentials')) {
                message = t('auth_wrong_credentials');
            } else if (lowMessage.includes('at least 6 characters')) {
                message = t('auth_weak_password');
            } else if (lowMessage.includes('email not confirmed')) {
                message = t('auth_unverified_email');
            } else if (lowMessage.includes('already registered') ||
                lowMessage.includes('already been registered') ||
                lowMessage.includes('email already in use')) {
                message = t('auth_account_exists');
            }

            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider) => {
        setLoading(true);
        setError('');
        try {
            const { error } = await signInWithOAuth({
                provider,
                options: {
                    // After Google/Facebook redirect back, send user to /courses directly
                    redirectTo: `${window.location.origin}/courses`,
                    // Force account picker on every Google login so users can switch accounts
                    queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
                }
            });
            if (error) throw error;
            // If no error, the browser will navigate to Google — don't reset loading
        } catch (err) {
            console.error(`${provider} login error:`, err);
            setLoading(false);
            if (provider === 'google') setError(t('auth_google_failed'));
            else if (provider === 'facebook') setError(t('auth_facebook_failed'));
            else setError(t('auth_generic_error'));
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
                            <span key="reset-header">
                                {t('auth_reset_title')} <span className={styles.highlight}>{t('auth_reset_highlight')}</span> {t('auth_reset_suffix')}
                            </span>
                        ) : isLogin ? (
                            <span key="login-header">
                                {t('auth_login_title')} <span className={styles.highlight}>{t('auth_login_highlight')}</span> {t('auth_login_suffix')}
                            </span>
                        ) : (
                            <span key="signup-header">
                                {t('auth_signup_title')} <span className={styles.highlight}>{t('auth_signup_highlight')}</span> {t('auth_signup_suffix')}
                            </span>
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

                <form className={styles.form} onSubmit={handleSubmit} noValidate>
                    {!isLogin && (
                        <div className={styles.field}>
                            <input
                                type="text"
                                id="name"
                                placeholder={t('auth_name_placeholder')}
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setFieldErrors(prev => prev.filter(f => f !== 'name'));
                                }}
                                required={!isLogin}
                                className={`${styles.input} ${fieldErrors.includes('name') ? styles.inputError : ''}`}
                            />
                        </div>
                    )}

                    <div className={styles.field}>
                        <input
                            type="email"
                            id="email"
                            placeholder={t('auth_email_placeholder')}
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setFieldErrors(prev => prev.filter(f => f !== 'email'));
                            }}
                            required
                            className={`${styles.input} ${fieldErrors.includes('email') ? styles.inputError : ''}`}
                        />
                    </div>

                    {!isForgotPassword && (
                        <div className={styles.field}>
                            <div className={styles.passwordWrapper}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    placeholder={t('auth_password_placeholder')}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setFieldErrors(prev => prev.filter(f => f !== 'password'));
                                    }}
                                    required
                                    className={`${styles.input} ${fieldErrors.includes('password') ? styles.inputError : ''}`}
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
                                <div className={styles.optionsLine}>
                                    <label className={styles.checkboxContainer}>
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                        />
                                        <span className={styles.checkmark}></span>
                                        <span>{t('auth_remember_me')}</span>
                                    </label>
                                    <button
                                        type="button"
                                        className={styles.forgotLink}
                                        onClick={() => setIsForgotPassword(true)}
                                    >
                                        {t('auth_forgot_password')}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {!isLogin && !isForgotPassword && (
                        <div className={styles.row}>
                            <div className={styles.field}>
                                <CustomSelect
                                    value={gender}
                                    onChange={(e) => {
                                        setGender(e.target.value);
                                        setFieldErrors(prev => prev.filter(f => f !== 'gender'));
                                    }}
                                    options={genderDropdownOptions}
                                    placeholder={t('i_am')}
                                    required
                                    isError={fieldErrors.includes('gender')}
                                />
                            </div>

                            <div className={styles.field}>
                                <CustomSelect
                                    value={location}
                                    onChange={(e) => {
                                        setLocation(e.target.value);
                                        setFieldErrors(prev => prev.filter(f => f !== 'location'));
                                    }}
                                    options={locationDropdownOptions}
                                    placeholder={t('location')}
                                    required
                                    isError={fieldErrors.includes('location')}
                                />
                            </div>
                        </div>
                    )}

                    {!isLogin && !isForgotPassword && (
                        <div className={styles.agreement}>
                            <label className={`${styles.checkboxContainer} ${fieldErrors.includes('agreement') ? styles.checkboxError : ''}`}>
                                <input
                                    type="checkbox"
                                    id="agree"
                                    checked={agreeToTerms}
                                    onChange={(e) => {
                                        setAgreeToTerms(e.target.checked);
                                        setFieldErrors(prev => prev.filter(f => f !== 'agreement'));
                                    }}
                                    className={styles.checkbox}
                                />
                                <span className={styles.checkmark}></span>
                                {t('auth_agree_prefix')} <a href="/terms" target="_blank">{t('auth_agree_terms')}</a> {t('auth_agree_and')} <a href="/privacy" target="_blank">{t('auth_agree_privacy')}</a> {t('auth_agree_suffix')}
                            </label>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || (success && !isLogin)}
                        className={styles.submitBtn}
                    >
                        {(success && !isLogin) ? (
                            <div key="logging_in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                <Loader2 className={styles.spinner} size={20} />
                                <span>{language === 'bn' ? 'লগইন হচ্ছে...' : 'Logging in...'}</span>
                            </div>
                        ) : loading ? (
                            <Loader2 key="spinner" className={styles.spinner} size={20} />
                        ) : (
                            <span key="btn_text">
                                {isForgotPassword ? t('auth_send_reset_link') : isLogin ? t('login_btn') : t('signup')}
                            </span>
                        )}
                    </button>
                </form>

                <div className={styles.divider}>
                    <span>{t('auth_or')}</span>
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
                            {t('auth_back_to_login')}
                        </button>
                    ) : (
                        <>
                            <span>{isLogin ? t('auth_new_user') : t('auth_already_have_account')}</span>
                            <button
                                className={styles.switchBtn}
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setError('');
                                }}
                            >
                                {isLogin ? t('signup') : t('login_btn')}
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
