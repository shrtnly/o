import React from 'react';
import styles from './LoadingScreen.module.css';

const LoadingScreen = () => {
    return (
        <div className={styles.loadingWrapper}>
            <div className={styles.animationContainer}>
                <dotlottie-wc
                    src="https://lottie.host/e03ae8f1-72a8-4959-a9f6-ea75a0f49206/noztfmtntu.lottie"
                    style={{ width: '300px', height: '300px' }}
                    autoplay
                    loop
                ></dotlottie-wc>
            </div>
            <p className={styles.loadingText}>লোড হচ্ছে...</p>
        </div>
    );
};

export default LoadingScreen;
