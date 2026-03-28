import React from 'react';
import Skeleton from '../../../components/ui/Skeleton';
import styles from '../ProfilePage.module.css';

const ProfileSkeleton = () => {
    return (
        <div className={styles.profileSkeleton}>
            {/* Royal Header Skeleton */}
            <section className={styles.royalHeaderSkeleton}>
                <div className={styles.avatarWrapperSkeleton}>
                    <Skeleton width="84px" height="84px" borderRadius="50%" />
                    <div className={styles.statusDotSkeleton}>
                        <Skeleton width="18px" height="18px" borderRadius="50%" />
                    </div>
                </div>
                <div className={styles.profileInfoSkeleton}>
                    <Skeleton width="180px" height="28px" borderRadius="8px" />
                    <Skeleton width="140px" height="16px" borderRadius="6px" />
                </div>
                <div className={styles.settingsBtnSkeleton}>
                    <Skeleton width="40px" height="40px" borderRadius="50%" />
                </div>
            </section>
            
            {/* Tabs Skeleton */}
            <div className={styles.tabsSkeleton}>
                <Skeleton width="30%" height="44px" borderRadius="12px" />
                <Skeleton width="30%" height="44px" borderRadius="12px" />
                <Skeleton width="30%" height="44px" borderRadius="12px" />
            </div>

            {/* Section Title */}
            <div style={{ margin: '24px 0 16px', padding: '0 4px' }}>
                <Skeleton width="100px" height="20px" borderRadius="4px" />
            </div>

            {/* Stats Grid Skeleton */}
            <div className={styles.statsSkeletonGrid}>
                {[...Array(4)].map((_, i) => (
                    <div key={i} className={styles.statCardSkeleton}>
                        <Skeleton width="40px" height="40px" borderRadius="12px" />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Skeleton width="40%" height="18px" />
                            <Skeleton width="60%" height="12px" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Achievement Section */}
            <div style={{ margin: '32px 0 16px', padding: '0 4px' }}>
                <Skeleton width="120px" height="20px" borderRadius="4px" />
            </div>
            <div className={styles.achievementSkeletonGrid}>
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} width="100%" height="120px" borderRadius="20px" />
                ))}
            </div>
        </div>
    );
};

export default ProfileSkeleton;
