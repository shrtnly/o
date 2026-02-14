import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Heart, Gem, Zap, Check, Shield, Star, ShoppingBag,
    Loader2, Sparkles, CreditCard, ChevronRight,
    Minus, Plus, ArrowRightLeft, TrendingUp, Award, Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { shopService } from '../../services/shopService';
import logo from '../../assets/shields/Logo_BeeLesson.png';
import styles from './ShopPage.module.css';

const GEM_PACKS = [
    { id: 'gem_p1', amount: 500, price: 100, label: 'জেম পকেট', icon: <Gem size={40} color="#1cb0f6" fill="#1cb0f6" /> },
    { id: 'gem_p2', amount: 1200, price: 200, label: 'জেম চেস্ট', icon: <div className={styles.gemStack}><Gem size={32} color="#1cb0f6" fill="#1cb0f6" /><Gem size={32} color="#1cb0f6" fill="#1cb0f6" /></div>, popular: true },
    { id: 'gem_p3', amount: 3000, price: 500, label: 'জেম কার্ট', icon: <ShoppingBag size={48} color="#1cb0f6" strokeWidth={1.5} /> },
    { id: 'gem_p4', amount: 7500, price: 1000, label: 'জেম ভল্ট', icon: <Award size={48} color="#1cb0f6" />, best: true },
];

const ShopPage = () => {
    const { user } = useAuth();
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
            toast.error('আপনার কাছে যথেষ্ট জেম নেই।');
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
                toast.success(`${calculatedHearts}টি নতুন হার্ট যোগ করা হয়েছে!`);
            }
        } catch (err) {
            toast.error(err.message || 'কনভার্ট করতে সমস্যা হয়েছে।');
        } finally {
            setProcessing(false);
        }
    };

    const handlePurchase = (type, data) => {
        // Instead of immediate purchase, go to checkout logic
        if (type === 'subscription' && profile?.is_premium) return;

        const checkoutData = type === 'subscription'
            ? { id: 'premium', amount: 1, price: planType === 'monthly' ? 400 : 4000, label: `সুপার মেম্বারশিপ (${planType === 'monthly' ? 'মাসিক' : 'বার্ষিক'})` }
            : data;

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
                    toast.success(`${data.amount}টি জেম যোগ করা হয়েছে!`);
                }
            } else if (type === 'subscription') {
                result = await shopService.subscribeToPremium(user.id, planType, data.price);
                if (result.success) {
                    await fetchProfile();
                    toast.success(`অভিনন্দন! আপনি এখন সুপার সাবস্ক্রাইবার।`);
                }
            }
            setShowCheckout(null);
        } catch (err) {
            toast.error('পেমেন্ট সফল হয়নি। পুনরায় চেষ্টা করুন।');
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
                            <span className={styles.shopText}>
                                <span className={styles.shopTextGreen}>বী-লেসন</span> শপ
                            </span>
                        </div>
                        <header className={styles.header}>
                            <p>আপনার শেখার অভিজ্ঞতাকে আরও সমৃদ্ধ করুন</p>
                            <div className={styles.headerDivider}></div>
                        </header>


                        {/* Membership Section */}
                        <section className={styles.section}>
                            {profile?.is_premium ? (
                                <div className={styles.premiumCard}>
                                    <div className={styles.premiumBadge}>
                                        <Shield size={14} fill="#fff" />
                                        সুপার মেম্বার
                                    </div>
                                    <div className={styles.superContent}>
                                        <h2 className={`${styles.superTitle} ${styles.premiumTitle}`}>
                                            সুপার সদস্যপদ সক্রিয়
                                        </h2>
                                        <p className={styles.convertSub} style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '16px' }}>
                                            আপনি এখন আনলিমিটেড হার্ট এবং অ্যাড-ফ্রি অভিজ্ঞতা উপভোগ করছেন।
                                        </p>
                                        <div className={styles.superFeatures}>
                                            <div className={styles.feature}>
                                                <div className={styles.featureIcon} style={{ background: '#ffa202' }}><Heart size={12} fill="#fff" /></div>
                                                আনলিমিটেড হার্টস
                                            </div>
                                            <div className={styles.feature}>
                                                <div className={styles.featureIcon} style={{ background: '#ffa202' }}><Star size={12} fill="#fff" /></div>
                                                অ্যাড-ফ্রি লার্নিং
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.superActions}>
                                        <div className={styles.premiumStatus}>
                                            <Sparkles color="#ffa202" size={32} />
                                            <span style={{ color: '#ffa202', fontWeight: 900 }}>প্রিমিয়াম স্ট্যাটাস</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.superCard}>
                                    <div className={styles.superContent}>
                                        <h2 className={styles.superTitle}>সুপার মেম্বারশিপ</h2>
                                        <div className={styles.superFeatures}>
                                            <div className={styles.feature}>
                                                <div className={styles.featureIcon}><Heart size={14} fill="#fff" /></div>
                                                আনলিমিটেড হার্ট
                                            </div>
                                            <div className={styles.feature}>
                                                <div className={styles.featureIcon}><Star size={14} fill="#fff" /></div>
                                                অ্যাড-ফ্রি অভিজ্ঞতা
                                            </div>
                                            <div className={styles.feature}>
                                                <div className={styles.featureIcon}><Zap size={14} fill="#fff" /></div>
                                                দ্রুত প্রগ্রেস
                                            </div>
                                            <div className={styles.feature}>
                                                <div className={styles.featureIcon}><Shield size={14} fill="#fff" /></div>
                                                স্পেশাল ব্যাজ
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.superActions}>
                                        <div className={styles.planToggle}>
                                            <button
                                                className={`${styles.toggleBtn} ${planType === 'monthly' ? styles.toggleBtnActive : ''}`}
                                                onClick={() => setPlanType('monthly')}
                                            >
                                                মাসিক
                                            </button>
                                            <button
                                                className={`${styles.toggleBtn} ${planType === 'yearly' ? styles.toggleBtnActive : ''}`}
                                                onClick={() => setPlanType('yearly')}
                                            >
                                                বার্ষিক
                                                <span className={styles.discountBadge}>-২০%</span>
                                            </button>
                                        </div>
                                        <button
                                            className={styles.subscribeBtn}
                                            onClick={() => handlePurchase('subscription')}
                                            disabled={processing}
                                        >
                                            {planType === 'monthly' ? '৳ ৪০০ / মাস' : '৳ ৪০০০ / বছর'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Gem to Heart Converter Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Zap size={24} color="#ffa202" fill="#ffa202" />
                                জেম এক্সচেঞ্জ
                            </h2>
                            <div className={styles.convertCard}>
                                <div className={styles.convertLeft}>
                                    <div className={styles.convertInputContainer}>
                                        <button className={styles.stepBtn} onClick={handleDecrement} disabled={gemToConvert <= 10}>
                                            <Minus size={20} />
                                        </button>
                                        <div className={styles.gemInputDisplay}>
                                            <Gem size={24} color="#1cb0f6" fill="#1cb0f6" />
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
                                        <Heart size={28} color="#ff4b4b" fill="#ff4b4b" />
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
                                                এক্সচেঞ্জ
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* Gem Packs Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <ShoppingBag size={24} color="#1cb0f6" />
                                জেম প্যাক
                            </h2>
                            <div className={styles.packsGrid}>
                                {GEM_PACKS.map((pack) => (
                                    <div
                                        key={pack.id}
                                        className={styles.packCard}
                                        onClick={() => handlePurchase('gems', pack)}
                                    >
                                        {pack.popular && <span className={styles.badge}>জনপ্রিয়</span>}
                                        {pack.best && <span className={styles.badge} style={{ background: '#58cc02' }}>সেরা মূল্য</span>}

                                        <div className={styles.packIcon}>{pack.icon}</div>
                                        <div className={styles.packAmount}>{pack.amount}</div>
                                        <div className={styles.packName}>{pack.label}</div>
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
                            <h2>পেমেন্ট নিশ্চিত করুন</h2>
                            <p>আপনার অর্ডারটি সম্পন্ন করতে পেমেন্ট মেথড নির্বাচন করুন</p>
                        </div>

                        <div className={styles.orderSummary}>
                            <div className={styles.summaryRow}>
                                <span>আইটেম:</span>
                                <span>{showCheckout.data.label}</span>
                            </div>
                            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                                <span>মোট মূল্য:</span>
                                <span>৳ {showCheckout.data.price}</span>
                            </div>
                        </div>

                        <div className={styles.paymentMethods}>
                            <button className={`${styles.methodBtn} ${styles.methodBtnActive}`}>
                                <CreditCard size={24} />
                                <span>বিকাশ</span>
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
                                বাতিল
                            </button>
                            <button
                                className={styles.confirmBtn}
                                onClick={completeCheckout}
                                disabled={processing}
                            >
                                {processing ? <Loader2 className={styles.spinner} /> : 'পেমেন্ট সম্পন্ন করুন'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main >
    );
};

export default ShopPage;
