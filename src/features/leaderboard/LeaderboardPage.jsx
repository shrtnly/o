import React, { useState, useEffect } from 'react';
import { Trophy, Medal, ChevronLeft, Search, Flame, Target, Award, Lock, Shield, Zap, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { leaderboardService } from '../../services/leaderboardService';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../learning/components/Sidebar';
import ShieldIcon from '../../components/ShieldIcon';
import { supabase } from '../../lib/supabaseClient';
import styles from './LeaderboardPage.module.css';

const TIERS = [
    { id: 'SILVER', name: 'সিলভার লার্নার', nameEn: 'Silver Learner', color: '#8B7355' },
    { id: 'GOLD', name: 'গোল্ড লার্নার', nameEn: 'Gold Learner', color: '#FFD700' },
    { id: 'PLATINUM', name: 'প্ল্যাটিনাম লার্নার', nameEn: 'Platinum Learner', color: '#E5E4E2' },
    { id: 'DIAMOND', name: 'ডায়মন্ড লার্নার', nameEn: 'Diamond Learner', color: '#B9F2FF' }
];

const LeaderboardPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTier, setActiveTier] = useState('SILVER');
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRank, setUserRank] = useState(null);
    const [userXP, setUserXP] = useState(0);
    const [xpLoading, setXpLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('xp')
                    .eq('id', user.id)
                    .single();
                if (data) setUserXP(data.xp);
            }
            setXpLoading(false);
        };
        fetchUserData();
    }, [user]);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            if (userXP < 100 && !xpLoading) {
                setLoading(false);
                return;
            }
            setLoading(true);
            const data = await leaderboardService.getLeaderboardByTier(activeTier);
            setLeaderboardData(data);

            if (user) {
                const rank = await leaderboardService.getUserRank(user.id, activeTier);
                setUserRank(rank);
            }
            setLoading(false);
        };

        if (!xpLoading) fetchLeaderboard();
    }, [activeTier, user, userXP, xpLoading]);

    const getRankIcon = (rank) => {
        if (rank === 0) return <Medal size={24} color="#FFD700" fill="#FFD700" />;
        if (rank === 1) return <Medal size={24} color="#C0C0C0" fill="#C0C0C0" />;
        if (rank === 2) return <Medal size={24} color="#CD7F32" fill="#CD7F32" />;
        return <span className={styles.rankNumber}>{rank + 1}</span>;
    };

    const isLocked = !xpLoading && userXP < 100;

    return (
        <div className={styles.container}>
            <Sidebar />

            <main className={styles.mainContent}>
                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <Trophy size={48} color="#FFD700" className={styles.trophyIcon} />
                        <div>
                            <h1>লিডারবোর্ড</h1>
                            <p>আপনার দক্ষতা প্রদর্শন করুন এবং সেরাদের সাথে প্রতিযোগিতা করুন</p>
                        </div>
                    </div>
                </div>

                {isLocked ? (
                    <div className={styles.introContainer}>
                        <div className={styles.lockInfoBanner}>
                            <div className={styles.lockIconBox}>
                                <Lock size={32} />
                            </div>
                            <div className={styles.lockTextContent}>
                                <h2>লিডারবোর্ড এখনো লক করা আছে</h2>
                                <p>লিডারবোর্ডে প্রবেশ করতে অন্তত 100 XP প্রয়োজন। আপনার বর্তমান XP: {userXP}</p>
                            </div>
                        </div>

                        <div className={styles.introGrid}>
                            <div className={styles.introCard}>
                                <div className={styles.introIconBox} style={{ backgroundColor: 'rgba(28, 176, 246, 0.1)', color: '#1cb0f6' }}>
                                    <Zap size={32} />
                                </div>
                                <h3>কিভাবে XP অর্জন করবেন?</h3>
                                <p>প্রতিটি অধ্যায় বা কুইজ সম্পন্ন করলে আপনি XP অর্জন করবেন। যত বেশি নির্ভুলভাবে উত্তর দেবেন, তত বেশি XP পাবেন!</p>
                            </div>

                            <div className={styles.introCard}>
                                <div className={styles.introIconBox} style={{ backgroundColor: 'rgba(88, 204, 2, 0.1)', color: '#58cc02' }}>
                                    <Trophy size={32} />
                                </div>
                                <h3>লিগের পরিচিতি</h3>
                                <p>ও-শেখায় ৪টি লিগ আছে: সিলভার, গোল্ড, প্ল্যাটিনাম এবং ডায়মন্ড। প্রতি সপ্তাহে শীর্ষ লার্নাররা পরবর্তী লিগে উন্নীত হয়।</p>
                            </div>

                            <div className={styles.introCard}>
                                <div className={styles.introIconBox} style={{ backgroundColor: 'rgba(255, 150, 0, 0.1)', color: '#ff9600' }}>
                                    <TrendingUp size={32} />
                                </div>
                                <h3>প্রতিযোগিতা শুরু করুন</h3>
                                <p>আপনার বন্ধুদের সাথে প্রতিযোগিতা করুন এবং নিজেকে দেশের সেরা লার্নারদের তালিকায় তুলে আনুন।</p>
                            </div>
                        </div>

                        <div className={styles.actionSection}>
                            <button className={styles.startLearningBtn} onClick={() => navigate('/learning')}>
                                শেখা শুরু করুন
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className={styles.tabs}>
                            {TIERS.map((tier) => (
                                <button
                                    key={tier.id}
                                    className={`${styles.tab} ${activeTier === tier.id ? styles.activeTab : ''}`}
                                    onClick={() => setActiveTier(tier.id)}
                                    style={{ '--tier-color': tier.color }}
                                >
                                    <span>{tier.name}</span>
                                </button>
                            ))}
                        </div>

                        <div className={styles.leaderboardCard}>
                            {loading ? (
                                <div className={styles.loadingState}>
                                    <div className={styles.spinner}></div>
                                    <p>তথ্য লোড হচ্ছে...</p>
                                </div>
                            ) : (
                                <div className={styles.tableContainer}>
                                    <div className={styles.tableHeader}>
                                        <div className={styles.headerCol}>মাটি (স্থান)</div>
                                        <div className={styles.headerCol}>শির্ক্ষার্থী</div>
                                        <div className={styles.headerCol}>মোট এক্সপি (XP)</div>
                                    </div>

                                    <div className={styles.tableBody}>
                                        {leaderboardData.length === 0 ? (
                                            <div className={styles.emptyState}>
                                                <Award size={64} color="#37464f" />
                                                <p>এই লিগে এখনো কোনো শির্ক্ষার্থী নেই। পড়াশোনা শুরু করুন এবং জায়গা করে নিন!</p>
                                            </div>
                                        ) : (
                                            leaderboardData.map((item, index) => (
                                                <div
                                                    key={item.id}
                                                    className={`${styles.row} ${user?.id === item.id ? styles.currentUserRow : ''}`}
                                                >
                                                    <div className={styles.rankCol}>
                                                        {getRankIcon(index)}
                                                    </div>
                                                    <div className={styles.userCol}>
                                                        <div className={styles.avatarWrapper}>
                                                            {item.avatar_url ? (
                                                                <img src={item.avatar_url} alt={item.display_name} className={styles.avatar} />
                                                            ) : (
                                                                <div className={styles.avatarPlaceholder}>
                                                                    {item.display_name?.charAt(0) || '?'}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className={styles.userInfo}>
                                                            <span className={styles.userName}>{item.display_name}</span>
                                                            <div className={styles.tierTag}>
                                                                <ShieldIcon xp={item.xp} size={16} showTooltip={false} />
                                                                <span>{TIERS.find(t => t.id === activeTier).nameEn}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={styles.xpCol}>
                                                        <span className={styles.xpValue}>{item.xp}</span>
                                                        <span className={styles.xpLabel}>XP</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Fixed User Status Bar */}
                        {!loading && userRank && (
                            <div className={styles.footerStatus}>
                                <div className={styles.footerLeft}>
                                    <div className={styles.footerRank}>আপনার স্থান: {userRank}</div>
                                </div>
                                <div className={styles.footerRight}>
                                    <button className={styles.shareBtn}>শেয়ার করুন</button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default LeaderboardPage;
