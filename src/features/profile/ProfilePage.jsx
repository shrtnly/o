import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { rewardService } from '../../services/rewardService';
import {
    User,
    Mail,
    Calendar,
    Award,
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
    CheckCircle
} from 'lucide-react';
import styles from './ProfilePage.module.css';

const ProfilePage = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recentTransactions, setRecentTransactions] = useState([]);

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

            // Fetch user stats
            const userStats = await rewardService.getUserStats(user.id);
            setStats(userStats);

            // Fetch recent transactions
            const transactions = await rewardService.getRecentTransactions(user.id, 5);
            setRecentTransactions(transactions);

        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
            navigate('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>লোড হচ্ছে...</p>
            </div>
        );
    }

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
            case 'xp_earned':
                return <Zap size={16} color="#ff9600" />;
            case 'gem_earned':
                return <Gem size={16} color="#1cb0f6" />;
            case 'heart_lost':
                return <Heart size={16} color="#ff4b4b" />;
            case 'heart_gained':
                return <Heart size={16} color="#58cc02" />;
            default:
                return <Award size={16} />;
        }
    };

    const getTransactionLabel = (type) => {
        const labels = {
            'xp_earned': 'XP অর্জিত',
            'gem_earned': 'জেম অর্জিত',
            'heart_lost': 'হার্ট হারিয়েছে',
            'heart_gained': 'হার্ট পেয়েছে',
            'gem_spent': 'জেম ব্যয়িত'
        };
        return labels[type] || type;
    };

    return (
        <div className={styles.profilePage}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1 className={styles.pageTitle}>আমার প্রোফাইল</h1>
                    <button className={styles.logoutBtn} onClick={handleLogout}>
                        <LogOut size={20} />
                        <span>লগআউট</span>
                    </button>
                </div>
            </header>

            <div className={styles.container}>
                {/* Profile Card */}
                <div className={styles.profileCard}>
                    <div className={styles.profileHeader}>
                        <div className={styles.avatarContainer}>
                            <div className={styles.avatar}>
                                <User size={48} />
                            </div>
                            <div className={styles.statusBadge}>সক্রিয়</div>
                        </div>
                        <div className={styles.profileInfo}>
                            <h2 className={styles.userName}>{profile?.full_name || 'শিক্ষার্থী'}</h2>
                            <div className={styles.userMeta}>
                                <Mail size={16} />
                                <span>{user?.email}</span>
                            </div>
                            <div className={styles.userMeta}>
                                <Calendar size={16} />
                                <span>যোগদান: {formatDate(profile?.created_at)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard} style={{ '--accent-color': '#ff9600' }}>
                            <div className={styles.statIcon}>
                                <Zap size={24} fill="#ff9600" />
                            </div>
                            <div className={styles.statContent}>
                                <span className={styles.statLabel}>মোট XP</span>
                                <span className={styles.statValue}>{profile?.xp || 0}</span>
                            </div>
                        </div>

                        <div className={styles.statCard} style={{ '--accent-color': '#1cb0f6' }}>
                            <div className={styles.statIcon}>
                                <Gem size={24} fill="#1cb0f6" />
                            </div>
                            <div className={styles.statContent}>
                                <span className={styles.statLabel}>জেম</span>
                                <span className={styles.statValue}>{profile?.gems || 0}</span>
                            </div>
                        </div>

                        <div className={styles.statCard} style={{ '--accent-color': '#ff4b4b' }}>
                            <div className={styles.statIcon}>
                                <Heart size={24} fill="#ff4b4b" />
                            </div>
                            <div className={styles.statContent}>
                                <span className={styles.statLabel}>হার্ট</span>
                                <span className={styles.statValue}>{profile?.hearts || 0}/{profile?.max_hearts || 10}</span>
                            </div>
                        </div>

                        <div className={styles.statCard} style={{ '--accent-color': '#58cc02' }}>
                            <div className={styles.statIcon}>
                                <Trophy size={24} fill="#58cc02" />
                            </div>
                            <div className={styles.statContent}>
                                <span className={styles.statLabel}>সম্পূর্ণ অধ্যায়</span>
                                <span className={styles.statValue}>{stats?.chapters_completed || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Two Column Layout */}
                <div className={styles.twoColumn}>
                    {/* Left Column - Performance */}
                    <div className={styles.leftColumn}>
                        {/* Performance Card */}
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <TrendingUp size={20} />
                                <h3>পারফরম্যান্স</h3>
                            </div>
                            <div className={styles.cardBody}>
                                <div className={styles.performanceItem}>
                                    <div className={styles.performanceLabel}>
                                        <Target size={18} />
                                        <span>নির্ভুলতা</span>
                                    </div>
                                    <div className={styles.performanceValue}>
                                        {stats?.accuracy_percentage || 0}%
                                    </div>
                                </div>

                                <div className={styles.performanceItem}>
                                    <div className={styles.performanceLabel}>
                                        <CheckCircle size={18} />
                                        <span>সঠিক উত্তর</span>
                                    </div>
                                    <div className={styles.performanceValue}>
                                        {stats?.total_correct_answers || 0}
                                    </div>
                                </div>

                                <div className={styles.performanceItem}>
                                    <div className={styles.performanceLabel}>
                                        <BookOpen size={18} />
                                        <span>মোট প্রশ্ন</span>
                                    </div>
                                    <div className={styles.performanceValue}>
                                        {stats?.total_questions_attempted || 0}
                                    </div>
                                </div>

                                <div className={styles.performanceItem}>
                                    <div className={styles.performanceLabel}>
                                        <Award size={18} />
                                        <span>নথিভুক্ত কোর্স</span>
                                    </div>
                                    <div className={styles.performanceValue}>
                                        {stats?.courses_enrolled || 0}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Settings Card */}
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <Settings size={20} />
                                <h3>সেটিংস</h3>
                            </div>
                            <div className={styles.cardBody}>
                                <button className={styles.settingItem}>
                                    <span>প্রোফাইল সম্পাদনা করুন</span>
                                    <ChevronRight size={18} />
                                </button>
                                <button className={styles.settingItem}>
                                    <span>পাসওয়ার্ড পরিবর্তন করুন</span>
                                    <ChevronRight size={18} />
                                </button>
                                <button className={styles.settingItem}>
                                    <span>বিজ্ঞপ্তি সেটিংস</span>
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Recent Activity */}
                    <div className={styles.rightColumn}>
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <Award size={20} />
                                <h3>সাম্প্রতিক কার্যকলাপ</h3>
                            </div>
                            <div className={styles.cardBody}>
                                {recentTransactions.length > 0 ? (
                                    <div className={styles.transactionList}>
                                        {recentTransactions.map((transaction) => (
                                            <div key={transaction.id} className={styles.transactionItem}>
                                                <div className={styles.transactionIcon}>
                                                    {getTransactionIcon(transaction.transaction_type)}
                                                </div>
                                                <div className={styles.transactionContent}>
                                                    <span className={styles.transactionLabel}>
                                                        {getTransactionLabel(transaction.transaction_type)}
                                                    </span>
                                                    <span className={styles.transactionDate}>
                                                        {formatDate(transaction.created_at)}
                                                    </span>
                                                </div>
                                                <div className={styles.transactionAmount}>
                                                    {transaction.transaction_type.includes('lost') ? '-' : '+'}
                                                    {transaction.amount}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyState}>
                                        <Award size={48} color="#37464f" />
                                        <p>কোন সাম্প্রতিক কার্যকলাপ নেই</p>
                                        <span>একটি অধ্যায় সম্পূর্ণ করে শুরু করুন!</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
