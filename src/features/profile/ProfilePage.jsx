import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { rewardService } from '../../services/rewardService';
import { courseService } from '../../services/courseService';
import { storageService } from '../../services/storageService';
import { connectionService } from '../../services/connectionService';
import InlineLoader from '../../components/ui/InlineLoader';
import ProfileSkeleton from './components/ProfileSkeleton';
import ProfileAnalysisSkeleton from './components/ProfileAnalysisSkeleton';
import PollenIcon from '../../components/PollenIcon';
import { leaderboardService } from '../../services/leaderboardService';
import {
    Users, Edit3, Crown, Star, Lock, MapPin,
    Heart, Info, Bell, Shield, ChevronRight, ChevronLeft, ChevronDown, Award,
    LogOut, BarChart3, Layout, Activity as ActivityIcon, Compass, Flame,
    Camera, X, Settings, Share2, User, Calendar, Zap, Gem, Trophy, Target, BookOpen,
    Search, UserPlus, Check, Mail, AtSign, Phone, GraduationCap, ChartNoAxesCombined, SquarePen, CircleHelp,
    Twitter, Facebook, Linkedin, MessageCircle
} from 'lucide-react';
import { formatLocalDate } from '../../lib/dateUtils';
import ShieldIcon from '../../components/ShieldIcon';
import Button from '../../components/ui/Button';
import styles from './ProfilePage.module.css';
import { useLanguage } from '../../context/LanguageContext';
import { getShieldLevel } from '../../utils/shieldSystem';
import { motion, AnimatePresence } from 'framer-motion';
import CertificateCard from './components/CertificateCard';
import CertificateViewer from './components/CertificateViewer';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell,
    BarChart, Bar
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'sonner';

// --- Achievement Badge Constants ---

const BADGE_DEFS = [
    { id: 'first_lesson', emoji: '📖', label: 'প্রথম পাঠ', labelEn: 'First Lesson' },
    { id: 'streak_7', emoji: '🔥', label: '7 দিনের স্ট্রিক', labelEn: '7 Day Streak' },
    { id: 'honey_100', emoji: '🍯', label: '100 টোটেন', labelEn: '100 Honey' },
    { id: 'quiz_ace', emoji: '🏆', label: 'কুইজ মাস্টার', labelEn: 'Quiz Master' },
    { id: 'course_complete', emoji: '🎓', label: 'কোর্স সম্পন্ন', labelEn: 'Course Complete' },
    { id: 'streak_30', emoji: '⚡', label: '30 দিনের স্ট্রিক', labelEn: '30 Day Streak' },
    { id: 'rank_top10', emoji: '👑', label: 'টপ 10', labelEn: 'Top 10' },
    { id: 'bee_master', emoji: '🛡️', label: 'সার্টিফিকেট', labelEn: 'Certificate' },
];

// --- DiceBear Avatar with Error Fallback ---
const DiceBearAvatar = ({ seed, size = 84 }) => {
    const [error, setError] = React.useState(false);
    const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&top=bob,curly,turban,bigHair,bun,dreads,shortCurly&mouth=smile`;
    if (error) {
        return (
            <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(241,196,15,0.08)',
                borderRadius: '50%'
            }}>
                <User size={Math.floor(size * 0.5)} color="var(--color-primary)" />
            </div>
        );
    }
    return (
        <img
            src={url}
            alt="Avatar"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            onError={() => setError(true)}
        />
    );
};

const ProfilePage = () => {
    const { user, signOut, updateProfile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t, language } = useLanguage();
    const { isDark } = useTheme();
    const brandColor = isDark ? '#F1C40F' : '#FFB800';
    const textBrandColor = isDark ? '#F1C40F' : '#b45309';
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [streak, setStreak] = useState(null);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        if (profile?.avatar_url) {
            setImgError(false);
        }
    }, [profile?.avatar_url]);

    const [showShareCard, setShowShareCard] = useState(false);
    const [globalRank, setGlobalRank] = useState('—');
    const [activeTab, setActiveTab] = useState('general');
    const [certificates, setCertificates] = useState([]);
    const [viewingCert, setViewingCert] = useState(null);
    const [copied, setCopied] = useState(false);
    const [showInviteTooltip, setShowInviteTooltip] = useState(false);
    const [showInviteMenu, setShowInviteMenu] = useState(false);
    const [certTab, setCertTab] = useState('earned'); // 'earned' or 'progress'

    const [analysisData, setAnalysisData] = useState(null);
    const [analysisDays, setAnalysisDays] = useState('30');
    const [viewingMonth, setViewingMonth] = useState(new Date());
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const filterRef = useRef(null);

    const analyzeScrollRef = useRef(null);
    const analyticsSummaryRef = useRef(null);
    const xpTrendRef = useRef(null);
    const accuracyRef = useRef(null);
    const patternRef = useRef(null);





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
        if (tab === 'connection') {
            navigate('/connections', { replace: true });
            return;
        }
        if (tab === 'activity' || tab === 'notifications') {
            navigate('/notifications', { replace: true });
            return;
        }
        if (tab && ['general', 'analyze', 'certificates'].includes(tab)) {
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




    const handleInviteRef = () => {
        if (navigator.share) {
            const refId = profile?.username || user?.id || profile?.id; // Use username if available
            const refLink = `${window.location.origin}/auth?ref=${refId}`;
            const shareMsg = `${t('invite_share_text')} ${refLink}`;

            navigator.share({
                title: 'BeeLesson Invite',
                text: shareMsg,
            }).catch(err => {
                console.error('Sharing failed:', err);
                setShowInviteMenu(true);
            });
        } else {
            setShowInviteMenu(true);
        }
    };

    const handleSocialInvite = (platform) => {
        const refId = profile?.username || user?.id || profile?.id;
        if (!refId) return;
        const refLink = `${window.location.origin}/auth?ref=${refId}`;
        const shareMsg = `${t('invite_share_text')} ${refLink}`;
        const encodedMsg = encodeURIComponent(shareMsg);

        copyToClipboard(shareMsg); // Auto-copy helper

        let shareUrl = '';
        switch (platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodedMsg}`;
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(refLink)}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(refLink)}`;
                break;
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${encodedMsg}`;
                break;
            default:
                break;
        }

        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
        setShowInviteMenu(false);
    };

    const copyToClipboard = (text) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
            }).catch(err => {
                console.error('Clipboard write failed:', err);
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    };

    const fallbackCopy = (text) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Fallback copy failed:', err);
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
        if (!user?.id) return;
        setIsAnalysisLoading(true);
        try {
            let period = null;
            if (analysisDays === 'all') {
                // Fetch everything
            } else if (analysisDays === 'month') {
                const firstDay = new Date(viewingMonth.getFullYear(), viewingMonth.getMonth(), 1);
                const lastDay = new Date(viewingMonth.getFullYear(), viewingMonth.getMonth() + 1, 0);
                period = {
                    start: formatLocalDate(firstDay),
                    end: formatLocalDate(lastDay)
                };
            }

            const data = await rewardService.getAnalysisData(user.id, analysisDays === 'month' ? 'all' : analysisDays, period);
            setAnalysisData(data);
        } catch (err) {
            console.error('Error fetching analysis:', err);
        } finally {
            setIsAnalysisLoading(false);
        }
    }, [user?.id, analysisDays, viewingMonth]);



    const renderChartNav = () => {
        if (analysisDays !== 'month') return null;
        return (
            <div className={styles.chartNav}>
                <button
                    className={styles.navBtn}
                    onClick={() => {
                        const prev = new Date(viewingMonth);
                        prev.setMonth(prev.getMonth() - 1);
                        setViewingMonth(prev);
                    }}
                >
                    <ChevronLeft size={16} />
                </button>
                <span className={styles.currentPeriod}>
                    {viewingMonth.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                    className={styles.navBtn}
                    onClick={() => {
                        const next = new Date(viewingMonth);
                        next.setMonth(next.getMonth() + 1);
                        setViewingMonth(next);
                    }}
                    disabled={viewingMonth.getMonth() === new Date().getMonth() && viewingMonth.getFullYear() === new Date().getFullYear()}
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        );
    };


    useEffect(() => {
        if (activeTab === 'analyze') {
            fetchAnalysisData();
        }
    }, [activeTab, fetchAnalysisData]);






    // Analytics unlock notification handler
    useEffect(() => {
        if (!user?.id || !streak || streak.current_streak < 3) return;

        const checkAndSendUnlockNotif = async () => {
            try {
                // 1. Quick check localStorage
                if (localStorage.getItem(`analytics_unlocked_${user.id}`)) return;

                // 2. Double check Database for existing notification of this type
                const { data: existingNotif, error: checkError } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('type', 'unlock')
                    .contains('data', { type: 'analytics_unlock' })
                    .limit(1);

                if (checkError) throw checkError;

                // If exists in DB, update localStorage and exit
                if (existingNotif && existingNotif.length > 0) {
                    localStorage.setItem(`analytics_unlocked_${user.id}`, 'true');
                    return;
                }

                // 3. Send if really new
                toast.success(
                    language === 'bn' ? 'অভিনন্দন! পারফরমেন্স অ্যানালিটিক্স আনলক' : 'Congratulations! Your performance analytics are now unlocked.',
                    {
                        icon: <Trophy size={18} className={styles.statIconRank} />,
                        duration: 5000
                    }
                );

                const { error } = await supabase.from('notifications').insert({
                    user_id: user.id,
                    actor_id: user.id, // self-actor for system unlocks
                    title: language === 'bn' ? 'অ্যানালিটিক্স আনলক হয়েছে!' : 'Analytics Unlocked!',
                    message: language === 'bn' ? 'আপনি ৩ দিনের ধারাবাহিকতা অর্জন করেছেন। এখন আপনার পারফরমেন্স চার্টগুলো দেখতে পারবেন।' : 'You have achieved a 3-day streak. You can now view your performance charts.',
                    type: 'unlock',
                    is_read: false,
                    data: {
                        type: 'analytics_unlock',
                        display_title: language === 'bn' ? 'অ্যানালিটিক্স আনলকড! 🏆' : 'Analytics Unlocked! 🏆',
                        display_msg: language === 'bn' ? '৩ দিনের স্ট্রিক পূর্ণ হয়েছে!' : '3-day streak achieved!'
                    }
                });

                if (!error) {
                    localStorage.setItem(`analytics_unlocked_${user.id}`, 'true');
                } else {
                    console.error('Failed to insert unlock notification:', error);
                }
            } catch (err) {
                console.error('Error handling analytics unlock notif:', err);
            }
        };

        checkAndSendUnlockNotif();
    }, [streak?.current_streak, user?.id, language]);


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
            {loading ? (
                <div className={styles.container}>
                    <ProfileSkeleton />
                </div>
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
                                {profile?.avatar_url && !imgError
                                    ? <img src={profile.avatar_url} alt="Profile" onError={() => setImgError(true)} />
                                    : <DiceBearAvatar seed={user?.id} size={84} />
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
                            className={`${styles.tabItem} ${activeTab === 'analyze' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('analyze')}
                        >
                            <BarChart3 size={18} />
                            {activeTab === 'analyze' && <span>{t('tab_analyze')}</span>}
                        </button>
                        <button
                            className={`${styles.tabItem} ${activeTab === 'certificates' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('certificates')}
                        >
                            <Award size={18} />
                            {activeTab === 'certificates' && <span>{t('tab_certificates')}</span>}
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
                                            <Flame 
                                                size={18} 
                                                fill={streak?.is_today_completed ? '#FF6B35' : 'none'} 
                                                stroke={streak?.is_today_completed ? '#FF4500' : 'var(--color-text-muted)'} 
                                                className={styles.statIconStreak} 
                                                style={{ opacity: streak?.is_today_completed ? 1 : 0.5 }}
                                            />
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

                                {/* Viral Loop: Standard Section Style */}
                                <div className={styles.inviteSection}>
                                    <h4 className={styles.sectionTitle}>
                                        <div className={styles.sectionTitleLeft}>
                                            {t('invite_learner')}
                                        </div>
                                        <div className={styles.tooltipContainer}>
                                            <button 
                                                className={styles.infoBtn}
                                                onClick={() => setShowInviteTooltip(!showInviteTooltip)}
                                            >
                                                <CircleHelp size={18} />
                                            </button>
                                            <AnimatePresence>
                                                {showInviteTooltip && (
                                                    <motion.div 
                                                        className={styles.inviteTooltip}
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    >
                                                        {t('invite_message')}
                                                        <div className={styles.tooltipArrow} />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </h4>
                                    
                                    <div className={styles.inviteBtnWrapper}>
                                        <button 
                                            className={`${styles.fullInviteBtn} ${copied ? styles.inviteActionCopied : ''}`}
                                            onClick={handleInviteRef}
                                        >
                                            {copied ? (
                                                <>
                                                    <Check size={18} />
                                                    <span>{t('invite_success')}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Share2 size={18} />
                                                    <span>{t('invite_share_cta')}</span>
                                                </>
                                            )}
                                        </button>

                                        <AnimatePresence>
                                            {showInviteMenu && (
                                                <motion.div
                                                    className={styles.shareMenu}
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                >
                                                    <div className={styles.shareMenuHeader}>
                                                        <span>{language === 'bn' ? 'শেয়ার করুন' : 'Share to'}</span>
                                                        <button onClick={() => setShowInviteMenu(false)}><X size={14} /></button>
                                                    </div>
                                                    <div className={styles.shareOptions}>
                                                        <button onClick={() => handleSocialInvite('facebook')} title="Facebook">
                                                            <Facebook size={20} fill="#1877F2" color="#1877F2" />
                                                        </button>
                                                        <button onClick={() => handleSocialInvite('twitter')} title="Twitter">
                                                            <Twitter size={20} fill="#1DA1F2" color="#1DA1F2" />
                                                        </button>
                                                        <button onClick={() => handleSocialInvite('linkedin')} title="LinkedIn">
                                                            <Linkedin size={20} fill="#0A66C2" color="#0A66C2" />
                                                        </button>
                                                        <button onClick={() => handleSocialInvite('whatsapp')} title="WhatsApp">
                                                            <MessageCircle size={20} fill="#25D366" color="#25D366" />
                                                        </button>
                                                    </div>
                                                    <div className={styles.shareMenuTip}>
                                                        <span>💡 {copied ? (language === 'bn' ? 'টেক্সট কপি করা হয়েছে!' : 'Text copied!') : (language === 'bn' ? 'টিপ: টেক্সট অটো-কপি করা হয়েছে!' : 'Tip: Text is auto-copied!')}</span>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </section>

                            {/* Bottom Spacer for extra scrolling room */}
                            <div className={styles.bottomSpacer} />
                        </>
                    )}

                    {activeTab === 'certificates' && (
                        <>
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
                                                    {analysisDays === 'all' ? t('all_time') :
                                                        analysisDays === 'month' ? (language === 'bn' ? 'মাসিক' : 'Monthly') :
                                                            t(`last_${analysisDays}_days`)}
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
                                                        { value: 'month', label: language === 'bn' ? 'মাসিক' : 'Monthly' },
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
                                <ProfileAnalysisSkeleton />
                            ) : (streak?.longest_streak || 0) < 3 ? (
                                // 🔒 Analytics locked — unlocks permanently once longest streak >= 3 days
                                <div className={styles.lockedAnalysis}>
                                    <div className={styles.lockContent}>
                                        <div className={styles.lockIconBox}>
                                            <Lock size={40} />
                                        </div>
                                        <h2 className={styles.lockTitle}>{t('analysis_locked_title')}</h2>
                                        <p className={styles.lockDesc}>{t('analysis_locked_desc')}</p>

                                        <div className={styles.streakProgressBox}>
                                            <div className={styles.streakBarContainer}>
                                                <motion.div
                                                    className={styles.streakBarFill}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, ((streak?.longest_streak || 0) / 3) * 100)}%` }}
                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                />
                                            </div>
                                            <span className={styles.streakCountText}>
                                                {t('days_earned').replace('{count}', (streak?.longest_streak || 0).toString().toLocaleLowerCase(language === 'bn' ? 'bn-BD' : 'en-US'))}
                                            </span>
                                        </div>
                                    </div>
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
                                                    <span className={styles.miniCardValue} style={{ color: textBrandColor }}>
                                                        {analysisData.summary.totalXp}
                                                    </span>
                                                </div>
                                                <div className={styles.analysisMiniCard}>
                                                    <span className={styles.miniCardLabel}>{t('total_time')}</span>
                                                    <span className={styles.miniCardValue} style={{ color: textBrandColor }}>
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
                                                <div className={styles.chartHeader}>
                                                    <h3 className={styles.chartTitle}>{t('daily_honey')}</h3>
                                                    {renderChartNav()}
                                                </div>
                                                <div style={{ width: '100%', height: 200 }}>
                                                    <ResponsiveContainer>
                                                        <AreaChart data={analysisData.activity}>
                                                            <defs>
                                                                <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor={brandColor} stopOpacity={0.3} />
                                                                    <stop offset="95%" stopColor={brandColor} stopOpacity={0} />
                                                                </linearGradient>
                                                            </defs>
                                                            <XAxis
                                                                dataKey="activity_date"
                                                                tickFormatter={(date) => {
                                                                    const d = new Date(date);
                                                                    return d.getDate();
                                                                }}
                                                                tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                                                                axisLine={false}
                                                                tickLine={false}
                                                                minTickGap={10}
                                                            />
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
                                                <div className={styles.chartHeader}>
                                                    <h3 className={styles.chartTitle}>{t('accuracy')}</h3>
                                                    {renderChartNav()}
                                                </div>
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
                                                        <span className={styles.legendDot} style={{ background: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)' }} />
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
                                                <div className={styles.chartHeader}>
                                                    <h3 className={styles.chartTitle}>{t('learning_pattern')}</h3>
                                                    {renderChartNav()}
                                                </div>
                                                <div style={{ width: '100%', height: 150 }}>
                                                    <ResponsiveContainer>
                                                        <BarChart data={analysisData.activity}>
                                                            <XAxis
                                                                dataKey="activity_date"
                                                                tickFormatter={(date) => {
                                                                    const d = new Date(date);
                                                                    return d.getDate();
                                                                }}
                                                                tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                                                                axisLine={false}
                                                                tickLine={false}
                                                                minTickGap={10}
                                                            />
                                                            <YAxis hide />
                                                            <ChartTooltip
                                                                contentStyle={{
                                                                    background: isDark ? 'rgba(20, 20, 20, 0.95)' : '#ffffff',
                                                                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                                                                    borderRadius: '10px',
                                                                    fontSize: '10px',
                                                                    color: isDark ? '#fff' : '#1e293b',
                                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                                }}
                                                                itemStyle={{ color: isDark ? '#fff' : '#1e293b' }}
                                                                labelStyle={{ color: isDark ? '#fff' : '#1e293b' }}
                                                                cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }}
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
                                <p>{language === 'bn' ? 'আমার শেখার সারসংক্ষেপ' : 'My Learning Summary'}</p>
                            </div>
                            <div className={styles.shareCardAvatar}>
                                {profile?.avatar_url
                                    ? <img src={profile.avatar_url} alt="avatar" />
                                    : <User size={32} color={textBrandColor} />}
                            </div>
                            <h4 className={styles.shareCardName}>
                                {profile?.full_name || profile?.display_name || (language === 'bn' ? 'শিক্ষার্থী' : 'Learner')}
                                {flamingBadge && <FlamingBadge size={16} className={styles.nameBadge} />}
                            </h4>
                            <div className={styles.shareStatsRow}>
                                <div className={styles.shareStat}><strong>{profile?.xp || 0}</strong><span>{language === 'bn' ? 'মধু (XP)' : 'Honey (XP)'}</span></div>
                                <div className={styles.shareStat}><strong>{streak?.current_streak || 0}</strong><span>{language === 'bn' ? 'দিনের স্ট্রিক' : 'Day Streak'}</span></div>
                                <div className={styles.shareStat}><strong>{enrolledCourses.length}</strong><span>{language === 'bn' ? 'কোর্স' : 'Courses'}</span></div>
                            </div>
                            <div className={styles.shareRankBadge}>
                                <Crown size={13} /> {language === 'bn' ? `রয়্যাল জেলি ${getShieldLevel(profile?.xp || 0).nameBangla}` : `Royal Jelly ${getShieldLevel(profile?.xp || 0).name}`}
                            </div>
                            <button className={styles.shareDownload}>{language === 'bn' ? '📸 স্ক্রিনশট নিন' : '📸 Take Screenshot'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* === EDIT PROFILE MODAL === */}
            {isEditModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsEditModalOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>{language === 'bn' ? 'প্রোফাইল এডিট' : 'Edit Profile'}</h3>
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
                                <label>{language === 'bn' ? 'লিঙ্গ' : 'Gender'}</label>
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
                                <Button variant="secondary" type="button" onClick={() => setIsEditModalOpen(false)}>
                                    {language === 'bn' ? 'বাতিল' : 'Cancel'}
                                </Button>
                                <Button variant="primary" type="submit">
                                    {language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {viewingCert && (
                    <CertificateViewer
                        certificate={viewingCert}
                        learnerName={profile?.full_name || 'Learner'}
                        onClose={() => setViewingCert(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProfilePage;
