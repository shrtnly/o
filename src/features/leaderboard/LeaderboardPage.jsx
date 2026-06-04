import React, { useState, useEffect } from 'react';
import {
    Trophy, Medal, ChevronLeft, ChevronRight,
    Lock, Zap, TrendingUp, Share2
} from 'lucide-react';
import Skeleton from '../../components/ui/Skeleton';
import { useNavigate } from 'react-router-dom';
import { leaderboardService } from '../../services/leaderboardService';
import { useAuth } from '../../context/AuthContext';
import ShieldIcon from '../../components/ShieldIcon';
import { supabase } from '../../lib/supabaseClient';
import styles from './LeaderboardPage.module.css';
import { useLanguage } from '../../context/LanguageContext';

import { getShieldLevel, getLevelProgress, SHIELD_LEVELS } from '../../utils/shieldSystem';

const TIERS = [
    { id: 'SILVER',   name: 'Bee Kid',      color: '#8B7355', minXP: SHIELD_LEVELS.SILVER.minXP   },
    { id: 'GOLD',     name: 'Bee Warrior',  color: '#FFD700', minXP: SHIELD_LEVELS.GOLD.minXP     },
    { id: 'PLATINUM', name: 'Bee Master',   color: '#5B7C99', minXP: SHIELD_LEVELS.PLATINUM.minXP },
    { id: 'DIAMOND',  name: 'Bee Legendary',color: '#B9F2FF', minXP: SHIELD_LEVELS.DIAMOND.minXP  },
];

const ITEMS_PER_PAGE = 20;
const UNLOCK_XP = 100;

const LeaderboardPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t, language } = useLanguage();

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
        let isMounted = true;
        const fetchUserData = async () => {
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('xp')
                    .eq('id', user.id)
                    .single();
                if (data && isMounted) {
                    setUserXP(data.xp);
                    const currentLevel = getShieldLevel(data.xp);
                    setActiveTier(currentLevel.level);
                }
            }
            if (isMounted) setXpLoading(false);
        };
        fetchUserData();
        return () => { isMounted = false; };
    }, [user?.id]); // user?.id prevents re-fetch on token refresh

    /* ---------- fetch leaderboard ---------- */
    useEffect(() => {
        let isMounted = true;
        const fetchLeaderboard = async () => {
            if (userXP < UNLOCK_XP && !xpLoading) {
                if (isMounted) setLoading(false);
                return;
            }
            if (isMounted) setLoading(true);

            const result = await leaderboardService.getLeaderboardByTier(
                activeTier,
                ITEMS_PER_PAGE,
                (currentPage - 1) * ITEMS_PER_PAGE
            ).catch(() => ({ data: [], total: 0 }));

            if (!isMounted) return;
            setLeaderboardData(result.data);
            setTotalUsers(result.total);

            if (user) {
                const rank = await leaderboardService.getUserRank(user.id, activeTier).catch(() => null);
                if (isMounted) setUserRank(rank);
            }
            if (isMounted) setLoading(false);
        };
        if (!xpLoading) fetchLeaderboard();
        return () => { isMounted = false; };
    }, [activeTier, user?.id, userXP, xpLoading, currentPage]);

    /* ---------- helpers ---------- */
    const getRankIcon = (index) => {
        const rank = (currentPage - 1) * ITEMS_PER_PAGE + index;
        if (rank === 0) return (
            <div className={styles.medalWrapper}>
                <Medal size={28} color="var(--color-primary)" fill="var(--color-primary-light)" strokeWidth={2} />
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
                    <div style={{ padding: '0 24px' }}>
                        <div className={styles.progressSection}>
                            <Skeleton width="180px" height="32px" borderRadius="8px" />
                            <Skeleton width="240px" height="16px" borderRadius="4px" />
                        </div>
                        <div className={styles.leaderboardCard}>
                            <div className={styles.tableHeader}>
                                <div className={styles.headerCol}><Skeleton width="30px" height="12px" /></div>
                                <div className={styles.headerCol}><Skeleton width="80px" height="12px" /></div>
                                <div className={styles.headerCol}><Skeleton width="60px" height="12px" /></div>
                                <div className={styles.headerCol}><Skeleton width="40px" height="12px" /></div>
                            </div>
                            <div className={styles.tableBody}>
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className={styles.row}>
                                        <div className={styles.rankCol}><Skeleton width="22px" height="22px" borderRadius="50%" /></div>
                                        <div className={styles.userCol}>
                                            <Skeleton width="36px" height="36px" borderRadius="50%" />
                                            <Skeleton width="100px" height="14px" />
                                        </div>
                                        <div className={styles.progressCol}><Skeleton width="100%" height="4px" /></div>
                                        <div className={styles.xpCol}><Skeleton width="50px" height="14px" /></div>
                                    </div>
                                ))}
                            </div>
                        </div>
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
                                        <h2>{t('unlock_leaderboard')}</h2>
                                        <p>
                                            {t('reach_xp_to_unlock').split('{xp}')[0]}
                                            <strong>{UNLOCK_XP - userXP} {t('pollen')}</strong>
                                            {t('reach_xp_to_unlock').split('{xp}')[1]}
                                        </p>
                                        <div className={styles.xpProgressLabel}>
                                            <span>{t('xp_earned_so_far').replace('{xp}', userXP)}</span>
                                            <span>{t('target_xp').replace('{xp}', UNLOCK_XP)}</span>
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
                                        <div className={styles.introIconBox}>
                                            <Zap size={20} />
                                        </div>
                                        <h3>{t('how_to_earn_xp')}</h3>
                                        <p>{t('earn_xp_desc')}</p>
                                    </div>

                                    <div className={styles.introCard}>
                                        <div className={styles.introIconBox}>
                                            <Trophy size={20} />
                                        </div>
                                        <h3>{t('bee_ranks')}</h3>
                                        <p>{t('bee_ranks_desc')}</p>
                                    </div>

                                    <div className={styles.introCard}>
                                        <div className={styles.introIconBox}>
                                            <TrendingUp size={20} />
                                        </div>
                                        <h3>{t('start_competition')}</h3>
                                        <p>{t('start_competition_desc')}</p>
                                    </div>
                                </div>

                                {/* CTA */}
                                <div className={styles.actionSection}>
                                    <button
                                        className={styles.startLearningBtn}
                                        onClick={() => navigate('/learning')}
                                    >
                                        {t('start_learning_btn')}
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
                                                <h1>{currentTierInfo?.name || ''} Learner</h1>
                                                <p>
                                                    {nextLevel
                                                        ? <>
                                                            {t('complete_xp_to_join').split('{xp}')[0].replace('{tier}', TIERS.find(t => t.id === nextLevel.level)?.name || 'Next')}
                                                            <span className={styles.xpHighlight}>{progress.remaining}</span>
                                                            {t('complete_xp_to_join').split('{xp}')[1].replace('{tier}', TIERS.find(t => t.id === nextLevel.level)?.name || 'Next')}
                                                          </>
                                                        : t('reached_legendary')}
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
                                                <div className={styles.headerCol}>{t('leaderboard_table_rank')}</div>
                                                <div className={styles.headerCol}>{t('leaderboard_table_learner')}</div>
                                                <div className={styles.headerCol}>{t('leaderboard_table_progress')}</div>
                                                <div className={styles.headerCol}>{t('leaderboard_table_pollen')}</div>
                                            </div>
                                            <div className={styles.tableBody}>
                                                {[...Array(8)].map((_, i) => (
                                                    <div key={i} className={styles.row}>
                                                        <div className={styles.rankCol}>
                                                            <Skeleton width="22px" height="22px" borderRadius="50%" />
                                                        </div>
                                                        <div className={styles.userCol}>
                                                            <Skeleton width="36px" height="36px" borderRadius="50%" />
                                                            <div className={styles.userInfo}>
                                                                <Skeleton width="110px" height="14px" borderRadius="6px" />
                                                            </div>
                                                        </div>
                                                        <div className={styles.progressCol}>
                                                            <Skeleton width="22px" height="22px" borderRadius="4px" />
                                                            <Skeleton width="100%" height="4px" borderRadius="10px" />
                                                        </div>
                                                        <div className={styles.xpCol}>
                                                            <Skeleton width="52px" height="16px" borderRadius="6px" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Real data */
                                        <div className={styles.tableContainer}>
                                            <div className={styles.tableHeader}>
                                                <div className={styles.headerCol}>{t('leaderboard_table_rank')}</div>
                                                <div className={styles.headerCol}>{t('leaderboard_table_learner')}</div>
                                                <div className={styles.headerCol}>{t('leaderboard_table_progress')}</div>
                                                <div className={styles.headerCol}>{t('leaderboard_table_pollen')}</div>
                                            </div>
                                            <div className={styles.tableBody}>
                                                {leaderboardData.length === 0 ? (
                                                    <div className={styles.emptyState}>
                                                        <Trophy size={48} className={styles.emptyStateIcon} />
                                                        <p>{t('empty_tier')}</p>
                                                    </div>
                                                ) : (
                                                    leaderboardData.map((item, index) => (
                                                        <div
                                                            key={item.id}
                                                            className={`${styles.row} ${user?.id === item.id ? styles.currentUserRow : ''}`}
                                                            onClick={() => user?.id !== item.id && navigate(`/learner/${item.id}`)}
                                                            style={{ cursor: user?.id !== item.id ? 'pointer' : 'default' }}
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
                                                                        <img 
                                                                            src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${item.id}&top=bob,curly,hijab,turban,bigHair,bun,dreads,shortCurly,longButNotTooLong,miaWallace,straight01,straight02,curvy&mouth=smile`} 
                                                                            className={styles.avatar} 
                                                                            alt={item.display_name} 
                                                                        />
                                                                    )}
                                                                </div>
                                                                <div className={styles.userInfo}>
                                                                    <div className={styles.nameAndShare}>
                                                                        <span className={styles.userName}>{item.display_name}</span>
                                                                        {user?.id === item.id && (
                                                                            <button
                                                                                className={styles.shareIconBtn}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const actualRank = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                                                                                    const tierName = TIERS.find(t => t.id === activeTier)?.name || activeTier;
                                                                                    const shareText = t('leaderboard_share_msg')
                                                                                        .replace('{rank}', actualRank)
                                                                                        .replace('{tier}', tierName)
                                                                                        .replace('{xp}', item.xp);
                                                                                        
                                                                                    if (navigator.share) {
                                                                                        navigator.share({ title: 'BeeLesson Leaderboard', text: shareText, url: window.location.href });
                                                                                    } else {
                                                                                        navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
                                                                                    }
                                                                                }}
                                                                                title={t('share_rank_tooltip')}
                                                                            >
                                                                                <Share2 size={12} />
                                                                            </button>
                                                                        )}
                                                                    </div>
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
                                                                        <div className={styles.mobileShield}>
                                                                            <ShieldIcon xp={item.xp} size={18} showTooltip={false} />
                                                                        </div>
                                                                        <span>{item.xp}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer: rank + pagination */}
                                <div className={styles.footerStatus}>
                                    {!loading && userRank && leaderboardData.length > 0 && (
                                        <button
                                            className={styles.userRankStatus}
                                            onClick={() => {
                                                const targetPage = Math.ceil(userRank / ITEMS_PER_PAGE);
                                                setCurrentPage(targetPage);
                                                // scroll to user row after render
                                                setTimeout(() => {
                                                    const el = document.querySelector(`.${styles.currentUserRow}`);
                                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }, 150);
                                            }}
                                            title={language === 'bn' ? 'আপনার অবস্থান দেখুন' : 'Jump to your rank'}
                                        >
                                            <TrendingUp size={16} />
                                            <span>{t('your_rank')}: <strong>#{userRank}</strong></span>
                                        </button>
                                    )}

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
                            </>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default LeaderboardPage;
