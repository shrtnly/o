import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    CreditCard, 
    ShieldCheck, 
    ArrowRight,

    CheckCircle2,
    Tag,
    AlertCircle,
    Loader2,
    Info,
    X
} from 'lucide-react';
import bkashLogo from '../../assets/payments/bkash.png';
import nagadLogo from '../../assets/payments/nagad.png';
import visaLogo from '../../assets/payments/visa.png';
import mastercardLogo from '../../assets/payments/mastercard.png';
import amexLogo from '../../assets/payments/amex.png';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { shopService } from '../../services/shopService';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import CheckoutSkeleton from './CheckoutSkeleton';

import styles from './CheckoutPage.module.css';

const CheckoutPage = () => {


    const { user } = useAuth();
    const { t, language, formatNumber } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [profile, setProfile] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('bkash');
    
    // Promo Code State
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [promoLoading, setPromoLoading] = useState(false);
    const [promoError, setPromoError] = useState('');
    
    // Checkout data from location state
    const checkoutData = location.state?.checkoutData;
    const type = location.state?.type;
    const [planType, setPlanType] = useState(location.state?.planType || 'monthly');
    const isSubscription = type === 'subscription';
    
    // Dynamically calculate price if subscription
    const basePrice = isSubscription 
        ? (planType === 'monthly' ? 99 : 999) 
        : checkoutData?.price;

    const discountAmount = Math.round(appliedPromo 
        ? (appliedPromo.discount_type === 'percentage' 
            ? Math.min(basePrice * (appliedPromo.discount_value / 100), appliedPromo.max_discount_amount || Infinity)
            : appliedPromo.discount_value)
        : 0);

    const finalPrice = Math.max(0, basePrice - discountAmount);

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

    const handleApplyPromo = async () => {
        if (!promoCode.trim()) return;
        setAppliedPromo(null); // Reset if applying a new one
        setPromoLoading(true);
        setPromoError('');
        try {
            const { data, error } = await supabase
                .from('promo_codes')
                .select('*')
                .eq('code', promoCode.toUpperCase().trim())
                .eq('is_active', true)
                .single();

            if (error) throw new Error(t('invalid_promo_code') || 'Invalid promo code');

            if (data.valid_until && new Date(data.valid_until) < new Date()) {
                throw new Error(t('promo_code_expired') || 'Promo code expired');
            }
            if (data.usage_limit && data.usage_count >= data.usage_limit) {
                throw new Error(t('usage_limit_reached') || 'Usage limit reached');
            }
            if (basePrice < data.min_purchase) {
                throw new Error(`${t('min_purchase_required') || 'Minimum purchase of'} ৳${data.min_purchase}`);
            }

            setAppliedPromo(data);
        } catch (err) {
            setPromoError(err.message);
        } finally {
            setPromoLoading(false);
        }
    };

    const handleCompleteCheckout = async () => {
        if (processing) return;
        
        setProcessing(true);
        const toastId = toast.loading(t('payment_processing') || 'পেমেন্ট প্রসেস হচ্ছে...');

        try {
            let result;
            const originalPrice = basePrice;
            const promoId = appliedPromo?.id;

            if (type === 'gems') {
                result = await shopService.buyGems(user.id, checkoutData.amount, finalPrice, checkoutData.id, originalPrice, promoId);
            } else if (type === 'subscription') {
                result = await shopService.subscribeToPremium(user.id, planType, finalPrice, originalPrice, promoId);
            } else if (type === '1day') {
                result = await shopService.buy1DayPremium(user.id, finalPrice, originalPrice, promoId);
            } else if (type === 'hearts') {
                result = await shopService.buyHearts(user.id, checkoutData.amount, finalPrice, checkoutData.id, originalPrice, promoId);
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
                    <h1 className={`${styles.pageTitle} ${isSubscription ? styles.premiumTitle : ''}`}>
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
                                <span className={`${styles.itemName} ${isSubscription ? styles.premiumTitle : ''}`}>
                                    {isSubscription 
                                        ? (profile?.gender === 'female' || profile?.gender === 'নারী' ? t('queen_bee_mode') || 'Queen Bee' : t('king_bee_mode') || 'King Bee')
                                        : checkoutData.label
                                    }
                                </span>
                                <span className={styles.itemSub}>
                                    {isSubscription ? (planType === 'yearly' ? t('yearly') : t('monthly')) : (t('one_time_purchase') || 'One-time purchase')}
                                </span>
                            </div>
                            <div className={styles.itemPrice}>
                                {appliedPromo && <span className={styles.originalPrice}>৳{formatNumber(basePrice)}</span>}
                                <span>৳{formatNumber(finalPrice)}</span>
                            </div>
                        </div>

                        {appliedPromo && (
                            <div className={`${styles.detailRow} ${styles.discountRow}`}>
                                <span className={styles.itemName}>
                                    {t('discount_label')} ({appliedPromo.discount_type === 'percentage' 
                                        ? `${formatNumber(appliedPromo.discount_value)}%` 
                                        : `৳${formatNumber(appliedPromo.discount_value)}`})
                                </span>
                                <span className={styles.discountAmount}>-৳{formatNumber(discountAmount)}</span>
                            </div>
                        )}

                        <div className={styles.detailRow}>
                            <span className={styles.itemName}>{t('tax') || 'Tax'}</span>
                            <span className={styles.itemPrice}>৳{formatNumber(0)}</span>
                        </div>

                        <div className={`${styles.detailRow} ${styles.totalRow}`}>
                            <span className={styles.itemName}>{t('total_due_today') || 'Total due today'}</span>
                            <span className={styles.itemPrice}>৳{formatNumber(finalPrice)}</span>
                        </div>
                    </div>
                </section>

                {/* Auto-renew Info Box + Promo Codes */}
                <div className={styles.infoBox}>
                    <div className="flex-1">
                        <div className={styles.promoContainer}>
                            <div className={styles.promoInputWrapper}>
                                <div className={styles.inputWithIcon}>
                                    <input 
                                        type="text" 
                                        className={styles.promoInput}
                                        placeholder={t('enter_promo_code') || 'Coupon code'}
                                        value={promoCode}
                                        onChange={(e) => {
                                            setPromoCode(e.target.value);
                                            setPromoError('');
                                            setAppliedPromo(null);
                                        }}
                                        disabled={appliedPromo}
                                    />
                                    {appliedPromo && (
                                        <button 
                                            className={styles.clearBtn}
                                            onClick={() => { setAppliedPromo(null); setPromoCode(''); }}
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                                <button 
                                    className={`${styles.applyBtn} ${appliedPromo ? styles.btnSuccess : (promoError ? styles.btnError : '')}`}
                                    onClick={handleApplyPromo}
                                    disabled={promoLoading || !promoCode.trim()}
                                >
                                    {promoLoading ? (
                                        <Loader2 className={styles.spinner} size={18} />
                                    ) : appliedPromo ? (
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={16} />
                                            <span>{t('promo_success_msg')}</span>
                                        </div>
                                    ) : promoError ? (
                                        <div className="flex items-center gap-2">
                                            <AlertCircle size={16} />
                                            <span>{language === 'bn' ? 'ব্যর্থ' : 'Invalid'}</span>
                                        </div>
                                    ) : (
                                        <span>{t('apply')}</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Method Section */}
                <section className={styles.sectionCard}>
                    <h2 className={styles.sectionHeading}>{t('payment_method') || 'Payment method'}</h2>

                    <div className={styles.paymentGrid}>
                        <button 
                            className={`${styles.methodCard} ${paymentMethod === 'bkash' ? styles.active : ''}`}
                            onClick={() => setPaymentMethod('bkash')}
                        >
                            <div className={styles.radioIndicator} />
                            <div className={styles.methodLogo}>
                                <img src={bkashLogo} alt="bKash" />
                            </div>
                        </button>
                        <button 
                            className={`${styles.methodCard} ${paymentMethod === 'nagad' ? styles.active : ''}`}
                            onClick={() => setPaymentMethod('nagad')}
                        >
                            <div className={styles.radioIndicator} />
                            <div className={styles.methodLogo}>
                                <img src={nagadLogo} alt="Nagad" />
                            </div>
                        </button>
                        <button 
                            className={`${styles.methodCard} ${paymentMethod === 'card' ? styles.active : ''}`}
                            onClick={() => setPaymentMethod('card')}
                        >
                            <div className={styles.radioIndicator} />
                            <div className={styles.methodLogoGroup}>
                                <img src={visaLogo} alt="Visa" />
                                <img src={mastercardLogo} alt="Mastercard" />
                                <img src={amexLogo} alt="Amex" />
                            </div>
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
