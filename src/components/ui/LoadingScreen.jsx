import React from 'react';
import styles from './LoadingScreen.module.css';
import InlineLoader from './InlineLoader';

const LoadingScreen = () => {
    return (
        <div className={styles.loadingWrapper}>
            <InlineLoader />
        </div>
    );
};

export default LoadingScreen;

