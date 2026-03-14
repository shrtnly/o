import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { Settings, Bell, Shield, User, Sliders, BookOpen, ChevronRight, Moon, Sun, Globe, Sparkles, Volume2, VolumeX, Crown, RotateCcw, AlertTriangle, Check, X, Zap, ShoppingBag, Drone, LogOut } from 'lucide-react';
import styles from './SettingsPage.module.css';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { courseService } from '../../services/courseService';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { toast } from 'sonner';
import { storageService } from '../../services/storageService';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabaseClient';
import CustomSelect from '../../components/ui/CustomSelect';

const SettingsPage = () => {
    const { isDark, toggleTheme } = useTheme();
    const { language, toggleLanguage, t } = useLanguage();
    const { user, updateProfile, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState('preferences');
    const [selectedAnimation, setSelectedAnimation] = useState('random');
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [sparkleEnabled, setSparkleEnabled] = useState(true);
    const [publicProfile, setPublicProfile] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(false);
    const [dailyReminder, setDailyReminder] = useState(true);
    const fileInputRef = useRef(null);
    const menuBoxRef = useRef(null);
    const navigate = useNavigate();

    // Profile State
    const [fullProfile, setFullProfile] = useState(null);
    const [editForm, setEditForm] = useState({
        full_name: '',
        email: '',
        phone_number: '',
        user_type: '',
        education_level: '',
        age: '',
        gender: '',
        location: '',
        bio: ''
    });
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

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

        const savedSparkle = localStorage.getItem('sparkleEffectsEnabled');
        if (savedSparkle !== null) {
            setSparkleEnabled(savedSparkle === 'true');
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

    useEffect(() => {
        if (activeTab === 'notifications' && user) {
            fetchNotificationSettings();
        }
    }, [activeTab, user]);

    const fetchNotificationSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('user_notifications')
                .select('*')
                .eq('user_id', user.id)
                .single();
            
            if (data) {
                setPushNotifications(data.push_enabled);
                setEmailNotifications(data.email_enabled);
                setDailyReminder(data.daily_reminder_enabled);
            } else if (error && error.code === 'PGRST116') {
                // If no record exists, create one using profile data
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, email')
                    .eq('id', user.id)
                    .single();
                
                await supabase.from('user_notifications').insert([{
                    user_id: user.id,
                    learner_name: profile?.full_name || '',
                    learner_email: profile?.email || user.email,
                    push_enabled: true,
                    email_enabled: false,
                    daily_reminder_enabled: true
                }]);
            }
        } catch (error) {
            console.error('Error fetching notification settings:', error);
        }
    };

    const updateNotificationSetting = async (field, value) => {
        try {
            const { error } = await supabase
                .from('user_notifications')
                .update({ [field]: value })
                .eq('user_id', user.id);
            
            if (error) throw error;
        } catch (error) {
            console.error('Error updating notification setting:', error);
            toast.error(t('error_update_settings') || 'সেটিংস আপডেট করতে সমস্যা হয়েছে');
        }
    };

    useEffect(() => {
        if ((activeTab === 'profile' || activeTab === 'subscription') && user) {
            fetchUserProfile();
        }
    }, [activeTab, user]);

    const fetchUserProfile = async () => {
        try {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (data) {
                setFullProfile(data);
                setEditForm({
                    full_name: data.full_name || '',
                    email: data.email || '',
                    phone_number: data.phone_number || '',
                    user_type: data.user_type || '',
                    education_level: data.education_level || '',
                    age: data.age || '',
                    gender: data.gender || 'female',
                    location: data.location || '',
                    bio: data.bio || ''
                });
            }
        } catch (err) {
            console.error('Error fetching user profile in settings:', err);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setIsSavingProfile(true);
        setIsSaved(false);
        try {
            await updateProfile(editForm);
            setIsSaved(true);
            toast.success(t('profile_updated') || 'প্রোফাইল আপডেট করা হয়েছে');
            setTimeout(() => setIsSaved(false), 2000);
        } catch (error) {
            console.error(error);
            toast.error(t('update_error') || 'সমস্যা হয়েছে');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleCancelSubscription = async () => {
        setConfirmModal({
            isOpen: true,
            type: 'danger',
            title: language === 'bn' ? 'মেম্বারশিপ বাতিল করুন' : 'Cancel Membership',
            message: language === 'bn' 
                ? 'আপনি কি নিশ্চিত যে আপনি মেম্বারশিপ বাতিল করতে চান? আপনার বর্তমান মেয়াদ শেষ না হওয়া পর্যন্ত সুবিধাগুলো সচল থাকবে এবং এরপর আর রিনিউ হবে না।' 
                : 'Are you sure you want to cancel? You will keep your benefits until the end of the current period, and it will not renew.',
            confirmText: language === 'bn' ? 'হ্যাঁ, বাতিল করুন' : 'Yes, Cancel',
            icon: X,
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('subscriptions')
                        .update({ status: 'cancelled' })
                        .eq('user_id', user.id)
                        .eq('status', 'active');
                    
                    if (error) throw error;
                    
                    setIsCancelling(false);
                    toast.success(language === 'bn' ? 'পদক্ষেপ সফল হয়েছে' : 'Successfully cancelled');
                    fetchUserProfile();
                } catch (error) {
                    setIsCancelling(false);
                    console.error('Error cancelling sub:', error);
                    toast.error(language === 'bn' ? 'বাতিল করতে সমস্যা হয়েছে' : 'Error cancelling');
                }
            }
        });
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
    const toggleAnimation = () => {
        const newValue = selectedAnimation === 'none' ? 'random' : 'none';
        setSelectedAnimation(newValue);
        localStorage.setItem('studyPageAnimation', newValue);
        if (newValue === 'random') {
            toast.success(t('random_animation') + ' ' + t('on'));
        } else {
            toast.info(t('random_animation') + ' ' + t('off'));
        }
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

    const toggleSparkleBurst = () => {
        const newValue = !sparkleEnabled;
        setSparkleEnabled(newValue);
        localStorage.setItem('sparkleEffectsEnabled', String(newValue));
        if (newValue) {
            toast.success(t('sparkle_effects') + ' ' + t('on'));
        } else {
            toast.info(t('sparkle_effects') + ' ' + t('off'));
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleLogout = () => {
        setConfirmModal({
            isOpen: true,
            type: 'danger',
            title: t('logout'),
            message: t('confirm_logout_msg'),
            confirmText: t('logout'),
            icon: LogOut,
            onConfirm: async () => {
                try {
                    await signOut();
                    navigate('/');
                    toast.success(t('logout_success'));
                } catch (error) {
                    console.error('Error logging out:', error);
                    toast.error(t('logout_error'));
                }
            }
        });
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

    const handleTabClick = (id, e) => {
        setActiveTab(id);
        
        // Auto scroll horizontally to show it is scrollable and center the selected tab
        if (menuBoxRef.current && window.innerWidth <= 1024) {
            const container = menuBoxRef.current;
            const button = e.currentTarget;
            
            // Calculate scroll position to place the clicked button roughly in the center
            const scrollLeft = button.offsetLeft - (container.offsetWidth / 2) + (button.offsetWidth / 2);
            
            container.scrollTo({
                left: scrollLeft,
                behavior: 'smooth'
            });
        }
    };

    const menuItems = [
        { id: 'preferences', label: t('preferences'), icon: Sliders },
        { id: 'profile', label: t('profile'), icon: User },
        { id: 'notifications', label: t('notifications'), icon: Bell },
        { id: 'courses', label: t('courses'), icon: BookOpen },
        { id: 'subscription', label: t('subscription'), icon: Crown },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'preferences':
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.sectionHeader}>
                            <h2>{t('pref_settings')}</h2>
                        </div>
                        <div className={styles.cardList}>
                            <div className={styles.settingCard}>
                                <div className={styles.cardHeaderArea}>
                                    <div className={styles.iconCircle}>
                                        {isDark ? <Moon size={20} /> : <Sun size={20} />}
                                    </div>
                                    <div className={styles.cardText}>
                                        <h3>{t('dark_mode')}</h3>
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
                                        {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                                    </div>
                                    <div className={styles.cardText}>
                                        <h3>{t('sound_effects')}</h3>
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
                                        <Drone size={20} />
                                    </div>
                                    <div className={styles.cardText}>
                                        <h3>{t('random_animation')}</h3>
                                    </div>
                                </div>
                                <label className={styles.switch}>
                                    <input
                                        type="checkbox"
                                        checked={selectedAnimation !== 'none'}
                                        onChange={toggleAnimation}
                                    />
                                    <span className={styles.slider}>
                                        <span className={styles.knob}>
                                            {selectedAnimation !== 'none' ? <Check size={14} strokeWidth={4} /> : <X size={14} strokeWidth={4} />}
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
                                        <h3>{t('sparkle_effects')}</h3>
                                    </div>
                                </div>
                                <label className={styles.switch}>
                                    <input
                                        type="checkbox"
                                        checked={sparkleEnabled}
                                        onChange={toggleSparkleBurst}
                                    />
                                    <span className={styles.slider}>
                                        <span className={styles.knob}>
                                            {sparkleEnabled ? <Check size={14} strokeWidth={4} /> : <X size={14} strokeWidth={4} />}
                                        </span>
                                    </span>
                                </label>
                            </div>

                            <div className={styles.settingCard}>
                                <div className={styles.cardHeaderArea}>
                                    <div className={styles.iconCircle}>
                                        <Globe size={20} />
                                    </div>
                                    <div className={styles.cardText}>
                                        <h3>{t('language')} (Language)</h3>
                                    </div>
                                </div>
                                <button type="button" className={styles.secondaryBtn} onClick={toggleLanguage}>
                                    {language === 'bn' ? 'English' : 'বাংলা'}
                                </button>
                            </div>

                            <div className={styles.settingCard}>
                                <button type="button" className={styles.dangerBtnMinimal} onClick={handleLogout} style={{ width: '100%', padding: '12px' }}>
                                    {t('logout')}
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
                        </div>
                        <div className={styles.cardList}>
                            <div className={styles.settingCard}>
                                <div className={styles.cardText}>
                                    <h3>{t('public_profile')}</h3>
                                    <p>{t('public_profile_desc')}</p>
                                </div>
                                <label className={styles.switch}>
                                    <input 
                                        type="checkbox" 
                                        checked={publicProfile} 
                                        onChange={() => setPublicProfile(!publicProfile)} 
                                    />
                                    <span className={styles.slider}>
                                        <span className={styles.knob}>
                                            {publicProfile ? <Check size={14} strokeWidth={4} /> : <X size={14} strokeWidth={4} />}
                                        </span>
                                    </span>
                                </label>
                            </div>

                        </div>
                        <form className={styles.editProfileCard} onSubmit={handleProfileSubmit}>
                            <div className={styles.sectionHeader} style={{ marginTop: '24px', marginBottom: '16px' }}>
                                <h2>{t('edit_profile')}</h2>
                            </div>
                            
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>{t('full_name')}</label>
                                    <input 
                                        className={styles.settingsInput}
                                        type="text" 
                                        required 
                                        value={editForm.full_name} 
                                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} 
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>{t('email')}</label>
                                    <input 
                                        className={styles.settingsInput}
                                        type="email" 
                                        disabled
                                        value={editForm.email} 
                                    />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>{t('phone_number')}</label>
                                    <input 
                                        className={styles.settingsInput}
                                        type="tel" 
                                        placeholder="01XXXXXXXXX"
                                        value={editForm.phone_number} 
                                        onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })} 
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>{t('gender')}</label>
                                    <CustomSelect
                                        value={editForm.gender}
                                        onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                        options={[
                                            { value: 'male', label: t('male') },
                                            { value: 'female', label: t('female') },
                                            { value: 'other', label: t('other') }
                                        ]}
                                        placeholder={t('select')}
                                    />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>{t('i_am')}</label>
                                    <CustomSelect
                                        value={editForm.user_type}
                                        onChange={(e) => setEditForm({ ...editForm, user_type: e.target.value })}
                                        options={[
                                            { value: 'student', label: t('student') },
                                            { value: 'job_seeker', label: t('job_seeker') },
                                            { value: 'job_holder', label: t('job_holder') },
                                            { value: 'other', label: t('other') }
                                        ]}
                                        placeholder={t('select')}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>{t('education')}</label>
                                    <CustomSelect
                                        value={editForm.education_level}
                                        onChange={(e) => setEditForm({ ...editForm, education_level: e.target.value })}
                                        options={[
                                            { value: 'below_class_5', label: t('below_class_5') },
                                            { value: 'class_6_10', label: t('class_6_10') },
                                            { value: 'intermediate', label: t('intermediate') },
                                            { value: 'graduate', label: t('graduate') },
                                            { value: 'post_graduate', label: t('post_graduate') }
                                        ]}
                                        placeholder={t('select')}
                                    />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>{t('age')}</label>
                                    <CustomSelect
                                        value={editForm.age}
                                        onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                                        options={[
                                            ...Array.from({ length: 82 }, (_, i) => ({ value: String(2021 - i), label: String(2021 - i) }))
                                        ]}
                                        placeholder={t('select')}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>{t('location')}</label>
                                    <CustomSelect
                                        value={editForm.location}
                                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                        options={[
                                            { value: 'Dhaka', label: 'Dhaka (ঢাকা)' },
                                            { value: 'Chattogram', label: 'Chattogram (চট্টগ্রাম)' },
                                            { value: 'Rajshahi', label: 'Rajshahi (রাজশাহী)' },
                                            { value: 'Khulna', label: 'Khulna (খুলনা)' },
                                            { value: 'Barishal', label: 'Barishal (বরিশাল)' },
                                            { value: 'Sylhet', label: 'Sylhet (সিলেট)' },
                                            { value: 'Rangpur', label: 'Rangpur (রংপুর)' },
                                            { value: 'Mymensingh', label: 'Mymensingh (ময়মনসিংহ)' },
                                            { value: 'Overseas', label: 'Overseas (দেশের বাইরে)' }
                                        ]}
                                        placeholder={t('select')}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>{t('about_me')}</label>
                                <textarea 
                                    className={styles.settingsTextarea}
                                    rows="3" 
                                    placeholder={t('about_me')}
                                    value={editForm.bio} 
                                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} 
                                />
                            </div>

                            <div className={styles.formActions}>
                                <button 
                                    type="submit" 
                                    className={styles.primaryBtn} 
                                    disabled={isSavingProfile || isSaved}
                                >
                                    {isSavingProfile ? (
                                        <div className={styles.btnLoader}></div>
                                    ) : isSaved ? (
                                        <Check size={24} strokeWidth={4} />
                                    ) : (
                                        t('save')
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                );
            case 'notifications':
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.sectionHeader}>
                            <h2>{t('notif_settings')}</h2>
                        </div>
                        <div className={styles.cardList}>
                            <div className={styles.settingCard}>
                                <div className={styles.cardText}>
                                    <h3>{t('push_notif')}</h3>
                                    <p>{t('push_notif_desc')}</p>
                                </div>
                                <label className={styles.switch}>
                                    <input 
                                        type="checkbox" 
                                        checked={pushNotifications} 
                                        onChange={() => {
                                            const newVal = !pushNotifications;
                                            setPushNotifications(newVal);
                                            updateNotificationSetting('push_enabled', newVal);
                                        }} 
                                    />
                                    <span className={styles.slider}>
                                        <span className={styles.knob}>
                                            {pushNotifications ? <Check size={14} strokeWidth={4} /> : <X size={14} strokeWidth={4} />}
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
                                    <input 
                                        type="checkbox" 
                                        checked={emailNotifications} 
                                        onChange={() => {
                                            const newVal = !emailNotifications;
                                            setEmailNotifications(newVal);
                                            updateNotificationSetting('email_enabled', newVal);
                                        }} 
                                    />
                                    <span className={styles.slider}>
                                        <span className={styles.knob}>
                                            {emailNotifications ? <Check size={14} strokeWidth={4} /> : <X size={14} strokeWidth={4} />}
                                        </span>
                                    </span>
                                </label>
                            </div>
                            <div className={styles.settingCard}>
                                <div className={styles.cardText}>
                                    <h3>{t('daily_reminder')}</h3>
                                    <p>{t('daily_reminder_desc')}</p>
                                </div>
                                <label className={styles.switch}>
                                    <input 
                                        type="checkbox" 
                                        checked={dailyReminder} 
                                        onChange={() => {
                                            const newVal = !dailyReminder;
                                            setDailyReminder(newVal);
                                            updateNotificationSetting('daily_reminder_enabled', newVal);
                                        }} 
                                    />
                                    <span className={styles.slider}>
                                        <span className={styles.knob}>
                                            {dailyReminder ? <Check size={14} strokeWidth={4} /> : <X size={14} strokeWidth={4} />}
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
                        </div>

                        {loadingCourses ? (
                            <div className={styles.loaderContainer}>
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className={styles.skeletonCourseCard}>
                                        <div className={cn(styles.skeleton, styles.skeletonThumb)}></div>
                                        <div className={styles.skeletonInfo}>
                                            <div className={cn(styles.skeleton, styles.skeletonTitle)}></div>
                                            <div className={cn(styles.skeleton, styles.skeletonProgress)}></div>
                                        </div>
                                        <div className={cn(styles.skeleton, styles.skeletonBtn)}></div>
                                    </div>
                                ))}
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
                                <div className={styles.warningNote}>
                                    <AlertTriangle size={18} />
                                    <span>সতর্কতা: রিসেট করলে তা আর পুনরুদ্ধার করা সম্ভব নয়।</span>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.emptyCourses}>
                                <BookOpen size={48} className={styles.emptyIcon} />
                                <h3>{t('no_courses')}</h3>
                                <p>{t('no_courses_desc')}</p>
                            </div>
                        )}
                    </div>
                );
            case 'subscription':
                const isPremium = !!fullProfile?.is_premium || !!fullProfile?.is_1day_premium;
                const isCancelled = fullProfile?.is_premium && fullProfile?.premium_status === 'cancelled';
                
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.sectionHeader}>
                            <h2>{t('subscription')}</h2>
                        </div>
                        <div className={styles.cardList}>
                            <div className={styles.settingCard}>
                                <div className={styles.cardHeaderArea}>
                                    <div className={styles.iconCircle}>
                                        <Crown size={20} color={isPremium ? "#f1c40f" : "var(--color-text-muted)"} />
                                    </div>
                                    <div className={styles.cardText}>
                                        <h3>{isPremium ? (language === 'bn' ? 'সক্রিয় মেম্বারশিপ' : 'Active Membership') : (language === 'bn' ? 'কোনো সক্রিয় মেম্বারশিপ নেই' : 'No Active Membership')}</h3>
                                        <p>
                                            {isPremium 
                                                ? (language === 'bn' 
                                                    ? `মেয়াদ শেষ হবে: ${new Date(fullProfile?.premium_until).toLocaleDateString('bn-BD')}` 
                                                    : `Expires on: ${new Date(fullProfile?.premium_until).toLocaleDateString()}`)
                                                : (language === 'bn' ? 'প্রিমিয়াম ফিচার আনলক করতে শপে যান' : 'Unlock premium features, visit shop')
                                            }
                                        </p>
                                        {isCancelled && (
                                            <p style={{ color: '#ff6464', fontWeight: 700, marginTop: '4px' }}>
                                                {language === 'bn' ? '⚠ বাতিল করা হয়েছে (রিনিউ হবে না)' : '⚠ Cancelled (Will not renew)'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {isPremium ? (
                                    isCancelled ? (
                                        <button className={styles.disabledBtn} disabled>
                                            {language === 'bn' ? 'বাতিল করা হয়েছে' : 'Cancelled'}
                                        </button>
                                    ) : (
                                        <button className={styles.dangerBtn} onClick={handleCancelSubscription}>
                                            {language === 'bn' ? 'বাতিল করুন' : 'Cancel'}
                                        </button>
                                    )
                                ) : (
                                    <button className={styles.shopBtn} onClick={() => navigate('/shop')}>
                                        {language === 'bn' ? 'শপে যান' : 'Visit Shop'}
                                    </button>
                                )}
                            </div>
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
                    </div>
                    <h1>{t('settings')}</h1>
                </div>
            </header>

            <div className={styles.layout}>
                <main className={styles.mainContent}>
                    {renderContent()}
                </main>

                <aside className={styles.sidebar}>
                    <div className={styles.menuBox} ref={menuBoxRef}>
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                className={cn(
                                    styles.menuItem,
                                    activeTab === item.id && styles.menuItemActive
                                )}
                                onClick={(e) => handleTabClick(item.id, e)}
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
