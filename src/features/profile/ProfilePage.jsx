import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { rewardService } from '../../services/rewardService';
import { courseService } from '../../services/courseService';
import { storageService } from '../../services/storageService';
import LoadingScreen from '../../components/ui/LoadingScreen';
import InlineLoader from '../../components/ui/InlineLoader';
import {
    User,
    Calendar,
    Zap,
    Gem,
    Heart,
    Trophy,
    Target,
    TrendingUp,
    LogOut,
    ChevronRight,
    BookOpen,
    MapPin,
    Edit3,
    X,
    Camera,
    Flame
} from 'lucide-react';
import ShieldIcon from '../../components/ShieldIcon';
import { getShieldLevel } from '../../utils/shieldSystem';
import Button from '../../components/ui/Button';
import styles from './ProfilePage.module.css';
import { useLanguage } from '../../context/LanguageContext';

const ProfilePage = () => {
    const { user, signOut, updateProfile } = useAuth();
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [enrolledCourses, setEnrolledCourses] = useState([]);

    // Modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        full_name: '',
        designation: '',
        department: '',
        bio: '',
        location: ''
    });

    // Avatar upload states
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef(null);

    // Cover upload states
    const [uploadingCover, setUploadingCover] = useState(false);
    const coverInputRef = useRef(null);

    const [streak, setStreak] = useState(null);

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }
        fetchProfileData();
    }, [user, navigate]);

    const fetchProfileData = async () => {
        try {
            setLoading(true);

            // Fetch profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            setProfile(profileData);
            setEditForm({
                full_name: profileData?.full_name || '',
                designation: profileData?.designation || '',
                department: profileData?.department || '',
                bio: profileData?.bio || '',
                location: profileData?.location || ''
            });

            // Fetch user stats
            const userStats = await rewardService.getUserStats(user.id);
            setStats(userStats);

            // Fetch streak
            const streakData = await rewardService.getUserStreak(user.id);
            setStreak(streakData);

            // Fetch enrolled courses with progress
            const courseProgress = await courseService.getUserEnrolledCourses(user.id);
            setEnrolledCourses(courseProgress);

            // Fetch recent transactions
            const transactions = await rewardService.getRecentTransactions(user.id, 5);
            setRecentTransactions(transactions);

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

    const handleLogout = async () => {
        if (window.confirm(t('confirm_logout_msg'))) {
            try {
                await signOut();
                navigate('/');
            } catch (error) {
                console.error('Error signing out:', error);
            }
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

            // Upload avatar and update profile
            const updatedProfile = await storageService.changeAvatar(
                file,
                user.id,
                profile?.avatar_url
            );

            setProfile(updatedProfile);

            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert(error.message || 'ছবি আপলোড করতে সমস্যা হয়েছে');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleCoverClick = () => {
        coverInputRef.current?.click();
    };

    const handleCoverChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingCover(true);

            // Upload cover and update profile
            const updatedProfile = await storageService.changeCover(
                file,
                user.id,
                profile?.cover_url
            );

            setProfile(updatedProfile);

            // Reset file input
            if (coverInputRef.current) {
                coverInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Error uploading cover:', error);
            alert(error.message || 'কভার ছবি আপলোড করতে সমস্যা হয়েছে');
        } finally {
            setUploadingCover(false);
        }
    };


    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getTransactionIcon = (type) => {
        switch (type) {
            case 'xp_earned': return <Zap size={16} color="#ffa502" />;
            case 'gem_earned': return <Gem size={16} color="#0fbcf9" />;
            case 'heart_lost': return <Heart size={16} color="#ff4d4d" />;
            case 'heart_gained': return <Heart size={16} color="#2ecc71" />;
            default: return <Zap size={16} />;
        }
    };

    const shield = getShieldLevel(profile?.xp || 0);

    return (
        <div className={styles.profilePage}>
            {loading ? (
                <div className={styles.loadingContainer}>
                    <InlineLoader />
                </div>
            ) : (
                <div className={styles.container}>
                    {/* Header / Cover Section */}
                    <header className={styles.profileHeader}>
                        <div
                            className={styles.coverImage}
                            style={profile?.cover_url ? { backgroundImage: `url(${profile.cover_url})` } : {}}
                        >
                            <div className={styles.coverOverlay}></div>
                            <button className={styles.editCoverBtn} onClick={handleCoverClick} title={t('change_cover')}>
                                <Camera size={16} />
                                <span>{t('change_cover')}</span>
                            </button>
                            <input
                                ref={coverInputRef}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                onChange={handleCoverChange}
                                style={{ display: 'none' }}
                            />
                        </div>

                        <div className={styles.profileHeaderContent}>
                            <div className={styles.profileMetaBar}>
                                <div className={styles.profileIdentity}>
                                    <div className={styles.avatarContainer}>
                                        <div className={styles.avatar}>
                                            {profile?.avatar_url ? (
                                                <img src={profile.avatar_url} alt="Profile" />
                                            ) : (
                                                <User size={40} />
                                            )}
                                            {uploadingAvatar && <div className={styles.loaderOverlay}><InlineLoader /></div>}
                                        </div>
                                        <button className={styles.avatarEditBtn} onClick={handleAvatarClick}>
                                            <Camera size={14} />
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/webp"
                                            onChange={handleAvatarChange}
                                            style={{ display: 'none' }}
                                        />
                                    </div>
                                    <div className={styles.userInfo}>
                                        <h1 className={styles.userName}>{profile?.full_name || t('learner')}</h1>
                                        <p className={styles.userRole}>
                                            {profile?.designation ? `${profile.designation} ${profile.department ? '• ' + profile.department : ''}` : t('welcome_tagline')}
                                        </p>
                                        <div className={styles.userLocationDate}>
                                            {profile?.location && (
                                                <span className={styles.locationItem}>
                                                    <MapPin size={14} /> {profile.location}
                                                </span>
                                            )}
                                            <span className={styles.dateItem}>
                                                <Calendar size={14} /> {t('joined')}: {formatDate(profile?.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Row - Now separate */}
                            <div className={styles.statsRow}>
                                <div className={styles.statItem}>
                                    <div className={styles.statIcon} style={{ color: '#ffa502', background: 'rgba(255, 165, 2, 0.1)' }}>
                                        <Zap size={20} />
                                    </div>
                                    <div className={styles.statContent}>
                                        <span className={styles.statValue}>{profile?.xp || 0}</span>
                                        <span className={styles.statLabel}>XP</span>
                                    </div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statIcon} style={{ color: '#0fbcf9', background: 'rgba(15, 188, 249, 0.1)' }}>
                                        <Gem size={20} />
                                    </div>
                                    <div className={styles.statContent}>
                                        <span className={styles.statValue}>{profile?.gems || 0}</span>
                                        <span className={styles.statLabel}>{language === 'bn' ? 'জেম' : 'Gems'}</span>
                                    </div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statIcon} style={{ color: '#ff4d4d', background: 'rgba(255, 77, 77, 0.1)' }}>
                                        <Flame size={20} />
                                    </div>
                                    <div className={styles.statContent}>
                                        <span className={styles.statValue}>{streak?.current_streak || 0}</span>
                                        <span className={styles.statLabel}>{t('days')}</span>
                                    </div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statIcon} style={{ color: '#2ecc71', background: 'rgba(46, 204, 113, 0.1)' }}>
                                        <Target size={20} />
                                    </div>
                                    <div className={styles.statContent}>
                                        <span className={styles.statValue}>{stats?.accuracy_percentage || 0}%</span>
                                        <span className={styles.statLabel}>{t('efficiency')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className={styles.contentGrid}>
                        {/* LEFT COLUMN - Shield & Bio */}
                        <aside className={styles.leftColumn}>

                            {/* Shield / League Card */}
                            <div className={styles.shieldCard}>
                                <div className={styles.shieldHeader}>
                                    <Trophy size={18} className={styles.trophyIcon} />
                                    <h3>{t('earned_shield')}</h3>
                                </div>
                                <div className={styles.shieldBody} style={{ background: shield.gradient }}>
                                    <div className={styles.shieldIcon}>{shield.icon}</div>
                                    <div className={styles.shieldInfo}>
                                        <h4>{language === 'bn' ? shield.nameBangla : shield.nameEnglish}</h4>
                                        <span>{t('level')}: {shield.level}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bio Section if exists */}
                            {profile?.bio && (
                                <div className={styles.bioCard}>
                                    <h3>{t('bio')}</h3>
                                    <p>{profile.bio}</p>
                                </div>
                            )}

                        </aside>

                        {/* RIGHT COLUMN - Courses & Activity */}
                        <div className={styles.rightColumn}>
                            {/* Courses Section */}
                            <section className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <h3>{t('my_courses')}</h3>
                                    {enrolledCourses.length > 0 && (
                                        <button className={styles.seeAllBtn} onClick={() => navigate('/courses')}>
                                            {t('see_all')} <ChevronRight size={16} />
                                        </button>
                                    )}
                                </div>

                                {enrolledCourses.length > 0 ? (
                                    <div className={styles.coursesList}>
                                        {enrolledCourses.map(course => (
                                            <div key={course.course_id} className={styles.courseItem} onClick={() => navigate(`/learn/${course.course_id}`)}>
                                                <img src={course.image_url} alt="" className={styles.courseThumb} />
                                                <div className={styles.courseDetails}>
                                                    <h4>{course.course_title}</h4>
                                                    <div className={styles.progressBarWrapper}>
                                                        <div className={styles.progressFill} style={{ width: `${course.progress_percentage}%` }}></div>
                                                    </div>
                                                    <div className={styles.progressMeta}>
                                                        <span>{course.progress_percentage}% {t('completed')}</span>
                                                        <span>{course.chapters_completed}/{course.total_chapters} {t('chapters')}</span>
                                                    </div>
                                                </div>
                                                <div className={styles.playIcon}>
                                                    <ChevronRight size={20} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyState}>
                                        <p>{language === 'bn' ? 'এখনও কোনো কোর্সে ভর্তি হননি।' : "You haven't enrolled in any courses yet."}</p>
                                        <Button variant="primary" onClick={() => navigate('/courses')}>{t('start_course')}</Button>
                                    </div>
                                )}
                            </section>

                            {/* Activity Section */}
                            <section className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <h3>{t('recent_activity')}</h3>
                                </div>

                                {recentTransactions.length > 0 ? (
                                    <div className={styles.activityFeed}>
                                        {recentTransactions.map(item => (
                                            <div key={item.id} className={styles.activityRow}>
                                                <div className={styles.activityTypeIcon}>
                                                    {getTransactionIcon(item.transaction_type)}
                                                </div>
                                                <div className={styles.activityDetails}>
                                                    <span className={styles.activityText}>
                                                        {item.transaction_type === 'xp_earned' && t('practice_xp')}
                                                        {item.transaction_type === 'gem_earned' && t('reward_gems')}
                                                        {item.transaction_type === 'heart_lost' && t('lost_hearts')}
                                                        {item.transaction_type === 'heart_gained' && t('refilled_hearts')}
                                                    </span>
                                                    <span className={styles.activityDate}>{formatDate(item.created_at)}</span>
                                                </div>
                                                <div className={`${styles.activityAmount} ${item.transaction_type.includes('lost') ? styles.negative : styles.positive}`}>
                                                    {item.transaction_type.includes('lost') ? '-' : '+'}{item.amount}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyState}>
                                        <p>{t('no_activity')}</p>
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>

                    {/* Edit Profile Modal */}
                    {isEditModalOpen && (
                        <div className={styles.modalOverlay} onClick={() => setIsEditModalOpen(false)}>
                            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                                <div className={styles.modalHeader}>
                                    <h3>{t('edit_profile')}</h3>
                                    <button className={styles.closeBtn} onClick={() => setIsEditModalOpen(false)}><X size={20} /></button>
                                </div>
                                <form className={styles.editForm} onSubmit={handleUpdateProfile}>
                                    <div className={styles.fieldGroup}>
                                        <label>{t('full_name')}</label>
                                        <input
                                            type="text"
                                            value={editForm.full_name}
                                            onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className={styles.rowGroup}>
                                        <div className={styles.fieldGroup}>
                                            <label>{t('designation')}</label>
                                            <input
                                                type="text"
                                                placeholder={language === 'bn' ? "উদা: Executive" : "e.g. Executive"}
                                                value={editForm.designation}
                                                onChange={e => setEditForm({ ...editForm, designation: e.target.value })}
                                            />
                                        </div>
                                        <div className={styles.fieldGroup}>
                                            <label>{t('dept')}</label>
                                            <input
                                                type="text"
                                                placeholder={language === 'bn' ? "উদা: IT" : "e.g. IT"}
                                                value={editForm.department}
                                                onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label>{t('bio')}</label>
                                        <textarea
                                            rows="3"
                                            value={editForm.bio}
                                            onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label>{t('location')}</label>
                                        <input
                                            type="text"
                                            value={editForm.location}
                                            onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.modalActions}>
                                        <Button variant="secondary" type="button" onClick={() => setIsEditModalOpen(false)}>{t('cancel')}</Button>
                                        <Button variant="primary" type="submit">{t('save')}</Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
