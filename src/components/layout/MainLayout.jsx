import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../features/learning/components/Sidebar';
import BottomNav from '../../features/learning/components/BottomNav';
import styles from './MainLayout.module.css';

const MainLayout = () => {
    return (
        <div className={styles.appLayout}>
            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <linearGradient id="flameGradientTracker" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f1c40f" />
                        <stop offset="100%" stopColor="#ff4d00" />
                    </linearGradient>
                </defs>
            </svg>
            <Sidebar />
            <main className={styles.mainContent}>
                <Outlet />
            </main>
            <BottomNav />
        </div>
    );
};

export default MainLayout;
