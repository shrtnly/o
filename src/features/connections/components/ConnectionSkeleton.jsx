import React from 'react';
import Skeleton from '../../../components/ui/Skeleton';
import styles from '../ConnectionPage.module.css';
import BattleSkeleton from './BattleSkeleton';

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
            
            <div className={styles.containerSkeleton}>
                <BattleSkeleton hideWrapper={true} />
            </div>
        </div>
    );
};

export default ConnectionSkeleton;
