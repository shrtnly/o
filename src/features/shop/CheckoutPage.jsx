import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    ShieldCheck, 
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    Loader2,
    X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { shopService } from '../../services/shopService';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import CheckoutSkeleton from './CheckoutSkeleton';

import styles from './CheckoutPage.module.css';
import SEO from '../../components/SEO';

const CheckoutPage = () => {


    const { user } = useAuth();
    const { t, language, formatNumber } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [profile, setProfile] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('bkash');
    
    // Custom manual payment states
    const [transactionId, setTransactionId] = useState('');
    const [userEmail, setUserEmail] = useState('');
    
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

    // True when promo covers 100% — no payment needed
    const isFreeCheckout = finalPrice === 0 && appliedPromo !== null;

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
                if (user.email) {
                    setUserEmail(user.email);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user, checkoutData, navigate]);

    const getPurchaseTypeName = () => {
        if (type === 'subscription') {
            const isFemale = profile?.gender === 'female' || profile?.gender === 'নারী';
            if (language === 'bn') {
                return isFemale ? 'সুপার কুইন বি' : 'সুপার কিং বি';
            }
            return isFemale ? 'Super Queen Bee' : 'Super King Bee';
        }
        if (type === '1day') {
            return language === 'bn' ? 'বি প্রিমিয়াম' : 'Bee Premium';
        }
        return checkoutData?.label || (language === 'bn' ? 'অন্যান্য' : 'Other');
    };

    const getValidityName = () => {
        if (type === 'subscription') {
            if (planType === 'yearly') {
                return language === 'bn' ? 'বার্ষিক (১ বছর)' : 'Yearly (1 Year)';
            }
            return language === 'bn' ? 'মাসিক (৩০ দিন)' : 'Monthly (30 Days)';
        }
        if (type === '1day') {
            return language === 'bn' ? '১০ দিন' : '10 Days';
        }
        return language === 'bn' ? 'লাইফটাইম / এককালীন' : 'Lifetime / One-time';
    };

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

            // Check promo code applicability
            if (data.applicable_to && data.applicable_to !== 'all') {
                if (data.applicable_to === 'subscription' && !isSubscription) {
                    throw new Error(
                        language === 'bn' 
                            ? 'এই প্রোমো কোডটি শুধুমাত্র সুপার বি প্রিমিয়াম-এর জন্য প্রযোজ্য' 
                            : 'This promo code is only applicable to Super Bee Premium'
                    );
                }
                if (data.applicable_to === '1day' && type !== '1day') {
                    throw new Error(
                        language === 'bn' 
                            ? 'এই প্রোমো কোডটি শুধুমাত্র বি প্রিমিয়াম-এর জন্য প্রযোজ্য' 
                            : 'This promo code is only applicable to Bee Premium'
                    );
                }
            }

            setAppliedPromo(data);
        } catch (err) {
            setPromoError(err.message);
        } finally {
            setPromoLoading(false);
        }
    };

    const handleCompleteCheckout = async () => {
        // For free checkout (100% discount), only email is required
        if (!isFreeCheckout && !transactionId.trim()) {
            toast.error(language === 'bn' ? 'অনুগ্রহ করে ট্রানজেকশন আইডি প্রদান করুন!' : 'Please enter a transaction ID!');
            return;
        }
        if (!userEmail.trim()) {
            toast.error(language === 'bn' ? 'অনুগ্রহ করে আপনার ইমেইল প্রদান করুন!' : 'Please enter your email!');
            return;
        }

        if (processing) return;
        setProcessing(true);

        // FREE CHECKOUT (100% promo discount)
        if (isFreeCheckout) {
            const toastId = toast.loading(language === 'bn' ? 'সাবস্ক্রিপশন একটিভ করা হচ্ছে...' : 'Activating your subscription...');
            try {
                if (isSubscription) {
                    await shopService.subscribeToPremium(user.id, planType, 0, basePrice, appliedPromo?.id || null);
                } else if (type === '1day') {
                    await shopService.buy1DayPremium(user.id, 0, basePrice, appliedPromo?.id || null);
                }
                await supabase.from('Payment').insert([{
                    user_id: user.id,
                    email: userEmail.trim(),
                    transaction_id: `PROMO-${appliedPromo?.code || 'FREE'}-${Date.now()}`,
                    amount: 0,
                    plan_type: type === 'subscription' ? planType : (type === '1day' ? '10day' : type),
                    subscription_type: getPurchaseTypeName(),
                    status: 'approved'
                }]);
                toast.success(
                    language === 'bn'
                        ? '🎉 আপনার সাবস্ক্রিপশন সফলভাবে একটিভ হয়েছে!'
                        : '🎉 Your subscription has been activated successfully!',
                    { id: toastId }
                );
                setTimeout(() => navigate('/shop', { replace: true }), 2000);
            } catch (err) {
                console.error('Free checkout error:', err);
                toast.error(
                    language === 'bn'
                        ? `একটিভ করতে সমস্যা হয়েছে: ${err.message}`
                        : `Activation failed: ${err.message}`,
                    { id: toastId }
                );
                setProcessing(false);
            }
            return;
        }

        // PAID CHECKOUT
        const toastId = toast.loading(language === 'bn' ? 'আপনার পেমেন্ট রিকোয়েস্ট পাঠানো হচ্ছে...' : 'Submitting payment request...');
        try {
            const planTypeVal = type === 'subscription' ? planType : (type === '1day' ? '10day' : type);
            const subTypeVal = getPurchaseTypeName();
            const { error } = await supabase
                .from('Payment')
                .insert([{
                    user_id: user.id,
                    email: userEmail.trim(),
                    transaction_id: transactionId.trim(),
                    amount: finalPrice,
                    plan_type: planTypeVal,
                    subscription_type: subTypeVal,
                    status: 'pending'
                }]);
            if (error) throw error;
            toast.success(
                language === 'bn'
                    ? 'পেমেন্ট সফলভাবে সাবমিট করা হয়েছে! শীঘ্রই আপনার অ্যাকাউন্ট সচল করা হবে।'
                    : 'Payment details submitted successfully! Your account will be activated shortly.',
                { id: toastId }
            );
            setTimeout(() => navigate('/shop', { replace: true }), 2000);
        } catch (err) {
            console.error('Checkout error:', err);
            toast.error(
                language === 'bn'
                    ? `পেমেন্ট সাবমিট করতে ত্রুটি হয়েছে: ${err.message}`
                    : `Error submitting payment: ${err.message}`,
                { id: toastId }
            );
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
                    <h1 className={`${styles.pageTitle} ${(isSubscription || type === '1day') ? styles.premiumTitle : ''}`}>
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
                                <span className={styles.planPrice}>৳{formatNumber(99)}</span>
                            </div>
                        </div>

                        <div 
                            className={`${styles.planCard} ${planType === 'yearly' ? styles.active : ''}`}
                            onClick={() => setPlanType('yearly')}
                        >
                            <div className={styles.radioIndicator} />
                            <div className={styles.planInfo}>
                                <span className={styles.planLabel}>{t('yearly') || 'Yearly'}</span>
                                <span className={styles.planPrice}>৳{formatNumber(999)}</span>
                            </div>
                            <span className={styles.saveBadge}>{t('save_percentage_yearly')}</span>
                        </div>
                    </div>
                )}

                {/* Order Details Card */}
                <section className={styles.sectionCard}>
                    <h2 className={styles.sectionHeading}>{t('order_details') || 'Order details'}</h2>

                    
                    <div className={styles.detailsList}>
                        <div className={styles.detailRow}>
                            <div className={styles.detailLabel}>
                                <span className={`${styles.itemName} ${(isSubscription || type === '1day') ? styles.premiumTitle : ''}`}>
                                    {isSubscription 
                                        ? (profile?.gender === 'female' || profile?.gender === 'নারী' ? t('queen_bee_mode') || 'Queen Bee' : t('king_bee_mode') || 'King Bee')
                                        : checkoutData.label
                                    }
                                </span>
                                <span className={styles.itemSub}>
                                    {isSubscription 
                                        ? (planType === 'yearly' ? t('yearly') : t('monthly')) 
                                        : (type === '1day' ? '' : (t('one_time_purchase') || 'One-time purchase'))
                                    }
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

                {/* Payment Instruction & Inputs */}
                <section className={styles.sectionCard}>
                    <h2 className={styles.sectionHeading}>
                        {language === 'bn' ? 'পেমেন্ট নির্দেশনাবলী' : 'Payment Instructions'}
                    </h2>

                    <div className={styles.instructionContainer}>
                        <p className={styles.instructionHeader}>
                            {language === 'bn' 
                                ? 'প্রিয় লার্নার সাবস্ক্রিপশন নিতে অনুগ্রহ করে নিচের বিস্তারিত দেখুন :' 
                                : 'Dear Learner, please check the details below to purchase your subscription:'}
                        </p>
                        
                        <ul className={styles.instructionList}>
                            <li>
                                <span>{language === 'bn' ? '• সাবস্ক্রিপশন টাইপ :' : '• Subscription Type:'}</span>
                                <strong>{getPurchaseTypeName()}</strong>
                            </li>
                            <li>
                                <span>{language === 'bn' ? '• মেয়াদ :' : '• Validity:'}</span>
                                <strong>{getValidityName()}</strong>
                            </li>
                            <li>
                                <span>{language === 'bn' ? '• টাকা :' : '• Amount:'}</span>
                                <strong className={styles.amountHighlight}>৳{formatNumber(finalPrice)}</strong>
                            </li>
                            {!isFreeCheckout && (
                                <li>
                                    <span>{language === 'bn' ? '• সেন্ড মানি :' : '• Send Money:'}</span>
                                    <strong className={styles.phoneHighlight}>০১৮১৫-৩১১২৩২</strong>
                                </li>
                            )}
                            {!isFreeCheckout && (
                                <li>
                                    <span>{language === 'bn' ? '• পেমেন্ট মেথড :' : '• Payment Method:'}</span>
                                    <strong>{language === 'bn' ? 'বিকাশ , রকেট এবং নগদ' : 'bKash, Rocket and Nagad'}</strong>
                                </li>
                            )}
                            {!isFreeCheckout && (
                                <li>
                                    <span className={styles.infoHighlight}>
                                        {language === 'bn' 
                                            ? '• পেমেন্ট শেষ করে আপনার ট্রানজিশন আইডি এবং ইউজার ইমেইল নিচে সাবমিট করুন' 
                                            : '• Submit your Transaction ID and User Email below after payment'}
                                    </span>
                                </li>
                            )}
                            {!isFreeCheckout && (
                                <li>
                                    <span className={styles.infoHighlight}>
                                        {language === 'bn' 
                                            ? '• শীঘ্রই আপনার সাবস্ক্রিপশনটি একটিভ হবে' 
                                            : '• Soon your subscription will be active'}
                                    </span>
                                </li>
                            )}
                            {isFreeCheckout && (
                                <li>
                                    <span className={styles.infoHighlight} style={{ color: '#4ade80', fontWeight: 700 }}>
                                        {language === 'bn' 
                                            ? '• ১০০% ডিসকাউন্ট প্রযোজ্য! সাবমিট করুন এবং আপনার সাবস্ক্রিপশন তাৎক্ষণিকভাবে একটিভ হবে।' 
                                            : '• 100% discount applied! Submit and your subscription will be activated instantly.'}
                                    </span>
                                </li>
                            )}
                        </ul>
                    </div>

                    <div className={styles.paymentForm}>
                        {/* Transaction ID hidden for 100% promo */}
                        {!isFreeCheckout && (
                            <div className={styles.formGroup}>
                                <label htmlFor="transactionId">
                                    {language === 'bn' ? 'ট্রানজেকশন আইডি (Transaction ID) *' : 'Transaction ID *'}
                                </label>
                                <input 
                                    id="transactionId"
                                    type="text"
                                    className={styles.formInput}
                                    placeholder={language === 'bn' ? 'এখানে ট্রানজেকশন আইডি দিন' : 'Enter Transaction ID'}
                                    value={transactionId}
                                    onChange={(e) => setTransactionId(e.target.value)}
                                />
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label htmlFor="userEmail">
                                {language === 'bn' ? 'ইমেইল (Email) *' : 'Email *'}
                            </label>
                            <input 
                                id="userEmail"
                                type="email"
                                className={styles.formInput}
                                placeholder={language === 'bn' ? 'এখানে ইমেইল দিন' : 'Enter Email'}
                                value={userEmail}
                                onChange={(e) => setUserEmail(e.target.value)}
                            />
                        </div>
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
                                <span>{language === 'bn' ? 'সাবমিট করুন' : 'Submit'}</span>
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
