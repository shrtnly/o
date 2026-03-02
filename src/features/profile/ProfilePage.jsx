import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { rewardService } from '../../services/rewardService';
import { courseService } from '../../services/courseService';
import { storageService } from '../../services/storageService';
import { honeyJarService } from '../../services/honeyJarService';
import InlineLoader from '../../components/ui/InlineLoader';
import PollenIcon from '../../components/PollenIcon';
import { leaderboardService } from '../../services/leaderboardService';
import {
    User, Calendar, Zap, Gem, Trophy, Target,
    BookOpen, Camera, X, Settings, Share2,
    Users, Edit3, Crown, Star, Lock, MapPin,
    Shield, Flame, Compass, Gift
} from 'lucide-react';
import Button from '../../components/ui/Button';
import styles from './ProfilePage.module.css';
import { useLanguage } from '../../context/LanguageContext';
import { getShieldLevel } from '../../utils/shieldSystem';

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
                            <div className={styles.metaRow}>
                                {profile?.location && (
                                    <span className={styles.metaItem}>
                                        <MapPin size={13} /> {profile.location}
                                    </span>
                                )}
                                <span className={styles.metaItem}>
                                    <Calendar size={13} /> যোগদান: {formatDate(profile?.created_at)}
                                </span>
                            </div>

                            {/* Rank Badge */}
                            <div className={styles.rankBadge}>
                                <Crown size={14} className={styles.crownIcon} />
                                <span>
                                    {language === 'bn'
                                        ? `রয়্যাল জেলি ${getShieldLevel(profile?.xp || 0).nameBangla}`
                                        : `Royal Jelly ${getShieldLevel(profile?.xp || 0).name}`
                                    }
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* ========== SECTION 2: HONEY STATS GRID ========== */}
                    <section className={styles.statsSection}>
                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <div className={styles.statCardContent}>
                                    <PollenIcon size={28} className={styles.statIconPollen} />
                                    <span className={styles.statCardValue}>{profile?.gems || 0}</span>
                                    <span className={styles.statCardDivider}>-</span>
                                    <span className={styles.statCardLabel}>পরাগরেণু</span>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statCardContent}>
                                    <Compass size={22} className={styles.statIconCompass} />
                                    <span className={styles.statCardValue}>{enrolledCourses.length}</span>
                                    <span className={styles.statCardDivider}>-</span>
                                    <span className={styles.statCardLabel}>শেখার কোর্সসমূহ</span>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statCardContent}>
                                    <Flame size={22} fill="url(#flameGradientProfile)" stroke="url(#flameGradientProfile)" className={styles.statIconStreak} />
                                    <span className={styles.statCardValue}>{streak?.current_streak || 0} দিন</span>
                                    <span className={styles.statCardDivider}>-</span>
                                    <span className={styles.statCardLabel}>গুনগুন স্ট্রিক</span>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statCardContent}>
                                    <Trophy size={22} className={styles.statIconRank} />
                                    <span className={styles.statCardValue}>#{globalRank}</span>
                                    <span className={styles.statCardDivider}>-</span>
                                    <span className={styles.statCardLabel}>লিডারবোর্ড র‌্যাঙ্কিং</span>
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

                    {/* ========== SECTION 5: ACTIONS & SETTINGS ========== */}
                    <section className={styles.actionsSection}>
                        <button className={styles.actionOutline}
                            onClick={() => setIsEditModalOpen(true)}>
                            <Edit3 size={16} />
                            প্রোফাইল এডিট করুন
                        </button>
                        <button className={styles.actionSolid}>
                            <Users size={16} />
                            বন্ধুদের চ্যালেঞ্জ করুন
                        </button>
                        <button className={styles.actionMinimal}
                            onClick={() => navigate('/settings')}>
                            <Settings size={18} />
                        </button>
                    </section>

                    {/* Bottom Spacer for extra scrolling room */}
                    <div className={styles.bottomSpacer} />
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
                                {profile?.full_name || 'শিক্ষার্থী'}
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
