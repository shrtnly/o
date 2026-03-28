import React from 'react';
import styles from './CheckoutPage.module.css';

const CheckoutSkeleton = () => {
    return (
        <div className={styles.checkoutPage}>
            <div className={styles.container}>
                {/* Header Skeleton */}
                <div className={styles.header} style={{ border: 'none', background: 'none' }}>
                    <div className={`${styles.skeleton}`} style={{ width: 24, height: 24 }} />
                    <div className={`${styles.skeleton} ${styles.skTitle}`} style={{ marginLeft: 16 }} />
                </div>

                {/* Plan Selection Blocks */}
                <div className={styles.skPlanGrid}>
                    <div className={`${styles.skeleton} ${styles.skPlanCard}`} />
                    <div className={`${styles.skeleton} ${styles.skPlanCard}`} />
                </div>

                {/* Order Details Card */}
                <div className={styles.skSectionCard}>
                    <div className={`${styles.skeleton} ${styles.skSectionHeading}`} />
                    
                    <div className={styles.skDetailRow}>
                        <div className={styles.skLabelGroup}>
                            <div className={`${styles.skeleton} ${styles.skLabelTitle}`} />
                            <div className={`${styles.skeleton} ${styles.skLabelSub}`} />
                        </div>
                        <div className={`${styles.skeleton} ${styles.skPrice}`} />
                    </div>

                    <div className={styles.skDivider} />

                    <div className={styles.skDetailRow}>
                        <div className={`${styles.skeleton} ${styles.skLabelTitle}`} />
                        <div className={`${styles.skeleton} ${styles.skPrice}`} />
                    </div>

                    <div className={styles.skDetailRow}>
                        <div className={`${styles.skeleton} ${styles.skLabelTitle}`} style={{ height: 24 }} />
                        <div className={`${styles.skeleton} ${styles.skPrice}`} style={{ height: 24 }} />
                    </div>
                </div>

                {/* Info Text Box */}
                <div className={`${styles.skeleton}`} style={{ height: 50, borderRadius: 12, marginBottom: 24 }} />

                {/* Payment Grid */}
                <div className={styles.skSectionCard}>
                    <div className={`${styles.skeleton} ${styles.skSectionHeading}`} />
                    <div className={styles.skPaymentGrid}>
                        <div className={`${styles.skeleton} ${styles.skPaymentBtn}`} />
                        <div className={`${styles.skeleton} ${styles.skPaymentBtn}`} />
                    </div>
                </div>

                {/* Action Button & Note */}
                <div className={`${styles.skeleton} ${styles.skActionBtn}`} />
                <div className={`${styles.skeleton} ${styles.skSecureNote}`} />
            </div>
        </div>
    );
};

export default CheckoutSkeleton;
