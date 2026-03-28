import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Zap, Check, Shield, Star, ShoppingBag,
    Loader2, Sparkles, CreditCard, ChevronRight,
    Minus, Plus, ArrowRightLeft, TrendingUp, Award, Settings
} from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { shopService } from '../../services/shopService';
import logo from '../../assets/shields/Logo_BeeLesson.png';
import styles from './ShopPage.module.css';
import { useLanguage } from '../../context/LanguageContext';
import HoneyDropIcon from '../../components/HoneyDropIcon';
import PollenIcon from '../../components/PollenIcon';
import { toast } from 'sonner';
import ShopSkeleton from './ShopSkeleton';





const getQueenBeeFeatures = (t) => [
    { emoji: '🍯', text: t('queen_bee_feature_1') },
];

// Numbers are now kept in English per request

const ShopPage = () => {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const QUEEN_BEE_FEATURES = getQueenBeeFeatures(t);
    const navigate = useNavigate();
    const location = useLocation();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [planType, setPlanType] = useState('monthly'); // 'monthly' or 'yearly'
    const [gemToConvert, setGemToConvert] = useState(20);
    const [showConvertConfirmation, setShowConvertConfirmation] = useState(false);

    const [activePlanType, setActivePlanType] = useState(null); // '1day' | 'monthly' | 'yearly' | null
    const [planLoading, setPlanLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState("");
    const [oneDayExpiry, setOneDayExpiry] = useState(null);

    const calculatedHearts = Math.floor(gemToConvert / 20);

    const fetchProfile = async () => {
        if (!user) {
            setLoading(false);
            return null;
        }
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (error) throw error;
            setProfile(data);
            return data;
        } catch (err) {
            console.error('Error fetching profile:', err);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const fetchActivePlan = async () => {
        if (!user) {
            setPlanLoading(false);
            return;
        }
        try {
            setPlanLoading(true);
            const sub = await shopService.getActiveSubscription(user.id);
            setActivePlanType(sub?.plan_type ?? null);
            // If it's a 1-day plan, store its specific expiry for the timer
            if (sub?.plan_type === '1day') {
                setOneDayExpiry(sub.end_date);
            } else {
                setOneDayExpiry(null);
            }
        } catch (err) {
            console.error('Error fetching active plan:', err);
            setActivePlanType(null);
            setOneDayExpiry(null);
        } finally {
            setPlanLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
        fetchActivePlan();
    }, [user]);

    useEffect(() => {
        if (location.state?.directCheckout && !loading && !planLoading && profile) {
            handlePurchase(location.state.directCheckout === 'monthly' ? 'subscription' : '1day');
            // Clear location state after processing to avoid re-triggering
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, loading, planLoading, profile]);

    // Derived Premium States - Isolated Mode
    const isQueenBee = !!profile?.is_premium;
    const is1DayActive = !!profile?.is_1day_premium;
    // For universal features (like unlimited hearts)
    const isPremium = isQueenBee || is1DayActive;

    // Countdown Logic for 1-Day Recharge
    useEffect(() => {
        // Source priority: local state -> dedicated 1-day column -> standard premium column
        const endGoal = oneDayExpiry || profile?.one_day_premium_until || (profile?.is_1day_premium ? profile.premium_until : null);

        if (!is1DayActive || !endGoal) {
            setTimeLeft("");
            return;
        }

        const tick = () => {
            const now = new Date();
            const end = new Date(endGoal);
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft("");
                fetchProfile();
                fetchActivePlan();
                return false;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            const format = (num) => num.toString().padStart(2, '0');
            // Capped at 24 hours for display logic safety
            const displayH = h >= 24 ? 24 : h;
            setTimeLeft(`${format(displayH)}:${format(m)}:${format(s)}`);
            return true;
        };

        const hasTime = tick();
        if (!hasTime) return;

        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [is1DayActive, profile?.premium_until]);

    // Debugging logic (attach to window for testing if needed)
    useEffect(() => {
        window.shopDebug = { profile, activePlanType, isPremium, is1DayActive, isQueenBee, timeLeft };
    }, [profile, activePlanType, isPremium, is1DayActive, isQueenBee, timeLeft]);

    const handleIncrement = () => setGemToConvert(prev => prev + 20);
    const handleDecrement = () => setGemToConvert(prev => Math.max(20, prev - 20));

    const handleConvertAction = async () => {
        if (!profile || profile.gems < gemToConvert) {
            toast.error(t('insufficient_gems'));
            return;
        }

        if (isPremium) {
            toast.info(t('unlimited_hearts_active_msg'));
            return;
        }

        const heartsToAdd = calculatedHearts;
        const gemsToSubtract = gemToConvert;

        // Store previous state for rollback
        const previousProfile = { ...profile };

        // Optimistic UI update for instant feedback
        setProfile(prev => ({
            ...prev,
            gems: prev.gems - gemsToSubtract,
            hearts: prev.hearts + heartsToAdd
        }));

        setProcessing(true);
        try {
            const result = await shopService.convertGemsToHearts(user.id, heartsToAdd, gemsToSubtract);
            
            if (result && result.success) {
                // Final state update with data from server to ensure sync
                const updatedProfile = {
                    ...previousProfile,
                    gems: result.new_gems,
                    hearts: result.new_hearts
                };
                setProfile(updatedProfile);
                
                // Dispatch global event for other components (Sidebar, TopBar etc.)
                window.dispatchEvent(new CustomEvent('profileUpdate', { detail: updatedProfile }));
                
                const unit = language === 'bn' ? 'টি' : '';
                toast.success(`${heartsToAdd}${unit} ${t('hearts_added_msg')} 🍯`);
                
                // Success state for the modal
                setProcessing('success');
            } else {
                // Rollback on server failure
                setProcessing(false);
                toast.error(result?.message || t('conversion_error'));
            }
        } catch (err) {
            console.error('Conversion error:', err);
            // Rollback on network/logic error
            setProfile(previousProfile);
            setProcessing(false);
            toast.error(err.message || t('conversion_error'));
        }
    };

    const handlePurchase = (type, dataArg = {}) => {
        if (processing) return;

        try {
            if (!user) {
                toast.error(t('please_login'));
                return;
            }

            // Block if already active or redundant
            if (type === 'subscription' && isQueenBee) {
                toast.info(t('already_in_mode').replace('{mode}', profile?.gender === 'male' ? t('king_bee_mode') : t('queen_bee_mode')));
                return;
            }
            if (type === '1day' && (is1DayActive || isQueenBee)) {
                toast.info(t('unlimited_active_already'));
                return;
            }

            let checkoutData = null;
            if (type === 'subscription') {
                checkoutData = {
                    id: 'premium',
                    amount: 1,
                    price: planType === 'monthly' ? 99 : 999,
                    label: `${profile?.gender === 'male' ? t('king_bee_mode') : t('queen_bee_mode')} (${planType === 'monthly' ? t('monthly') : t('yearly')})`
                };
            } else if (type === '1day') {
                checkoutData = {
                    id: '1day',
                    amount: 1,
                    price: 49,
                    label: (language === 'bn' ? 'কুইক হানি ড্রপ (১ দিন)' : 'Quick Honey Drop (1 Day)')
                };
            } else if (dataArg) {
                checkoutData = {
                    ...dataArg,
                    label: dataArg.labelKey ? t(dataArg.labelKey) : (dataArg.label || 'আইটেম')
                };
            }

            if (checkoutData) {
                navigate('/checkout', { 
                    state: { 
                        checkoutData, 
                        type, 
                        planType 
                    } 
                });
            }
        } catch (error) {
            console.error('Shop: handlePurchase error', error);
        }
    };

    return (
        <main className={styles.mainContent}>
            <div className={styles.innerContent}>
                {loading ? (
                    <ShopSkeleton />
                ) : (

                    <>
                        <header className={styles.header}>
                            <div className={styles.headerWelcomeRow}>
                                <div className={styles.headerMascotSmall}>
                                    <DotLottieReact
                                        src="/models/Honey bee.lottie"
                                        loop
                                        autoplay
                                    />
                                </div>
                                <p className={styles.headerSub}>
                                    {isQueenBee 
                                        ? `${t('unlocked_all_features')}, ${profile?.gender === 'male' ? t('male_bee_title') || (language === 'bn' ? 'কিং বি' : 'King Bee') : t('female_bee_title') || (language === 'bn' ? 'কুইন বি' : 'Queen Bee')}! 👑`
                                        : t('unlimited_hearts_msg') || (language === 'bn' ? 'শিখতে থাকুন আনলিমিটেড হানি ড্রপ নিয়ে' : 'Learn with unlimited honey drops')}
                                </p>
                            </div>
                            <div className={styles.headerDivider}></div>
                        </header>





                        {/* Queen Bee Membership Section */}
                        <section className={styles.section}>
                            <div className={styles.queenBeeCardHorizontal}>
                                <div className={styles.qbCardLeft}>
                                    <div className={styles.qbIconBg}>
                                        <HoneyDropIcon size={32} />
                                    </div>
                                </div>

                                <div className={styles.qbCardMiddle}>
                                    <h3 className={styles.qbTitleHero}>
                                        {profile?.gender === 'male' ? t('king_bee_mode') : t('queen_bee_mode')}
                                    </h3>
                                    <div className={styles.qbFeaturesRow}>
                                        {QUEEN_BEE_FEATURES.map((f, i) => (
                                            <span key={i} className={styles.qbFeaturePill}>
                                                {f.text}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.qbCardRight}>
                                    <button
                                        id="queen-bee-activate-btn"
                                        className={`${styles.qbActivateBtn} ${isQueenBee ? styles.activeBtnStyle : ''}`}
                                        onClick={() => handlePurchase('subscription')}
                                        disabled={processing || isQueenBee}
                                    >
                                        {isQueenBee
                                            ? t('active')
                                            : t('activate')
                                        }
                                    </button>
                                </div>
                            </div>

                            <div className={styles.queenBeeCardHorizontal}>
                                <div className={styles.qbCardLeft}>
                                    <div className={styles.qbIconBg}>
                                        <Zap size={32} color="#f1c40f" />
                                    </div>
                                </div>

                                <div className={styles.qbCardMiddle}>
                                    <h3 className={styles.qbTitleHero}>
                                        {t('quick_honey_drop')}
                                    </h3>
                                    <div className={styles.qbFeaturesRow} style={{ marginBottom: '8px' }}>
                                        <span className={styles.qbFeaturePill}>
                                            {t('enjoy_1day_unlimited')}
                                        </span>
                                    </div>
                                </div>

                                <div className={styles.qbCardRight}>
                                    <button
                                        id="recharge-1day-btn"
                                        className={`${styles.qbActivateBtn} ${(isQueenBee || is1DayActive) ? styles.activeBtnStyle : styles.blueBtn}`}
                                        onClick={() => handlePurchase('1day')}
                                        disabled={processing || isQueenBee || is1DayActive}
                                    >
                                        {is1DayActive && timeLeft
                                            ? timeLeft
                                            : (isQueenBee || is1DayActive)
                                                ? t('active')
                                                : t('recharge_1day')
                                        }
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section className={styles.section}>
                             <div className={styles.queenBeeCardHorizontal}>
                                <div className={styles.qbCardLeft}>
                                    <div 
                                        className={styles.qbIconBg}
                                        style={{ 
                                            cursor: (processing || isPremium || (profile?.gems < gemToConvert)) ? 'default' : 'pointer',
                                            transition: 'transform 0.1s'
                                        }}
                                        onClick={() => {
                                            if (!(processing || isPremium || (profile?.gems < gemToConvert))) {
                                                setShowConvertConfirmation(true);
                                            }
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!(processing || isPremium || (profile?.gems < gemToConvert))) {
                                                e.currentTarget.style.transform = 'scale(1.05)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'scale(1)';
                                        }}
                                    >
                                        <PollenIcon size={32} />
                                    </div>
                                </div>

                                <div className={styles.qbCardMiddle}>
                                    <h3 className={styles.qbTitleHero}>
                                        {t('exchange')}
                                    </h3>
                                  
                                    <div className={styles.exchangeControlsRow}>
                                        <button className={styles.miniStepBtn} onClick={handleDecrement} disabled={gemToConvert <= 20}>
                                            <Minus size={14} />
                                        </button>
                                        <div className={styles.miniDisplay}>
                                            <span>{gemToConvert}</span>
                                        </div>
                                        <button className={styles.miniStepBtn} onClick={handleIncrement}>
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.qbCardRight}>
                                    <button
                                        id="exchange-pollen-btn"
                                        className={`${styles.qbActivateBtn} ${(isQueenBee || is1DayActive) ? styles.activeBtnStyle : styles.greenBtn}`}
                                        onClick={() => {
                                            if (profile?.gems < gemToConvert) {
                                                setProcessing('insufficient');
                                                setShowConvertConfirmation(true);
                                            } else {
                                                setShowConvertConfirmation(true);
                                            }
                                        }}
                                        disabled={processing === true || isQueenBee || is1DayActive}
                                    >
                                        {processing === true ? (
                                            <Loader2 size={18} className={styles.spinner} />
                                        ) : (
                                                <span>+{calculatedHearts} {t('honey_drop')}</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </section>


                    </>
                )}
            </div>

            {
                showConvertConfirmation && (
                    <div className={styles.checkoutOverlay} onClick={() => !processing && setShowConvertConfirmation(false)}>
                        <div className={styles.exchangeModal} onClick={e => e.stopPropagation()}>
                            {processing === 'success' ? (
                                <div className={styles.exchangeSuccess}>
                                    <div className={styles.successLottie}>
                                        <DotLottieReact
                                            src="/models/Honey bee.lottie"
                                            loop
                                            autoplay
                                        />
                                    </div>
                                    <h2 className={styles.successTitle}>{t('exchange_success_title')}</h2>
                                    <p className={styles.successDesc}>
                                        {t('exchange_success_desc')}
                                    </p>
                                    <button 
                                        className={styles.confirmBtn} 
                                        onClick={() => {
                                            navigate('/learn');
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        {t('go_back')}
                                    </button>
                                </div>
                            ) : processing === 'insufficient' ? (
                                <div className={styles.exchangeSuccess}>
                                    <div className={styles.successLottie} style={{ background: 'rgba(241,196,15,0.05)', borderRadius: '50%', padding: '20px' }}>
                                        <PollenIcon size={100} />
                                    </div>
                                    <h2 className={styles.successTitle} style={{ color: 'var(--color-text)', fontSize: '1.6rem' }}>{t('insufficient_pollen_title')}</h2>
                                    <p className={styles.successDesc}>
                                        {t('insufficient_pollen_desc').replace('{amount}', gemToConvert)}
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                                        <button 
                                            className={styles.confirmBtn}
                                            style={{ width: '100%', background: 'linear-gradient(135deg, #1cb0f6 0%, #1796d1 100%)', boxShadow: '0 4px 0 #1480b3' }}
                                            onClick={() => navigate('/learn')}
                                        >
                                            {t('start_learning_earn_pollen')}
                                        </button>
                                        <button 
                                            className={styles.confirmBtn}
                                            onClick={() => {
                                                setShowConvertConfirmation(false);
                                                setProcessing(false);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            style={{ width: '100%' }}
                                        >
                                            {t('view_mode')}
                                        </button>
                                        <button 
                                            className={styles.cancelBtn}
                                            onClick={() => {
                                                setShowConvertConfirmation(false);
                                                setProcessing(false);
                                            }}
                                            style={{ border: 'none' }}
                                        >
                                            {t('not_now')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.checkoutHeader}>
                                        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '8px' }}>{t('confirm_exchange_title')}</h2>
                                        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>
                                            {t('confirm_exchange_desc')}
                                        </p>
                                    </div>

                                    <div className={styles.transactionFlow}>
                                        <div className={styles.transactionItem}>
                                            <div className={styles.itemCircle}>
                                                <PollenIcon size={48} />
                                            </div>
                                            <span className={styles.itemAmount}>{gemToConvert}</span>
                                        </div>
                                        
                                        <div className={styles.transactionArrow}>
                                            <ChevronRight size={32} strokeWidth={3} />
                                        </div>

                                        <div className={styles.transactionItem}>
                                            <div className={styles.itemCircle} style={{ borderColor: '#f1c40f' }}>
                                                <HoneyDropIcon size={48} />
                                            </div>
                                            <span className={styles.itemAmount} style={{ color: '#f1c40f' }}>+{calculatedHearts}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                                        <button
                                            onClick={() => setShowConvertConfirmation(false)}
                                            className={styles.cancelBtn}
                                            disabled={processing === true}
                                        >
                                            {t('no')}
                                        </button>
                                        <button
                                            onClick={handleConvertAction}
                                            className={styles.confirmBtn}
                                            disabled={processing === true}
                                        >
                                            {processing === true ? <Loader2 className={styles.spinner} /> : t('yes_confirm')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )
            }
        </main >
    );
};

export default ShopPage;
