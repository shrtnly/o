import React from 'react';
import Skeleton from '../../../components/ui/Skeleton';
import styles from '../LearningPage.module.css';

const LearningSkeleton = () => {
    return (
        <div className={styles.learningSkeleton}>
            <div className={styles.unitHeaderSkeleton}>
                <Skeleton width="120px" height="20px" />
                <Skeleton width="200px" height="30px" />
            </div>
            
            <div className={styles.nodesSkeleton}>
                {[...Array(6)].map((_, i) => (
                    <div key={i} className={styles.nodeItemSkeleton}>
                        <Skeleton width="80px" height="80px" borderRadius="50%" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LearningSkeleton;
