import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { rewardService } from '../../services/rewardService';
import { courseService } from '../../services/courseService';
import { storageService } from '../../services/storageService';
import { honeyJarService } from '../../services/honeyJarService';
import LoadingScreen from '../../components/ui/LoadingScreen';
import HoneyDropIcon from '../../components/HoneyDropIcon';
import PollenIcon from '../../components/PollenIcon';
import InlineLoader from '../../components/ui/InlineLoader';
import HoneyJarGiftModal from '../../components/HoneyJarGiftModal';
import {
    User, Calendar, Zap, Gem, Trophy, Target,
    BookOpen, Camera, X, Settings, Share2,
    Users, Edit3, Crown, Star, Lock, MapPin,
    Shield, Flame, Compass, Gift
} from 'lucide-react';
import Button from '../../components/ui/Button';
import FlamingBadge from '../../components/FlamingBadge';
import styles from './ProfilePage.module.css';
import { useLanguage } from '../../context/LanguageContext';
import { getShieldLevel } from '../../utils/shieldSystem';

// --- Achievement Badge Data ---
const BADGE_LIST = [
    { id: 'first_lesson', emoji: '📖', label: 'প্রথম পাঠ', unlocked: true },
    { id: 'streak_7', emoji: '🔥', label: '৭ দিনের স্ট্রিক', unlocked: true },
    { id: 'honey_100', emoji: '🍯', label: '১০০ মধু', unlocked: true },
    { id: 'quiz_ace', emoji: '🏆', label: 'কুইজ মাস্টার', unlocked: false },
    { id: 'course_complete', emoji: '🎓', label: 'কোর্স সম্পন্ন', unlocked: false },
    { id: 'streak_30', emoji: '⚡', label: '৩০ দিনের স্ট্রিক', unlocked: false },
    { id: 'rank_top10', emoji: '👑', label: 'টপ ১০', unlocked: false },
    { id: 'bee_master', emoji: '🐝', label: 'Bee মাস্টার', unlocked: false },
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

    // Honey Jar states
    const [jarProgress, setJarProgress] = useState({ fill_percent: 0, pollen_in_cycle: 0, is_full: false });
    const [pendingGift, setPendingGift] = useState(null);
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [flamingBadge, setFlamingBadge] = useState(null);
    const [jarSplash, setJarSplash] = useState(false);

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
        fetchJarData();
    }, [user, navigate]);

    // Real-time jar progress subscription
    useEffect(() => {
        if (!user) return;
        const channel = honeyJarService.subscribeToJarProgress(user.id, (newData) => {
            setJarProgress(newData);
            // Trigger splash animation when pollen is added
            setJarSplash(true);
            setTimeout(() => setJarSplash(false), 800);
            // When jar becomes full, generate a mystery gift
            if (newData.is_full) {
                handleJarFull();
            }
        });
        // Also subscribe to new gifts
        const giftChannel = honeyJarService.subscribeToGifts(user.id, (newGift) => {
            if (!newGift.is_claimed) {
                setPendingGift(newGift);
                setShowGiftModal(true);
            }
        });
        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(giftChannel);
        };
    }, [user]);

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
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchJarData = async () => {
        if (!user) return;
        try {
            const [progress, gift, badge] = await Promise.all([
                honeyJarService.getJarProgress(user.id),
                honeyJarService.getUnclaimedGift(user.id),
                honeyJarService.getActiveFlamingBadge(user.id),
            ]);
            setJarProgress(progress || { fill_percent: 0, pollen_in_cycle: 0, is_full: false });
            if (gift) {
                setPendingGift(gift);
                // DO NOT auto-open modal on page load — user clicks the button
            }
            setFlamingBadge(badge);
        } catch (err) {
            console.error('fetchJarData error:', err);
        }
    };

    const handleJarFull = async () => {
        try {
            const gift = await honeyJarService.generateMysteryGift(user.id);
            if (gift) {
                setPendingGift(gift);
                // Small delay for the overflow animation to play
                setTimeout(() => setShowGiftModal(true), 1500);
            }
        } catch (err) {
            console.error('handleJarFull error:', err);
        }
    };

    const handleClaimGift = async (giftId) => {
        const result = await honeyJarService.claimMysteryGift(user.id, giftId);
        if (result?.success) {
            // Refresh profile (pollen/honey may have changed)
            await fetchProfileData();
            // Refresh jar (reset to 0)
            const progress = await honeyJarService.getJarProgress(user.id);
            setJarProgress(progress);
            setPendingGift(null);
            // Refresh flaming badge
            const badge = await honeyJarService.getActiveFlamingBadge(user.id);
            setFlamingBadge(badge);
        }
        return result;
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

    // Progress calculation for honey jar
    const xp = profile?.xp || 0;
    const lessonsCompleted = Math.floor(xp / 100);
    const beeRanks = [
        { name: 'Baby Bee', threshold: 0, nextThreshold: 5 },
        { name: 'Worker Bee', threshold: 5, nextThreshold: 10 },
        { name: 'Scout Bee', threshold: 10, nextThreshold: 20 },
        { name: 'Guard Bee', threshold: 20, nextThreshold: 35 },
        { name: 'Drone Bee', threshold: 35, nextThreshold: 50 },
        { name: 'Queen Bee', threshold: 50, nextThreshold: null },
    ];
    const currentRank = beeRanks.reduce((acc, rank) =>
        lessonsCompleted >= rank.threshold ? rank : acc, beeRanks[0]);
    const progressInRank = currentRank.nextThreshold
        ? lessonsCompleted - currentRank.threshold : currentRank.threshold;
    const progressNeeded = currentRank.nextThreshold
        ? currentRank.nextThreshold - currentRank.threshold : 1;
    const honeyJarPercent = Math.min(100, Math.round((progressInRank / progressNeeded) * 100));

    const globalRank = stats ? Math.max(1, 9999 - Math.floor((profile?.xp || 0) / 10)) : '—';

    return (
        <div className={styles.profilePage}>
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
                                {flamingBadge && <FlamingBadge size={22} className={styles.nameBadge} />}
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
                                    <Flame size={22} className={styles.statIconStreak} />
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

                    {/* ========== SECTION 3: HONEY JAR PROGRESS ========== */}
                    <section className={styles.jarSection}>
                        <h2 className={styles.sectionTitle}>
                            <span>🍯</span> মধু-পূর্ণতা
                        </h2>
                        <div className={styles.jarLayout}>
                            {/* Honey Jar */}
                            <div className={styles.honeyJarContainer}>
                                <div className={styles.honeyJar}>
                                    {/* Overflow animation when full */}
                                    {jarProgress.is_full && (
                                        <div className={styles.jarOverflowDrips}>
                                            <div className={styles.overflowDrip} />
                                            <div className={styles.overflowDrip} style={{ animationDelay: '0.3s' }} />
                                            <div className={styles.overflowDrip} style={{ animationDelay: '0.6s' }} />
                                        </div>
                                    )}
                                    <div className={styles.jarLid}></div>
                                    <div className={styles.jarBody}>
                                        <div className={`${styles.jarGlass} ${jarSplash ? styles.jarSplash : ''}`}>
                                            <div className={styles.jarFill} style={{ height: `${jarProgress.fill_percent}%` }}>
                                                <div className={styles.liquidWave}></div>
                                                <div className={styles.liquidBubble} style={{ left: '20%', animationDelay: '0s' }}></div>
                                                <div className={styles.liquidBubble} style={{ left: '55%', animationDelay: '0.8s' }}></div>
                                                <div className={styles.liquidBubble} style={{ left: '75%', animationDelay: '1.6s' }}></div>
                                            </div>
                                            <div className={styles.jarGlossLeft}></div>
                                            <div className={styles.jarGlossTop}></div>
                                        </div>
                                        <div className={styles.jarBase}></div>
                                    </div>
                                    <div className={styles.jarPercentOverlay}>
                                        <span>{jarProgress.fill_percent}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Info */}
                            <div className={styles.jarInfo}>
                                {jarProgress.is_full ? (
                                    <button
                                        className={styles.claimGiftBtn}
                                        onClick={() => setShowGiftModal(true)}
                                    >
                                        <Gift size={16} />
                                        <span>মৌ-উপহার সংগ্রহ করুন!</span>
                                    </button>
                                ) : (
                                    <p className={styles.jarLabel}>
                                        জারটি <strong>{jarProgress.fill_percent}%</strong> পূর্ণ হয়েছে
                                    </p>
                                )}



                                {/* Pollen counter */}
                                <p className={styles.pollenCounter}>
                                    🌼 <strong>{jarProgress.pollen_in_cycle || 0}</strong> মধু ফোঁটা সংগ্রহ হয়েছে
                                    &nbsp;·&nbsp; প্রতি ৩টিতে ১% পূর্ণ হয়
                                </p>

                                {/* XP Progress Bar */}
                                <div className={styles.xpBarWrapper}>
                                    <div className={styles.xpBar}>
                                        <div
                                            className={`${styles.xpFill} ${jarProgress.is_full ? styles.xpFillFull : ''}`}
                                            style={{ width: `${jarProgress.fill_percent}%` }}
                                        ></div>
                                    </div>
                                    <span className={styles.xpPct}>{jarProgress.fill_percent}%</span>
                                </div>

                                <p className={styles.xpTotal}>মোট মধু : <strong>{profile?.xp || 0}</strong></p>

                                {/* Flaming Badge status */}
                                {flamingBadge && (
                                    <div className={styles.flamingBadgeActive}>
                                        🔥 ফ্লেমিং ব্যাজ সক্রিয় আছে!
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Mystery Gift Modal */}
                    {showGiftModal && pendingGift && (
                        <HoneyJarGiftModal
                            gift={pendingGift}
                            onClaim={handleClaimGift}
                            onClose={() => setShowGiftModal(false)}
                        />
                    )}

                    {/* ========== SECTION 4: ACHIEVEMENT GALLERY ========== */}
                    <section className={styles.badgesSection}>
                        <h2 className={styles.sectionTitle}>
                            <span>🏅</span> অর্জিত পদক
                        </h2>
                        <div className={styles.badgesGrid}>
                            {BADGE_LIST.map(badge => (
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
                                {flamingBadge && <FlamingBadge size={16} className={styles.nameBadge} />}
                                {profile?.full_name || 'শিক্ষার্থী'}
                            </h4>
                            <div className={styles.shareStatsRow}>
                                <div className={styles.shareStat}><strong>{profile?.xp || 0}</strong><span>মধু (XP)</span></div>
                                <div className={styles.shareStat}><strong>{streak?.current_streak || 0}</strong><span>দিনের স্ট্রিক</span></div>
                                <div className={styles.shareStat}><strong>{enrolledCourses.length}</strong><span>কোর্স</span></div>
                            </div>
                            <div className={styles.shareRankBadge}>
                                <Crown size={13} /> রয়্যাল জেলি হাইভ মাস্টর্স
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
