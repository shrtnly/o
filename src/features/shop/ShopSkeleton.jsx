import React from 'react';
import Skeleton from '../../components/ui/Skeleton';
import styles from './ShopPage.module.css';

const ShopSkeleton = () => {
    return (
        <div className={styles.shopSkeleton}>
            {/* Header Skeleton */}
            <div className={styles.headerSkeleton}>
                <div className={styles.mascotSkeleton}>
                    <Skeleton width="65px" height="65px" borderRadius="50%" />
                </div>
                <div className={styles.headerInfoSkeleton}>
                    <Skeleton width="350px" height="40px" borderRadius="10px" />
                </div>
                <div className={styles.dividerSkeleton}>
                    <Skeleton width="60px" height="3px" borderRadius="10px" />
                </div>
            </div>

            {/* Shop Cards Skeleton */}
            <div className={styles.cardsSkeletonList}>
                {[...Array(3)].map((_, i) => (
                    <div key={i} className={styles.shopCardSkeleton}>
                        <div className={styles.cardIconSkeleton}>
                            <Skeleton width="68px" height="68px" borderRadius="18px" />
                        </div>
                        <div className={styles.cardMiddleSkeleton}>
                            <Skeleton width="160px" height="22px" borderRadius="6px" />
                            <div className={styles.cardPillsSkeleton}>
                                <Skeleton width="100px" height="14px" borderRadius="4px" />
                                <Skeleton width="80px" height="14px" borderRadius="4px" />
                            </div>
                        </div>
                        <div className={styles.cardRightSkeleton}>
                            <Skeleton width="100px" height="42px" borderRadius="14px" />
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Exchange Section Skeleton (if different) or just more cards */}
            <div className={styles.shopCardSkeleton}>
                <div className={styles.cardIconSkeleton}>
                    <Skeleton width="68px" height="68px" borderRadius="18px" />
                </div>
                <div className={styles.cardMiddleSkeleton}>
                    <Skeleton width="120px" height="22px" borderRadius="6px" />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <Skeleton width="40px" height="30px" borderRadius="8px" />
                        <Skeleton width="60px" height="30px" borderRadius="8px" />
                        <Skeleton width="40px" height="30px" borderRadius="8px" />
                    </div>
                </div>
                <div className={styles.cardRightSkeleton}>
                    <Skeleton width="120px" height="42px" borderRadius="14px" />
                </div>
            </div>
        </div>
    );
};

export default ShopSkeleton;
