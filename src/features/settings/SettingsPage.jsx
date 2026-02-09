import React, { useState } from 'react';
import { Settings, Bell, Shield, User, Sliders, BookOpen, ChevronRight, Moon, Sun, Globe } from 'lucide-react';
import styles from './SettingsPage.module.css';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

const SettingsPage = () => {
    const { isDark, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('profile');

    const menuItems = [
        { id: 'preferences', label: 'প্রেফারেন্স', icon: Sliders },
        { id: 'profile', label: 'প্রোফাইল', icon: User },
        { id: 'notifications', label: 'নোটিফিকেশন', icon: Bell },
        { id: 'courses', label: 'কোর্স', icon: BookOpen },
        { id: 'privacy', label: 'প্রাইভেসি', icon: Shield },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'preferences':
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.sectionHeader}>
                            <h2>প্রেফারেন্স সেটিংস</h2>
                            <p>আপনার ব্যক্তিগত ব্যবহারের অভিজ্ঞতা কাস্টমাইজ করুন</p>
                        </div>
                        <div className={styles.cardList}>
                            <div className={styles.settingCard}>
                                <div className={styles.cardHeaderArea}>
                                    <div className={styles.iconCircle}>
                                        {isDark ? <Moon size={20} /> : <Sun size={20} />}
                                    </div>
                                    <div className={styles.cardText}>
                                        <h3>ডার্ক মুড</h3>
                                        <p>চোখের আরামের জন্য কালো থিম ব্যবহার করুন</p>
                                    </div>
                                </div>
                                <label className={styles.switch}>
                                    <input
                                        type="checkbox"
                                        checked={isDark}
                                        onChange={toggleTheme}
                                    />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>

                            <div className={styles.settingCard}>
                                <div className={styles.cardHeaderArea}>
                                    <div className={styles.iconCircle}>
                                        <Globe size={20} />
                                    </div>
                                    <div className={styles.cardText}>
                                        <h3>ভাষা (Language)</h3>
                                        <p>আপনার পছন্দের ভাষা নির্বাচন করুন</p>
                                    </div>
                                </div>
                                <button className={styles.secondaryBtn}>বাংলা</button>
                            </div>
                        </div>
                    </div>
                );
            case 'profile':
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.sectionHeader}>
                            <h2>প্রোফাইল সেটিংস</h2>
                            <p>আপনার ব্যক্তিগত তথ্য এবং প্রোফাইল দৃশ্যমানতা পরিচালনা করুন</p>
                        </div>
                        <div className={styles.cardList}>
                            <div className={styles.settingCard}>
                                <div className={styles.cardText}>
                                    <h3>পাবলিক প্রোফাইল</h3>
                                    <p>অন্যান্য ব্যবহারকারীরা আপনার শেখার অগ্রগতি দেখতে পারবে</p>
                                </div>
                                <label className={styles.switch}>
                                    <input type="checkbox" defaultChecked />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>
                            <div className={styles.settingCard}>
                                <div className={styles.cardText}>
                                    <h3>প্রোফাইল প্রোফাইল পিকচার</h3>
                                    <p>একটি নতুন প্রোফাইল ছবি আপলোড করুন</p>
                                </div>
                                <button className={styles.secondaryBtn}>পরিবর্তন</button>
                            </div>
                        </div>
                    </div>
                );
            case 'notifications':
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.sectionHeader}>
                            <h2>নোটিফিকেশন সেটিংস</h2>
                            <p>আপনি কিভাবে আপডেট এবং স্মরণিকা পাবেন তা নিয়ন্ত্রণ করুন</p>
                        </div>
                        <div className={styles.cardList}>
                            <div className={styles.settingCard}>
                                <div className={styles.cardText}>
                                    <h3>পুশ নোটিফিকেশন</h3>
                                    <p>আপনার মোবাইল বা ব্রাউজারে সরাসরি আপডেট পান</p>
                                </div>
                                <label className={styles.switch}>
                                    <input type="checkbox" defaultChecked />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>
                            <div className={styles.settingCard}>
                                <div className={styles.cardText}>
                                    <h3>ইমেল নোটিফিকেশন</h3>
                                    <p>সাপ্তাহিক প্রগতি রিপোর্ট এবং গুরুত্বপূর্ণ আপডেট পান</p>
                                </div>
                                <label className={styles.switch}>
                                    <input type="checkbox" />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className={styles.emptyState}>
                        <h3>{menuItems.find(m => m.id === activeTab)?.label} সেটিংস</h3>
                        <p>এই সেকশনটি বর্তমানে ডেভেলপমেন্টাধীন আছে।</p>
                    </div>
                );
        }
    };

    return (
        <div className={styles.settingsPage}>
            <header className={styles.pageHeader}>
                <div className={styles.headerTitle}>
                    <Settings className={styles.headerIcon} />
                    <h1>সেটিংস</h1>
                </div>
            </header>

            <div className={styles.layout}>
                <main className={styles.mainContent}>
                    {renderContent()}
                </main>

                <aside className={styles.sidebar}>
                    <div className={styles.menuBox}>
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                className={cn(
                                    styles.menuItem,
                                    activeTab === item.id && styles.menuItemActive
                                )}
                                onClick={() => setActiveTab(item.id)}
                            >
                                <div className={styles.menuItemLeft}>
                                    <item.icon size={20} />
                                    <span>{item.label}</span>
                                </div>
                                <ChevronRight size={18} className={styles.menuChevron} />
                            </button>
                        ))}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default SettingsPage;
