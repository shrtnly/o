import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabaseClient';
import { connectionService } from '../../services/connectionService';
import { rewardService } from '../../services/rewardService';
import { leaderboardService } from '../../services/leaderboardService';
import { getShieldLevel } from '../../utils/shieldSystem';
import ShieldIcon from '../../components/ShieldIcon';
import { motion } from 'framer-motion';
import {
    ArrowLeft, UserPlus, MessageSquare, Check, MapPin,
    Flame, Trophy, BookOpen, Zap, Clock, UserCheck, UserX,
    Hourglass
} from 'lucide-react';
import styles from './LearnerProfilePage.module.css';



const LearnerProfilePage = () => {
    const { learnerId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { language } = useLanguage();

    const [learner, setLearner]           = useState(null);
    const [stats, setStats]               = useState(null);
    const [streak, setStreak]             = useState(null);
    const [rank, setRank]                 = useState(null);
    const [certs, setCerts]               = useState(0);
    const [loading, setLoading]           = useState(true);
    const [connStatus, setConnStatus]     = useState('none'); // 'none' | 'pending' | 'accepted' | 'outgoing'
    const [connId, setConnId]             = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [imgError, setImgError]         = useState(false);

    // Redirect self-view to own profile
    useEffect(() => {
        if (user && learnerId === user.id) {
            navigate('/profile', { replace: true });
        }
    }, [user, learnerId, navigate]);

    const fetchLearner = useCallback(async () => {
        if (!learnerId) return;
        setLoading(true);
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', learnerId)
                .single();
            if (error || !profile) { navigate(-1); return; }
            setLearner(profile);
            setImgError(false);

            // Fetch stats, streaks, rank, and certs
            const [statsData, streakData, certsData] = await Promise.all([
                rewardService.getUserStats(learnerId),
                rewardService.getUserStreak(learnerId),
                supabase.from('certificates').select('id', { count: 'exact', head: true }).eq('user_id', learnerId)
            ]);
            setStats(statsData);
            setStreak(streakData);
            setCerts(certsData.count || 0);

            // Rank (only if enough XP)
            if (profile.xp >= 100) {
                try {
                    const { data: rankRow } = await supabase
                        .from('leaderboard_view')
                        .select('tier')
                        .eq('id', learnerId)
                        .maybeSingle();
                    if (rankRow) {
                        const r = await leaderboardService.getUserRank(learnerId, rankRow.tier);
                        setRank(r);
                    }
                } catch { /* ignore rank errors */ }
            }
        } catch (err) {
            console.error('LearnerProfile fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [learnerId, navigate]);

    const fetchConnection = useCallback(async () => {
        if (!user || !learnerId) return;
        try {
            const { data } = await supabase
                .from('learner_connections')
                .select('*')
                .or(
                    `and(sender_id.eq.${user.id},receiver_id.eq.${learnerId}),and(sender_id.eq.${learnerId},receiver_id.eq.${user.id})`
                )
                .maybeSingle();

            if (!data) { setConnStatus('none'); setConnId(null); return; }
            setConnId(data.id);
            if (data.status === 'accepted') {
                setConnStatus('accepted');
            } else if (data.status === 'pending') {
                setConnStatus(data.sender_id === user.id ? 'outgoing' : 'pending');
            }
        } catch (err) {
            console.error('Connection fetch error:', err);
        }
    }, [user, learnerId]);

    useEffect(() => { fetchLearner(); }, [fetchLearner]);
    useEffect(() => { fetchConnection(); }, [fetchConnection]);

    const handleConnect = async () => {
        if (!user) { navigate('/auth'); return; }
        setActionLoading(true);
        try {
            if (connStatus === 'none') {
                await connectionService.sendRequest(user.id, learnerId);
                setConnStatus('outgoing');
            } else if (connStatus === 'pending') {
                await connectionService.respondToRequest(connId, 'accepted', learnerId, user.id);
                setConnStatus('accepted');
            } else if (connStatus === 'outgoing') {
                await connectionService.removeConnection(connId);
                setConnStatus('none');
                setConnId(null);
            }
        } catch (err) {
            console.error('Connection action error:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleMessage = () => {
        navigate('/connections?chat=' + learnerId);
    };

    const avatarSrc = learner?.avatar_url && !imgError
        ? learner.avatar_url
        : `https://api.dicebear.com/9.x/avataaars/svg?seed=${learnerId}&top=longButNotTooLong,bob,hijab,curvy,straight01,straight02,turban,miaWallace,frida,shortRound,fro,sides,shortCurly&mouth=smile`;

    const shieldInfo = getShieldLevel(learner?.xp || 0);

    const isOnline = learner?.last_seen &&
        (new Date() - new Date(learner.last_seen)) < 5 * 60 * 1000;



    const connectLabel = () => {
        if (actionLoading) return language === 'bn' ? 'লোড...' : 'Loading...';
        switch (connStatus) {
            case 'accepted':  return language === 'bn' ? 'সংযুক্ত' : 'Connected';
            case 'outgoing':  return language === 'bn' ? 'অনুরোধ পাঠানো' : 'Requested';
            case 'pending':   return language === 'bn' ? 'গ্রহণ করুন' : 'Accept';
            default:          return language === 'bn' ? 'সংযুক্ত হন' : 'Connect';
        }
    };

    const ConnectIcon = () => {
        if (connStatus === 'accepted') return <UserCheck size={16} />;
        if (connStatus === 'outgoing') return <Hourglass size={16} />;
        if (connStatus === 'pending')  return <Check size={16} />;
        return <UserPlus size={16} />;
    };

    /* ─────────── SKELETON ─────────── */
    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.backRow}>
                        <div className={`${styles.skeletonBlock}`} style={{ width: 80, height: 32, borderRadius: 8 }} />
                    </div>
                    <div className={styles.skeletonHeader}>
                        <div className={`${styles.skeletonCircle}`} style={{ width: 84, height: 84 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                            <div className={styles.skeletonBlock} style={{ width: '60%', height: 20 }} />
                            <div className={styles.skeletonBlock} style={{ width: '40%', height: 14 }} />
                            <div className={styles.skeletonBlock} style={{ width: '30%', height: 14 }} />
                        </div>
                    </div>
                    <div className={styles.skeletonActions}>
                        <div className={styles.skeletonBlock} style={{ flex: 1, height: 44 }} />
                        <div className={styles.skeletonBlock} style={{ flex: 1, height: 44 }} />
                    </div>
                    <div className={styles.skeletonStats}>
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className={styles.skeletonBlock} style={{ flex: 1, height: 72, borderRadius: 14 }} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!learner) return null;

    return (
        <div className={styles.page}>
            <div className={styles.container}>

                {/* ── Back Button ── */}
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} />
                    <span>{language === 'bn' ? 'ফিরে যান' : 'Back'}</span>
                </button>

                {/* ── Header Card ── */}
                <motion.div
                    className={styles.headerCard}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                    {/* Avatar + Online indicator */}
                    <div className={styles.avatarWrap}>
                        <img
                            src={avatarSrc}
                            alt={learner.display_name || 'Learner'}
                            className={styles.avatar}
                            onError={() => setImgError(true)}
                        />
                        <span className={`${styles.onlineDot} ${isOnline ? styles.online : styles.offline}`} />
                    </div>

                    {/* Name / info */}
                    <div className={styles.headerInfo}>
                        <h1 className={styles.learnerName}>
                            {learner.full_name || learner.display_name || (language === 'bn' ? 'শিক্ষার্থী' : 'Learner')}
                        </h1>
                        <div className={styles.rankChip}>
                            <ShieldIcon xp={learner.xp || 0} size={16} showTooltip={false} />
                            <span>{shieldInfo.name} Learner</span>
                        </div>
                        {learner.location && (
                            <div className={styles.locationLine}>
                                <MapPin size={13} />
                                <span>{learner.location}</span>
                            </div>
                        )}

                    </div>
                </motion.div>

                {/* ── Action buttons ── */}
                <motion.div
                    className={styles.actions}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.08, ease: 'easeOut' }}
                >
                    <button
                        className={`${styles.actionBtn} ${styles.connectBtn} ${connStatus === 'accepted' ? styles.connectedBtn : ''} ${connStatus === 'outgoing' ? styles.outgoingBtn : ''}`}
                        onClick={handleConnect}
                        disabled={actionLoading}
                    >
                        <ConnectIcon />
                        <span>{connectLabel()}</span>
                    </button>

                    <button
                        className={`${styles.actionBtn} ${styles.msgBtn}`}
                        onClick={handleMessage}
                    >
                        <MessageSquare size={16} />
                        <span>{language === 'bn' ? 'বার্তা' : 'Message'}</span>
                    </button>
                </motion.div>



                {/* ── Status Horizontal Row ── */}
                <motion.section
                    className={styles.section}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.15, ease: 'easeOut' }}
                >
                    <h2 className={styles.sectionTitle}>
                        {language === 'bn' ? 'অবস্থা' : 'Status'}
                    </h2>
                    
                    <div className={styles.statsRow}>
                        <div className={styles.statBox}>
                            <Flame size={20} className={styles.statIconStreak} />
                            <span className={styles.statVal}>{streak?.longest_streak || 0}</span>
                            <span className={styles.statLbl}>{language === 'bn' ? 'সর্বোচ্চ স্ট্রিক' : 'Best Streak'}</span>
                        </div>
                        
                        <div className={styles.statDivider} />
                        
                        <div className={styles.statBox}>
                            <Zap size={20} className={styles.statIconXp} />
                            <span className={styles.statVal}>{learner.xp || 0}</span>
                            <span className={styles.statLbl}>{language === 'bn' ? 'মধু (XP)' : 'XP'}</span>
                        </div>

                        <div className={styles.statDivider} />

                        <div className={styles.statBox}>
                            <Trophy size={20} className={styles.statIconRank} />
                            <span className={styles.statVal}>{rank ? `#${rank}` : '0'}</span>
                            <span className={styles.statLbl}>{language === 'bn' ? 'র‍্যাংক' : 'Rank'}</span>
                        </div>

                        <div className={styles.statDivider} />

                        <div className={styles.statBox}>
                            <BookOpen size={20} className={styles.statIconCourse} />
                            <span className={styles.statVal}>{certs}</span>
                            <span className={styles.statLbl}>{language === 'bn' ? 'সার্টিফিকেট' : 'Certificates'}</span>
                        </div>
                    </div>
                </motion.section>

                {/* ── Personal Information ── */}
                <motion.section
                    className={styles.section}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.22, ease: 'easeOut' }}
                >
                    <h2 className={styles.sectionTitle}>
                        {language === 'bn' ? 'সাধারণ তথ্য' : 'General Information'}
                    </h2>
                    <div className={styles.detailsList}>
                        <div className={styles.detailRow}>
                            <span className={styles.detailKey}>{language === 'bn' ? 'ইমেইল' : 'Email'}</span>
                            <span className={styles.detailVal}>{learner.email || '—'}</span>
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailKey}>{language === 'bn' ? 'শিক্ষা' : 'Education'}</span>
                            <span className={styles.detailVal}>{learner.education_level || '—'}</span>
                        </div>

                        <div className={styles.detailRow}>
                            <span className={styles.detailKey}>{language === 'bn' ? 'যোগ দিয়েছেন' : 'Joined'}</span>
                            <span className={styles.detailVal}>
                                {new Date(learner.created_at).toLocaleDateString(
                                    language === 'bn' ? 'bn-BD' : 'en-US',
                                    { year: 'numeric', month: 'long' }
                                )}
                            </span>
                        </div>
                    </div>
                </motion.section>

                {/* ── About / Bio ── */}
                {learner.bio && (
                    <motion.section
                        className={styles.section}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.28, ease: 'easeOut' }}
                    >
                        <h2 className={styles.sectionTitle}>
                            {language === 'bn' ? 'পরিচয়' : 'About'}
                        </h2>
                        <p className={styles.bioText}>{learner.bio}</p>
                    </motion.section>
                )}

                <div style={{ height: 40 }} />
            </div>
        </div>
    );
};

export default LearnerProfilePage;
