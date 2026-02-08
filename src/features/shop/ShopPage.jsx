import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Heart, Gem, Zap, Check, Shield, Star, ShoppingBag,
    Loader2, Sparkles, CreditCard, ChevronRight,
    Minus, Plus, ArrowRight, TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { shopService } from '../../services/shopService';
import Sidebar from '../learning/components/Sidebar';
import styles from './ShopPage.module.css';
import { toast } from 'sonner';
import LoadingScreen from '../../components/ui/LoadingScreen';
import InlineLoader from '../../components/ui/InlineLoader';

const GEM_PACKS = [
    { id: 'gem_p1', amount: 500, price: 100, label: 'জেম পকেট', icon: <Gem size={48} color="#1cb0f6" fill="#1cb0f6" /> },
    { id: 'gem_p2', amount: 1200, price: 200, label: 'জেম চেস্ট', icon: <div style={{ display: 'flex', gap: '-15px' }}><Gem size={40} color="#1cb0f6" fill="#1cb0f6" /><Gem size={40} color="#1cb0f6" fill="#1cb0f6" /></div>, popular: true },
    { id: 'gem_p3', amount: 3000, price: 500, label: 'জেম কার্ট', icon: <ShoppingBag size={52} color="#1cb0f6" strokeWidth={1.5} /> },
    { id: 'gem_p4', amount: 7500, price: 1000, label: 'জেম ভল্ট', icon: <TrendingUp size={52} color="#1cb0f6" />, best: true },
];

const ShopPage = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Subscription Toggle State
    const [planType, setPlanType] = useState('monthly'); // 'monthly' or 'yearly'

    // Gem Converter State
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
                toast.success(`${calculatedHearts}টি নতুন হার্ট যোগ করা হয়েছে!`, {
                    description: 'আপনার জেম সফলভাবে কনভার্ট করা হয়েছে।'
                });
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
                    await fetchProfile(); // Refresh profile for is_premium
                    toast.success(`অভিনন্দন! আপনি এখন সুপার সাবস্ক্রাইবার (${planType})।`);
                }
            }
        } catch (err) {
            console.error('Purchase error:', err);
            toast.error('ক্রয় সম্পন্ন করা যায়নি। পুনরায় চেষ্টা করুন।');
        } finally {
            setProcessing(false);
        }
    };



    return (
        <div className={styles.shopPage}>
            <main className={styles.mainContent}>
                {loading ? (
                    <div className="flex items-center justify-center h-full w-full">
                        <InlineLoader />
                    </div>
                ) : (
                    <>
                        <header className={styles.header}>
                            <h1>ও-শেখা স্টোর</h1>
                            <p>আপনার শেখার গতি বাড়াতে প্রয়োজনীয় রিসোর্স সংগ্রহ করুন।</p>
                        </header>

                        {/* SUPER Subscription Section */}
                        <section className={styles.section}>
                            <div className={styles.superCard}>
                                <div className={styles.superContent}>
                                    <div className={styles.superHeader}>
                                        <span className={styles.superTag}>SUPER MEMBERSHIP</span>
                                        <h2 className={styles.superTitle}>সুপার সাবস্ক্রিপশন</h2>
                                    </div>
                                    <div className={styles.superFeaturesCompact}>
                                        <div className={styles.compactFeature}><Check size={16} className={styles.featureCheck} /> আনলিমিটেড হার্ট</div>
                                        <div className={styles.compactFeature}><Check size={16} className={styles.featureCheck} /> অ্যাড-ফ্রি লার্নিং</div>
                                        <div className={styles.compactFeature}><Check size={16} className={styles.featureCheck} /> স্পেশাল প্রোফাইল ব্যাজ</div>
                                    </div>
                                </div>

                                <div className={styles.superRightArea}>
                                    <div className={styles.toggleContainer}>
                                        <div
                                            className={styles.toggleIndicator}
                                            style={{
                                                width: '90px',
                                                transform: planType === 'monthly' ? 'translateX(0)' : 'translateX(90px)'
                                            }}
                                        />
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
                                            {planType === 'yearly' && <span className={styles.yearlyBadge}>-২০%</span>}
                                        </button>
                                    </div>

                                    <button
                                        className={styles.superAction}
                                        onClick={() => handlePurchase('subscription')}
                                        disabled={processing || profile?.is_premium}
                                    >
                                        {profile?.is_premium ? 'সক্রিয়' : (planType === 'monthly' ? '৳৪০০.০০ / মাস' : '৳৪০০০.০০ / বছর')}
                                        <ChevronRight size={22} />
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* Gem to Heart Converter Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>জেম এক্সচেঞ্জ</h2>
                            <div className={styles.convertCard}>
                                <div className={styles.convertInputArea}>
                                    <h3 className={styles.convertTitle}>জেম থেকে হার্ট</h3>
                                    <p className={styles.convertDesc}>আপনার জেম ব্যবহার করে হার্ট রিফিল করুন। (১০ জেম = ১ হার্ট)</p>

                                    <div className={styles.controlBox}>
                                        <button className={styles.controlBtn} onClick={handleDecrement}><Minus size={20} /></button>
                                        <div className={styles.gemValue}>
                                            <Gem size={28} color="#1cb0f6" fill="#1cb0f6" />
                                            <span>{gemToConvert}</span>
                                        </div>
                                        <button className={styles.controlBtn} onClick={handleIncrement}><Plus size={20} /></button>

                                        <ArrowRight className={styles.arrowIcon} size={32} />
                                    </div>
                                </div>

                                <div className={styles.convertResult}>
                                    <div className={styles.heartCount}>
                                        <Heart size={48} color="#ff4b4b" fill="#ff4b4b" />
                                        <span>+{calculatedHearts}</span>
                                    </div>
                                    <button
                                        className={styles.convertBtn}
                                        onClick={handleConvertAction}
                                        disabled={processing || (profile?.gems < gemToConvert) || (profile?.hearts >= profile?.max_hearts)}
                                    >
                                        {processing ? <Loader2 className={styles.spinner} size={20} /> : 'কনভার্ট করুন'}
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* Gem Packs Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>জেম প্যাক কিনুন</h2>
                            <div className={styles.packsGrid}>
                                {GEM_PACKS.map((pack) => (
                                    <div
                                        key={pack.id}
                                        className={styles.packCard}
                                        onClick={() => handlePurchase('gems', pack)}
                                    >
                                        {pack.popular && <span className={styles.bestValue} style={{ background: '#1cb0f6', color: '#fff' }}>POPULAR</span>}
                                        {pack.best && <span className={styles.bestValue}>BEST VALUE</span>}

                                        <div className={styles.packIcon}>{pack.icon}</div>
                                        <div className={styles.packAmount}>{pack.amount}</div>
                                        <div className={styles.packLabel}>{pack.label}</div>
                                        <div className={styles.packPrice}>৳{pack.price}.০০</div>
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
