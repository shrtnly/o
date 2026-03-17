import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { rewardService } from '../../services/rewardService';
import { courseService } from '../../services/courseService';
import { storageService } from '../../services/storageService';
import { honeyJarService } from '../../services/honeyJarService';
import { connectionService } from '../../services/connectionService';
import InlineLoader from '../../components/ui/InlineLoader';
import PollenIcon from '../../components/PollenIcon';
import { leaderboardService } from '../../services/leaderboardService';
import {
    Users, Edit3, Crown, Star, Lock, MapPin,
    Heart, Info, Bell, Shield, ChevronRight, ChevronDown, Award,
    LogOut, BarChart3, Layout, Activity as ActivityIcon, Compass, Flame,
    Camera, X, Settings, Share2, User, Calendar, Zap, Gem, Trophy, Target, BookOpen,
    Search, UserPlus
} from 'lucide-react';
import Button from '../../components/ui/Button';
import styles from './ProfilePage.module.css';
import { useLanguage } from '../../context/LanguageContext';
import { getShieldLevel } from '../../utils/shieldSystem';
import { motion, AnimatePresence } from 'framer-motion';
import LearnerConnection from './components/LearnerConnection';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
    CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell,
    BarChart, Bar
} from 'recharts';

// --- Achievement Badge Constants ---
const BADGE_DEFS = [
    { id: 'first_lesson', emoji: '📖', label: 'প্রথম পাঠ' },
    { id: 'streak_7', emoji: '🔥', label: '7 দিনের স্ট্রিক' },
    { id: 'honey_100', emoji: '🍯', label: '100 মধু' },
    { id: 'quiz_ace', emoji: '🏆', label: 'কুইজ মাস্টার' },
    { id: 'course_complete', emoji: '🎓', label: 'কোর্স সম্পন্ন' },
    { id: 'streak_30', emoji: '⚡', label: '30 দিনের স্ট্রিক' },
    { id: 'rank_top10', emoji: '👑', label: 'টপ 10' },
    { id: 'bee_master', emoji: '�', label: 'সার্টিফিকেট' },
];

const ProfilePage = () => {
    const { user, signOut, updateProfile } = useAuth();
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [streak, setStreak] = useState(null);
    const [showShareCard, setShowShareCard] = useState(false);
    const [globalRank, setGlobalRank] = useState('—');
    const [activeTab, setActiveTab] = useState('general');
    
    const [analysisData, setAnalysisData] = useState(null);
    const [analysisDays, setAnalysisDays] = useState('all');
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const filterRef = useRef(null);

    const [activitySubTab, setActivitySubTab] = useState('log');
    const [notifications, setNotifications] = useState([]);
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
    }, [user, navigate]);

    const fetchProfileData = async () => {
        try {
            setLoading(true);
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
            const courseProgress = await courseService.getUserEnrolledCourses(user.id);
            setEnrolledCourses(courseProgress);

            // Fetch real rank from leaderboard
            try {
                const { data: rankData } = await supabase
                    .from('leaderboard_view')
                    .select('tier')
                    .eq('id', user.id)
                    .maybeSingle();

                if (rankData) {
                    const rank = await leaderboardService.getUserRank(user.id, rankData.tier);
                    if (rank) setGlobalRank(rank);
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

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    const fetchAnalysisData = useCallback(async () => {
        if (!user) return;
        setIsAnalysisLoading(true);
        try {
            const data = await rewardService.getAnalysisData(user.id, analysisDays);
            setAnalysisData(data);
        } catch (err) {
            console.error('Error fetching analysis:', err);
        } finally {
            setIsAnalysisLoading(false);
        }
    }, [user, analysisDays]);

    const fetchActivityData = useCallback(async () => {
        if (!user) return;
        setIsActivityLoading(true);
        try {
            const logs = await rewardService.getRecentTransactions(user.id, 20);
            setActivityLogs(logs);

            const { data: notifs, error } = await supabase
                .from('notification_history')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (!error) {
                setNotifications(notifs || []);
            }
        } catch (err) {
            console.error('Error fetching activity data:', err);
        } finally {
            setIsActivityLoading(false);
        }
    }, [user]);

    const fetchConnectionBadgeData = useCallback(async () => {
        if (!user) return;
        try {
            const data = await connectionService.getConnections(user.id);
            setConnections(data);
        } catch (err) {
            console.error('Error fetching connections for badge:', err);
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === 'analyze') {
            fetchAnalysisData();
        } else if (activeTab === 'activity') {
            fetchActivityData();
        } else if (activeTab === 'connection') {
            fetchConnectionBadgeData();
        }
    }, [activeTab, fetchAnalysisData, fetchActivityData, fetchConnectionBadgeData]);


    // Calculate Completed Courses for Certification
    const completedCourses = enrolledCourses.filter(course => 
        Number(course.progress_percentage || 0) >= 100
    );

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
                        <stop offset="50%" style={{ stopColor: '#F1C40F', stopOpacity: 1 }} />
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
                        {/* Glow Avatar */}
                        <div className={styles.avatarWrapper}>
                            <div className={styles.avatarGlow}></div>
                            <div className={styles.avatar} onClick={() => fileInputRef.current?.click()}>
                                {profile?.avatar_url
                                    ? <img src={profile.avatar_url} alt="Profile" />
                                    : <User size={44} color="#F1C40F" />
                                }
                                <div className={styles.avatarOverlay}>
                                    <Camera size={20} />
                                </div>
                                {uploadingAvatar && <div className={styles.loaderOverlay}><InlineLoader /></div>}
                            </div>

                            {/* Desktop Rank Badge on Avatar */}
                            {xp >= 1 && (
                                <div className={styles.avatarBadge}>
                                    <img
                                        alt={getShieldLevel(profile?.xp || 0).name}
                                        src={`/src/assets/shields/${getShieldLevel(profile?.xp || 0).level.toLowerCase()}-shield.png`}
                                    />
                                </div>
                            )}
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
                                    {getShieldLevel(profile?.xp || 0).name}
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
                            <span>{t('tab_general')}</span>
                        </button>
                        <button 
                            className={`${styles.tabItem} ${activeTab === 'analyze' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('analyze')}
                        >
                            <BarChart3 size={18} />
                            <span>{t('tab_analyze')}</span>
                        </button>
                        <button 
                            className={`${styles.tabItem} ${activeTab === 'activity' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('activity')}
                        >
                            <ActivityIcon size={18} />
                            <span>{t('tab_activity')}</span>
                        </button>
                        <button 
                            className={`${styles.tabItem} ${activeTab === 'connection' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('connection')}
                        >
                            <Users size={18} />
                            <span>{t('tab_connection')}</span>
                            {connections.pending.length > 0 && <span className={styles.tabBadge}>{connections.pending.length}</span>}
                        </button>
                    </nav>

                    {activeTab === 'general' && (
                        <>
                            {/* ========== SECTION 2: HONEY STATS GRID ========== */}
                    <section className={styles.statsSection}>
                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <div className={styles.statCardContent}>
                                    <div className={styles.statInfoStack}>
                                        <span className={styles.statCardValue}>
                                            <PollenIcon size={18} className={styles.statIconPollen} />
                                            {profile?.gems || 0}
                                        </span>
                                        <span className={styles.statCardLabel}>মধুরেণু</span>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statCardContent}>
                                    <div className={styles.statInfoStack}>
                                        <span className={styles.statCardValue}>
                                            <Compass size={16} className={styles.statIconCompass} />
                                            {enrolledCourses.length}
                                        </span>
                                        <span className={styles.statCardLabel}>কোর্সসমূহ</span>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statCardContent}>
                                    <div className={styles.statInfoStack}>
                                        <span className={styles.statCardValue}>
                                            <Flame size={16} fill="url(#flameGradientProfile)" stroke="url(#flameGradientProfile)" className={styles.statIconStreak} />
                                            {streak?.current_streak || 0} দিন
                                        </span>
                                        <span className={styles.statCardLabel}>গুনগুন স্ট্রিক</span>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statCardContent}>
                                    <div className={styles.statInfoStack}>
                                        <span className={styles.statCardValue}>
                                            <Trophy size={16} className={styles.statIconRank} />
                                            #{globalRank}
                                        </span>
                                        <span className={styles.statCardLabel}>র‌্যাঙ্কিং</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>


                    {/* ========== SECTION 4: ACHIEVEMENT GALLERY ========== */}
                    <section className={styles.badgesSection}>
                        <h2 className={styles.sectionTitle}>
                            <span>🏅</span> অর্জিত পদক
                        </h2>
                        <div className={styles.badgesGrid}>
                            {badges.map(badge => (
                                <div
                                    key={badge.id}
                                    className={`${styles.badgeItem} ${badge.unlocked ? styles.badgeUnlocked : styles.badgeLocked}`}
                                    title={badge.label}
                                >
                                    <div className={styles.badgeCircle}>
                                        {badge.unlocked
                                            ? <span className={styles.badgeEmoji}>{badge.emoji}</span>
                                            : <Lock size={16} className={styles.lockIcon} />
                                        }
                                    </div>
                                    <span className={styles.badgeLabel}>{badge.label}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ========== SECTION 6: CERTIFICATIONS ========== */}
                    <section className={styles.certsSection}>
                        <h2 className={styles.sectionTitle}>
                            <span>🎓</span> {t('earned_certificates')}
                        </h2>
                        {completedCourses.length > 0 ? (
                            <div className={styles.certsGrid}>
                                {completedCourses.map((course) => (
                                    <div key={course.course_id} className={styles.certCard}>
                                        <div className={styles.certIconContainer}>
                                            <Award size={24} />
                                        </div>
                                        <div className={styles.certInfo}>
                                            <h3 className={styles.certTitle}>{course.course_title}</h3>
                                            <p className={styles.certDate}>
                                                কোর্সের সকল অধ্যায় সফলভাবে সম্পন্ন হয়েছে
                                            </p>
                                        </div>
                                        <div className={styles.certBadge}>
                                            <Shield size={16} fill="#F1C40F" stroke="#F1C40F" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.noCertsWrapper}>
                                <div className={styles.certIconContainer} style={{ opacity: 0.3 }}>
                                    <Award size={32} />
                                </div>
                                <p className={styles.noCertsText}>
                                    {t('no_certificates')}
                                </p>
                            </div>
                        )}
                    </section>

                    {/* ========== SECTION 5: ACTIONS & SETTINGS ========== */}
                    <section className={styles.actionsSection}>
                        <button className={styles.actionOutline}
                            onClick={() => setIsEditModalOpen(true)}>
uhj                            <Edit3 size={16} />
                            প্রোফাইল এডিট করুন
                        </button>
                        <button className={styles.actionSolid}>
                            <Users size={16} />
                            বন্ধুদের চ্যালেঞ্জ করুন
                        </button>
                    </section>

                    {/* Bottom Spacer for extra scrolling room */}
                        <div className={styles.bottomSpacer} />
                        </>
                    )}

                    {activeTab === 'analyze' && (
                        <div className={styles.analyzeTabContent}>
                            {/* Filter Header */}
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

                            {isAnalysisLoading ? (
                                <div className={styles.analysisLoading}>
                                    <InlineLoader />
                                    <p>অ্যানালাইসিস লোড হচ্ছে...</p>
                                </div>
                            ) : analysisData ? (
                                <div className={styles.analysisGrid}>
                                    {/* Summary Cards */}
                                    <div className={styles.analysisStatsRow}>
                                        <div className={styles.analysisMiniCard}>
                                            <span className={styles.miniCardLabel}>{t('daily_xp')}</span>
                                            <span className={styles.miniCardValue} style={{ color: '#F1C40F' }}>
                                                {analysisData.summary.totalXp}
                                            </span>
                                        </div>
                                        <div className={styles.analysisMiniCard}>
                                            <span className={styles.miniCardLabel}>{t('total_time')}</span>
                                            <span className={styles.miniCardValue} style={{ color: '#F1C40F' }}>
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

                                    {/* XP Activity Chart */}
                                    <div className={styles.chartContainerFull}>
                                        <h3 className={styles.chartTitle}>{t('daily_honey')}</h3>
                                        <div style={{ width: '100%', height: 200 }}>
                                            <ResponsiveContainer>
                                                <AreaChart data={analysisData.activity}>
                                                    <defs>
                                                        <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#F1C40F" stopOpacity={0.3}/>
                                                            <stop offset="95%" stopColor="#F1C40F" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis 
                                                        dataKey="activity_date" 
                                                        hide 
                                                    />
                                                    <YAxis hide />
                                                    <ChartTooltip 
                                                        contentStyle={{ 
                                                            background: 'rgba(20, 20, 20, 0.9)', 
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            borderRadius: '12px',
                                                            fontSize: '12px',
                                                            color: '#fff'
                                                        }}
                                                        itemStyle={{ color: '#fff' }}
                                                        labelStyle={{ color: '#fff' }}
                                                    />
                                                    <Area 
                                                        type="monotone" 
                                                        dataKey="xp_earned" 
                                                        name={t('earned')}
                                                        stroke="#F1C40F" 
                                                        fillOpacity={1} 
                                                        fill="url(#colorXp)" 
                                                        strokeWidth={3}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Pie Chart: Accuracy */}
                                    <div className={styles.analysisChartsHalf}>
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
                                                            <Cell fill="#F1C40F" stroke="none" />
                                                            <Cell fill="rgba(255, 255, 255, 0.05)" stroke="none" />
                                                        </Pie>
                                                        <ChartTooltip 
                                                            contentStyle={{ 
                                                                background: 'rgba(20, 20, 20, 0.9)', 
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                borderRadius: '10px',
                                                                fontSize: '12px',
                                                                color: '#fff'
                                                            }}
                                                            itemStyle={{ color: '#fff' }}
                                                            labelStyle={{ color: '#fff' }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className={styles.pieLegend}>
                                                <div className={styles.legendItem}>
                                                    <span className={styles.legendDot} style={{ background: '#F1C40F' }} />
                                                    <span>{t('right_answers')}</span>
                                                </div>
                                                <div className={styles.legendItem}>
                                                    <span className={styles.legendDot} style={{ background: 'rgba(255, 255, 255, 0.15)' }} />
                                                    <span>{t('wrong_answers')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.chartCard}>
                                            <h3 className={styles.chartTitle}>{t('learning_pattern')}</h3>
                                            <div style={{ width: '100%', height: 150 }}>
                                                <ResponsiveContainer>
                                                    <BarChart data={analysisData.activity}>
                                                        <XAxis 
                                                            dataKey="activity_date" 
                                                            hide 
                                                        />
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
                                                            fill="#F1C40F" 
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
                            ) : (
                                <div className={styles.analysisEmpty}>
                                    <BarChart3 size={40} opacity={0.3} />
                                    <p>এই সময়ে কোনো কার্যক্রম পাওয়া যায়নি</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div className={styles.activityTabContent}>
                            <div className={styles.subTabHeader}>
                                <button 
                                    className={`${styles.subTabBtn} ${activitySubTab === 'log' ? styles.subTabActive : ''}`}
                                    onClick={() => setActivitySubTab('log')}
                                >
                                    <ActivityIcon size={16} />
                                    {t('activity_log')}
                                </button>
                                <button 
                                    className={`${styles.subTabBtn} ${activitySubTab === 'notifications' ? styles.subTabActive : ''}`}
                                    onClick={() => setActivitySubTab('notifications')}
                                >
                                    <Bell size={16} />
                                    {t('notifications')}
                                    {notifications.some(n => !n.is_read) && <span className={styles.notifBadge} />}
                                </button>
                            </div>

                            {isActivityLoading ? (
                                <div className={styles.activityLoading}>
                                    <InlineLoader />
                                </div>
                            ) : (
                                <div className={styles.subTabContent}>
                                    {activitySubTab === 'log' ? (
                                        <div className={styles.logList}>
                                            {activityLogs.length > 0 ? activityLogs.map(log => (
                                                <div key={log.id} className={styles.logItem}>
                                                    <div className={styles.logIconRow}>
                                                        <div className={styles.logIcon}>
                                                            {log.transaction_type === 'xp_earned' && <Zap size={14} color="#F1C40F" />}
                                                            {log.transaction_type === 'gem_earned' && <PollenIcon size={14} />}
                                                            {log.transaction_type === 'heart_lost' && <Heart size={14} color="#E74C3C" />}
                                                            {log.transaction_type === 'heart_gained' && <Heart size={14} color="#2ECC71" />}
                                                            {log.transaction_type === 'gem_spent' && <Gem size={14} color="#E74C3C" />}
                                                        </div>
                                                        <span className={styles.logTime}>
                                                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className={styles.logMain}>
                                                        <div className={styles.logLabel}>
                                                            {log.transaction_type === 'xp_earned' && `অর্জিত ${log.amount} XP`}
                                                            {log.transaction_type === 'gem_earned' && `পেয়েছেন ${log.amount} পরাগ`}
                                                            {log.transaction_type === 'heart_lost' && `১টি ড্রপ হারিয়েছেন`}
                                                            {log.transaction_type === 'heart_gained' && `${log.amount}টি ড্রপ পেয়েছেন`}
                                                            {log.transaction_type === 'gem_spent' && `${log.amount} পরাগ খরচ করেছেন`}
                                                        </div>
                                                        <div className={styles.logSource}>
                                                            {log.source === 'mcq_correct' && 'সঠিক উত্তরের জন্য'}
                                                            {log.source === 'chapter_complete' && 'অধ্যায় সম্পন্ন করার জন্য'}
                                                            {log.source === 'mystery_box' && 'রহস্য বক্স থেকে'}
                                                            {log.source === 'streak_bonus' && 'স্ট্রাইক বোনাস'}
                                                            {!log.source && 'সিস্টেম কার্যক্রম'}
                                                        </div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className={styles.emptyState}>
                                                    <ActivityIcon size={40} opacity={0.2} />
                                                    <p>{t('empty_activity')}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className={styles.notifList}>
                                            {notifications.length > 0 ? notifications.map(notif => (
                                                <div key={notif.id} className={`${styles.notifItem} ${!notif.is_read ? styles.unreadNotif : ''}`}>
                                                    <div className={styles.notifIconWrap}>
                                                        {notif.type === 'reward' && <Trophy size={16} color="#F1C40F" />}
                                                        {notif.type === 'streak' && <Flame size={16} color="#E67E22" />}
                                                        {notif.type === 'course' && <BookOpen size={16} color="#2ECC71" />}
                                                        {notif.type === 'system' && <Bell size={16} color="#3498DB" />}
                                                    </div>
                                                    <div className={styles.notifBody}>
                                                        <h4 className={styles.notifTitle}>{notif.title}</h4>
                                                        <p className={styles.notifMsg}>{notif.message}</p>
                                                        <span className={styles.notifDate}>
                                                            {new Date(notif.created_at).toLocaleDateString('bn-BD')}
                                                        </span>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className={styles.emptyState}>
                                                    <Bell size={40} opacity={0.2} />
                                                    <p>{t('empty_notif')}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
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
                                            {selectedLearner.avatar_url ? <img src={selectedLearner.avatar_url} /> : <User size={48} color="#F1C40F" />}
                                        </div>
                                        <h3 className={styles.lNameLarge}>{selectedLearner.full_name || selectedLearner.display_name}</h3>
                                        <p className={styles.lEmailLarge}>{selectedLearner.email}</p>
                                    </div>

                                    <div className={styles.lStatsRow}>
                                        <div className={styles.lStatItem}>
                                            <Zap size={16} color="#F1C40F" />
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

            {/* === FLOATING SHARE BUTTON === */}
            {!loading && (
                <button className={styles.shareFab} onClick={() => setShowShareCard(true)}
                    title="শেয়ার করুন">
                    <Share2 size={20} />
                </button>
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
                                <h3>beeLesson</h3>
                                <p>আমার শেখার সারসংক্ষেপ</p>
                            </div>
                            <div className={styles.shareCardAvatar}>
                                {profile?.avatar_url
                                    ? <img src={profile.avatar_url} alt="avatar" />
                                    : <User size={32} color="#F1C40F" />}
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
