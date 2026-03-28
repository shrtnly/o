import React from 'react';
import Skeleton from '../../../components/ui/Skeleton';
import styles from '../ConnectionPage.module.css';

const ConnectionSkeleton = () => {
    return (
        <div className={styles.connectionSkeleton}>
            <div className={styles.headerSkeleton}>
                <Skeleton width="40px" height="40px" borderRadius="10px" />
                <Skeleton width="180px" height="32px" borderRadius="8px" />
            </div>
            
            <div className={styles.tabsSkeleton}>
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} width="100px" height="36px" borderRadius="20px" />
                ))}
            </div>
            
            <div className={styles.listSkeleton}>
                {[...Array(6)].map((_, i) => (
                    <div key={i} className={styles.itemSkeleton}>
                        <Skeleton width="48px" height="48px" borderRadius="50%" />
                        <div className={styles.itemInfoSkeleton}>
                            <Skeleton width="140px" height="16px" borderRadius="4px" />
                            <Skeleton width="100px" height="12px" borderRadius="4px" />
                        </div>
                        <Skeleton width="80px" height="32px" borderRadius="10px" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ConnectionSkeleton;
