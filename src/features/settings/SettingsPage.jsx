import React, { useState, useEffect } from 'react';
import { Settings, Bell, Shield, User, Sliders, BookOpen, ChevronRight, Moon, Sun, Globe, Sparkles } from 'lucide-react';
import styles from './SettingsPage.module.css';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { courseService } from '../../services/courseService';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { RotateCcw, AlertTriangle, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';

const SettingsPage = () => {
    const { isDark, toggleTheme } = useTheme();
    const { language, toggleLanguage, t } = useLanguage();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('preferences');
    const [selectedAnimation, setSelectedAnimation] = useState('1');
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(false);

    // Modal states
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        type: 'danger',
        title: '',
        message: '',
        confirmText: '',
        icon: RotateCcw,
        onConfirm: () => { }
    });

    useEffect(() => {
        const savedAnimation = localStorage.getItem('studyPageAnimation');
        if (savedAnimation) {
            setSelectedAnimation(savedAnimation);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'courses' && user) {
            fetchEnrolledCourses();
        }
    }, [activeTab, user]);

    const fetchEnrolledCourses = async () => {
        setLoadingCourses(true);
        try {
            const data = await courseService.getUserEnrolledCourses(user.id);
            setEnrolledCourses(data);
        } catch (error) {
            console.error('Error fetching courses:', error);
            toast.error(t('error_fetch_courses'));
        } finally {
            setLoadingCourses(false);
        }
    };

    const handleResetCourse = (course) => {
        setConfirmModal({
            isOpen: true,
            type: 'danger',
            title: t('reset_course'),
            message: `${t('confirm_reset_msg')} "${course.course_title}"? ${t('irreversible')}`,
            confirmText: t('confirm'),
            icon: RotateCcw,
            onConfirm: async () => {
                try {
                    await courseService.resetCourseProgress(user.id, course.course_id);
                    toast.success('কোর্স প্রগতি রিসেট করা হয়েছে');
                    fetchEnrolledCourses();
                } catch (error) {
                    console.error('Error resetting course:', error);
                    toast.error('রিসেট করতে সমস্যা হয়েছে');
                }
            }
        });
    };



    // Save animation preference to localStorage
    const handleAnimationChange = (e) => {
        const value = e.target.value;
        setSelectedAnimation(value);
        localStorage.setItem('studyPageAnimation', value);
    };

    const menuItems = [
        { id: 'preferences', label: t('preferences'), icon: Sliders },
        { id: 'profile', label: t('profile'), icon: User },
        { id: 'notifications', label: t('notifications'), icon: Bell },
        { id: 'courses', label: t('courses'), icon: BookOpen },
        { id: 'privacy', label: t('privacy'), icon: Shield },
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
                                    <span className={styles.slider}>
                                        <span className={styles.knob}>
                                            {isDark ? <Check size={14} strokeWidth={4} /> : <X size={14} strokeWidth={4} />}
                                        </span>
                                    </span>
                                </label>
                            </div>

                            <div className={styles.settingCard}>
                                <div className={styles.cardHeaderArea}>
                                    <div className={styles.iconCircle}>
                                        <Sparkles size={20} />
                                    </div>
                                    <div className={styles.cardText}>
                                        <h3>স্টাডি পেজ অ্যানিমেশন</h3>
                                        <p>আপনার পছন্দের মৌমাছি অ্যানিমেশন নির্বাচন করুন</p>
                                    </div>
                                </div>
                                <select
                                    className={styles.animationSelect}
                                    value={selectedAnimation}
                                    onChange={handleAnimationChange}
                                >
                                    <option value="1">বাউন্সিং বি 🐝</option>
                                    <option value="2">লাউঞ্জিং বি 🐝💤</option>
                                    <option value="3">লুকিং বি 🐝👀</option>
                                    <option value="4">ফ্লাইং বি 🐝✈️</option>
                                    <option value="5">হ্যাপি বি 🐝😊</option>
                                    <option value="none">কোনো অ্যানিমেশন নয়</option>
                                </select>
                            </div>

                            <div className={styles.settingCard}>
                                <div className={styles.cardHeaderArea}>
                                    <div className={styles.iconCircle}>
                                        <Globe size={20} />
                                    </div>
                                    <div className={styles.cardText}>
                                        <h3>{t('language')} (Language)</h3>
                                        <p>{t('lang_desc')}</p>
                                    </div>
                                </div>
                                <button className={styles.secondaryBtn} onClick={toggleLanguage}>
                                    {language === 'bn' ? 'English' : 'বাংলা'}
                                </button>
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
                                    <span className={styles.slider}>
                                        <span className={styles.knob}>
                                            <Check size={14} strokeWidth={4} className={styles.onIcon} />
                                            <X size={14} strokeWidth={4} className={styles.offIcon} />
                                        </span>
                                    </span>
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
                                    <span className={styles.slider}>
                                        <span className={styles.knob}>
                                            <Check size={14} strokeWidth={4} className={styles.onIcon} />
                                            <X size={14} strokeWidth={4} className={styles.offIcon} />
                                        </span>
                                    </span>
                                </label>
                            </div>
                            <div className={styles.settingCard}>
                                <div className={styles.cardText}>
                                    <h3>ইমেল নোটিফিকেশন</h3>
                                    <p>সাপ্তাহিক প্রগতি রিপোর্ট এবং গুরুত্বপূর্ণ আপডেট পান</p>
                                </div>
                                <label className={styles.switch}>
                                    <input type="checkbox" />
                                    <span className={styles.slider}>
                                        <span className={styles.knob}>
                                            <Check size={14} strokeWidth={4} className={styles.onIcon} />
                                            <X size={14} strokeWidth={4} className={styles.offIcon} />
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                );
            case 'courses':
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.sectionHeader}>
                            <h2>কোর্স সেটিংস</h2>
                            <p>আপনার এনরোল করা কোর্সসমূহ পরিচালনা করুন</p>
                        </div>

                        {loadingCourses ? (
                            <div className={styles.loaderContainer}>
                                <div className={styles.spinner}></div>
                                <p>লোড হচ্ছে...</p>
                            </div>
                        ) : enrolledCourses.length > 0 ? (
                            <div className={styles.courseManageList}>
                                {enrolledCourses.map((course) => (
                                    <div key={course.course_id} className={styles.courseManageCard}>
                                        <div className={styles.courseMainInfo}>
                                            <img src={course.image_url} alt={course.course_title} className={styles.courseThumb} />
                                            <div className={styles.courseDetails}>
                                                <h3>{course.course_title}</h3>
                                                <div className={styles.progressRow}>
                                                    <div className={styles.miniProgressBar}>
                                                        <div
                                                            className={styles.miniProgressFill}
                                                            style={{ width: `${course.progress_percentage}%` }}
                                                        ></div>
                                                    </div>
                                                    <span>{course.progress_percentage}% সম্পন্ন</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.courseActions}>
                                            <button
                                                className={cn(styles.actionBtn, styles.resetBtn)}
                                                onClick={() => handleResetCourse(course)}
                                                title="রিসেট করুন"
                                            >
                                                <RotateCcw size={18} />
                                                <span>রিসেট</span>
                                            </button>

                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.emptyCourses}>
                                <BookOpen size={48} className={styles.emptyIcon} />
                                <h3>কোনো কোর্স পাওয়া যায়নি</h3>
                                <p>আপনি এখনও কোনো কোর্সে এনরোল করেননি।</p>
                            </div>
                        )}

                        <div className={styles.warningNote}>
                            <AlertTriangle size={18} />
                            <span>সতর্কতা: প্রগতি রিসেট বা কোর্স ডিলিট করলে তা আর পুনরুদ্ধার করা সম্ভব নয়।</span>
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
                    <h1>{t('settings')}</h1>
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

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                icon={confirmModal.icon}
                type={confirmModal.type}
            />
        </div>
    );
};

export default SettingsPage;
