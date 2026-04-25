import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabaseClient';
import { connectionService } from '../../services/connectionService';
import { rewardService } from '../../services/rewardService';
import { leaderboardService } from '../../services/leaderboardService';
import { getShieldLevel } from '../../utils/shieldSystem';
import { motion } from 'framer-motion';
import {
    ArrowLeft, UserPlus, MessageSquare, Check,
    Flame, Trophy, BookOpen, Zap, UserCheck,
    Hourglass, User, UserMinus, Ban, Link, CheckCheck, MoreVertical, Shield, Swords
} from 'lucide-react';
import { toast } from 'sonner';
import styles from './LearnerProfilePage.module.css';

const LearnerProfilePage = () => {
    const { learnerId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { language } = useLanguage();

    const [learner, setLearner]             = useState(null);
    const [stats, setStats]                 = useState(null);
    const [streak, setStreak]               = useState(null);
    const [rank, setRank]                   = useState(null);
    const [certs, setCerts]                 = useState(0);
    const [loading, setLoading]             = useState(true);
    const [connStatus, setConnStatus]       = useState('none');
    const [connId, setConnId]               = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [imgError, setImgError]           = useState(false);
    const [isBlocked, setIsBlocked]         = useState(false);
    const [isBlockedByMe, setIsBlockedByMe] = useState(false);
    const [linkCopied, setLinkCopied]       = useState(false);
    const [menuOpen, setMenuOpen]           = useState(false);
    const menuRef                           = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

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

            const [statsData, streakData, certsData] = await Promise.all([
                rewardService.getUserStats(learnerId),
                rewardService.getUserStreak(learnerId),
                supabase.from('certificates').select('id', { count: 'exact', head: true }).eq('user_id', learnerId)
            ]);
            setStats(statsData);
            setStreak(streakData);
            setCerts(certsData.count || 0);

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
            // Check for blocks
            const { data: blockData } = await supabase
                .from('blocked_users')
                .select('*')
                .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${learnerId}),and(blocker_id.eq.${learnerId},blocked_id.eq.${user.id})`)
                .maybeSingle();
            
            if (blockData) {
                setIsBlocked(true);
                setIsBlockedByMe(blockData.blocker_id === user.id);
                setConnStatus('none');
                return;
            }

            setIsBlocked(false);
            setIsBlockedByMe(false);

            const { data } = await supabase
                .from('learner_connections')
                .select('*')
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${learnerId}),and(sender_id.eq.${learnerId},receiver_id.eq.${user.id})`)
                .maybeSingle();

            if (!data) { setConnStatus('none'); setConnId(null); return; }
            setConnId(data.id);
            if (data.status === 'accepted') {
                setConnStatus('accepted');
            } else if (data.status === 'pending') {
                setConnStatus(data.sender_id === user.id ? 'outgoing' : 'pending');
            }
        } catch (err) {
            console.error('Connection/Block fetch error:', err);
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
            } else if (connStatus === 'accepted') {
                if (window.confirm(language === 'bn' ? 'আপনি কি নিশ্চিত যে আপনি কানেকশন বিচ্ছিন্ন করতে চান?' : 'Are you sure you want to disconnect?')) {
                    await connectionService.disconnect(user.id, learnerId);
                    setConnStatus('none');
                }
            }
        } catch (err) {
            console.error('Connection action error:', err);
        } finally {
            setActionLoading(false);
        }
    };
    const handleMessage = () => {
        if (!user) { navigate('/auth'); return; }
        navigate(`/connections?sub=inbox&partnerId=${learnerId}`);
    };

    const handleBattleRequest = () => {
        if (!user) { navigate('/auth'); return; }
        navigate(`/connections?sub=battle&challengeId=${learnerId}`);
    };

    const handleDisconnect = async () => {
        if (!window.confirm(language === 'bn' ? 'আপনি কি নিশ্চিত যে আপনি সংযোগ বিচ্ছিন্ন করতে চান?' : 'Are you sure you want to disconnect?')) return;
        try {
            setActionLoading(true);
            await connectionService.disconnect(user.id, learnerId);
            setConnStatus('none');
            toast.success(language === 'bn' ? 'সংযোগ বিচ্ছিন্ন করা হয়েছে' : 'Disconnected successfully');
        } catch (error) {
            console.error('Error disconnecting:', error);
            toast.error('Error disconnecting user');
        } finally {
            setActionLoading(false);
        }
    };

    const handleBlock = async () => {
        if (!window.confirm(language === 'bn' ? 'এই ব্যবহারকারীকে ব্লক করতে চান?' : 'Block this user?')) return;
        try {
            setActionLoading(true);
            await connectionService.blockUser(user.id, learnerId);
            setIsBlocked(true);
            setConnStatus('none');
            toast.success(language === 'bn' ? 'ব্যবহারকারীকে ব্লক করা হয়েছে' : 'User blocked');
        } catch (error) {
            console.error('Error blocking user:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnblock = async () => {
        try {
            setActionLoading(true);
            await supabase
                .from('blocked_users')
                .delete()
                .eq('blocker_id', user.id)
                .eq('blocked_id', learnerId);
            setIsBlocked(false);
            toast.success('Unblocked');
        } catch (error) {
            console.error('Error unblocking:', error);
        } finally {
            setActionLoading(false);
        }
    };

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
        if (connStatus === 'accepted') return <UserCheck size={15} />;
        if (connStatus === 'outgoing') return <Hourglass size={15} />;
        if (connStatus === 'pending')  return <Check size={15} />;
        return <UserPlus size={15} />;
    };

    const isOnline = learner?.last_seen &&
        (new Date() - new Date(learner.last_seen)) < 5 * 60 * 1000;

    const shieldInfo = getShieldLevel(learner?.xp || 0);

    /* ─── AVATAR ─── */
    const AvatarFallback = () => (
        <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(241,196,15,0.06)', borderRadius: '50%'
        }}>
            <User size={30} color="var(--color-primary)" strokeWidth={1.5} />
        </div>
    );

    const [avatarFailed, setAvatarFailed] = useState(false);

    const avatarSrc = learner?.avatar_url && !imgError && !avatarFailed
        ? learner.avatar_url
        : null;

    /* ─── SKELETON ─── */
    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.backRow}>
                        <div className={styles.skeletonBlock} style={{ width: 72, height: 28, borderRadius: 6 }} />
                    </div>
                    <div className={styles.skeletonHeader}>
                        <div className={styles.skeletonCircle} style={{ width: 72, height: 72 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                            <div className={styles.skeletonBlock} style={{ width: '55%', height: 18 }} />
                            <div className={styles.skeletonBlock} style={{ width: '35%', height: 13 }} />
                            <div className={styles.skeletonBlock} style={{ width: '28%', height: 13 }} />
                        </div>
                    </div>
                    <div className={styles.skeletonActions}>
                        <div className={styles.skeletonBlock} style={{ height: 42 }} />
                        <div className={styles.skeletonBlock} style={{ height: 42 }} />
                    </div>
                    <div className={styles.skeletonBlock} style={{ height: 68, borderRadius: 14 }} />
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
                    <ArrowLeft size={16} />
                    <span>{language === 'bn' ? 'ফিরে যান' : 'Back'}</span>
                </button>

                {/* ── Header Card ── */}
                <motion.div
                    className={styles.headerCard}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                    {/* Avatar */}
                    <div className={styles.avatarWrap}>
                        <div className={styles.avatar}>
                            {avatarSrc ? (
                                <img
                                    src={avatarSrc}
                                    alt={learner.full_name || 'Learner'}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                    onError={() => setAvatarFailed(true)}
                                />
                            ) : (
                                <AvatarFallback />
                            )}
                        </div>
                        <span className={`${styles.onlineDot} ${isOnline ? styles.online : styles.offline}`} />
                    </div>

                    {/* Name / info */}
                    <div className={styles.headerInfo}>
                        <h1 className={styles.learnerName}>
                            {learner.full_name || learner.display_name || (language === 'bn' ? 'শিক্ষার্থী' : 'Learner')}
                        </h1>
                        <p className={styles.subtitle}>
                            {[shieldInfo.name, learner.location].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                </motion.div>

                <motion.div
                    className={styles.actions}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.07, ease: 'easeOut' }}
                >
                    {/* Connect button – always visible */}
                    <motion.button
                        className={`${styles.actionBtn} ${styles.connectBtn} ${
                            connStatus === 'accepted' ? styles.connectedBtn :
                            connStatus === 'outgoing' ? styles.outgoingBtn : ''
                        }`}
                        onClick={handleConnect}
                        disabled={actionLoading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <ConnectIcon />
                        <span>{connectLabel()}</span>
                    </motion.button>

                    {/* Message button – always visible */}
                    <motion.button 
                        className={`${styles.actionBtn} ${styles.msgBtn}`} 
                        onClick={handleMessage}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <MessageSquare size={15} />
                        <span>{language === 'bn' ? 'বার্তা' : 'Message'}</span>
                    </motion.button>

                    {/* Battle Request button */}
                    <motion.button 
                        className={`${styles.actionBtn} ${styles.battleBtn}`} 
                        onClick={handleBattleRequest}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Swords size={15} />
                        <span>{language === 'bn' ? 'ব্যাটেল' : 'Battle'}</span>
                    </motion.button>
                </motion.div>

                {/* ── Status Grid ── */}
                <motion.section
                    className={styles.section}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.13, ease: 'easeOut' }}
                >
                    <p className={styles.sectionTitle}>
                        {language === 'bn' ? 'পরিসংখ্যান' : 'Statistics'}
                    </p>

                    {learner.is_public !== false ? (
                        <div className={styles.statsRow}>
                            <div className={styles.statBox}>
                                <Flame size={17} className={styles.statIconStreak} strokeWidth={2} />
                                <span className={styles.statVal}>{streak?.longest_streak || 0}</span>
                                <span className={styles.statLbl}>{language === 'bn' ? 'সর্বোচ্চ স্ট্রিক' : 'Best Streak'}</span>
                            </div>

                            <div className={styles.statBox}>
                                <Zap size={17} className={styles.statIconXp} strokeWidth={2} />
                                <span className={styles.statVal}>{(learner.xp || 0).toLocaleString()}</span>
                                <span className={styles.statLbl}>{language === 'bn' ? 'মধু (XP)' : 'XP'}</span>
                            </div>

                            <div className={styles.statBox}>
                                <Trophy size={17} className={styles.statIconRank} strokeWidth={2} />
                                <span className={styles.statVal}>{rank ? `#${rank}` : '—'}</span>
                                <span className={styles.statLbl}>{language === 'bn' ? 'র‍্যাংক' : 'Rank'}</span>
                            </div>

                            <div className={styles.statBox}>
                                <BookOpen size={17} className={styles.statIconCourse} strokeWidth={2} />
                                <span className={styles.statVal}>{certs}</span>
                                <span className={styles.statLbl}>{language === 'bn' ? 'সার্টিফিকেট' : 'Certificates'}</span>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.privateInfoBox}>
                            <Shield size={20} className={styles.privateIcon} />
                            <span>{language === 'bn' ? 'এই প্রোফাইলটি বর্তমানে প্রাইভেট করা আছে' : 'This profile is currently private'}</span>
                        </div>
                    )}
                </motion.section>

                {/* ── General Information ── */}
                <motion.section
                    className={styles.section}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.19, ease: 'easeOut' }}
                >
                    <p className={styles.sectionTitle}>
                        {language === 'bn' ? 'সাধারণ তথ্য' : 'General Information'}
                    </p>
                    <div className={styles.detailsList}>
                        {learner.is_public !== false && (
                            <div className={styles.detailRow}>
                                <span className={styles.detailKey}>{language === 'bn' ? 'ইমেইল' : 'Email'}</span>
                                <span className={styles.detailVal}>{learner.email || '—'}</span>
                            </div>
                        )}
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
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.24, ease: 'easeOut' }}
                    >
                        <p className={styles.sectionTitle}>
                            {language === 'bn' ? 'আমার সম্পর্কে' : 'About'}
                        </p>
                        <p className={styles.bioText}>{learner.bio}</p>
                    </motion.section>
                )}

                {/* ── Copy Link + 3-dot menu row ── */}
                <motion.div
                    className={styles.bottomRow}
                    ref={menuRef}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.28, ease: 'easeOut' }}
                >
                    <button
                        className={`${styles.actionBtn} ${styles.copyLinkBtn} ${linkCopied ? styles.copyLinkCopied : ''}`}
                        onClick={() => {
                            if (linkCopied) return;
                            const url = `${window.location.origin}/learner/${learnerId}`;
                            const succeed = () => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); };
                            if (navigator.clipboard) {
                                navigator.clipboard.writeText(url).then(succeed).catch(() => {});
                            } else {
                                try {
                                    const ta = document.createElement('textarea');
                                    ta.value = url;
                                    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
                                    document.body.appendChild(ta);
                                    ta.focus();
                                    ta.select();
                                    document.execCommand('copy');
                                    document.body.removeChild(ta);
                                    succeed();
                                } catch { /* silent fail */ }
                            }
                        }}
                    >
                        {linkCopied ? <CheckCheck size={14} /> : <Link size={14} />}
                        <span>{linkCopied
                            ? (language === 'bn' ? 'কপি হয়েছে ✓' : 'Copied!')
                            : (language === 'bn' ? 'প্রোফাইল লিংক কপি করুন' : 'Copy Profile Link')
                        }</span>
                    </button>

                    {/* 3-dot more menu */}
                    <div className={styles.moreWrap}>
                        <button
                            className={`${styles.moreBtn} ${menuOpen ? styles.moreBtnActive : ''}`}
                            onClick={() => setMenuOpen(o => !o)}
                            aria-label="More options"
                        >
                            <MoreVertical size={15} />
                        </button>

                        {menuOpen && (
                            <div className={styles.dropdown}>
                                {connStatus === 'accepted' && (
                                    <button
                                        className={`${styles.dropdownItem} ${styles.dropdownDanger}`}
                                        onClick={() => { setMenuOpen(false); handleDisconnect(); }}
                                        disabled={actionLoading}
                                    >
                                        <UserMinus size={14} />
                                        <span>{language === 'bn' ? 'সংযোগ বিচ্ছিন্ন' : 'Disconnect'}</span>
                                    </button>
                                )}
                                {isBlocked ? (
                                    <button
                                        className={styles.dropdownItem}
                                        onClick={() => { setMenuOpen(false); handleUnblock(); }}
                                        disabled={actionLoading}
                                    >
                                        <Ban size={14} />
                                        <span>{language === 'bn' ? 'আনব্লক' : 'Unblock'}</span>
                                    </button>
                                ) : (
                                    <button
                                        className={`${styles.dropdownItem} ${styles.dropdownDanger}`}
                                        onClick={() => { setMenuOpen(false); handleBlock(); }}
                                        disabled={actionLoading}
                                    >
                                        <Ban size={14} />
                                        <span>{language === 'bn' ? 'ব্লক করুন' : 'Block User'}</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>

                <div style={{ height: 24 }} />
            </div>
        </div>
    );
};

export default LearnerProfilePage;
