import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { rewardService } from '../../services/rewardService';
import { courseService } from '../../services/courseService';
import { storageService } from '../../services/storageService';
import { connectionService } from '../../services/connectionService';
import InlineLoader from '../../components/ui/InlineLoader';
import PollenIcon from '../../components/PollenIcon';
import { leaderboardService } from '../../services/leaderboardService';
import {
    Users, Edit3, Crown, Star, Lock, MapPin,
    Heart, Info, Bell, Shield, ChevronRight, ChevronDown, Award,
    LogOut, BarChart3, Layout, Activity as ActivityIcon, Compass, Flame,
    Camera, X, Settings, Share2, User, Calendar, Zap, Gem, Trophy, Target, BookOpen,
    Search, UserPlus, Check, Mail, AtSign, Phone, GraduationCap, ChartNoAxesCombined, SquarePen
} from 'lucide-react';
import ShieldIcon from '../../components/ShieldIcon';
import Button from '../../components/ui/Button';
import styles from './ProfilePage.module.css';
import { useLanguage } from '../../context/LanguageContext';
import { getShieldLevel } from '../../utils/shieldSystem';
import { motion, AnimatePresence } from 'framer-motion';
import LearnerConnection from './components/LearnerConnection';
import CertificateCard from './components/CertificateCard';
import CertificateViewer from './components/CertificateViewer';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell,
    BarChart, Bar
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

// --- Achievement Badge Constants ---
import { useNotifications } from '../../context/NotificationContext';

const BADGE_DEFS = [
    { id: 'first_lesson', emoji: '📖', label: 'প্রথম পাঠ' },
    { id: 'streak_7', emoji: '🔥', label: '7 দিনের স্ট্রিক' },
    { id: 'honey_100', emoji: '🍯', label: '100 মধু' },
    { id: 'quiz_ace', emoji: '🏆', label: 'কুইজ মাস্টার' },
    { id: 'course_complete', emoji: '🎓', label: 'কোর্স সম্পন্ন' },
    { id: 'streak_30', emoji: '⚡', label: '30 দিনের স্ট্রিক' },
    { id: 'rank_top10', emoji: '👑', label: 'টপ 10' },
    { id: 'bee_master', emoji: '', label: 'সার্টিফিকেট' },
];

const ProfilePage = () => {
    const { user, signOut, updateProfile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t, language } = useLanguage();
    const { isDark } = useTheme();
    const brandColor = isDark ? '#F1C40F' : '#FFB800';
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [streak, setStreak] = useState(null);
    const [showShareCard, setShowShareCard] = useState(false);
    const [globalRank, setGlobalRank] = useState('—');
    const [activeTab, setActiveTab] = useState('general');
    const [certificates, setCertificates] = useState([]);
    const [viewingCert, setViewingCert] = useState(null);
    const [certTab, setCertTab] = useState('earned'); // 'earned' or 'progress'

    const [analysisData, setAnalysisData] = useState(null);
    const [analysisDays, setAnalysisDays] = useState('all');
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const filterRef = useRef(null);

    const analyzeScrollRef = useRef(null);
    const analyticsSummaryRef = useRef(null);
    const xpTrendRef = useRef(null);
    const accuracyRef = useRef(null);
    const patternRef = useRef(null);

    // Notification scroll ref
    const notifScrollRef = useRef(null);



    const [activitySubTab, setActivitySubTab] = useState('log');
    const {
        notifications, unreadCount, markAsRead,
        markAllAsRead,
        deleteNotification, refresh: refreshNotifications,
        respondToConnectionRequest
    } = useNotifications();
    const [notifFilter, setNotifFilter] = useState('all');
    const [activityLogs, setActivityLogs] = useState([]);
    const [isActivityLoading, setIsActivityLoading] = useState(false);

    const [connections, setConnections] = useState({ pending: [], active: [], outgoing: [] });
    const [selectedLearner, setSelectedLearner] = useState(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setIsFilterDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        full_name: '', designation: '', department: '',
        bio: '', location: '', gender: 'female'
    });

    // Avatar upload states
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!user) { navigate('/auth'); return; }
        fetchProfileData();

        // Check for tab param
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab && ['general', 'analyze', 'activity', 'connection'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [user?.id, navigate, location.search]);

    const fetchProfileData = async () => {
        try {
            if (!profile) setLoading(true);
            const { data: profileData } = await supabase
                .from('profiles').select('*').eq('id', user.id).single();
            setProfile(profileData);
            setEditForm({
                full_name: profileData?.full_name || '',
                designation: profileData?.designation || '',
                department: profileData?.department || '',
                bio: profileData?.bio || '',
                location: profileData?.location || '',
                gender: profileData?.gender || 'female'
            });
            const userStats = await rewardService.getUserStats(user.id);
            setStats(userStats);
            const streakData = await rewardService.getUserStreak(user.id);
            setStreak(streakData);
            const { data: courseProgress } = await supabase
                .from('user_course_progress')
                .select('*')
                .eq('user_id', user.id);
            setEnrolledCourses(courseProgress || []);

            // Fetch certificates
            const { data: certData } = await supabase
                .from('certificates')
                .select('*, courses(title)')
                .eq('user_id', user.id);
            setCertificates(certData || []);

            // Fetch real rank from leaderboard
            try {
                if (!profileData || profileData.xp < 100) {
                    setGlobalRank('—');
                } else {
                    const { data: rankData } = await supabase
                        .from('leaderboard_view')
                        .select('tier')
                        .eq('id', user.id)
                        .maybeSingle();

                    if (rankData) {
                        const rank = await leaderboardService.getUserRank(user.id, rankData.tier);
                        if (rank) setGlobalRank(rank);
                    }
                }
            } catch (rankErr) {
                console.error('Error fetching global rank:', rankErr);
            }

        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };


    const sendTestNotification = async () => {
        if (!user?.id) return;
        try {
            const { error } = await supabase
                .from('notifications')
                .insert([{
                    user_id: user.id,
                    type: 'reward',
                    title: 'টেস্ট নটিফিকেশন 🐝',
                    message: 'অভিনন্দন! আপনার নোটিফিকেশন সিস্টেম এখন চমৎকারভাবে কাজ করছে।',
                    data: { test: true }
                }]);
            if (error) throw error;
        } catch (err) {
            console.error('Error sending test notification:', err);
        }
    };


    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const updated = await updateProfile(editForm);
            setProfile(updated);
            setIsEditModalOpen(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            alert(t('update_error'));
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploadingAvatar(true);
            const updatedProfile = await storageService.changeAvatar(file, user.id, profile?.avatar_url);
            setProfile(updatedProfile);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert(error.message || 'ছবি আপলোড করতে সমস্যা হয়েছে');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const formatNotifDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();

        if (isToday) {
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }

        return date.toLocaleString('en-US', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    const fetchAnalysisData = useCallback(async () => {
        if (!user?.id) return;
        setIsAnalysisLoading(true);
        try {
            const data = await rewardService.getAnalysisData(user.id, analysisDays);
            setAnalysisData(data);
        } catch (err) {
            console.error('Error fetching analysis:', err);
        } finally {
            setIsAnalysisLoading(false);
        }
    }, [user?.id, analysisDays]);

    const fetchActivityData = useCallback(async () => {
        if (!user?.id) return;
        setIsActivityLoading(true);
        try {
            const logs = await rewardService.getRecentTransactions(user.id, 20);
            setActivityLogs(logs);
            await refreshNotifications();
        } catch (err) {
            console.error('Error fetching activity data:', err);
        } finally {
            setIsActivityLoading(false);
        }
    }, [user?.id, refreshNotifications]);


    const fetchConnectionBadgeData = useCallback(async () => {
        if (!user?.id) return;
        try {
            const data = await connectionService.getConnections(user.id);
            setConnections(data);
        } catch (err) {
            console.error('Error fetching connections for badge:', err);
        }
    }, [user?.id]);

    useEffect(() => {
        if (activeTab === 'analyze') {
            fetchAnalysisData();
        } else if (activeTab === 'activity') {
            fetchActivityData();
        }
    }, [activeTab, fetchAnalysisData, fetchActivityData]);



    // Independent fetch for badges on mount
    useEffect(() => {
        if (user?.id) {
            fetchConnectionBadgeData();
        }
    }, [user?.id, fetchConnectionBadgeData]);

    // Real-time listener for connection requests
    useEffect(() => {
        if (!user?.id) return;

        // Listen for ANY change in connections
        const connectionChannel = supabase
            .channel(`profile-badge-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'learner_connections'
                },
                (payload) => {
                    console.log('Real-time sync triggered:', payload.eventType);
                    fetchConnectionBadgeData();
                }
            )
            .subscribe();

        // Also fetch when window becomes visible (user returns to browser tab)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchConnectionBadgeData();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            supabase.removeChannel(connectionChannel);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [user?.id, fetchConnectionBadgeData]);


    // Map enrolled courses with their certificate data if available
    const certificatesWithStatus = enrolledCourses.map(course => {
        const cert = certificates.find(c => c.course_id === course.course_id);
        const progress = Number(course.progress_percentage || 0);
        return {
            ...course,
            isLocked: !cert && progress < 100,
            certificate: cert,
            progress: progress
        };
    }).sort((a, b) => (b.progress - a.progress));

    // Calculate Badges Unlocked Status
    const badges = BADGE_DEFS.map(badge => {
        let unlocked = false;
        switch (badge.id) {
            case 'first_lesson':
                unlocked = stats?.chapters_completed >= 1;
                break;
            case 'streak_7':
                unlocked = streak?.current_streak >= 7;
                break;
            case 'honey_100':
                unlocked = (profile?.xp || 0) >= 100;
                break;
            case 'quiz_ace':
                unlocked = stats?.chapters_completed >= 50;
                break;
            case 'course_complete':
                unlocked = enrolledCourses.some(c => parseFloat(c.progress_percentage) >= 100);
                break;
            case 'streak_30':
                unlocked = streak?.current_streak >= 30;
                break;
            case 'rank_top10':
                unlocked = typeof globalRank === 'number' && globalRank <= 10;
                break;
            case 'bee_master':
                // For now, true if at least one course is 100% complete OR as defined by user requirement hint
                unlocked = enrolledCourses.some(c => parseFloat(c.progress_percentage) >= 100);
                break;
            default:
                break;
        }
        return { ...badge, unlocked };
    });

    const xp = profile?.xp || 0;

    return (
        <div className={styles.profilePage}>
            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <linearGradient id="flameGradientProfile" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#FFD700', stopOpacity: 1 }} />
                        <stop offset="50%" style={{ stopColor: brandColor, stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#E67E22', stopOpacity: 1 }} />
                    </linearGradient>
                </defs>
            </svg>
            {loading ? (
                <div className={styles.loadingContainer}><InlineLoader /></div>
            ) : (
                <div className={styles.container}>

                    {/* ========== SECTION 1: ROYAL HEADER ========== */}
                    <section className={styles.royalHeader}>
                        <button
                            className={styles.headerSettingsBtn}
                            onClick={() => navigate('/settings')}
                            title={t('settings')}
                        >
                            <Settings size={22} strokeWidth={1.5} />
                        </button>
                        <div className={styles.avatarWrapper}>
                            <div className={styles.avatar} onClick={() => fileInputRef.current?.click()}>
                                {profile?.avatar_url
                                    ? <img src={profile.avatar_url} alt="Profile" />
                                    : <User size={44} color={brandColor} />
                                }
                                <div className={styles.avatarOverlay}>
                                    <Camera size={20} />
                                </div>
                                {uploadingAvatar && <div className={styles.loaderOverlay}><InlineLoader /></div>}
                            </div>

                            {/* Active/Inactive Indicator */}
                            <div className={styles.statusIndicator}>
                                <div className={`${styles.statusDot} ${profile?.last_seen && (new Date() - new Date(profile.last_seen)) < 5 * 60 * 1000 ? styles.online : styles.offline}`}></div>
                            </div>

                            <input ref={fileInputRef} type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                onChange={handleAvatarChange} style={{ display: 'none' }} />
                        </div>

                        {/* User Info */}
                        <div className={styles.profileInfo}>
                            <h1 className={styles.profileName}>
                                {profile?.full_name || 'শিক্ষার্থী'}
                            </h1>

                            {/* Rank Badge */}
                            <div className={styles.rankBadge}>
                                <span>
                                    {getShieldLevel(profile?.xp || 0).name} Learner {profile?.location ? `@ ${profile.location}` : ''}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* ========== TABS SECTION ========== */}
                    <nav className={styles.profileTabs}>
                        <button
                            className={`${styles.tabItem} ${activeTab === 'general' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('general')}
                        >
                            <Layout size={18} />
                            {activeTab === 'general' && <span>{t('tab_general')}</span>}
                        </button>
                        <button
                            className={`${styles.tabItem} ${activeTab === 'connection' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('connection')}
                        >
                            <div className={styles.tabIconGroup}>
                                <Users size={18} />
                                {connections.pending.length > 0 && (
                                    <span className={styles.tabBadge}>{connections.pending.length}</span>
                                )}
                            </div>
                            {activeTab === 'connection' && <span>{t('tab_connection')}</span>}
                        </button>
                        <button
                            className={`${styles.tabItem} ${activeTab === 'analyze' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('analyze')}
                        >
                            <BarChart3 size={18} />
                            {activeTab === 'analyze' && <span>{t('tab_analyze')}</span>}
                        </button>
                        <button
                            className={`${styles.tabItem} ${activeTab === 'activity' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('activity')}
                        >
                            <div className={styles.tabIconGroup}>
                                <Bell size={18} />
                                {unreadCount > 0 && <span className={styles.tabBadge}>{unreadCount}</span>}
                            </div>
                            {activeTab === 'activity' && <span>{'নটিফিকেশন'}</span>}
                        </button>
                    </nav>

                    {activeTab === 'general' && (
                        <>
                            {/* ========== SECTION 2: HONEY STATS GRID ========== */}
                            <section className={styles.statsSection}>
                                <h2 className={styles.sectionTitle}>
                                    <div className={styles.sectionTitleLeft}>
                                        {language === 'bn' ? 'পরিসংখ্যান' : 'Statistics'}
                                    </div>
                                </h2>
                                <div className={styles.statsGrid}>
                                    <div className={styles.statCard}>
                                        <div className={styles.statIconBox}>
                                            <Flame size={18} fill="url(#flameGradientProfile)" stroke="url(#flameGradientProfile)" className={styles.statIconStreak} />
                                        </div>
                                        <div className={styles.statInfoStack}>
                                            <span className={styles.statCardValue}>{streak?.current_streak || 0}</span>
                                            <span className={styles.statCardLabel}>{language === 'bn' ? 'স্ট্রিক' : 'Streak'}</span>
                                        </div>
                                    </div>
                                    <div className={styles.statCard}>
                                        <div className={styles.statIconBox}>
                                            <Trophy size={18} className={styles.statIconRank} />
                                        </div>
                                        <div className={styles.statInfoStack}>
                                            <span className={styles.statCardValue}>{typeof globalRank === 'number' ? `#${globalRank}` : globalRank}</span>
                                            <span className={styles.statCardLabel}>{language === 'bn' ? 'র‍্যাংক' : 'Rank'}</span>
                                        </div>
                                    </div>
                                    <div className={styles.statCard}>
                                        <div className={styles.statIconBox}>
                                            <Compass size={18} className={styles.statIconCompass} />
                                        </div>
                                        <div className={styles.statInfoStack}>
                                            <span className={styles.statCardValue}>{enrolledCourses.length}</span>
                                            <span className={styles.statCardLabel}>{language === 'bn' ? 'কোর্স' : 'Courses'}</span>
                                        </div>
                                    </div>
                                </div>
                            </section>


                            {/* ========== SECTION: PERSONAL DETAILS ========== */}
                            <section className={styles.personalSection}>
                                <h2 className={styles.sectionTitle}>
                                    <div className={styles.sectionTitleLeft}>
                                        {language === 'bn' ? 'ব্যক্তিগত তথ্য' : 'Personal Details'}
                                    </div>
                                    <button className={styles.seeAllBtn} onClick={() => navigate('/settings?tab=profile')}>
                                        <SquarePen size={18} />
                                    </button>
                                </h2>
                                <div className={styles.personalGrid}>
                                    <div className={styles.personalItem}>
                                        <div className={styles.personalText}>
                                            <span className={styles.personalLabel}>{language === 'bn' ? 'নাম' : 'Name'}</span>
                                            <span className={styles.personalValue}>{profile?.full_name || '—'}</span>
                                        </div>
                                    </div>
                                    <div className={styles.personalItem}>
                                        <div className={styles.personalText}>
                                            <span className={styles.personalLabel}>{language === 'bn' ? 'ইমেইল' : 'Email'}</span>
                                            <span className={styles.personalValue}>{profile?.email || '—'}</span>
                                        </div>
                                    </div>
                                    <div className={styles.personalItem}>
                                        <div className={styles.personalText}>
                                            <span className={styles.personalLabel}>{language === 'bn' ? 'ফোন' : 'Phone'}</span>
                                            <span className={styles.personalValue}>{profile?.phone_number || '—'}</span>
                                        </div>
                                    </div>
                                    <div className={styles.personalItem}>
                                        <div className={styles.personalText}>
                                            <span className={styles.personalLabel}>{language === 'bn' ? 'ঠিকানা' : 'Location'}</span>
                                            <span className={styles.personalValue}>{profile?.location || '—'}</span>
                                        </div>
                                    </div>
                                    <div className={styles.personalItem}>
                                        <div className={styles.personalText}>
                                            <span className={styles.personalLabel}>{language === 'bn' ? 'শিক্ষা' : 'Education'}</span>
                                            <span className={styles.personalValue}>{profile?.education_level || '—'}</span>
                                        </div>
                                    </div>
                                    <div className={styles.personalItem}>
                                        <div className={styles.personalText}>
                                            <span className={styles.personalLabel}>{language === 'bn' ? 'সদস্যপদ' : 'Joined'}</span>
                                            <span className={styles.personalValue}>{formatDate(profile?.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* ========== SECTION 6: CERTIFICATIONS ========== */}
                            <section className={styles.certsSection}>
                                <div className={styles.sectionTitle}>
                                    <div className={styles.sectionTitleLeft}>
                                        {t('earned_certificates')}
                                    </div>
                                    <div className={styles.certTabs}>
                                        <button 
                                            className={`${styles.certTab} ${certTab === 'earned' ? styles.certTabActive : ''}`}
                                            onClick={() => setCertTab('earned')}
                                        >
                                            {language === 'bn' ? 'অর্জিত' : 'Earned'}
                                        </button>
                                        <button 
                                            className={`${styles.certTab} ${certTab === 'progress' ? styles.certTabActive : ''}`}
                                            onClick={() => setCertTab('progress')}
                                        >
                                            {language === 'bn' ? 'চলমান' : 'Ongoing'}
                                        </button>
                                    </div>
                                </div>

                                {certificatesWithStatus.filter(c => certTab === 'earned' ? !c.isLocked : c.isLocked).length > 0 ? (
                                    <div className={styles.certsGrid}>
                                        {certificatesWithStatus
                                            .filter(c => certTab === 'earned' ? !c.isLocked : c.isLocked)
                                            .map((course) => (
                                                <CertificateCard 
                                                    key={course.course_id} 
                                                    course={course} 
                                                    onOpen={(c) => setViewingCert(c)}
                                                />
                                            ))}
                                    </div>
                                ) : (
                                    <div className={styles.noCertsWrapper}>
                                        <div className={styles.certIconContainer} style={{ opacity: 0.2 }}>
                                            <Award size={32} />
                                        </div>
                                        <p className={styles.noCertsText}>
                                            {certTab === 'earned' 
                                                ? t('no_certificates') 
                                                : (language === 'bn' ? 'বর্তমানে কোনো কোর্স চলমান নেই।' : 'No courses currently in progress.')}
                                        </p>
                                    </div>
                                )}
                            </section>

                            <AnimatePresence>
                                {viewingCert && (
                                    <CertificateViewer 
                                        certificate={viewingCert}
                                        learnerName={profile?.full_name || 'Learner'}
                                        onClose={() => setViewingCert(null)}
                                    />
                                )}
                            </AnimatePresence>

                            {/* ========== SECTION 5: ACTIONS & SETTINGS ========== */}
                            <section className={styles.actionsSection}>

                                <button className={styles.actionOutline} onClick={sendTestNotification}>
                                    <Bell size={16} />
                                    টেস্ট নটিফিকেশন
                                </button>
                               
                            </section>

                            {/* Bottom Spacer for extra scrolling room */}
                            <div className={styles.bottomSpacer} />
                        </>
                    )}

                    {activeTab === 'analyze' && (
                        <div className={styles.analyzeTabContent}>
                            {/* \u2500\u2500 Scroll Nav + Filter Header \u2500\u2500 */}
                            <div className={styles.analyzeHeader}>
                                {/* Time Range Filter */}
                                <div className={styles.analysisFilters}>
                                    <div className={styles.dropdownWrapper} ref={filterRef}>
                                        <button
                                            className={styles.dropdownToggle}
                                            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                                        >
                                            <div className={styles.dropLabelStack}>
                                                <span className={styles.selectedVal}>
                                                    {analysisDays === 'all' ? t('all_time') : t(`last_${analysisDays}_days`)}
                                                </span>
                                            </div>
                                            <ChevronDown size={14} className={`${styles.dropdownIcon} ${isFilterDropdownOpen ? styles.rotateIcon : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {isFilterDropdownOpen && (
                                                <motion.div
                                                    className={styles.dropdownMenu}
                                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                                >
                                                    {[
                                                        { value: 'all', label: t('all_time') },
                                                        { value: '30', label: t('last_30_days') },
                                                        { value: '15', label: t('last_15_days') },
                                                        { value: '7', label: t('last_7_days') }
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.value}
                                                            className={`${styles.dropdownOption} ${analysisDays === opt.value ? styles.optActive : ''}`}
                                                            onClick={() => {
                                                                setAnalysisDays(opt.value);
                                                                setIsFilterDropdownOpen(false);
                                                            }}
                                                        >
                                                            {opt.label}
                                                            {analysisDays === opt.value && <div className={styles.activeDot} />}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            {isAnalysisLoading ? (
                                <div className={styles.analysisLoading}>
                                    <InlineLoader showText={false} />
                                    <p className={styles.typingLoading}>
                                        {language === 'bn' ? 'লোড হচ্ছে...' : 'Analyzing performance...'}
                                    </p>
                                </div>
                            ) : analysisData ? (
                                <div ref={analyzeScrollRef} className={styles.analyzeScrollBody}>
                                    <div className={styles.analysisGrid}>

                                        {/* \u2500\u2500 Section 1: Summary \u2500\u2500 */}
                                        <div
                                            className={styles.analysisSectionBlock}
                                            ref={analyticsSummaryRef}
                                            data-section="summary"
                                        >

                                            <div className={styles.analysisStatsRow}>
                                                <div className={styles.analysisMiniCard}>
                                                    <span className={styles.miniCardLabel}>{t('daily_xp')}</span>
                                                    <span className={styles.miniCardValue} style={{ color: brandColor }}>
                                                        {analysisData.summary.totalXp}
                                                    </span>
                                                </div>
                                                <div className={styles.analysisMiniCard}>
                                                    <span className={styles.miniCardLabel}>{t('total_time')}</span>
                                                    <span className={styles.miniCardValue} style={{ color: brandColor }}>
                                                        {analysisData.summary.totalMinutes} {t('minutes')}
                                                    </span>
                                                </div>
                                                <div className={styles.analysisMiniCard}>
                                                    <span className={styles.miniCardLabel}>{t('accuracy')}</span>
                                                    <span className={styles.miniCardValue} style={{ color: '#2ECC71' }}>
                                                        {Math.round((analysisData.summary.totalCorrect / (analysisData.summary.totalCorrect + analysisData.summary.totalWrong)) * 100)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* \u2500\u2500 Section 2: XP Chart \u2500\u2500 */}
                                        <div
                                            className={styles.analysisSectionBlock}
                                            ref={xpTrendRef}
                                            data-section="xp"
                                        >

                                            <div className={styles.chartContainerFull}>
                                                <h3 className={styles.chartTitle}>{t('daily_honey')}</h3>
                                                <div style={{ width: '100%', height: 200 }}>
                                                    <ResponsiveContainer>
                                                        <AreaChart data={analysisData.activity}>
                                                            <defs>
                                                                <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor={brandColor} stopOpacity={0.3} />
                                                                    <stop offset="95%" stopColor={brandColor} stopOpacity={0} />
                                                                </linearGradient>
                                                            </defs>
                                                            <XAxis dataKey="activity_date" hide />
                                                            <YAxis hide />
                                                            <ChartTooltip
                                                                contentStyle={{
                                                                    background: isDark ? 'rgba(20, 20, 20, 0.95)' : '#ffffff',
                                                                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                                                                    borderRadius: '12px',
                                                                    fontSize: '12px',
                                                                    color: isDark ? '#fff' : '#1e293b',
                                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                                }}
                                                                itemStyle={{ color: isDark ? '#fff' : '#1e293b' }}
                                                                labelStyle={{ color: isDark ? '#fff' : '#1e293b' }}
                                                            />
                                                            <Area
                                                                type="monotone"
                                                                dataKey="xp_earned"
                                                                name={t('earned')}
                                                                stroke={brandColor}
                                                                fillOpacity={1}
                                                                fill="url(#colorXp)"
                                                                strokeWidth={3}
                                                            />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>

                                        {/* \u2500\u2500 Section 3: Accuracy \u2500\u2500 */}
                                        <div
                                            className={styles.analysisSectionBlock}
                                            ref={accuracyRef}
                                            data-section="accuracy"
                                        >

                                            <div className={styles.chartCard}>
                                                <h3 className={styles.chartTitle}>{t('accuracy')}</h3>
                                                <div style={{ width: '100%', height: 150 }}>
                                                    <ResponsiveContainer>
                                                        <PieChart>
                                                            <Pie
                                                                data={[
                                                                    { name: t('right_answers'), value: analysisData.summary.totalCorrect },
                                                                    { name: t('wrong_answers'), value: analysisData.summary.totalWrong }
                                                                ]}
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={45}
                                                                outerRadius={65}
                                                                paddingAngle={8}
                                                                dataKey="value"
                                                            >
                                                                <Cell fill={brandColor} stroke="none" />
                                                                <Cell fill={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"} stroke="none" />
                                                            </Pie>
                                                            <ChartTooltip
                                                                contentStyle={{
                                                                    background: isDark ? 'rgba(20, 20, 20, 0.95)' : '#ffffff',
                                                                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                                                                    borderRadius: '10px',
                                                                    fontSize: '12px',
                                                                    color: isDark ? '#fff' : '#1e293b',
                                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                                }}
                                                                itemStyle={{ color: isDark ? '#fff' : '#1e293b' }}
                                                                labelStyle={{ color: isDark ? '#fff' : '#1e293b' }}
                                                            />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                                <div className={styles.pieLegend}>
                                                    <div className={styles.legendItem}>
                                                        <span className={styles.legendDot} style={{ background: brandColor }} />
                                                        <span>{t('right_answers')}</span>
                                                    </div>
                                                    <div className={styles.legendItem}>
                                                        <span className={styles.legendDot} style={{ background: 'rgba(255, 255, 255, 0.15)' }} />
                                                        <span>{t('wrong_answers')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* \u2500\u2500 Section 4: Pattern \u2500\u2500 */}
                                        <div
                                            className={styles.analysisSectionBlock}
                                            ref={patternRef}
                                            data-section="pattern"
                                        >

                                            <div className={styles.chartCard}>
                                                <h3 className={styles.chartTitle}>{t('learning_pattern')}</h3>
                                                <div style={{ width: '100%', height: 150 }}>
                                                    <ResponsiveContainer>
                                                        <BarChart data={analysisData.activity}>
                                                            <XAxis dataKey="activity_date" hide />
                                                            <YAxis hide />
                                                            <ChartTooltip
                                                                contentStyle={{
                                                                    background: 'rgba(20, 20, 20, 0.9)',
                                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                                    borderRadius: '10px',
                                                                    fontSize: '10px',
                                                                    color: '#fff'
                                                                }}
                                                                itemStyle={{ color: '#fff' }}
                                                                labelStyle={{ color: '#fff' }}
                                                                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                                            />
                                                            <Bar
                                                                dataKey="lessons_completed"
                                                                name={t('lessons_completed')}
                                                                fill={brandColor}
                                                                radius={[4, 4, 0, 0]}
                                                                barSize={12}
                                                                opacity={0.8}
                                                            />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                    <div style={{ height: 24 }} />
                                </div>
                            ) : (
                                <div className={styles.analysisEmpty}>
                                    <BarChart3 size={40} opacity={0.3} />
                                    <p>{language === 'bn' ? 'কোনো ডেটা পাওয়া যায়নি' : 'No data available'}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div className={styles.activityTabContent}>
                            {/* Sticky Header */}
                            <div className={styles.notifStickyHeader}>
                                <div className={styles.notifHeaderRow}>
                                    <span className={styles.notifCountLabel}>
                                        {unreadCount > 0 ? `${unreadCount}টি আনরিড` : 'সব পড়া হয়েছে'}
                                    </span>
                                    {unreadCount > 0 && (
                                        <button className={styles.markAllBtnMinimal} onClick={markAllAsRead}>
                                            সব পড়া হল
                                        </button>
                                    )}
                                </div>
                                {/* Filter pills */}
                                <div className={styles.notifFilters}>
                                    {[
                                        { id: 'all', label: 'সব' },
                                        { id: 'achievements', label: 'অ্যাচিভমেন্ট' },
                                        { id: 'social', label: 'সোশ্যাল' },
                                        { id: 'system', label: 'সিস্টেম' }
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            className={`${styles.filterPill} ${notifFilter === f.id ? styles.filterPillActive : ''}`}
                                            onClick={() => setNotifFilter(f.id)}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Scrollable content */}
                            <div ref={notifScrollRef} className={styles.notifScrollBody}>
                                {isActivityLoading ? (
                                    <div className={styles.activityLoading}><InlineLoader /></div>
                                ) : (() => {
                                    const filtered = notifications.filter(n => {
                                        if (notifFilter === 'all') return true;
                                        if (notifFilter === 'achievements') return ['reward', 'streak'].includes(n.type);
                                        if (notifFilter === 'social') return ['connection', 'message'].includes(n.type);
                                        if (notifFilter === 'system') return ['system', 'course'].includes(n.type);
                                        return true;
                                    });

                                    if (filtered.length === 0) {
                                        return (
                                            <div className={styles.emptyState}>
                                                <Bell size={36} opacity={0.15} />
                                                <p>কোনো নটিফিকেশন নেই</p>
                                            </div>
                                        );
                                    }

                                    const groups = filtered.reduce((acc, notif) => {
                                        const d = new Date(notif.created_at);
                                        const today = new Date();
                                        const yesterday = new Date(today);
                                        yesterday.setDate(yesterday.getDate() - 1);
                                        let key = 'আগে';
                                        if (d.toDateString() === today.toDateString()) key = 'আজ';
                                        else if (d.toDateString() === yesterday.toDateString()) key = 'গতকাল';
                                        if (!acc[key]) acc[key] = [];
                                        acc[key].push(notif);
                                        return acc;
                                    }, {});

                                    return Object.entries(groups).map(([groupName, items]) => (
                                        <div key={groupName} className={styles.notifGroup}>
                                            <h5 className={styles.groupHeading}>{groupName}</h5>
                                            <div className={styles.groupItems}>
                                                {items.map(notif => (
                                                    <div
                                                        key={notif.id}
                                                        className={`${styles.notifRow} ${!notif.is_read ? styles.notifRowUnread : ''}`}
                                                        onClick={() => !notif.is_read && markAsRead(notif.id)}
                                                    >
                                                        {/* Unread dot */}
                                                        <div className={styles.notifUnreadDot}>
                                                            {!notif.is_read && <div className={styles.unreadDot} />}
                                                        </div>

                                                        {/* Icon */}
                                                        <div className={styles.notifTypeIcon} style={{
                                                            background: notif.type === 'reward' ? 'rgba(241,196,15,0.08)' :
                                                                notif.type === 'streak' ? 'rgba(230,126,34,0.08)' :
                                                                    notif.type === 'course' ? 'rgba(46,204,113,0.08)' :
                                                                        'rgba(52,152,219,0.08)'
                                                        }}>
                                                            {notif.actor?.avatar_url ? (
                                                                <img src={notif.actor.avatar_url} alt="" className={styles.notifActorImg} />
                                                            ) : (
                                                                <>
                                                                    {notif.type === 'reward' && <Trophy size={15} color="#F1C40F" />}
                                                                    {notif.type === 'streak' && <Flame size={15} color="#E67E22" />}
                                                                    {notif.type === 'course' && <BookOpen size={15} color="#2ECC71" />}
                                                                    {!['reward', 'streak', 'course'].includes(notif.type) && <Bell size={15} color="#3498DB" />}
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Text */}
                                                        <div className={styles.notifRowText}>
                                                            <span className={styles.nTitle}>
                                                                {notif.type === 'connection' && notif.data?.status === 'pending'
                                                                    ? 'নতুন কানেকশন অনুরোধ!'
                                                                    : notif.title}
                                                            </span>
                                                            <span className={styles.nMsg}>
                                                                {notif.type === 'connection' && notif.data?.status === 'pending'
                                                                    ? `${notif.actor?.full_name || 'কেউ একজন'} আপনাকে কানেকশন অনুরোধ পাঠিয়েছেন।`
                                                                    : notif.message}
                                                            </span>

                                                            {/* Actions */}

                                                            {notif.type === 'connection' && notif.data?.status === 'accepted' && (
                                                                <div className={styles.respondedStatus}>
                                                                    <Check size={12} strokeWidth={3} />
                                                                    <span>সংযুক্ত হয়েছেন</span>
                                                                </div>
                                                            )}
                                                            {notif.type === 'reward' && (
                                                                <button className={styles.actionLink} onClick={() => navigate('/shop')}>
                                                                    শপ দেখুন <ChevronRight size={11} />
                                                                </button>
                                                            )}

                                                            {notif.type === 'connection' && notif.data?.status === 'pending' && (
                                                                <button
                                                                    className={styles.actionLink}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigate('?tab=connection&sub=received');
                                                                        if (!notif.is_read) markAsRead(notif.id);
                                                                    }}
                                                                >
                                                                    দেখুন <ChevronRight size={11} />
                                                                </button>
                                                            )}

                                                            <span className={styles.nTime}>{formatNotifDate(notif.created_at)}</span>
                                                        </div>

                                                        {/* Delete */}
                                                        <button
                                                            type="button"
                                                            className={styles.deleteNotif}
                                                            onClick={e => { e.preventDefault(); e.stopPropagation(); deleteNotification(notif.id); }}
                                                        >
                                                            <X size={13} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ));
                                })()}
                                <div style={{ height: 24 }} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'connection' && (
                        <LearnerConnection
                            user={user}
                            userXp={profile?.xp || 0}
                            onSelectLearner={setSelectedLearner}
                        />
                    )}

                    {/* Learner Profile Modal */}
                    <AnimatePresence>
                        {selectedLearner && (
                            <motion.div
                                className={styles.modalOverlay}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSelectedLearner(null)}
                            >
                                <motion.div
                                    className={styles.learnerModal}
                                    initial={{ scale: 0.9, y: 20 }}
                                    animate={{ scale: 1, y: 0 }}
                                    exit={{ scale: 0.9, y: 20 }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <button className={styles.modalClose} onClick={() => setSelectedLearner(null)}>
                                        <X size={20} />
                                    </button>

                                    <div className={styles.learnerHeader}>
                                        <div className={styles.lAvatarLarge}>
                                            {selectedLearner.avatar_url ? <img src={selectedLearner.avatar_url} /> : <User size={48} color={brandColor} />}
                                        </div>
                                        <h3 className={styles.lNameLarge}>{selectedLearner.full_name || selectedLearner.display_name}</h3>
                                        <p className={styles.lEmailLarge}>{selectedLearner.email}</p>
                                    </div>

                                    <div className={styles.lStatsRow}>
                                        <div className={styles.lStatItem}>
                                            <Zap size={16} color={brandColor} />
                                            <span>{selectedLearner.xp} XP</span>
                                        </div>
                                        {selectedLearner.location && (
                                            <div className={styles.lStatItem}>
                                                <MapPin size={16} color="#3498DB" />
                                                <span>{selectedLearner.location}</span>
                                            </div>
                                        )}
                                        <div className={styles.lStatItem}>
                                            <User size={16} color="#9B59B6" />
                                            <span>{t(selectedLearner.gender)}</span>
                                        </div>
                                    </div>

                                    {selectedLearner.bio && (
                                        <div className={styles.lBioSection}>
                                            <h4 className={styles.lBioTitle}>{t('bio')}</h4>
                                            <p className={styles.lBioText}>{selectedLearner.bio}</p>
                                        </div>
                                    )}

                                    <div className={styles.lBadgesRow}>
                                        {/* Placeholder for learner's top badges if available */}
                                    </div>

                                    <button className={styles.lActionBtn} onClick={() => setSelectedLearner(null)}>
                                        {t('close')}
                                    </button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}



            {/* === SHARE CARD MODAL === */}
            {showShareCard && (
                <div className={styles.modalOverlay} onClick={() => setShowShareCard(false)}>
                    <div className={styles.shareCard} onClick={e => e.stopPropagation()}>
                        <button className={styles.shareCloseBtn} onClick={() => setShowShareCard(false)}>
                            <X size={18} />
                        </button>
                        <div className={styles.shareCardInner}>
                            <div className={styles.shareCardHeader}>
                                <span className={styles.shareBeeIcon}>🐝</span>
                                <h3>BeeLesson</h3>
                                <p>আমার শেখার সারসংক্ষেপ</p>
                            </div>
                            <div className={styles.shareCardAvatar}>
                                {profile?.avatar_url
                                    ? <img src={profile.avatar_url} alt="avatar" />
                                    : <User size={32} color={brandColor} />}
                            </div>
                            <h4 className={styles.shareCardName}>
                                {profile?.full_name || profile?.display_name || 'শিক্ষার্থী'}
                                {flamingBadge && <FlamingBadge size={16} className={styles.nameBadge} />}
                            </h4>
                            <div className={styles.shareStatsRow}>
                                <div className={styles.shareStat}><strong>{profile?.xp || 0}</strong><span>মধু (XP)</span></div>
                                <div className={styles.shareStat}><strong>{streak?.current_streak || 0}</strong><span>দিনের স্ট্রিক</span></div>
                                <div className={styles.shareStat}><strong>{enrolledCourses.length}</strong><span>কোর্স</span></div>
                            </div>
                            <div className={styles.shareRankBadge}>
                                <Crown size={13} /> {language === 'bn' ? `রয়্যাল জেলি ${getShieldLevel(profile?.xp || 0).nameBangla}` : `Royal Jelly ${getShieldLevel(profile?.xp || 0).name}`}
                            </div>
                            <button className={styles.shareDownload}>📸 স্ক্রিনশট নিন</button>
                        </div>
                    </div>
                </div>
            )}

            {/* === EDIT PROFILE MODAL === */}
            {isEditModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsEditModalOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>প্রোফাইল এডিট</h3>
                            <button className={styles.closeBtn} onClick={() => setIsEditModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form className={styles.editForm} onSubmit={handleUpdateProfile}>
                            <div className={styles.fieldGroup}>
                                <label>পূর্ণ নাম</label>
                                <input type="text" value={editForm.full_name}
                                    onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} required />
                            </div>
                            <div className={styles.rowGroup}>
                                <div className={styles.fieldGroup}>
                                    <label>পদবি</label>
                                    <input type="text" placeholder="উদা: Executive"
                                        value={editForm.designation}
                                        onChange={e => setEditForm({ ...editForm, designation: e.target.value })} />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>বিভাগ</label>
                                    <input type="text" placeholder="উদা: IT"
                                        value={editForm.department}
                                        onChange={e => setEditForm({ ...editForm, department: e.target.value })} />
                                </div>
                            </div>
                            <div className={styles.fieldGroup}>
                                <label>পরিচয়</label>
                                <textarea rows="3" value={editForm.bio}
                                    onChange={e => setEditForm({ ...editForm, bio: e.target.value })} />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label>অবস্থান</label>
                                <input type="text" value={editForm.location}
                                    onChange={e => setEditForm({ ...editForm, location: e.target.value })} />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label>লিঙ্গ</label>
                                <div className={styles.genderToggle}>
                                    <button type="button"
                                        className={`${styles.genderBtn} ${editForm.gender === 'male' ? styles.genderBtnActive : ''}`}
                                        onClick={() => setEditForm({ ...editForm, gender: 'male' })}>
                                        পুরুষ
                                    </button>
                                    <button type="button"
                                        className={`${styles.genderBtn} ${editForm.gender === 'female' ? styles.genderBtnActive : ''}`}
                                        onClick={() => setEditForm({ ...editForm, gender: 'female' })}>
                                        নারী
                                    </button>
                                </div>
                            </div>
                            <div className={styles.modalActions}>
                                <Button variant="secondary" type="button" onClick={() => setIsEditModalOpen(false)}>বাতিল</Button>
                                <Button variant="primary" type="submit">সংরক্ষণ করুন</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
