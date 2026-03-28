import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    CreditCard, 
    ShieldCheck, 
    ArrowRight,

    Loader2,
    Info,
    CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { shopService } from '../../services/shopService';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import CheckoutSkeleton from './CheckoutSkeleton';

import styles from './CheckoutPage.module.css';

const CheckoutPage = () => {


    const { user } = useAuth();
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [profile, setProfile] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('bkash');
    
    // Checkout data from location state
    const checkoutData = location.state?.checkoutData;
    const type = location.state?.type;
    const [planType, setPlanType] = useState(location.state?.planType || 'monthly');
    const isSubscription = type === 'subscription';
    
    // Dynamically calculate price if subscription
    const finalPrice = isSubscription 
        ? (planType === 'monthly' ? 99 : 999) 
        : checkoutData?.price;

    useEffect(() => {
        if (!checkoutData) {
            navigate('/shop');
            return;
        }

        const fetchProfile = async () => {
            if (!user) return;
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user, checkoutData, navigate]);

    const handleCompleteCheckout = async () => {
        if (processing) return;
        
        setProcessing(true);
        const toastId = toast.loading(t('payment_processing') || 'পেমেন্ট প্রসেস হচ্ছে...');

        try {
            let result;
            if (type === 'gems') {
                result = await shopService.buyGems(user.id, checkoutData.amount, finalPrice, checkoutData.id);
            } else if (type === 'subscription') {
                result = await shopService.subscribeToPremium(user.id, planType, finalPrice);
            } else if (type === '1day') {
                result = await shopService.buy1DayPremium(user.id, finalPrice);
            } else if (type === 'hearts') {
                result = await shopService.buyHearts(user.id, checkoutData.amount, finalPrice, checkoutData.id);
            }

            if (result?.success) {
                toast.success(t('purchase_success') || 'সফলভাবে কেনা হয়েছে!', { id: toastId });
                setTimeout(() => {
                    navigate('/shop', { replace: true });
                }, 1500);
            } else {
                throw new Error(result?.message || 'Something went wrong');
            }
        } catch (err) {
            console.error('Checkout error:', err);
            toast.error(t('payment_failed') || 'পেমেন্ট ব্যর্থ হয়েছে', { id: toastId });
            setProcessing(false);
        }
    };

    if (loading) {
        return <CheckoutSkeleton />;
    }


    return (
        <div className={styles.checkoutPage}>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <button onClick={() => navigate(-1)} className={styles.backBtn}>
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className={styles.pageTitle}>
                        {isSubscription ? (t('super_bee_title') || 'Super Bee') : checkoutData.label}
                    </h1>
                </div>

                {/* Plan Selector (Mirroring Reference Image) */}
                {isSubscription && (
                    <div className={styles.planGrid}>
                        <div 
                            className={`${styles.planCard} ${planType === 'monthly' ? styles.active : ''}`}
                            onClick={() => setPlanType('monthly')}
                        >
                            <div className={styles.radioIndicator} />
                            <div className={styles.planInfo}>
                                <span className={styles.planLabel}>{t('monthly') || 'Monthly'}</span>
                                <span className={styles.planPrice}>৳99</span>
                            </div>
                        </div>

                        <div 
                            className={`${styles.planCard} ${planType === 'yearly' ? styles.active : ''}`}
                            onClick={() => setPlanType('yearly')}
                        >
                            <div className={styles.radioIndicator} />
                            <div className={styles.planInfo}>
                                <span className={styles.planLabel}>{t('yearly') || 'Yearly'}</span>
                                <span className={styles.planPrice}>৳999</span>
                            </div>
                            <span className={styles.saveBadge}>{t('save_percentage_yearly') || 'Save 16%'}</span>
                        </div>
                    </div>
                )}

                {/* Order Details Card */}
                <section className={styles.sectionCard}>
                    <h2 className={styles.sectionHeading}>{t('order_details') || 'Order details'}</h2>

                    
                    <div className={styles.detailsList}>
                        <div className={styles.detailRow}>
                            <div className={styles.detailLabel}>
                                <span className={styles.itemName}>
                                    {isSubscription 
                                        ? (profile?.gender === 'male' ? t('king_bee_mode') || 'King Bee' : t('queen_bee_mode') || 'Queen Bee')
                                        : checkoutData.label
                                    }
                                </span>
                                <span className={styles.itemSub}>
                                    {isSubscription ? (planType === 'yearly' ? t('yearly') : t('monthly')) : (t('one_time_purchase') || 'One-time purchase')}
                                </span>
                            </div>
                            <span className={styles.itemPrice}>৳{finalPrice}</span>
                        </div>

                        <div className={styles.detailRow}>
                            <span className={styles.itemName}>{t('tax') || 'Tax'}</span>
                            <span className={styles.itemPrice}>৳0</span>
                        </div>

                        <div className={`${styles.detailRow} ${styles.totalRow}`}>
                            <span className={styles.itemName}>{t('total_due_today') || 'Total due today'}</span>
                            <span className={styles.itemPrice}>৳{finalPrice}</span>
                        </div>
                    </div>
                </section>

                {/* Auto-renew Info Box */}
                {isSubscription && (
                    <div className={styles.infoBox}>
                        <Info className={styles.infoIcon} size={20} />
                        <p>
                            {t('auto_renew_msg') || 'Your subscription will auto-renew on '}
                            {new Date(new Date().setFullYear(new Date().getFullYear() + (planType === 'yearly' ? 1 : 0), new Date().getMonth() + (planType === 'monthly' ? 1 : 0))).toLocaleDateString()}
                            . {t('auto_renew_note') || `You will be charged ৳${finalPrice}/${planType === 'yearly' ? (t('year') || 'year') : (t('month') || 'month')}.`}

                        </p>
                    </div>
                )}

                {/* Payment Method Section */}
                <section className={styles.sectionCard}>
                    <h2 className={styles.sectionHeading}>{t('payment_method') || 'Payment method'}</h2>

                    <div className={styles.paymentGrid}>
                        <button 
                            className={`${styles.methodBtn} ${paymentMethod === 'bkash' ? styles.active : ''}`}
                            onClick={() => setPaymentMethod('bkash')}
                        >
                            <CheckCircle2 size={24} color={paymentMethod === 'bkash' ? '#3b82f6' : '#555'} />
                            <span>{t('bkash') || 'bKash'}</span>
                        </button>
                        <button 
                            className={`${styles.methodBtn} ${paymentMethod === 'nagad' ? styles.active : ''}`}
                            onClick={() => setPaymentMethod('nagad')}
                        >
                            <CheckCircle2 size={24} color={paymentMethod === 'nagad' ? '#3b82f6' : '#555'} />
                            <span>{t('nagad') || 'Nagad'}</span>
                        </button>
                    </div>
                </section>

                {/* Action Button */}
                <div className={styles.actions}>
                    <button 
                        className={styles.confirmBtn}
                        onClick={handleCompleteCheckout}
                        disabled={processing}
                    >
                        {processing ? (
                            <Loader2 className={styles.spinner} />
                        ) : (
                            <>
                                <span>{t('confirm_payment') || 'Confirm and Pay'}</span>
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                    <p className={styles.secureNote}>
                        <ShieldCheck size={16} color="#4ade80" />
                        {t('secure_checkout') || 'Secure checkout with end-to-end encryption'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
