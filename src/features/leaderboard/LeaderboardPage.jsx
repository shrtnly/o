import React, { useState, useEffect } from 'react';
import { Trophy, Medal, ChevronLeft, ChevronRight, Search, Flame, Target, Award, Lock, Shield, Zap, TrendingUp, Share2 } from 'lucide-react';
import InlineLoader from '../../components/ui/InlineLoader';
import { useNavigate } from 'react-router-dom';
import { leaderboardService } from '../../services/leaderboardService';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../learning/components/Sidebar';
import ShieldIcon from '../../components/ShieldIcon';
import { supabase } from '../../lib/supabaseClient';
import styles from './LeaderboardPage.module.css';

import { getShieldLevel, getLevelProgress, SHIELD_LEVELS } from '../../utils/shieldSystem';

const TIERS = [
    { id: 'SILVER', name: 'Silver Learner', nameBn: 'সিলভার', color: '#8B7355', minXP: SHIELD_LEVELS.SILVER.minXP },
    { id: 'GOLD', name: 'Gold Learner', nameBn: 'গোল্ড', color: '#FFD700', minXP: SHIELD_LEVELS.GOLD.minXP },
    { id: 'PLATINUM', name: 'Platinum Learner', nameBn: 'প্ল্যাটিনাম', color: '#E5E4E2', minXP: SHIELD_LEVELS.PLATINUM.minXP },
    { id: 'DIAMOND', name: 'Diamond Learner', nameBn: 'ডায়মন্ড', color: '#B9F2FF', minXP: SHIELD_LEVELS.DIAMOND.minXP }
];

const ITEMS_PER_PAGE = 20;

const LeaderboardPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTier, setActiveTier] = useState('SILVER');
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRank, setUserRank] = useState(null);
    const [userXP, setUserXP] = useState(0);
    const [xpLoading, setXpLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    useEffect(() => {
        const fetchUserData = async () => {
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('xp')
                    .eq('id', user.id)
                    .single();
                if (data) {
                    setUserXP(data.xp);
                    const currentLevel = getShieldLevel(data.xp);
                    setActiveTier(currentLevel.level);
                }
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
            const { data, total } = await leaderboardService.getLeaderboardByTier(activeTier, ITEMS_PER_PAGE, (currentPage - 1) * ITEMS_PER_PAGE);
            setLeaderboardData(data);
            setTotalUsers(total);

            if (user) {
                const rank = await leaderboardService.getUserRank(user.id, activeTier);
                setUserRank(rank);
            }
            setLoading(false);
        };

        if (!xpLoading) fetchLeaderboard();
    }, [activeTier, user, userXP, xpLoading, currentPage]);

    const getRankIcon = (index) => {
        const rank = (currentPage - 1) * ITEMS_PER_PAGE + index;
        if (rank === 0) return <Trophy size={26} color="#FFD700" fill="rgba(255, 215, 0, 0.2)" />;
        if (rank === 1) return <Trophy size={24} color="#E5E4E2" fill="rgba(229, 228, 226, 0.2)" />;
        if (rank === 2) return <Trophy size={22} color="#CD7F32" fill="rgba(205, 127, 50, 0.2)" />;
        return <span className={styles.rankNumber}>{rank + 1}</span>;
    };

    const isLocked = !xpLoading && userXP < 100;

    return (
        <div className={styles.container}>
            <main className={styles.mainContent}>
                {loading && !leaderboardData.length ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
                        <InlineLoader />
                    </div>
                ) : (
                    <>

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
                                        <h3>টীমের পরিচিতি</h3>
                                        <p>BeeLesson-এ ৪টি টীম আছে: সিলভার, গোল্ড, প্ল্যাটিনাম এবং ডায়মন্ড। প্রতি সপ্তাহে শীর্ষ লার্নাররা পরবর্তী টীমে উন্নীত হয়।</p>
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
                                    {TIERS.map((tier) => {
                                        const isTierLocked = tier.minXP > userXP;
                                        return (
                                            <button
                                                key={tier.id}
                                                className={`${styles.tab} ${activeTier === tier.id ? styles.activeTab : ''} ${isTierLocked ? styles.lockedTab : ''}`}
                                                onClick={() => {
                                                    if (!isTierLocked) {
                                                        setActiveTier(tier.id);
                                                        setCurrentPage(1);
                                                    }
                                                }}
                                                style={{ '--tier-color': tier.color }}
                                            >
                                                <div className={styles.tabShield}>
                                                    <ShieldIcon xp={tier.minXP} size={activeTier === tier.id ? 72 : 48} showTooltip={false} />
                                                </div>
                                                {isTierLocked && (
                                                    <div className={styles.lockOverlay}>
                                                        <Lock size={12} />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Progress Section */}
                                {(() => {
                                    const userLevel = getShieldLevel(userXP);
                                    const progress = getLevelProgress(userXP);
                                    const nextLevel = progress.nextLevel;
                                    const currentTierInfo = TIERS.find(t => t.id === userLevel.level);

                                    return (
                                        <div className={styles.progressSection}>
                                            <div className={styles.progressTitle}>
                                                <h1>{currentTierInfo?.nameBn || ''} টীম</h1>
                                                <p>
                                                    {nextLevel
                                                        ? (
                                                            <>
                                                                {TIERS.find(t => t.id === nextLevel.level)?.nameBn || 'Next'} লার্নার টীমে যোগ দিতে আপনার দরকার
                                                                <span className={styles.xpHighlight}> +{progress.remaining} XP</span>
                                                            </>
                                                        )
                                                        : 'আপনি ডায়মন্ড লার্নার টীমে পৌঁছে গেছেন!'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div className={styles.leaderboardCard}>
                                    {loading ? (
                                        <div className={styles.tableContainer}>
                                            <div className={styles.tableHeader}>
                                                <div className={styles.headerCol}>স্থান</div>
                                                <div className={styles.headerCol}>শিক্ষার্থী</div>
                                                <div className={styles.headerCol}>অগ্রগতি</div>
                                                <div className={styles.headerCol}>মোট এক্সপি (XP)</div>
                                            </div>
                                            <div className={styles.tableBody}>
                                                {[...Array(8)].map((_, i) => (
                                                    <div key={i} className={styles.row}>
                                                        <div className={styles.rankCol}>
                                                            <div className={`${styles.skeleton} ${styles.skeletonRank}`}></div>
                                                        </div>
                                                        <div className={styles.userCol}>
                                                            <div className={`${styles.skeleton} ${styles.skeletonAvatar}`}></div>
                                                            <div className={styles.userInfo}>
                                                                <div className={`${styles.skeleton} ${styles.skeletonName}`}></div>
                                                            </div>
                                                        </div>
                                                        <div className={styles.progressCol}>
                                                            <div className={`${styles.skeleton} ${styles.skeletonShield}`}></div>
                                                            <div className={`${styles.skeleton} ${styles.skeletonBar}`}></div>
                                                        </div>
                                                        <div className={styles.xpCol}>
                                                            <div className={`${styles.skeleton} ${styles.skeletonXP}`}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={styles.tableContainer}>
                                            <div className={styles.tableHeader}>
                                                <div className={styles.headerCol}>স্থান</div>
                                                <div className={styles.headerCol}>শিক্ষার্থী</div>
                                                <div className={styles.headerCol}>অগ্রগতি</div>
                                                <div className={styles.headerCol}>মোট এক্সপি (XP)</div>
                                            </div>

                                            <div className={styles.tableBody}>
                                                {leaderboardData.length === 0 ? (
                                                    <div className={styles.emptyState}>
                                                        <Award size={64} color="#37464f" />
                                                        <p>এই টীমে এখনো কোনো শিক্ষার্থী নেই। পড়াশোনা শুরু করুন এবং জায়গা করে নিন!</p>
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
                                                                </div>
                                                            </div>
                                                            <div className={styles.progressCol}>
                                                                <ShieldIcon xp={item.xp} size={24} showTooltip={false} />
                                                                <div className={styles.progressBarWrapper}>
                                                                    <div
                                                                        className={styles.progressBar}
                                                                        style={{ width: `${getLevelProgress(item.xp).percentage}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className={styles.xpCol}>
                                                                <span className={styles.xpValue}>{item.xp}</span>
                                                                <span className={styles.xpLabel}>XP</span>
                                                                {user?.id === item.id && (
                                                                    <button
                                                                        className={styles.shareIconBtn}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const actualRank = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                                                                            const text = `I'm ranked #${actualRank} in the ${activeTier} Team on O-sekha! Can you beat my ${item.xp} XP?`;
                                                                            if (navigator.share) {
                                                                                navigator.share({
                                                                                    title: 'O-sekha Leaderboard',
                                                                                    text: text,
                                                                                    url: window.location.href
                                                                                });
                                                                            } else {
                                                                                navigator.clipboard.writeText(`${text} ${window.location.href}`);
                                                                                alert('Rank details copied to clipboard!');
                                                                            }
                                                                        }}
                                                                        title="Share your rank"
                                                                    >
                                                                        <Share2 size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Fixed User Status Bar */}
                                {userRank && (
                                    <div className={styles.footerStatus}>
                                        <div className={styles.footerLeft}>
                                            <div className={styles.footerRank}>আপনার স্থান: {userRank}</div>
                                        </div>
                                        {!loading && totalUsers > ITEMS_PER_PAGE && (
                                            <div className={styles.paginationControls}>
                                                <button
                                                    className={styles.pageBtn}
                                                    disabled={currentPage === 1}
                                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                >
                                                    <ChevronLeft size={20} />
                                                </button>
                                                <span className={styles.pageInfo}>পেজ {currentPage} / {Math.ceil(totalUsers / ITEMS_PER_PAGE) || 1}</span>
                                                <button
                                                    className={styles.pageBtn}
                                                    disabled={currentPage >= Math.ceil(totalUsers / ITEMS_PER_PAGE)}
                                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                                >
                                                    <ChevronRight size={20} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default LeaderboardPage;
