import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Heart, Gem, Zap, Check, Shield, Star, ShoppingBag,
    Loader2, Sparkles, CreditCard, ChevronRight,
    Minus, Plus, ArrowRight, TrendingUp, Award
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { shopService } from '../../services/shopService';
import Sidebar from '../learning/components/Sidebar';
import styles from './ShopPage.module.css';
import { toast } from 'sonner';
import InlineLoader from '../../components/ui/InlineLoader';

const GEM_PACKS = [
    { id: 'gem_p1', amount: 500, price: 100, label: 'জেম পকেট', icon: <Gem size={40} color="#1cb0f6" fill="#1cb0f6" /> },
    { id: 'gem_p2', amount: 1200, price: 200, label: 'জেম চেস্ট', icon: <div className="flex gap-[-10px]"><Gem size={32} color="#1cb0f6" fill="#1cb0f6" /><Gem size={32} color="#1cb0f6" fill="#1cb0f6" /></div>, popular: true },
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

    const handlePurchase = async (type, data) => {
        setProcessing(true);
        try {
            let result;
            if (type === 'gems') {
                result = await shopService.buyGems(user.id, data.amount, data.price, data.id);
                if (result.success) {
                    setProfile(prev => ({ ...prev, gems: result.new_gems }));
                    toast.success(`${data.amount}টি জেম যোগ করা হয়েছে!`);
                }
            } else if (type === 'subscription') {
                const subPrice = planType === 'monthly' ? 400 : 4000;
                result = await shopService.subscribeToPremium(user.id, planType, subPrice);
                if (result.success) {
                    await fetchProfile();
                    toast.success(`অভিনন্দন! আপনি এখন সুপার সাবস্ক্রাইবার (${planType})।`);
                }
            }
        } catch (err) {
            toast.error('ক্রয় সম্পন্ন করা যায়নি। পুনরায় চেষ্টা করুন।');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className={styles.shopPage}>
            <Sidebar />
            <main className={styles.mainContent}>
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <InlineLoader />
                    </div>
                ) : (
                    <>
                        <header className={styles.header}>
                            <h1>ও-শেখা স্টোর</h1>
                            <p>আপনার শেখার অভিজ্ঞতাকে আরও সমৃদ্ধ করুন</p>
                        </header>

                        {/* Balance Bar */}
                        <div className={styles.balanceOverview}>
                            <div className={styles.balanceItem}>
                                <div className={styles.balanceLabel}>আপনার জেম</div>
                                <div className={styles.balanceValue}>
                                    <Gem size={24} color="#1cb0f6" fill="#1cb0f6" className="inline mr-2" />
                                    {profile?.gems || 0}
                                </div>
                            </div>
                            <div className={styles.balanceItem}>
                                <div className={styles.balanceLabel}>বর্তমান হার্ট</div>
                                <div className={styles.balanceValue}>
                                    <Heart size={24} color="#ff4b4b" fill="#ff4b4b" className="inline mr-2" />
                                    {profile?.is_premium ? '∞' : (profile?.hearts || 0)}
                                </div>
                            </div>
                        </div>

                        {/* SUPER Subscription Section */}
                        <section className={styles.section}>
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
                                        disabled={processing || profile?.is_premium}
                                    >
                                        {profile?.is_premium ? 'সক্রিয়' : (planType === 'monthly' ? '৳ ৪০০ / মাস' : '৳ ৪০০০ / বছর')}
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* Gem to Heart Converter Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Zap size={24} color="#ff9600" />
                                জেম এক্সচেঞ্জ
                            </h2>
                            <div className={styles.convertCard}>
                                <div className={styles.convertInput}>
                                    <h3 className={styles.convertTitle}>জেম থেকে হার্ট</h3>
                                    <p className={styles.convertSub}>প্রতি ১০ জেমের বিনিময়ে ১টি হার্ট সংগ্রহ করুন</p>

                                    <div className={styles.controlGroup}>
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

                                <ArrowRight className={styles.convertArrow} size={32} />

                                <div className={styles.convertOutput}>
                                    <div className={styles.heartResult}>
                                        <Heart size={40} color="#ff4b4b" fill="#ff4b4b" />
                                        <span>+{calculatedHearts}</span>
                                    </div>
                                    <button
                                        className={styles.exchangeBtn}
                                        onClick={handleConvertAction}
                                        disabled={processing || (profile?.gems < gemToConvert) || (profile?.hearts >= profile?.max_hearts)}
                                    >
                                        {processing ? <Loader2 className="animate-spin" /> : 'বিনিময় করুন'}
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
                )}
            </main>
        </div>
    );
};

export default ShopPage;
