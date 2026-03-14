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




const QUEEN_BEE_FEATURES = [
    { emoji: '🍯', text: 'ভুল করলেও শেখা থামবে না। আনলিমিটেড হানি ড্রপ।' },
];

// Numbers are now kept in English per request

const ShopPage = () => {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [planType, setPlanType] = useState('monthly'); // 'monthly' or 'yearly'
    const [gemToConvert, setGemToConvert] = useState(20);
    const [showCheckout, setShowCheckout] = useState(null); // { type, data }
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
            toast.info(language === 'bn' ? 'আপনার আনলিমিটেড হানি ড্রপ সক্রিয় আছে। 👑' : 'Your unlimited honey drops are already active. 👑');
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
                setProfile(previousProfile);
                setProcessing(false);
                toast.error(result?.message || 'কনভার্ট করতে সমস্যা হয়েছে।');
            }
        } catch (err) {
            console.error('Conversion error:', err);
            // Rollback on network/logic error
            setProfile(previousProfile);
            setProcessing(false);
            toast.error(err.message || 'কনভার্ট করতে সমস্যা হয়েছে।');
        }
    };

    const handlePurchase = (type, dataArg = {}) => {
        if (processing) return;

        try {
            console.log('Shop: [Click Action]', { type, dataArg });

            if (!user) {
                toast.error('অনুগ্রহ করে লগইন করুন।');
                return;
            }

            console.log('Shop: Current State for Purchase Check:', { isQueenBee, is1DayActive, type });

            // Block if already active or redundant
            if (type === 'subscription' && isQueenBee) {
                toast.info('আপনি বর্তমানে কিং বী মুড-এ আছেন! 👑');
                return;
            }
            if (type === '1day' && (is1DayActive || isQueenBee)) {
                toast.info('আপনার আনলিমিটেড হানি ড্রপ আগে থেকেই সক্রিয় আছে।');
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
                console.log('Shop: Opening checkout modal with data:', checkoutData);
                setShowCheckout({ type, data: checkoutData });
            } else {
                toast.error('তথ্য পাওয়া যায়নি।');
            }
        } catch (error) {
            console.error('Shop: handlePurchase error', error);
            toast.error('দুঃখিত, সমস্যা হয়েছে।');
        }
    };

    const completeCheckout = async () => {
        if (!showCheckout || !showCheckout.data || processing) {
            console.error('Shop: Cannot complete checkout', { showCheckout, processing });
            return;
        }

        if (!user?.id) {
            toast.error('সেশন পাওয়া যায়নি। আবার লগইন করুন।');
            return;
        }

        setProcessing(true);
        const toastId = toast.loading('পেমেন্ট প্রসেসিং হচ্ছে...');
        const { type, data } = showCheckout;
        console.log(`Shop: completeCheckout [${type}] initiated`, { data });

        try {
            let result;
            if (type === 'gems') {
                result = await shopService.buyGems(user.id, data.amount, data.price, data.id);
                if (result?.success) {
                    await fetchProfile();
                    toast.success(t('gems_added').replace('টি', `${data.amount}টি`), { id: toastId });
                } else throw new Error();
            } else if (type === 'subscription') {
                result = await shopService.subscribeToPremium(user.id, planType, data.price);
                if (result?.success) {
                    setProfile(prev => ({ 
                        ...prev, 
                        is_premium: true,
                        premium_until: result.end_date, // Now correctly tracks from DB result
                        is_1day_premium: false, // Isolate: Queen Bee resets 1-day
                        one_day_premium_until: null
                    }));
                    setActivePlanType(planType);
                    await Promise.all([fetchProfile(), fetchActivePlan()]);
                    toast.success('সাবস্ক্রিপশন সফল! আপনি এখন মেম্বার! 👑', { id: toastId });
                } else throw new Error();
            } else if (type === '1day') {
                result = await shopService.buy1DayPremium(user.id, data.price);
                console.log('Shop: 1-day purchase result:', result);
                if (result && result.success) {
                    // Update state immediately for UI responsiveness
                    setProfile(prev => ({
                        ...prev,
                        is_1day_premium: true, // ONLY set 1-day flag (Isolate)
                        one_day_premium_until: result.premium_until
                    }));
                    setActivePlanType('1day');
                    setOneDayExpiry(result.premium_until);
                    setPlanLoading(false);

                    // Refresh fresh data in background
                    fetchProfile().then(p => {
                        console.log('Shop: Profile refreshed after 1-day purchase', p);
                        // Dispatch global event for other components (like Sidebar) to refresh
                        window.dispatchEvent(new CustomEvent('profileUpdate', { detail: p }));
                    });
                    fetchActivePlan();

                    toast.success('১ দিনের রিচার্জ সফল! আনলিমিটেড হানি ড্রপ উপভোগ করুন 🍯', { id: toastId });
                } else {
                    console.error('Shop: 1-day purchase failed', result);
                    const msg = result?.message || 'পেমেন্ট প্রসেস করা সম্ভব হয়নি।';
                    toast.error(msg, { id: toastId });
                    throw new Error(msg);
                }
            } else if (type === 'hearts') {
                result = await shopService.buyHearts(user.id, data.amount, data.price, data.id);
                if (result?.success) {
                    await fetchProfile();
                    toast.success(t('hearts_added').replace('টি', `${data.amount}টি`), { id: toastId });
                } else throw new Error();
            }
            setShowCheckout(null);
        } catch (err) {
            console.error('Shop: Checkout error', err);
            toast.error('পেমেন্ট সফল হয়নি। পুনরায় চেষ্টা করুন।', { id: toastId });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <main className={styles.mainContent}>
            <div className={styles.innerContent}>
                {loading ? (
                    <div className={styles.loadingContainer}>
                        <Loader2 className={styles.spinner} size={48} />
                    </div>
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
                                    {profile?.gender === 'male'
                                        ? 'আনলিমিটেড মধু নিয়ে শিখতে থাকুন'
                                        : 'আনলিমিটেড মধু নিয়ে শিখতে থাকুন'}
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
                                            ? (language === 'bn' ? 'সক্রিয়' : 'Active')
                                            : (language === 'bn' ? 'সক্রিয় করুন' : 'Activate')
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
                                        {language === 'bn' ? 'কুইক হানি ড্রপ' : 'Quick Honey Drop'}
                                    </h3>
                                    <div className={styles.qbFeaturesRow} style={{ marginBottom: '8px' }}>
                                        <span className={styles.qbFeaturePill}>
                                            {language === 'bn' ? 'পুরো 1 দিন আনলিমিটেড হানি ড্রপ উপভোগ করুন!' : 'Enjoy unlimited honey drops for a full day!'}
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
                                                ? (language === 'bn' ? 'সক্রিয়' : 'Active')
                                                : (language === 'bn' ? 'রিচার্জ 1 দিন' : 'Recharge 1 Day')
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <HoneyDropIcon size={18} />
                                                <span>+{calculatedHearts} {language === 'bn' ? 'হানি ড্রপ' : 'Honey Drop'}</span>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </section>


                    </>
                )}
            </div>

            {
                showCheckout && (
                    <div className={styles.checkoutOverlay}>
                        <div className={styles.checkoutModal}>
                            <div className={styles.checkoutHeader}>
                                <h2>{t('confirm_payment')}</h2>
                                <p>{t('payment_desc')}</p>
                            </div>

                            <div className={styles.checkoutPriceLarge}>
                                ৳ {showCheckout.type === 'subscription'
                                    ? (planType === 'monthly' ? '99' : '999')
                                    : showCheckout.data.price}
                            </div>

                            <div className={styles.orderSummary}>
                                {showCheckout.type === 'subscription' && (
                                    <div className={styles.modalToggleWrapper}>
                                        <div className={styles.planToggle}>
                                            <button
                                                className={`${styles.toggleBtn} ${planType === 'monthly' ? styles.toggleBtnActive : ''}`}
                                                onClick={() => setPlanType('monthly')}
                                            >
                                                {t('monthly')}
                                            </button>
                                            <button
                                                className={`${styles.toggleBtn} ${planType === 'yearly' ? styles.toggleBtnActive : ''}`}
                                                onClick={() => setPlanType('yearly')}
                                            >
                                                {t('yearly')}
                                                <span className={styles.discountBadge}>{t('discount')}</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className={styles.summaryRow}>
                                    <span>{t('item')}</span>
                                    <span>
                                        {showCheckout.type === 'subscription'
                                            ? `${showCheckout.data.label} (${planType === 'monthly' ? t('monthly') : t('yearly')})`
                                            : showCheckout.data.label
                                        }
                                    </span>
                                </div>
                            </div>

                            <div className={styles.paymentMethods}>
                                <button className={`${styles.methodBtn} ${styles.methodBtnActive}`}>
                                    <CreditCard size={24} />
                                    <span>{language === 'bn' ? 'বিকাশ' : 'bKash'}</span>
                                </button>
                                <button className={styles.methodBtn}>
                                    <ShoppingBag size={24} />
                                    <span>{language === 'bn' ? 'নগদ' : 'Nagad'}</span>
                                </button>
                            </div>

                            <div className={styles.checkoutActions}>
                                <button
                                    className={styles.cancelBtn}
                                    onClick={() => setShowCheckout(null)}
                                    disabled={processing}
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    className={styles.confirmBtn}
                                    onClick={completeCheckout}
                                    disabled={processing}
                                >
                                    {processing ? <Loader2 className={styles.spinner} /> : t('pay_now')}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
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
                                    <h2 className={styles.successTitle}>সফল হয়েছে!</h2>
                                    <p className={styles.successDesc}>
                                        আপনার পরাগরেণু সফলভাবে হানি ড্রপে রূপান্তরিত হয়েছে।
                                    </p>
                                    <button 
                                        className={styles.confirmBtn} 
                                        onClick={() => {
                                            navigate('/learn');
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        {language === 'bn' ? 'ফিরে যান' : 'Go Back'}
                                    </button>
                                </div>
                            ) : processing === 'insufficient' ? (
                                <div className={styles.exchangeSuccess}>
                                    <div className={styles.successLottie} style={{ background: 'rgba(241,196,15,0.05)', borderRadius: '50%', padding: '20px' }}>
                                        <PollenIcon size={100} />
                                    </div>
                                    <h2 className={styles.successTitle} style={{ color: '#fff', fontSize: '1.6rem' }}>পর্যাপ্ত পরাগরেণু নেই</h2>
                                    <p className={styles.successDesc}>
                                        হানি ড্রপ এক্সচেঞ্জ করতে কমপক্ষে <strong>{gemToConvert}টি</strong> পরাগরেণু প্রয়োজন। আরও আয় করতে পড়া শুরু করুন অথবা {profile?.gender === 'male' ? 'কিং বী মোড' : 'কুইন বী মোড'} নিন।
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                                        <button 
                                            className={styles.confirmBtn}
                                            style={{ width: '100%', background: 'linear-gradient(135deg, #1cb0f6 0%, #1796d1 100%)', boxShadow: '0 4px 0 #1480b3' }}
                                            onClick={() => navigate('/learn')}
                                        >
                                            পড়া শুরু করুন (Earn Pollen)
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
                                            {profile?.gender === 'male' 
                                                ? (language === 'bn' ? 'কিং বী মোড দেখুন' : 'View King Bee Mode') 
                                                : (language === 'bn' ? 'কুইন বী মোড দেখুন' : 'View Queen Bee Mode')
                                            }
                                        </button>
                                        <button 
                                            className={styles.cancelBtn}
                                            onClick={() => {
                                                setShowConvertConfirmation(false);
                                                setProcessing(false);
                                            }}
                                            style={{ border: 'none' }}
                                        >
                                            এখন নয়
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.checkoutHeader}>
                                        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '8px' }}>এক্সচেঞ্জ কনফার্ম করুন</h2>
                                        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>
                                            পরাগরেণু দিয়ে হানি ড্রপ পাওয়ার জন্য কনফার্ম করুন
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
                                            না
                                        </button>
                                        <button
                                            onClick={handleConvertAction}
                                            className={styles.confirmBtn}
                                            disabled={processing === true}
                                        >
                                            {processing === true ? <Loader2 className={styles.spinner} /> : 'হ্যাঁ, কনফার্ম'}
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
