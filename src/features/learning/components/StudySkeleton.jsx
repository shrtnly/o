import React from 'react';
import Skeleton from '../../../components/ui/Skeleton';
import styles from '../StudyPage.module.css';

const StudySkeleton = () => {
    return (
        <div className={styles.studySkeleton}>
            <div className={styles.headerSkeleton}>
                <Skeleton width="40px" height="40px" borderRadius="10px" />
                <Skeleton width="100%" height="12px" borderRadius="10px" />
            </div>
            
            <div className={styles.contentSkeleton}>
                <div className={styles.mascotSkeleton}>
                    <Skeleton width="120px" height="120px" borderRadius="50%" />
                </div>
                
                <div className={styles.questionSkeleton}>
                    <Skeleton width="90%" height="24px" borderRadius="4px" />
                    <Skeleton width="60%" height="24px" borderRadius="4px" />
                </div>
                
                <div className={styles.optionsGridSkeleton}>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className={styles.optionSkeleton}>
                            <Skeleton width="40px" height="40px" borderRadius="12px" />
                            <Skeleton width="100%" height="20px" borderRadius="4px" />
                        </div>
                    ))}
                </div>
            </div>
            
            <div className={styles.footerSkeleton}>
                <Skeleton width="100%" height="80px" borderRadius="0" />
            </div>
        </div>
    );
};

export default StudySkeleton;
