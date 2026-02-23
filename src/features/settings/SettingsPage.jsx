import React, { useState, useEffect, useRef } from 'react';
import { Settings, Bell, Shield, User, Sliders, BookOpen, ChevronRight, Moon, Sun, Globe, Sparkles, Volume2 } from 'lucide-react';
import styles from './SettingsPage.module.css';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { courseService } from '../../services/courseService';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { RotateCcw, AlertTriangle, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { storageService } from '../../services/storageService';
import { useLanguage } from '../../context/LanguageContext';

const SettingsPage = () => {
    const { isDark, toggleTheme } = useTheme();
    const { language, toggleLanguage, t } = useLanguage();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('preferences');
    const [selectedAnimation, setSelectedAnimation] = useState('1');
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const fileInputRef = useRef(null);

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

        const savedSound = localStorage.getItem('soundEffectsEnabled');
        if (savedSound !== null) {
            setSoundEnabled(savedSound === 'true');
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
                    toast.success(t('reset_success'));
                    fetchEnrolledCourses();
                } catch (error) {
                    console.error('Error resetting course:', error);
                    toast.error(t('reset_error'));
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

    const toggleSound = () => {
        const newValue = !soundEnabled;
        setSoundEnabled(newValue);
        localStorage.setItem('soundEffectsEnabled', String(newValue));
        if (newValue) {
            toast.success(t('sound_on'));
        } else {
            toast.info(t('sound_off'));
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingAvatar(true);
            await storageService.changeAvatar(file, user.id);
            toast.success(t('profile_updated'));
        } catch (error) {
            console.error('Error uploading avatar:', error);
            toast.error(t('upload_error'));
        } finally {
            setUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
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
                            <h2>{t('pref_settings')}</h2>
                            <p>{t('pref_desc')}</p>
                        </div>
                        <div className={styles.cardList}>
                            <div className={styles.settingCard}>
                                <div className={styles.cardHeaderArea}>
                                    <div className={styles.iconCircle}>
                                        {isDark ? <Moon size={20} /> : <Sun size={20} />}
                                    </div>
                                    <div className={styles.cardText}>
                                        <h3>{t('dark_mode')}</h3>
                                        <p>{t('dark_mode_desc')}</p>
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
                                        <Volume2 size={20} />
                                    </div>
                                    <div className={styles.cardText}>
                                        <h3>{t('sound_effects')}</h3>
                                        <p>{t('sound_effects_desc')}</p>
                                    </div>
                                </div>
                                <label className={styles.switch}>
                                    <input
                                        type="checkbox"
                                        checked={soundEnabled}
                                        onChange={toggleSound}
                                    />
                                    <span className={styles.slider}>
                                        <span className={styles.knob}>
                                            {soundEnabled ? <Check size={14} strokeWidth={4} /> : <X size={14} strokeWidth={4} />}
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
                                        <h3>{t('study_anim')}</h3>
                                        <p>{t('study_anim_desc')}</p>
                                    </div>
                                </div>
                                <select
                                    className={styles.animationSelect}
                                    value={selectedAnimation}
                                    onChange={handleAnimationChange}
                                >
                                    <option value="1">{t('bouncing_bee')}</option>
                                    <option value="2">{t('lounging_bee')}</option>
                                    <option value="3">{t('looking_bee')}</option>
                                    <option value="4">{t('flying_bee')}</option>
                                    <option value="5">{t('happy_bee')}</option>
                                    <option value="none">{t('no_animation')}</option>
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
                                <button type="button" className={styles.secondaryBtn} onClick={toggleLanguage}>
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
                            <h2>{t('profile_settings')}</h2>
                            <p>{t('profile_desc')}</p>
                        </div>
                        <div className={styles.cardList}>
                            <div className={styles.settingCard}>
                                <div className={styles.cardText}>
                                    <h3>{t('public_profile')}</h3>
                                    <p>{t('public_profile_desc')}</p>
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
                                    <h3>{t('profile_picture')}</h3>
                                    <p>{t('upload_new_pic')}</p>
                                </div>
                                <button
                                    type="button"
                                    className={styles.secondaryBtn}
                                    onClick={handleAvatarClick}
                                    disabled={uploadingAvatar}
                                >
                                    {uploadingAvatar ? t('loading') : t('change_pic')}
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'notifications':
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.sectionHeader}>
                            <h2>{t('notif_settings')}</h2>
                            <p>{t('notif_desc')}</p>
                        </div>
                        <div className={styles.cardList}>
                            <div className={styles.settingCard}>
                                <div className={styles.cardText}>
                                    <h3>{t('push_notif')}</h3>
                                    <p>{t('push_notif_desc')}</p>
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
                                    <h3>{t('email_notif')}</h3>
                                    <p>{t('email_notif_desc')}</p>
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
                            <h2>{t('course_settings')}</h2>
                            <p>{t('course_settings_desc')}</p>
                        </div>

                        {loadingCourses ? (
                            <div className={styles.loaderContainer}>
                                <div className={styles.spinner}></div>
                                <p>{t('loading')}</p>
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
                                                    <span>{course.progress_percentage}% {t('completed')}</span>
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
                                                <span>{t('reset')}</span>
                                            </button>

                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.emptyCourses}>
                                <BookOpen size={48} className={styles.emptyIcon} />
                                <h3>{t('no_courses')}</h3>
                                <p>{t('no_courses_desc')}</p>
                            </div>
                        )}

                        <div className={styles.warningNote}>
                            <AlertTriangle size={18} />
                            <span>{t('warning_reset')}</span>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className={styles.emptyState}>
                        <h3>{menuItems.find(m => m.id === activeTab)?.label} {t('section_settings')}</h3>
                        <p>{t('under_development')}.</p>
                    </div>
                );
        }
    };

    return (
        <div className={styles.settingsPage}>
            <header className={styles.pageHeader}>
                <div className={styles.headerTitle}>
                    <div className={styles.headerIconWrapper}>
                        <Settings className={styles.headerIcon} />
                        <Sparkles className={styles.sparkleIcon} />
                    </div>
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
