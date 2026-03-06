import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../features/learning/components/Sidebar';
import BottomNav from '../../features/learning/components/BottomNav';
import styles from './MainLayout.module.css';

const MainLayout = () => {
    return (
        <div className={styles.appLayout}>
            <Sidebar />
            <main className={styles.mainContent}>
                <Outlet />
            </main>
            <BottomNav />
        </div>
    );
};

export default MainLayout;
