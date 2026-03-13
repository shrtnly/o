import React, { useState, useEffect } from 'react';
import {
    Trophy, Medal, ChevronLeft, ChevronRight,
    Lock, Zap, TrendingUp, Share2,
} from 'lucide-react';
import PollenIcon from '../../components/PollenIcon';
import InlineLoader from '../../components/ui/InlineLoader';
import { useNavigate } from 'react-router-dom';
import { leaderboardService } from '../../services/leaderboardService';
import { useAuth } from '../../context/AuthContext';
import ShieldIcon from '../../components/ShieldIcon';
import { supabase } from '../../lib/supabaseClient';
import styles from './LeaderboardPage.module.css';

import { getShieldLevel, getLevelProgress, SHIELD_LEVELS } from '../../utils/shieldSystem';

const TIERS = [
    { id: 'SILVER',   name: 'Bee Kid',      nameBn: 'Bee Kid',      color: '#CD7F32', minXP: SHIELD_LEVELS.SILVER.minXP   },
    { id: 'GOLD',     name: 'Bee Warrior',  nameBn: 'Bee Warrior',  color: '#C0C0C0', minXP: SHIELD_LEVELS.GOLD.minXP     },
    { id: 'PLATINUM', name: 'Bee Master',   nameBn: 'Bee Master',   color: '#FFD700', minXP: SHIELD_LEVELS.PLATINUM.minXP },
    { id: 'DIAMOND',  name: 'Bee Legendary',nameBn: 'Bee Legendary',color: '#B9F2FF', minXP: SHIELD_LEVELS.DIAMOND.minXP  },
];

const ITEMS_PER_PAGE = 20;
const UNLOCK_XP = 100;

const LeaderboardPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [activeTier,      setActiveTier]      = useState('SILVER');
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [loading,         setLoading]         = useState(true);
    const [userRank,        setUserRank]        = useState(null);
    const [userXP,          setUserXP]          = useState(0);
    const [xpLoading,       setXpLoading]       = useState(true);
    const [currentPage,     setCurrentPage]     = useState(1);
    const [totalUsers,      setTotalUsers]      = useState(0);

    /* ---------- fetch user XP ---------- */
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

    /* ---------- fetch leaderboard ---------- */
    useEffect(() => {
        const fetchLeaderboard = async () => {
            if (userXP < UNLOCK_XP && !xpLoading) {
                setLoading(false);
                return;
            }
            setLoading(true);
            const { data, total } = await leaderboardService.getLeaderboardByTier(
                activeTier,
                ITEMS_PER_PAGE,
                (currentPage - 1) * ITEMS_PER_PAGE,
            );
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

    /* ---------- helpers ---------- */
    const getRankIcon = (index) => {
        const rank = (currentPage - 1) * ITEMS_PER_PAGE + index;
        if (rank === 0) return (
            <div className={styles.medalWrapper}>
                <Medal size={28} color="#F1C40F" fill="rgba(241,196,15,0.15)" strokeWidth={2} />
            </div>
        );
        if (rank === 1) return (
            <div className={styles.medalWrapper}>
                <Medal size={24} color="#9ca3af" fill="rgba(156,163,175,0.15)" strokeWidth={2} />
            </div>
        );
        if (rank === 2) return (
            <div className={styles.medalWrapper}>
                <Medal size={20} color="#b87333" fill="rgba(184,115,51,0.15)" strokeWidth={2} />
            </div>
        );
        return <span className={styles.rankNumber}>{rank + 1}</span>;
    };

    const isLocked = !xpLoading && userXP < UNLOCK_XP;
    const xpPct    = Math.min(100, Math.round((userXP / UNLOCK_XP) * 100));

    /* ================================================
       RENDER
       ================================================ */
    return (
        <div className={styles.container}>
            <main className={styles.mainContent}>

                {/* Global loading */}
                {loading && !leaderboardData.length && !isLocked ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                        <InlineLoader />
                    </div>
                ) : (
                    <>


                        {/* ============================
                              LOCKED STATE
                            ============================ */}
                        {isLocked ? (
                            <div className={styles.introContainer}>

                                {/* Lock banner with XP progress */}
                                <div className={styles.lockBanner}>
                                    <div className={styles.lockIconCircle}>
                                        <Lock size={22} />
                                    </div>
                                    <div className={styles.lockBannerText}>
                                        <h2>লিডারবোর্ড আনলক করুন</h2>
                                        <p>প্রতিযোগিতায় অংশ নিতে আরও <strong>{UNLOCK_XP - userXP} XP</strong> অর্জন করুন।</p>
                                        <div className={styles.xpProgressLabel}>
                                            <span>{userXP} XP অর্জিত</span>
                                            <span>{UNLOCK_XP} XP</span>
                                        </div>
                                        <div className={styles.xpProgressTrack}>
                                            <div
                                                className={styles.xpProgressFill}
                                                style={{ width: `${xpPct}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Info cards */}
                                <div className={styles.introGrid}>
                                    <div className={styles.introCard}>
                                        <div
                                            className={styles.introIconBox}
                                            style={{ background: 'rgba(241,196,15,0.1)', color: '#F1C40F' }}
                                        >
                                            <Zap size={20} />
                                        </div>
                                        <h3>XP কীভাবে অর্জন করবেন?</h3>
                                        <p>প্রতিটি অধ্যায় বা কুইজ সম্পন্ন করলে XP পাবেন। নির্ভুল উত্তর দিলে বেশি XP।</p>
                                    </div>

                                    <div className={styles.introCard}>
                                        <div
                                            className={styles.introIconBox}
                                            style={{ background: 'rgba(241,196,15,0.1)', color: '#F1C40F' }}
                                        >
                                            <Trophy size={20} />
                                        </div>
                                        <h3>বী-র র‍্যাঙ্ক</h3>
                                        <p>Bee Kid → Warrior → Master → Legendary। প্রতি সপ্তাহে শীর্ষরা পরবর্তী লিগে ওঠে।</p>
                                    </div>

                                    <div className={styles.introCard}>
                                        <div
                                            className={styles.introIconBox}
                                            style={{ background: 'rgba(241,196,15,0.1)', color: '#F1C40F' }}
                                        >
                                            <TrendingUp size={20} />
                                        </div>
                                        <h3>প্রতিযোগিতা শুরু করুন</h3>
                                        <p>বন্ধুদের সাথে প্রতিযোগিতা করুন এবং দেশের সেরা শিক্ষার্থীদের তালিকায় নাম তুলুন।</p>
                                    </div>
                                </div>

                                {/* CTA */}
                                <div className={styles.actionSection}>
                                    <button
                                        className={styles.startLearningBtn}
                                        onClick={() => navigate('/learning')}
                                    >
                                        শেখা শুরু করুন
                                    </button>
                                </div>
                            </div>

                        ) : (
                            /* ============================
                                 UNLOCKED STATE
                               ============================ */
                            <>
                                {/* Tier tabs */}
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
                                                    <ShieldIcon
                                                        xp={tier.minXP}
                                                        size={activeTier === tier.id ? 68 : 30}
                                                        showTooltip={false}
                                                    />
                                                </div>
                                                {isTierLocked && (
                                                    <div className={styles.lockOverlay}>
                                                        <Lock size={11} />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Progress label */}
                                {(() => {
                                    const userLevel      = getShieldLevel(userXP);
                                    const progress       = getLevelProgress(userXP);
                                    const nextLevel      = progress.nextLevel;
                                    const currentTierInfo = TIERS.find(t => t.id === userLevel.level);
                                    return (
                                        <div className={styles.progressSection}>
                                            <div className={styles.progressTitle}>
                                                <h1>{currentTierInfo?.nameBn || ''}</h1>
                                                <p>
                                                    {nextLevel
                                                        ? <>
                                                            {TIERS.find(t => t.id === nextLevel.level)?.nameBn || 'Next'} লিগে যোগ দিতে আরও{' '}
                                                            <span className={styles.xpHighlight}>+{progress.remaining} XP</span>
                                                          </>
                                                        : 'আপনি Bee Legendary-তে পৌঁছে গেছেন! 🎉'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Leaderboard table */}
                                <div className={styles.leaderboardCard}>
                                    {loading ? (
                                        /* Skeleton */
                                        <div className={styles.tableContainer}>
                                            <div className={styles.tableHeader}>
                                                <div className={styles.headerCol}>#</div>
                                                <div className={styles.headerCol}>শিক্ষার্থী</div>
                                                <div className={styles.headerCol}>অগ্রগতি</div>
                                                <div className={styles.headerCol}>XP</div>
                                            </div>
                                            <div className={styles.tableBody}>
                                                {[...Array(8)].map((_, i) => (
                                                    <div key={i} className={styles.row}>
                                                        <div className={styles.rankCol}>
                                                            <div className={`${styles.skeleton} ${styles.skeletonRank}`} />
                                                        </div>
                                                        <div className={styles.userCol}>
                                                            <div className={`${styles.skeleton} ${styles.skeletonAvatar}`} />
                                                            <div className={styles.userInfo}>
                                                                <div className={`${styles.skeleton} ${styles.skeletonName}`} />
                                                            </div>
                                                        </div>
                                                        <div className={styles.progressCol}>
                                                            <div className={`${styles.skeleton} ${styles.skeletonShield}`} />
                                                            <div className={`${styles.skeleton} ${styles.skeletonBar}`} />
                                                        </div>
                                                        <div className={styles.xpCol}>
                                                            <div className={`${styles.skeleton} ${styles.skeletonXP}`} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Real data */
                                        <div className={styles.tableContainer}>
                                            <div className={styles.tableHeader}>
                                                <div className={styles.headerCol}>#</div>
                                                <div className={styles.headerCol}>শিক্ষার্থী</div>
                                                <div className={styles.headerCol}>অগ্রগতি</div>
                                                <div className={styles.headerCol}>XP</div>
                                            </div>
                                            <div className={styles.tableBody}>
                                                {leaderboardData.length === 0 ? (
                                                    <div className={styles.emptyState}>
                                                        <Trophy size={48} color="#1e2c33" />
                                                        <p>এই বী-তে এখনো কোনো শিক্ষার্থী নেই। পড়াশোনা শুরু করুন এবং জায়গা করে নিন!</p>
                                                    </div>
                                                ) : (
                                                    leaderboardData.map((item, index) => (
                                                        <div
                                                            key={item.id}
                                                            className={`${styles.row} ${user?.id === item.id ? styles.currentUserRow : ''}`}
                                                        >
                                                            {/* Rank */}
                                                            <div className={styles.rankCol}>
                                                                {getRankIcon(index)}
                                                            </div>

                                                            {/* User */}
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

                                                            {/* Progress bar */}
                                                            <div className={styles.progressCol}>
                                                                <ShieldIcon xp={item.xp} size={22} showTooltip={false} />
                                                                <div className={styles.progressBarWrapper}>
                                                                    <div
                                                                        className={styles.progressBar}
                                                                        style={{ width: `${getLevelProgress(item.xp).percentage}%` }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* XP */}
                                                            <div className={styles.xpCol}>
                                                                <div className={styles.xpScoreWrapper}>
                                                                    <div className={styles.pollenLabel}>
                                                                        <PollenIcon size={13} />
                                                                        <span>{item.xp}</span>
                                                                    </div>
                                                                </div>
                                                                {user?.id === item.id && (
                                                                    <button
                                                                        className={styles.shareIconBtn}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const actualRank = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                                                                            const text = `I'm ranked #${actualRank} in the ${activeTier} Bee on O-sekha! Can you beat my ${item.xp} XP?`;
                                                                            if (navigator.share) {
                                                                                navigator.share({ title: 'O-sekha Leaderboard', text, url: window.location.href });
                                                                            } else {
                                                                                navigator.clipboard.writeText(`${text} ${window.location.href}`);
                                                                            }
                                                                        }}
                                                                        title="Share your rank"
                                                                    >
                                                                        <Share2 size={14} />
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

                                {/* Footer: rank + pagination */}
                                {userRank && (
                                    <div className={styles.footerStatus}>
                                        <div className={styles.footerRank}>
                                            আপনার স্থান: <strong>#{userRank}</strong>
                                        </div>
                                        {!loading && totalUsers > ITEMS_PER_PAGE && (
                                            <div className={styles.paginationControls}>
                                                <button
                                                    className={styles.pageBtn}
                                                    disabled={currentPage === 1}
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                >
                                                    <ChevronLeft size={18} />
                                                </button>
                                                <span className={styles.pageInfo}>
                                                    {currentPage} / {Math.ceil(totalUsers / ITEMS_PER_PAGE) || 1}
                                                </span>
                                                <button
                                                    className={styles.pageBtn}
                                                    disabled={currentPage >= Math.ceil(totalUsers / ITEMS_PER_PAGE)}
                                                    onClick={() => setCurrentPage(p => p + 1)}
                                                >
                                                    <ChevronRight size={18} />
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
