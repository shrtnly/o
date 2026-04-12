import React from 'react';
import { motion } from 'framer-motion';
import { Hexagon } from 'lucide-react';
import styles from './LoadingScreen.module.css';

const LoadingScreen = () => {
    return (
        <div className={styles.loadingWrapper}>
            <div className={styles.container}>
                <motion.div 
                    className={styles.logoCont}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className={styles.hexWrapper}>
                        <Hexagon 
                            className={styles.hexIcon} 
                            fill="var(--color-primary)" 
                            stroke="var(--color-primary)" 
                            size={48}
                        />
                        <motion.div 
                            className={styles.pulse}
                            animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                            transition={{ 
                                duration: 2, 
                                repeat: Infinity,
                                ease: "easeOut"
                            }}
                        />
                    </div>
                </motion.div>

                <div className={styles.content}>
                    <motion.h1 
                        className={styles.title}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        BeeLesson
                    </motion.h1>
                </div>

            </div>
            
        </div>
    );
};


export default LoadingScreen;

