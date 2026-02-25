import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './TopProgressBar.module.css';

const TopProgressBar = () => {
    const location = useLocation();
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);
    const [fading, setFading] = useState(false);
    const timers = useRef([]);

    const clearAll = () => timers.current.forEach(clearTimeout);

    useEffect(() => {
        clearAll();
        timers.current = [];

        // Reset and kick off
        setFading(false);
        setVisible(true);
        setProgress(0);

        // Staggered progress steps mimicking NProgress
        timers.current.push(setTimeout(() => setProgress(20), 0));
        timers.current.push(setTimeout(() => setProgress(50), 150));
        timers.current.push(setTimeout(() => setProgress(75), 400));
        timers.current.push(setTimeout(() => setProgress(90), 700));
        timers.current.push(setTimeout(() => {
            setProgress(100);
            // Fade out after reaching 100%
            timers.current.push(setTimeout(() => {
                setFading(true);
                timers.current.push(setTimeout(() => {
                    setVisible(false);
                    setProgress(0);
                    setFading(false);
                }, 400));
            }, 200));
        }, 900));

        return () => clearAll();
    }, [location.pathname]);

    if (!visible) return null;

    return (
        <div className={styles.progressContainer}>
            <div
                className={styles.progressBar}
                style={{
                    width: `${progress}%`,
                    opacity: fading ? 0 : 1,
                }}
            />
        </div>
    );
};

export default TopProgressBar;
