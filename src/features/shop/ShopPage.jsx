import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [planType, setPlanType] = useState('monthly'); // 'monthly' or 'yearly'
    const [gemToConvert, setGemToConvert] = useState(20);
    const [showCheckout, setShowCheckout] = useState(null); // { type, data }
    const [showConvertConfirmation, setShowConvertConfirmation] = useState(false);

    const calculatedHearts = Math.floor(gemToConvert / 20);

    const fetchProfile = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (error) throw error;
            setProfile(data);
        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [user]);

    const handleIncrement = () => setGemToConvert(prev => prev + 20);
    const handleDecrement = () => setGemToConvert(prev => Math.max(20, prev - 20));

    const handleConvertAction = async () => {
        if (!profile || profile.gems < gemToConvert) {
            toast.error(t('insufficient_gems'));
            return;
        }

        if (profile.is_premium) {
            toast.error('আপনি একজন কিং বী! আপনার হানি ড্রপ আনলিমিটেড, এক্সচেঞ্জ করার প্রয়োজন নেই। 👑');
            return;
        }

        setProcessing(true);
        console.log('Starting conversion:', { userId: user.id, hearts: calculatedHearts, gems: gemToConvert });
        try {
            const result = await shopService.convertGemsToHearts(user.id, calculatedHearts, gemToConvert);
            console.log('Conversion result:', result);
            if (result && result.success) {
                // Manually update local state first for instant feedback
                setProfile(prev => ({
                    ...prev,
                    gems: result.new_gems ?? (prev.gems - gemToConvert),
                    hearts: result.new_hearts ?? (prev.hearts + calculatedHearts)
                }));

                // Then fetch fresh data as backup
                await fetchProfile();

                const unit = language === 'bn' ? 'টি' : '';
                toast.success(`${calculatedHearts}${unit} ${t('hearts_added_msg')} 🍯`);
            } else {
                toast.error(result?.message || 'কনভার্ট করতে সমস্যা হয়েছে।');
            }
        } catch (err) {
            console.error('Conversion error:', err);
            toast.error(err.message || 'কনভার্ট করতে সমস্যা হয়েছে।');
        } finally {
            setProcessing(false);
        }
    };

    const handlePurchase = (type, data) => {
        // Instead of immediate purchase, go to checkout logic
        if (type === 'subscription' && profile?.is_premium) return;

        const checkoutData = type === 'subscription'
            ? {
                id: 'premium',
                amount: 1,
                price: planType === 'monthly' ? 99 : 999,
                label: `${profile?.gender === 'male' ? t('king_bee_mode') : t('queen_bee_mode')} (${planType === 'monthly' ? t('monthly') : t('yearly')})`
            }
            : { ...data, label: t(data.labelKey) };

        setShowCheckout({ type, data: checkoutData });
    };

    const completeCheckout = async () => {
        if (!showCheckout) return;
        setProcessing(true);
        const { type, data } = showCheckout;

        try {
            let result;
            if (type === 'gems') {
                result = await shopService.buyGems(user.id, data.amount, data.price, data.id);
                if (result.success) {
                    await fetchProfile();
                    toast.success(t('gems_added').replace('টি', `${data.amount}টি`));
                }
            } else if (type === 'subscription') {
                result = await shopService.subscribeToPremium(user.id, planType, data.price);
                if (result.success) {
                    await fetchProfile();
                    const beeName = profile?.gender === 'male' ? t('king_bee_mode') : t('queen_bee_mode');
                    toast.success(`অভিনন্দন! আপনি এখন ${beeName}! 👑`);
                }
            } else if (type === 'hearts') {
                result = await shopService.buyHearts(user.id, data.amount, data.price, data.id);
                if (result.success) {
                    await fetchProfile();
                    toast.success(t('hearts_added').replace('টি', `${data.amount}টি`));
                }
            }
            setShowCheckout(null);
        } catch (err) {
            toast.error('পেমেন্ট সফল হয়নি। পুনরায় চেষ্টা করুন।');
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
                                <p>
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
                                        className={`${styles.qbActivateBtn} ${profile?.is_premium ? styles.activeBtnStyle : ''}`}
                                        onClick={() => !profile?.is_premium && handlePurchase('subscription')}
                                        disabled={processing || profile?.is_premium}
                                    >
                                        {profile?.is_premium
                                            ? (language === 'bn' ? 'সক্রিয়' : 'Active')
                                            : (language === 'bn' ? 'সক্রিয় করুন' : 'Activate')
                                        }
                                    </button>
                                </div>
                            </div>

                            <div className={styles.queenBeeCardHorizontal} style={{ marginTop: '20px' }}>
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
                                        className={`${styles.qbActivateBtn} ${styles.blueBtn}`}
                                        onClick={() => handlePurchase('hearts', { id: 'unlimited_1d', amount: 24, price: 49, labelKey: 'unlimited_1d' })}
                                        disabled={processing}
                                    >
                                        রিচার্জ 1 দিন
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section className={styles.section}>
                            <div className={styles.queenBeeCardHorizontal} style={{ marginTop: '20px' }}>
                                <div className={styles.qbCardLeft}>
                                    <div className={styles.qbIconBg}>
                                        <PollenIcon size={32} />
                                    </div>
                                </div>

                                <div className={styles.qbCardMiddle}>
                                    <h3 className={styles.qbTitleHero}>
                                        {t('exchange')}
                                    </h3>
                                    <div className={styles.qbFeaturesRow} style={{ marginBottom: '8px' }}>
                                        <span className={styles.qbFeaturePill}>
                                            {language === 'bn' ? 'পরাগরেণু দিয়ে রিফিল করুন' : 'Refill honey drops using your pollen'}
                                        </span>
                                    </div>
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
                                        className={`${styles.qbActivateBtn} ${styles.greenBtn}`}
                                        onClick={() => setShowConvertConfirmation(true)}
                                        disabled={processing || (profile?.gems < gemToConvert)}
                                    >
                                        {processing ? <Loader2 size={18} className={styles.spinner} /> : `+${calculatedHearts} হানি ড্রপ`}
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
                    <div className={styles.checkoutOverlay} onClick={() => setShowConvertConfirmation(false)}>
                        <div className={styles.checkoutModal} onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                            <div className={styles.checkoutHeader}>
                                <div style={{ marginBottom: '20px' }}>
                                    <HoneyDropIcon size={72} />
                                </div>
                                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '12px' }}>এক্সচেঞ্জ কনফার্ম করুন</h2>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', marginBottom: '24px' }}>
                                    আপনি কি <strong>{gemToConvert}টি</strong> পরাগরেণু দিয়ে <strong>{calculatedHearts}টি</strong> হানি ড্রপ নিতে চান?
                                </p>
                            </div>

                            {profile?.is_premium && (
                                <div style={{
                                    background: 'rgba(241, 196, 15, 0.1)',
                                    border: '1px solid #f1c40f',
                                    borderRadius: '15px',
                                    padding: '16px',
                                    marginBottom: '24px',
                                    color: '#f1c40f',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    lineHeight: 1.5,
                                    textAlign: 'left',
                                    display: 'flex',
                                    gap: '12px',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '1.5rem' }}>👑</span>
                                    <span>আপনি একজন কিং বী! আপনার হানি ড্রপ কখনো শেষ হবে না, তাই এক্সচেঞ্জ করার প্রয়োজন নেই।</span>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                                <button
                                    onClick={() => setShowConvertConfirmation(false)}
                                    style={{
                                        flex: 1,
                                        padding: '16px',
                                        borderRadius: '16px',
                                        border: '2px solid #37464f',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: '#fff',
                                        fontWeight: 900,
                                        fontSize: '1.1rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    না
                                </button>
                                <button
                                    onClick={() => {
                                        handleConvertAction();
                                        setShowConvertConfirmation(false);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '16px',
                                        borderRadius: '16px',
                                        background: '#f1c40f',
                                        color: '#000',
                                        border: 'none',
                                        fontWeight: 900,
                                        fontSize: '1.1rem',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 0 #9a7d0a',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    হ্যাঁ
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </main >
    );
};

export default ShopPage;
