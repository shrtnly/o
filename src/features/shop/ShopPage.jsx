import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Zap, Check, Shield, Star, ShoppingBag,
    Loader2, Sparkles, CreditCard, ChevronRight,
    Minus, Plus, ArrowRightLeft, TrendingUp, Award, Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { shopService } from '../../services/shopService';
import logo from '../../assets/shields/Logo_BeeLesson.png';
import styles from './ShopPage.module.css';
import { useLanguage } from '../../context/LanguageContext';
import HoneyDropIcon from '../../components/HoneyDropIcon';
import PollenIcon from '../../components/PollenIcon';
import { toast } from 'sonner';

const GEM_PACKS = [
    { id: 'gem_p1', amount: 500, price: 100, labelKey: 'gem_pocket', icon: <PollenIcon size={40} /> },
    { id: 'gem_p2', amount: 1200, price: 200, labelKey: 'gem_chest', icon: <div className={styles.gemStack}><PollenIcon size={32} /><PollenIcon size={32} /></div>, popular: true },
    { id: 'gem_p3', amount: 3000, price: 500, labelKey: 'gem_cart', icon: <PollenIcon size={48} /> },
    { id: 'gem_p4', amount: 7500, price: 1000, labelKey: 'gem_vault', icon: <PollenIcon size={54} />, best: true },
];

const HEART_PACKS = [
    { id: 'heart_p1', amount: 5, price: 5, labelKey: 'heart_refill_5', icon: <HoneyDropIcon size={44} /> },
];

const QUEEN_BEE_FEATURES = [
    { emoji: '🍯', text: 'ভুল করলেও শেখা থামবে না।' },
    { emoji: '🚫', text: 'কোনো অ্যাড নেই, পিওর লার্নিং।' },
    { emoji: '📜', text: 'বিশেষ কুইন বী সার্টিফিকেট।' },
    { emoji: '⚡', text: 'নতুন কোর্স সবার আগে আপনার জন্য।' },
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
                        <div className={styles.shopLogoWrapper}>
                            <span className={styles.shopTexlearnt}>
                                <span className={styles.shopTextGreen}>
                                    {language === 'bn' ? 'বী-লেসন' : 'BeeLesson'}
                                </span> {t('shop')}
                            </span>
                        </div>
                        <header className={styles.header}>
                            <p>
                                {profile?.gender === 'male'
                                    ? 'মৌচাকের রাজা হোন! আনলিমিটেড মধু নিয়ে শিখতে থাকুন'
                                    : 'মৌচাকের রানী হোন! আনলিমিটেড মধু নিয়ে শিখতে থাকুন'}
                            </p>
                            <div className={styles.headerDivider}></div>
                        </header>


                        {/* Queen Bee Membership Section */}
                        <section className={styles.section}>
                            {profile?.is_premium ? (
                                <div className={styles.premiumCard}>
                                    <div className={styles.premiumBadge}>
                                        <span>👑</span>
                                        {profile?.gender === 'male' ? `${t('king_bee_mode')} সক্রিয়` : `${t('queen_bee_mode')} সক্রিয়`}
                                    </div>
                                    <div className={styles.superContent}>
                                        <h2 className={`${styles.superTitle} ${styles.premiumTitle}`}>
                                            🎉 আপনি এখন {profile?.gender === 'male' ? t('king_bee_mode') : t('queen_bee_mode')}!
                                        </h2>
                                        <p className={styles.convertSub} style={{ color: 'rgba(255,255,255,0.75)', marginBottom: '20px' }}>
                                            আনলিমিটেড {t('honey_drop')} এবং অ্যাড-ফ্রি শিক্ষার অভিজ্ঞতা উপভোগ করুন।
                                        </p>
                                        <div className={styles.queenBeeFeatureGrid}>
                                            {QUEEN_BEE_FEATURES.map((f, i) => (
                                                <div key={i} className={styles.queenBeeFeatureItem}>
                                                    <span className={styles.queenBeeFeatureEmoji}>{f.emoji}</span>
                                                    <span>{f.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={styles.superActions}>
                                        <div className={styles.premiumStatus}>
                                            <Sparkles color="#f1c40f" size={32} />
                                            <span style={{ color: '#f1c40f', fontWeight: 900 }}>প্রিমিয়াম স্ট্যাটাস সক্রিয় আছে</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.queenBeeCard}>
                                    {/* Decorative hexagon pattern */}
                                    <div className={styles.hexPattern} aria-hidden="true">
                                        {['⬡', '⬡', '⬡', '⬡', '⬡', '⬡'].map((h, i) => (
                                            <span key={i} className={styles.hexItem} style={{ opacity: 0.08 + i * 0.02, fontSize: `${28 + i * 6}px` }}>{h}</span>
                                        ))}
                                    </div>

                                    <div className={styles.queenBeeHeader} style={{ justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div className={styles.queenBeeCrown}>👑</div>
                                            <div>
                                                <h2 className={styles.queenBeeTitle}>
                                                    {profile?.gender === 'male' ? t('king_bee_mode') : t('queen_bee_mode')}
                                                </h2>
                                                <p className={styles.queenBeeTagline}>
                                                    {profile?.gender === 'male'
                                                        ? (language === 'bn' ? 'মৌচাকের রাজা হোন!' : 'Be the King of the Hive!')
                                                        : (language === 'bn' ? 'মৌচাকের রানী হোন!' : 'Be the Queen of the Hive!')
                                                    }
                                                </p>
                                            </div>
                                        </div>
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

                                    {/* Features List */}
                                    <div className={styles.queenBeeFeatureList}>
                                        {QUEEN_BEE_FEATURES.map((feature, idx) => {
                                            const displayMessage = profile?.gender === 'male'
                                                ? feature.text.replace('কুইন বী', 'কিং বী')
                                                : feature.text;
                                            return (
                                                <div key={idx} className={styles.queenBeeFeatureRow}>
                                                    <div className={styles.featureEmojiBox}>
                                                        {feature.emoji === '🍯' ? <HoneyDropIcon size={20} /> : feature.emoji}
                                                    </div>
                                                    <span className={styles.featureText}>{displayMessage}</span>
                                                    <Check size={14} color="#f1c40f" strokeWidth={4} className={styles.featureCheck} />
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Pricing CTA */}
                                    <div className={styles.queenBeePricing}>
                                        <button
                                            className={styles.queenBeeCtaBtn}
                                            onClick={() => handlePurchase('subscription')}
                                            disabled={processing}
                                        >
                                            <span>👑</span>
                                            {planType === 'monthly'
                                                ? <><span className={styles.ctaPrice}>99</span><span className={styles.ctaLabel}> টাকায় শুরু করুন</span></>
                                                : <><span className={styles.ctaPrice}>999</span><span className={styles.ctaLabel}> টাকায় বার্ষিক</span></>}
                                        </button>
                                        <p className={styles.queenBeeCtaSub}>
                                            {planType === 'monthly' ? 'মাত্র ৳99/মাস • যেকোনো সময় বাতিল করুন' : 'মাত্র ৳999/বছর • 2 মাস বিনামূল্যে!'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Honey Drop Packs Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Zap size={28} />
                                হানি ড্রপ প্যাক (একদম নতুন)
                            </h2>
                            <div className={styles.packsGrid} style={{ gridTemplateColumns: '1fr' }}>
                                {HEART_PACKS.map((pack) => (
                                    <div
                                        key={pack.id}
                                        className={`${styles.packCard} ${styles.packCardLandscape}`}
                                        onClick={() => handlePurchase('hearts', pack)}
                                        style={{ borderColor: '#f1c40f', background: 'rgba(241, 196, 15, 0.05)' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                            <div className={styles.packIcon}>
                                                {pack.icon}
                                            </div>
                                            <div>
                                                <div className={styles.packAmount} style={{ color: '#f1c40f' }}>{pack.amount} {t('honey_drop')}</div>
                                                <div className={styles.packName} style={{ marginBottom: 0 }}>{t(pack.labelKey)}</div>
                                            </div>
                                        </div>

                                        <div className={styles.priceTag} style={{ background: '#f1c40f' }}>৳ {pack.price}</div>
                                        <span className={styles.badge} style={{ background: '#f1c40f', color: '#fff', left: '24px', top: '-10px' }}>ইনস্ট্যান্ট</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Honey Drop (Gem to Heart) Converter Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Settings size={28} />
                                পরাগরেণু এক্সচেঞ্জ করুন
                            </h2>
                            <div className={styles.convertCard}>
                                <div className={styles.convertLeft}>
                                    <div className={styles.convertInputContainer}>
                                        <button className={styles.stepBtn} onClick={handleDecrement} disabled={gemToConvert <= 20}>
                                            <Minus size={20} />
                                        </button>
                                        <div className={styles.gemInputDisplay}>
                                            <PollenIcon size={24} />
                                            <span>{gemToConvert}</span>
                                        </div>
                                        <button className={styles.stepBtn} onClick={handleIncrement}>
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                    <div className={styles.gemBalanceInfo}>
                                        আপনার পরাগরেণু: <PollenIcon size={14} /> <span>{(profile?.gems || 0) - gemToConvert}</span>
                                    </div>
                                </div>

                                <div className={styles.convertCenter}>
                                    <ArrowRightLeft className={styles.convertArrow} size={32} color="#ffffff" />
                                </div>

                                <div className={styles.convertRight}>
                                    <div className={styles.heartResultMinimal}>
                                        <HoneyDropIcon size={28} />
                                        <span>+{calculatedHearts}</span>
                                    </div>
                                    <button
                                        className={styles.exchangeBtnMinimal}
                                        onClick={() => setShowConvertConfirmation(true)}
                                        disabled={processing || (profile?.gems < gemToConvert)}
                                    >
                                        {processing ? <Loader2 className={styles.spinner} /> : (
                                            <>
                                                <Settings size={18} className={styles.btnIcon} />
                                                {t('exchange')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </section>


                        {/* Pollen Packs Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <PollenIcon size={28} />
                                {t('gem_packs')}
                            </h2>
                            <div className={styles.packsGrid}>
                                {GEM_PACKS.map((pack) => (
                                    <div
                                        key={pack.id}
                                        className={styles.packCard}
                                        onClick={() => handlePurchase('gems', pack)}
                                    >
                                        {pack.popular && <span className={styles.badge}>জনপ্রিয়</span>}
                                        {pack.best && <span className={styles.badge} style={{ background: '#58cc02' }}>সেরা মূল্য</span>}

                                        <div className={styles.packIcon}>{pack.icon}</div>
                                        <div className={styles.packAmount}>{pack.amount}</div>
                                        <div className={styles.packName}>{t(pack.labelKey)}</div>
                                        <div className={styles.priceTag}>৳ {pack.price}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </>
                )
                }
            </div >

            {
                showCheckout && (
                    <div className={styles.checkoutOverlay}>
                        <div className={styles.checkoutModal}>
                            <div className={styles.checkoutHeader}>
                                <h2>{t('confirm_payment')}</h2>
                                <p>{t('payment_desc')}</p>
                            </div>

                            <div className={styles.orderSummary}>
                                <div className={styles.summaryRow}>
                                    <span>{t('item')}:</span>
                                    <span>{showCheckout.data.label}</span>
                                </div>
                                <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                                    <span>{t('total_price')}:</span>
                                    <span>৳ {showCheckout.data.price}</span>
                                </div>
                            </div>

                            <div className={styles.paymentMethods}>
                                <button className={`${styles.methodBtn} ${styles.methodBtnActive}`}>
                                    <CreditCard size={24} />
                                    <span>{language === 'bn' ? 'বিকাশ' : 'bKash'}</span>
                                </button>
                                <button className={styles.methodBtn}>
                                    <ShoppingBag size={24} />
                                    <span>নগদ</span>
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
