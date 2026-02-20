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

const QUEEN_BEE_FEATURES = [
    { emoji: '🍯', text: 'Unlimited Honey Drops: ভুল করলেও শেখা থামবে না।' },
    { emoji: '🚫', text: 'No Interruption: কোনো অ্যাড নেই, শুধু পিওর লার্নিং।' },
    { emoji: '📜', text: 'Golden Certificates: কোর্সের শেষে বিশেষ কুইন বি সার্টিফিকেট।' },
    { emoji: '⚡', text: 'Priority Access: নতুন কোর্স সবার আগে আপনার জন্য।' },
];

const ShopPage = () => {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [planType, setPlanType] = useState('monthly'); // 'monthly' or 'yearly'
    const [gemToConvert, setGemToConvert] = useState(10);
    const [showCheckout, setShowCheckout] = useState(null); // { type, data }

    const calculatedHearts = Math.floor(gemToConvert / 10);

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

    const handleIncrement = () => setGemToConvert(prev => prev + 10);
    const handleDecrement = () => setGemToConvert(prev => Math.max(10, prev - 10));

    const handleConvertAction = async () => {
        if (!profile || profile.gems < gemToConvert) {
            toast.error(t('insufficient_gems'));
            return;
        }

        setProcessing(true);
        try {
            const result = await shopService.convertGemsToHearts(user.id, calculatedHearts);
            if (result.success) {
                setProfile(prev => ({
                    ...prev,
                    gems: result.new_gems,
                    hearts: result.new_hearts
                }));
                const unit = language === 'bn' ? 'টি' : '';
                toast.success(`${calculatedHearts}${unit} ${language === 'bn' ? 'নতুন Honey Drop যোগ করা হয়েছে!' : 'new Honey Drops have been added!'} 🍯`);
            }
        } catch (err) {
            toast.error(err.message || 'কনভার্ট করতে সমস্যা হয়েছে।');
        } finally {
            setProcessing(false);
        }
    };

    const handlePurchase = (type, data) => {
        // Instead of immediate purchase, go to checkout logic
        if (type === 'subscription' && profile?.is_premium) return;

        const checkoutData = type === 'subscription'
            ? { id: 'premium', amount: 1, price: planType === 'monthly' ? 99 : 999, label: `Queen Bee Mode (${planType === 'monthly' ? t('monthly') : t('yearly')})` }
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
                    setProfile(prev => ({ ...prev, gems: result.new_gems }));
                    toast.success(t('gems_added').replace('টি', `${data.amount}টি`));
                }
            } else if (type === 'subscription') {
                result = await shopService.subscribeToPremium(user.id, planType, data.price);
                if (result.success) {
                    await fetchProfile();
                    toast.success(`অভিনন্দন! আপনি এখন Queen Bee! 👑`);
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
                            <p>মৌচাকের রাজা বা রানী হোন! আনলিমিটেড মধু নিয়ে শিখতে থাকুন 🐝</p>
                            <div className={styles.headerDivider}></div>
                        </header>


                        {/* Queen Bee Membership Section */}
                        <section className={styles.section}>
                            {profile?.is_premium ? (
                                <div className={styles.premiumCard}>
                                    <div className={styles.premiumBadge}>
                                        <span>👑</span>
                                        Queen Bee Mode সক্রিয়
                                    </div>
                                    <div className={styles.superContent}>
                                        <h2 className={`${styles.superTitle} ${styles.premiumTitle}`}>
                                            🎉 আপনি এখন Queen Bee!
                                        </h2>
                                        <p className={styles.convertSub} style={{ color: 'rgba(255,255,255,0.75)', marginBottom: '20px' }}>
                                            আনলিমিটেড Honey Drop এবং অ্যাড-ফ্রি শিক্ষার অভিজ্ঞতা উপভোগ করুন।
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
                                            <Sparkles color="#ffa202" size={32} />
                                            <span style={{ color: '#ffa202', fontWeight: 900 }}>প্রিমিয়াম স্ট্যাটাস সক্রিয় আছে</span>
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

                                    <div className={styles.queenBeeHeader}>
                                        <div className={styles.queenBeeCrown}>👑</div>
                                        <div>
                                            <h2 className={styles.queenBeeTitle}>Queen Bee Mode</h2>
                                            <p className={styles.queenBeeTagline}>মৌচাকের রানী হোন!</p>
                                        </div>
                                    </div>

                                    {/* Features List */}
                                    <div className={styles.queenBeeFeatureList}>
                                        {QUEEN_BEE_FEATURES.map((feature, idx) => (
                                            <div key={idx} className={styles.queenBeeFeatureRow}>
                                                <div className={styles.featureEmojiBox}>
                                                    {feature.emoji === '🍯' ? <HoneyDropIcon size={20} /> : feature.emoji}
                                                </div>
                                                <span className={styles.featureText}>{feature.text}</span>
                                                <Check size={16} color="#ffa202" strokeWidth={3} className={styles.featureCheck} />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Plan Toggle + CTA */}
                                    <div className={styles.queenBeePricing}>
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

                                        <button
                                            className={styles.queenBeeCtaBtn}
                                            onClick={() => handlePurchase('subscription')}
                                            disabled={processing}
                                        >
                                            <span>👑</span>
                                            {planType === 'monthly' ? '৯৯ টাকায় Queen Bee Mode শুরু করুন' : '৯৯৯ টাকায় বার্ষিক সদস্যপদ নিন'}
                                        </button>
                                        <p className={styles.queenBeeCtaSub}>
                                            {planType === 'monthly' ? 'মাত্র ৳৯৯/মাস • যেকোনো সময় বাতিল করুন' : 'মাত্র ৳৯৯৯/বছর • ২ মাস বিনামূল্যে!'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Honey Drop (Gem to Heart) Converter Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <HoneyDropIcon size={28} />
                                Honey Drop রিফিল করুন
                            </h2>
                            <div className={styles.convertCard}>
                                <div className={styles.convertLeft}>
                                    <div className={styles.convertInputContainer}>
                                        <button className={styles.stepBtn} onClick={handleDecrement} disabled={gemToConvert <= 10}>
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
                                        onClick={handleConvertAction}
                                        disabled={processing || (profile?.gems < gemToConvert) || (profile?.hearts >= profile?.max_hearts)}
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

            {showCheckout && (
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
            )}
        </main >
    );
};

export default ShopPage;
