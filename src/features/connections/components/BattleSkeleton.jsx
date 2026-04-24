import React from 'react';
import Skeleton from '../../../components/ui/Skeleton';
import styles from './BattleWar.module.css';
import { motion } from 'framer-motion';

const BattleSkeleton = ({ hideWrapper = false }) => {
    const card = (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={styles.lobbyCard}
        >
            <div className={styles.lobbyHero}>
                <div className={styles.historyBtnFloating}>
                    <Skeleton width="38px" height="38px" borderRadius="12px" />
                </div>
                <div className={styles.modeToggleFloating}>
                    <Skeleton width="44px" height="22px" borderRadius="50px" />
                </div>
                
                <div className={styles.vsCircle} style={{ marginBottom: '0.5rem' }}>
                    <Skeleton width="40px" height="40px" borderRadius="50%" />
                </div>
                
                <Skeleton width="180px" height="28px" borderRadius="8px" />
                <Skeleton width="240px" height="16px" borderRadius="4px" />
            </div>

            <div className={styles.lobbyActions}>
                <div className={styles.selectGroup}>
                    <Skeleton width="80px" height="12px" borderRadius="4px" />
                    <Skeleton width="100%" height="48px" borderRadius="16px" />
                </div>

                <Skeleton width="100%" height="54px" borderRadius="16px" />

                <div className={styles.dividerRow}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--color-border-muted)' }} />
                    <Skeleton width="30px" height="12px" borderRadius="4px" />
                    <div style={{ flex: 1, height: '1px', background: 'var(--color-border-muted)' }} />
                </div>

                <div className={styles.joinRow}>
                    <Skeleton width="100%" height="52px" borderRadius="16px" />
                    <Skeleton width="54px" height="52px" borderRadius="16px" />
                </div>
            </div>
        </motion.div>
    );

    if (hideWrapper) return card;

    return (
        <div className={styles.lobbyWrap}>
            {card}
        </div>
    );
};

export default BattleSkeleton;
