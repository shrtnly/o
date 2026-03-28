import React from 'react';
import Skeleton from '../../../components/ui/Skeleton';
import styles from '../ProfilePage.module.css';

const ProfileAnalysisSkeleton = () => {
    return (
        <div className={styles.analysisSkeleton}>
            <div className={styles.statsGridSkeleton}>
                {[...Array(4)].map((_, i) => (
                    <div key={i} className={styles.statBoxSkeleton}>
                        <Skeleton width="40px" height="40px" borderRadius="10px" />
                        <div className={styles.statInfoSkeleton}>
                            <Skeleton width="100%" height="8px" borderRadius="4px" />
                            <Skeleton width="60%" height="16px" borderRadius="4px" />
                        </div>
                    </div>
                ))}
            </div>
            
            <div className={styles.chartsSkeleton}>
                <div className={styles.chartBoxSkeleton}>
                    <Skeleton width="100%" height="180px" borderRadius="16px" />
                </div>
                <div className={styles.chartBoxSkeleton}>
                    <Skeleton width="100%" height="180px" borderRadius="16px" />
                </div>
            </div>
            
            <div className={styles.patternSkeleton}>
                <Skeleton width="100%" height="140px" borderRadius="16px" />
            </div>
        </div>
    );
};

export default ProfileAnalysisSkeleton;
