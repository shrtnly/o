import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './TopProgressBar.module.css';

const TopProgressBar = () => {
    const location = useLocation();
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Start progress on location change
        setVisible(true);
        setProgress(30);

        const timer1 = setTimeout(() => setProgress(60), 100);
        const timer2 = setTimeout(() => setProgress(90), 400);
        const timer3 = setTimeout(() => {
            setProgress(100);
            setTimeout(() => {
                setVisible(false);
                setProgress(0);
            }, 300);
        }, 600);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, [location.pathname]);

    if (!visible) return null;

    return (
        <div className={styles.progressContainer}>
            <div
                className={styles.progressBar}
                style={{ width: `${progress}%` }}
            />
        </div>
    );
};

export default TopProgressBar;
