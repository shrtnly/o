import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { rewardService } from '../../services/rewardService';
import { courseService } from '../../services/courseService';
import LoadingScreen from '../../components/ui/LoadingScreen';
import InlineLoader from '../../components/ui/InlineLoader';
import {
    User,
    Mail,
    Calendar,
    Zap,
    Gem,
    Heart,
    Trophy,
    Target,
    TrendingUp,
    LogOut,
    Settings,
    ChevronRight,
    BookOpen,
    CheckCircle,
    MapPin,
    Briefcase,
    Building2,
    Edit3,
    X,
    ExternalLink
} from 'lucide-react';
import ShieldIcon from '../../components/ShieldIcon';
import { getShieldLevel } from '../../utils/shieldSystem';
import Button from '../../components/ui/Button';
import styles from './ProfilePage.module.css';

const ProfilePage = () => {
    const { user, signOut, updateProfile } = useAuth();
    const navigate = useNavigate();
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
            alert('প্রোফাইল আপডেট করতে সমস্যা হয়েছে।');
        }
    };

    const handleLogout = async () => {
        if (window.confirm('আপনি কি নিশ্চিত যে লগআউট করতে চান?')) {
            try {
                await signOut();
                navigate('/');
            } catch (error) {
                console.error('Error signing out:', error);
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('bn-BD', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getTransactionIcon = (type) => {
        switch (type) {
            case 'xp_earned': return <Zap size={16} color="#ff9600" />;
            case 'gem_earned': return <Gem size={16} color="#1cb0f6" />;
            case 'heart_lost': return <Heart size={16} color="#ff4b4b" />;
            case 'heart_gained': return <Heart size={16} color="#58cc02" />;
            default: return <Zap size={16} />;
        }
    };



    const shield = getShieldLevel(profile?.xp || 0);

    return (
        <div className={styles.profilePage}>
            {loading ? (
                <div className="flex items-center justify-center h-full w-full min-h-[400px]">
                    <InlineLoader />
                </div>
            ) : (
                <>
                    {/* Top Hero Section */}
                    <section className={styles.profileHero}>
                        <div className={styles.heroPattern}></div>
                        <div className={styles.heroGlow}></div>

                        <div className={styles.topActions}>
                            <button className={styles.actionBtn} onClick={() => setIsEditModalOpen(true)}>
                                <Edit3 size={18} />
                                <span>প্রোফাইল এডিট</span>
                            </button>
                            <button className={`${styles.actionBtn} ${styles.logoutBtn}`} onClick={handleLogout}>
                                <LogOut size={18} />
                                <span>লগআউট</span>
                            </button>
                        </div>
                    </section>

                    <div className={styles.container}>
                        {/* Left Sidebar */}
                        <aside className={styles.profileSidebar}>
                            <div className={styles.sidebarCard}>
                                <div className={styles.avatarWrapper}>
                                    <div className={styles.avatar}>
                                        {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} alt="Avatar" className={styles.avatarImg} />
                                        ) : (
                                            <User size={60} />
                                        )}
                                    </div>
                                    <div className={styles.onlineBadge}></div>
                                </div>

                                <h2 className={styles.userName}>{profile?.full_name || 'শিক্ষার্থী'}</h2>
                                <p className={styles.userTagline}>
                                    {profile?.designation ? `${profile.designation} ${profile.department ? '@ ' + profile.department : ''}` : 'শেখার যাত্রায় আপনাকে স্বাগতম'}
                                </p>

                                {profile?.bio && <p className={styles.userBio}>{profile.bio}</p>}

                                <div className={styles.metaList}>
                                    <div className={styles.metaItem}>
                                        <Mail size={16} />
                                        <span>{user?.email}</span>
                                    </div>
                                    {profile?.location && (
                                        <div className={styles.metaItem}>
                                            <MapPin size={16} />
                                            <span>{profile.location}</span>
                                        </div>
                                    )}
                                    <div className={styles.metaItem}>
                                        <Calendar size={16} />
                                        <span>যোগদান: {formatDate(profile?.created_at)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.sidebarCard}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Trophy size={18} color="gold" />
                                    অর্জিত শিল্ড
                                </h3>
                                <div className={styles.shieldPreview} style={{
                                    padding: '20px',
                                    background: shield.gradient,
                                    borderRadius: '16px',
                                    color: 'white',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>{shield.icon}</div>
                                    <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{shield.nameBangla}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: '0.8', marginTop: '4px' }}>লেভেল: {shield.level}</div>
                                </div>
                            </div>
                        </aside>

                        {/* Main Content Area */}
                        <main className={styles.mainContent}>
                            {/* Stats Overview */}
                            <div className={styles.statsSummary}>
                                <div className={styles.miniStatCard}>
                                    <div className={styles.statIcon}><Zap size={24} /></div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{profile?.xp || 0}</span>
                                        <span className={styles.statLabel}>মোট XP</span>
                                    </div>
                                </div>
                                <div className={styles.miniStatCard} style={{ '--accent-color': '#1cb0f6' }}>
                                    <div className={styles.statIcon} style={{ background: 'rgba(28, 176, 246, 0.1)', color: '#1cb0f6' }}><Gem size={24} /></div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{profile?.gems || 0}</span>
                                        <span className={styles.statLabel}>জেম</span>
                                    </div>
                                </div>
                                <div className={styles.miniStatCard} style={{ '--accent-color': '#ff4b4b' }}>
                                    <div className={styles.statIcon} style={{ background: 'rgba(255, 75, 75, 0.1)', color: '#ff4b4b' }}><Heart size={24} /></div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{profile?.hearts || 0}/{profile?.max_hearts || 10}</span>
                                        <span className={styles.statLabel}>হার্ট</span>
                                    </div>
                                </div>
                                <div className={styles.miniStatCard} style={{ '--accent-color': '#58cc02' }}>
                                    <div className={styles.statIcon} style={{ background: 'rgba(88, 204, 2, 0.1)', color: '#58cc02' }}><CheckCircle size={24} /></div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{stats?.accuracy_percentage || 0}%</span>
                                        <span className={styles.statLabel}>নির্ভুলতা</span>
                                    </div>
                                </div>
                            </div>

                            {/* Continued Learning */}
                            <section className={styles.learningSection}>
                                <div className={styles.sectionHeader}>
                                    <h3><BookOpen size={20} /> আমার কোর্সসমূহ</h3>
                                    <button className={styles.textBtn} onClick={() => navigate('/courses')}>সবগুলো দেখুন</button>
                                </div>
                                <div className={styles.courseGrid}>
                                    {enrolledCourses.length > 0 ? enrolledCourses.map(course => (
                                        <div key={course.course_id} className={styles.courseProgressCard} onClick={() => navigate(`/learn/${course.course_id}`)}>
                                            <img src={course.image_url} alt={course.course_title} className={styles.courseThumb} />
                                            <div className={styles.courseInfo}>
                                                <h4>{course.course_title}</h4>
                                                <div className={styles.progressLabel}>
                                                    <span>অগ্রগতি: {course.progress_percentage}%</span>
                                                    <span>{course.chapters_completed}/{course.total_chapters} অধ্যায়</span>
                                                </div>
                                                <div className={styles.progressBar}>
                                                    <div className={styles.progressFill} style={{ width: `${course.progress_percentage}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className={styles.emptyState}>
                                            <p>এখনও কোনো কোর্সে ভর্তি হননি।</p>
                                            <Button variant="primary" onClick={() => navigate('/courses')}>কোর্স শুরু করুন</Button>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Activity Feed */}
                            <section className={styles.activitySection}>
                                <div className={styles.sectionHeader}>
                                    <h3><TrendingUp size={20} /> সাম্প্রতিক কার্যকলাপ</h3>
                                </div>
                                <div className={styles.activityCard}>
                                    {recentTransactions.length > 0 ? (
                                        <div className={styles.activityList}>
                                            {recentTransactions.map(item => (
                                                <div key={item.id} className={styles.activityItem}>
                                                    <div className={styles.actIcon}>
                                                        {getTransactionIcon(item.transaction_type)}
                                                    </div>
                                                    <div className={styles.actContent}>
                                                        <div className={styles.actTitle}>
                                                            {item.transaction_type === 'xp_earned' && 'অনুশীলন সম্পন্ন করে XP পেয়েছেন'}
                                                            {item.transaction_type === 'gem_earned' && 'পুরস্কারস্বরূপ জেম পেয়েছেন'}
                                                            {item.transaction_type === 'heart_lost' && 'ভুল উত্তরের জন্য হার্ট হারিয়েছেন'}
                                                            {item.transaction_type === 'heart_gained' && 'হার্ট রিফিল হয়েছে'}
                                                        </div>
                                                        <div className={styles.actTime}>{formatDate(item.created_at)}</div>
                                                    </div>
                                                    <div className={`${styles.actAmount} ${item.transaction_type.includes('lost') ? styles.minus : styles.plus}`}>
                                                        {item.transaction_type.includes('lost') ? '-' : '+'}{item.amount}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={styles.emptyState}>
                                            <p>কোনো কার্যকলাপের রেকর্ড পাওয়া যায়নি।</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </main>
                    </div>

                    {/* Edit Profile Modal */}
                    {isEditModalOpen && (
                        <div className={styles.modalOverlay} onClick={() => setIsEditModalOpen(false)}>
                            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                                <div className={styles.modalHeader}>
                                    <h3>প্রোফাইল সম্পাদন করুন</h3>
                                    <button className={styles.closeBtn} onClick={() => setIsEditModalOpen(false)}><X size={24} /></button>
                                </div>
                                <form className={styles.editForm} onSubmit={handleUpdateProfile}>
                                    <div className={styles.fieldGroup}>
                                        <label>পুরো নাম</label>
                                        <input
                                            type="text"
                                            value={editForm.full_name}
                                            onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label>পদবী (Designation)</label>
                                        <input
                                            type="text"
                                            placeholder="উদা: Executive, Officer"
                                            value={editForm.designation}
                                            onChange={e => setEditForm({ ...editForm, designation: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label>বিভাগ/দপ্তর (Department)</label>
                                        <input
                                            type="text"
                                            placeholder="উদা: HR, Sales, IT"
                                            value={editForm.department}
                                            onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label>আপনার সম্পর্কে (Bio)</label>
                                        <textarea
                                            rows="3"
                                            value={editForm.bio}
                                            onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label>অবস্থান (Location)</label>
                                        <input
                                            type="text"
                                            value={editForm.location}
                                            onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.modalActions}>
                                        <Button variant="secondary" type="button" onClick={() => setIsEditModalOpen(false)}>বাতিল</Button>
                                        <Button variant="primary" type="submit">সংরক্ষণ করুন</Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ProfilePage;
