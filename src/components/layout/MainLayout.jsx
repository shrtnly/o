import React, { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../features/learning/components/Sidebar';
import BottomNav from '../../features/learning/components/BottomNav';
import { rewardService } from '../../services/rewardService';
import { useAuth } from '../../context/AuthContext';
import styles from './MainLayout.module.css';

const MainLayout = () => {
    const { user } = useAuth();
    const intervalRef = useRef(null);

    useEffect(() => {
        if (!user?.id) return;

        // Start heartbeat tracker
        // We sync every 60 seconds of active time
        const startHeartbeat = () => {
            intervalRef.current = setInterval(async () => {
                if (document.visibilityState === 'visible') {
                    await rewardService.addMinuteSpent(user.id);
                }
            }, 60000);
        };

        startHeartbeat();

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [user?.id]);

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
