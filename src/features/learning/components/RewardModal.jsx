import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Heart, Gem, Sparkles } from 'lucide-react';
import styles from './RewardModal.module.css';

const RewardModal = ({ isOpen, onClose, hearts = 0, gems = 0 }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className={styles.overlay}>
                    <motion.div
                        initial={{ scale: 0, opacity: 0, rotate: -20 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0, opacity: 0, rotate: 20 }}
                        className={styles.modal}
                    >
                        {/* Background Rays */}
                        <div className={styles.raysContainer}>
                            {[...Array(12)].map((_, i) => (
                                <div
                                    key={i}
                                    className={styles.ray}
                                    style={{ transform: `rotate(${i * 30}deg)` }}
                                />
                            ))}
                        </div>

                        {/* Sparkles */}
                        <div className={styles.sparklesContainer}>
                            {[...Array(8)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        y: [0, -100],
                                        x: [0, (Math.random() - 0.5) * 200],
                                        opacity: [0, 1, 0],
                                        scale: [0, 1.5, 0]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        delay: i * 0.2,
                                        ease: "easeOut"
                                    }}
                                    className={styles.sparkle}
                                >
                                    <Sparkles size={16} color="#ffd700" fill="#ffd700" />
                                </motion.div>
                            ))}
                        </div>

                        <div className={styles.content}>
                            <motion.div
                                animate={{
                                    y: [0, -10, 0],
                                    rotate: [0, -5, 5, 0]
                                }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className={styles.iconWrapper}
                            >
                                <Gift size={120} color="#ffd700" className={styles.mainIcon} />
                            </motion.div>

                            <h2 className={styles.title}>অসাধারণ!</h2>
                            <p className={styles.subtitle}>মিস্ট্রি বক্স থেকে আপনি পেয়েছেন:</p>

                            <div className={styles.rewardsRow}>
                                {hearts > 0 && (
                                    <motion.div
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className={styles.rewardItem}
                                    >
                                        <div className={styles.rewardIconCircle} style={{ background: 'rgba(255, 75, 75, 0.1)' }}>
                                            <Heart size={32} color="#ff4b4b" fill="#ff4b4b" />
                                        </div>
                                        <span className={styles.rewardValue}>+{hearts}</span>
                                        <span className={styles.rewardLabel}>হার্ট</span>
                                    </motion.div>
                                )}

                                {gems > 0 && (
                                    <motion.div
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className={styles.rewardItem}
                                    >
                                        <div className={styles.rewardIconCircle} style={{ background: 'rgba(46, 204, 113, 0.1)' }}>
                                            <Gem size={32} color="#2ecc71" fill="#2ecc71" />
                                        </div>
                                        <span className={styles.rewardValue}>+{gems}</span>
                                        <span className={styles.rewardLabel}>জেম</span>
                                    </motion.div>
                                )}
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onClose}
                                className={styles.claimButton}
                            >
                                সংগ্রহ করুন
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default RewardModal;
