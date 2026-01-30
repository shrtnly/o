import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import styles from './LoadingScreen.module.css';

const LoadingScreen = () => {
    return (
        <div className={styles.loadingWrapper}>
            <div className={styles.animationContainer}>
                <DotLottieReact
                    src="https://lottie.host/7bde8b69-e083-4fe4-aa64-4cdb96768053/bLH3ZaeDzm.lottie"
                    loop
                    autoplay
                />
            </div>
            <p className={styles.loadingText}>লোড হচ্ছে...</p>
        </div>
    );
};

export default LoadingScreen;
