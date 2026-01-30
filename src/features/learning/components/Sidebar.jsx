import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Shield, Target, Store, User, MoreHorizontal } from 'lucide-react';
import styles from '../LearningPage.module.css';

const Sidebar = () => (
    <aside className={styles.leftSidebar}>
        <div className={styles.logoArea}>
            <span className={styles.logoText}>ও-শেখা</span>
        </div>
        <NavLink to="/learn" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
            <Home size={24} />
            <span>শিখুন</span>
        </NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
            <Shield size={24} />
            <span>লিডারবোর্ড</span>
        </NavLink>
        <NavLink to="/quests" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
            <Target size={24} />
            <span>অনুসন্ধান</span>
        </NavLink>
        <NavLink to="/shop" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
            <Store size={24} />
            <span>দোকান</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
            <User size={24} />
            <span>প্রোফাইল</span>
        </NavLink>
        <button className={styles.navItem}>
            <MoreHorizontal size={24} />
            <span>আরও</span>
        </button>
    </aside>
);

export default Sidebar;
