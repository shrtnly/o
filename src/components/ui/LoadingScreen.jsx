import React from 'react';
import styles from './LoadingScreen.module.css';

const LoadingScreen = () => {
    return (
        <div className={styles.loadingWrapper}>
            <div className={styles.animationContainer}>
            </div>
            <p className={styles.loadingText}>লোড হচ্ছে...</p>
        </div>
    );
};

export default LoadingScreen;
