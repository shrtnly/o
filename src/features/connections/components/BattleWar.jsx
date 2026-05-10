import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { useLanguage } from '../../../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Swords, Trophy, Zap, Clock, CheckCircle2, XCircle,
    Users, Search, Loader2, Star, RotateCcw, ChevronRight, ChevronLeft,
    Wifi, WifiOff, Target, Award, Copy, User, X, Shield, History, Power, Cpu, UserX, Bot, Brain
} from 'lucide-react';
import styles from './BattleWar.module.css';
import CustomSelect from '../../../components/ui/CustomSelect';
import { toast } from 'sonner';
import BattleSkeleton from './BattleSkeleton';
import HistoryModal from './HistoryModal';
import ExitModal from './ExitModal';
import BattleModeSelector from './BattleModeSelector';
import BattleBetSelector from './BattleBetSelector';
import { rewardService } from '../../../services/rewardService';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import PollenIcon from '../../../components/PollenIcon';

// ─── file-level cache to prevent skeleton loading on remount ──────
let cachedCourses = [];
let cachedModules = {};
let cachedSelectedCourse = null;
let cachedSelectedModule = null;

// ─── constants ────────────────────────────────────────────────
const TOTAL_QUESTIONS = 15;
const QUESTION_TIME = 15; // seconds
const MAX_SCORE_PER_Q = 10;
const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

// ─── helpers ──────────────────────────────────────────────────
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function calcSpeed(timeLeft) {
    return Math.round((timeLeft / QUESTION_TIME) * 5);
}

// ─── sub-components ───────────────────────────────────────────
const getTierName = (tier, language) => {
    const tiersEn = ["Bee Kid learner", "Bee Warrior", "Bee Master", "Bee Champion", "Bee Legend"];
    const tiersBn = ["বি কিড লার্নার", "মৌমাছি যোদ্ধা", "মৌমাছি মাস্টার", "মৌমাছি চ্যাম্পিয়ন", "মৌমাছি লিজেন্ড"];
    const idx = Math.min(Math.max((tier || 1) - 1, 0), 4);
    return language === 'bn' ? tiersBn[idx] : tiersEn[idx];
};

const Avatar = ({ url, name, size = 42 }) => (
    <div className={styles.avatar} style={{ width: size, height: size }}>
        {url
            ? <img src={url} alt={name} crossOrigin="anonymous" referrerPolicy="no-referrer" />
            : <span style={{ fontSize: size * 0.42, fontWeight: 700, color: 'var(--color-primary)' }}>
                {(name || '?')[0].toUpperCase()}
            </span>
        }
    </div>
);

const LottieWrapper = ({ src }) => {
    const [shouldRender, setShouldRender] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setShouldRender(true), 800);
        return () => clearTimeout(timer);
    }, []);

    if (!shouldRender) return <div style={{ width: 240, height: 240 }} />;

    return (
        <DotLottieReact
            src={src}
            autoplay
            loop
        />
    );
};

// ─── main component ───────────────────────────────────────────
const BattleWar = ({ user, userProfile, onPhaseChange }) => {
    const { t, language } = useLanguage();

    // ── phase: 'lobby' | 'searching' | 'matchmaking' | 'game' | 'result'
    const [phase, setPhase] = useState('lobby');
    const [roomCode, setRoomCode] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [session, setSession] = useState(null);
    const [opponentProfile, setOpponentProfile] = useState(null);
    const [battleMode, setBattleMode] = useState(userProfile?.battle_mode !== false);
    const [isUpdatingMode, setIsUpdatingMode] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [battleHistory, setBattleHistory] = useState([]);
    const [historyPage, setHistoryPage] = useState(0);
    const [totalHistory, setTotalHistory] = useState(0);
    const [isSavingRecord, setIsSavingRecord] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [challengeId, setChallengeId] = useState(null);
    const [challengeProfile, setChallengeProfile] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();

    // Setup state
    const [allCourses, setAllCourses] = useState(cachedCourses);
    const [allModules, setAllModules] = useState(cachedSelectedCourse ? (cachedModules[cachedSelectedCourse.id] || []) : []);
    const [selectedCourse, setSelectedCourse] = useState(cachedSelectedCourse);
    const [selectedModule, setSelectedModule] = useState(cachedSelectedModule);
    const [isLoadingCourses, setIsLoadingCourses] = useState(cachedCourses.length === 0);
    const [isLoadingModules, setIsLoadingModules] = useState(false);

    // game state
    const [questions, setQuestions] = useState([]);
    const [qIndex, setQIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
    const [myScore, setMyScore] = useState(0);
    const [oppScore, setOppScore] = useState(0);
    const [myCorrect, setMyCorrect] = useState(0);
    const [oppCorrect, setOppCorrect] = useState(0);
    const [oppQIndex, setOppQIndex] = useState(0);
    const [isAnswerLocked, setIsAnswerLocked] = useState(false);

    // realtime
    const [opponentOnline, setOpponentOnline] = useState(true);
    const [isVsBot, setIsVsBot] = useState(false);
    const [searchCountdown, setSearchCountdown] = useState(20);
    const channelRef = useRef(null);
    const timerRef = useRef(null);
    const autoAdvanceRef = useRef(null);
    const botTimeoutRef = useRef(null);
    const searchCountdownRef = useRef(null);
    const sessionRef = useRef(session);
    const phaseRef = useRef('lobby');
    const isBotRef = useRef(false);
    const [matchMode, setMatchMode] = useState('both');
    const matchModeRef = useRef('both');
    useEffect(() => { matchModeRef.current = matchMode; }, [matchMode]);

    const [difficulty, setDifficulty] = useState('easy');
    const difficultyRef = useRef('easy');
    useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

    const [betInfo, setBetInfo] = useState({ type: 'xp', amount: 0 });
    const betInfoRef = useRef({ type: 'xp', amount: 0 });
    useEffect(() => { betInfoRef.current = betInfo; }, [betInfo]);

    useEffect(() => { sessionRef.current = session; }, [session]);
    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { isBotRef.current = isVsBot; }, [isVsBot]);

    useEffect(() => {
        if (onPhaseChange) onPhaseChange(phase);
    }, [phase, onPhaseChange]);

    useEffect(() => {
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, []);


    const isPlayer1 = session ? session.player1_id === user?.id : false;
    const isPlayer1Ref = useRef(isPlayer1);
    useEffect(() => { isPlayer1Ref.current = isPlayer1; }, [isPlayer1]);

    // Keep latest game state in refs to avoid stale closures
    const myScoreRef = useRef(0);
    const myCorrectRef = useRef(0);
    const oppScoreRef = useRef(0);
    const oppQIndexRef = useRef(0);
    const qIndexRef = useRef(0);
    const questionsRef = useRef([]);
    const isBotGameActive = useRef(false);
    const isAnswerLockedRef = useRef(false);

    useEffect(() => { myScoreRef.current = myScore; }, [myScore]);
    useEffect(() => { myCorrectRef.current = myCorrect; }, [myCorrect]);
    useEffect(() => { oppScoreRef.current = oppScore; }, [oppScore]);
    useEffect(() => { oppQIndexRef.current = oppQIndex; }, [oppQIndex]);
    useEffect(() => { qIndexRef.current = qIndex; }, [qIndex]);
    useEffect(() => { questionsRef.current = questions; }, [questions]);
    useEffect(() => { isAnswerLockedRef.current = isAnswerLocked; }, [isAnswerLocked]);

    // ── fetch opponent profile ─────────────────────────────────
    const fetchOpponent = useCallback(async (oppId) => {
        if (!oppId) return;
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, display_name, avatar_url, xp, league_id')
            .eq('id', oppId)
            .single();
        if (data) setOpponentProfile(data);
    }, []);

    // ── fetch random questions for a unit or course ───────────
    const fetchBattleQuestions = useCallback(async ({ courseId, unitId }) => {
        const { data, error } = await supabase.rpc('get_battle_questions', {
            p_course_id: courseId || null,
            p_unit_id: unitId || null,
            p_limit: 50 // Fetch enough to ensure we have enough after filtering
        });

        if (error || !data || data.length === 0) {
            if (error) console.error('Error fetching battle questions:', error);
            return [];
        }

        // Filter out duplicates and questions with fewer than 2 options
        const uniqueQs = [];
        const seenTexts = new Set();
        data.forEach(q => {
            const text = q.question_text?.trim();
            // Map 'options' from RPC to 'mcq_options' for frontend compatibility
            const mcqOptions = q.options || [];
            if (text && !seenTexts.has(text) && mcqOptions.length >= 2) {
                seenTexts.add(text);
                uniqueQs.push({
                    ...q,
                    mcq_options: mcqOptions
                });
            }
        });

        // Difficulty sorting by text length
        if (difficultyRef.current === 'easy') {
            uniqueQs.sort((a, b) => (a.question_text || '').length - (b.question_text || '').length);
        } else {
            uniqueQs.sort((a, b) => (b.question_text || '').length - (a.question_text || '').length);
        }

        // Take exactly TOTAL_QUESTIONS and shuffle the options for variety
        return uniqueQs.slice(0, TOTAL_QUESTIONS).map(q => ({
            ...q,
            mcq_options: [...q.mcq_options].sort(() => Math.random() - 0.5)
        }));
    }, []);

    // ── subscribe to session changes ──────────────────────────
    const subscribeToSession = useCallback((sessionId, oppId) => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }

        const channel = supabase
            .channel(`battle-${sessionId}`, { config: { broadcast: { self: false } } })
            // Presence: track online/offline
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const onlineIds = Object.values(state).flatMap(v => v.map(p => p.user_id));
                setOpponentOnline(onlineIds.includes(oppId));
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                const left = leftPresences.some(p => p.user_id === oppId);
                if (left) setOpponentOnline(false);
            })
            // Broadcast: opponent answered
            .on('broadcast', { event: 'score_update' }, ({ payload }) => {
                if (payload.user_id !== user?.id) {
                    setOppScore(payload.score);
                    setOppCorrect(payload.correct);
                    setOppQIndex(payload.qIndex || 0);
                }
            })
            // DB changes: session status / scores
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'battle_sessions', filter: `id=eq.${sessionId}` },
                (payload) => {
                    const s = payload.new;
                    setSession(s);
                    if (s.status === 'in_game' && s.player2_id && phase !== 'game') {
                        // game just started for player1
                    }
                    if (s.status === 'finished') {
                        setPhase('result');
                    }
                    // Sync opponent score from DB
                    if (s.player1_id === user?.id) {
                        setOppScore(s.player2_score || 0);
                        setOppCorrect(s.player2_correct || 0);
                        setOppQIndex(s.player2_q_index || 0);
                    } else {
                        setOppScore(s.player1_score || 0);
                        setOppCorrect(s.player1_correct || 0);
                        setOppQIndex(s.player1_q_index || 0);
                    }
                }
            )
            .subscribe(async (status, err) => {
                console.log(`Battle channel status (${sessionId}):`, status);
                if (err) console.error(`Battle channel error (${sessionId}):`, err);
                if (status === 'SUBSCRIBED') {
                    await channel.track({ user_id: user?.id });
                }
            });

        channelRef.current = channel;
    }, [user?.id, phase]);

    // ── Pre-setup fetch ───────────────────────────────────────
    const fetchCourses = useCallback(async (isSilent = false) => {
        if (!user?.id) {
            setIsLoadingCourses(false);
            return;
        }
        if (!isSilent) setIsLoadingCourses(true);
        try {
            // Step 1: Try fetching enrolled courses
            const { data: enrolledData, error: enrolledError } = await supabase
                .from('user_courses')
                .select('course_id, courses(id, title)')
                .eq('user_id', user.id);

            let coursesToSet = [];

            if (!enrolledError && enrolledData && enrolledData.length > 0) {
                coursesToSet = enrolledData
                    .map(item => item.courses)
                    .filter(Boolean);
            } else {
                // Step 2: Fallback - Fetch all courses if none found or error
                const { data: allData } = await supabase
                    .from('courses')
                    .select('id, title')
                    .limit(20);
                if (allData) coursesToSet = allData;
            }

            // Remove duplicates and sort
            const uniqueCourses = Array.from(new Map(coursesToSet.map(c => [c.id, c])).values())
                .sort((a, b) => a.title.localeCompare(b.title));

            setAllCourses(uniqueCourses);
            cachedCourses = uniqueCourses;
        } catch (err) {
            console.error('Error fetching courses:', err);
        } finally {
            if (!isSilent) setIsLoadingCourses(false);
        }
    }, [user?.id]);

    useEffect(() => {
        let mounted = true;
        if (user?.id && mounted) {
            const isSilent = cachedCourses.length > 0;
            fetchCourses(isSilent);
        }
        return () => { mounted = false; };
    }, [user?.id, fetchCourses]);

    const fetchModules = useCallback(async (courseId) => {
        if (!courseId) return;
        if (cachedModules[courseId]) {
            setAllModules(cachedModules[courseId]);
            return;
        }
        setIsLoadingModules(true);
        const fallbackTimer = setTimeout(() => {
            setIsLoadingModules(false);
        }, 5000);

        try {
            const { data, error } = await supabase
                .from('units')
                .select('id, title')
                .eq('course_id', courseId)
                .order('order_index');
            
            if (!error && data) {
                setAllModules(data);
                cachedModules[courseId] = data;
            }
        } catch (err) {
            console.error('Error fetching modules:', err);
        } finally {
            clearTimeout(fallbackTimer);
            setIsLoadingModules(false);
        }
    }, []);

    const fetchQuestionsByIds = useCallback(async (ids) => {
        const { data } = await supabase
            .from('mcq_questions')
            .select('id, question_text, mcq_options(id, option_text, is_correct, order_index)')
            .in('id', ids);

        // preserve order from ids array and shuffle options
        const map = {};
        (data || []).forEach(q => { map[q.id] = q; });
        return ids.map(id => map[id]).filter(Boolean).map(q => ({
            ...q,
            mcq_options: (q.mcq_options || []).sort((a, b) => a.order_index - b.order_index)
        }));
    }, []);
    // ── Bot simulation: human-like independent logic loop ────────────
    const runBotLogic = useCallback(() => {
        if (!isBotRef.current || !isBotGameActive.current) return;

        const currentProgress = oppQIndexRef.current;
        const totalQs = questionsRef.current.length || TOTAL_QUESTIONS;

        if (currentProgress >= totalQs) {
            isBotGameActive.current = false;
            return;
        }

        // Human-like reading + thinking time (based on 15s total time):
        const rand = Math.random();
        let delay;
        if (rand < 0.25) {
            // Focused/Expert: 5 - 9s
            delay = 5000 + Math.random() * 4000;
        } else if (rand < 0.80) {
            // Average Learner: 9 - 14s
            delay = 9000 + Math.random() * 5000;
        } else {
            // Distracted/Struggling: 14 - 18s (might miss the 15s window)
            delay = 14000 + Math.random() * 4000;
        }

        botTimeoutRef.current = setTimeout(() => {
            if (!isBotRef.current || !isBotGameActive.current) return;

            const hardnessFactor = currentProgress / totalQs;
            const accuracy = 0.85 - hardnessFactor * 0.20; // 85% → 65% accuracy
            const isCorrect = Math.random() < accuracy;

            const maxBonus = delay < 9000 ? 4 : delay < 14000 ? 2 : 1;
            const speedBonus = Math.floor(Math.random() * maxBonus);
            const gained = isCorrect ? (MAX_SCORE_PER_Q + speedBonus) : 0;

            setOppScore(prev => prev + gained);
            if (isCorrect) setOppCorrect(prev => prev + 1);

            setOppQIndex(prev => {
                const next = prev + 1;
                if (next < totalQs) {
                    runBotLogic();
                } else {
                    isBotGameActive.current = false;
                }
                return next;
            });
        }, delay);
    }, []);

    // ── Start vs Bot game ─────────────────────────────────────
    const startBotGame = useCallback((qs) => {
        clearTimeout(botTimeoutRef.current);
        clearInterval(searchCountdownRef.current);

        const BOT_NAMES = ['অর্জুন AI', 'প্রজ্ঞা Bot', 'বুদ্ধিমান Bot', 'কিরণ AI'];
        const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];

        setQuestions(qs);
        setIsVsBot(true);
        isBotRef.current = true;
        isBotGameActive.current = true;

        setOpponentProfile({
            id: 'bot',
            full_name: botName,
            display_name: botName,
            avatar_url: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${botName}`,
            xp: Math.floor(Math.random() * 500) + 200,
            league_id: Math.floor(Math.random() * 3) + 1,
            isBot: true
        });

        setPhase('matchmaking');
        setTimeout(() => {
            startGame(qs);
        }, 3000);
    }, []);

    // ── start game ────────────────────────────────────────────
    const startGame = useCallback((qs) => {
        setPhase('game');
        setQIndex(0);
        setMyScore(0);
        setOppScore(0);
        setMyCorrect(0);
        setOppCorrect(0);
        setOppQIndex(0);
        setSelectedOption(null);
        setIsAnswerLocked(false);
        setTimeLeft(QUESTION_TIME);

        if (isBotRef.current) {
            runBotLogic();
        }
    }, [runBotLogic]);

    // ── join existing room ────────────────────────────────────
    const handleJoinRoom = useCallback(async (forcedCodeParam = null) => {
        const forcedCode = typeof forcedCodeParam === 'string' ? forcedCodeParam : null;
        const code = (forcedCode || joinCode).trim().toUpperCase();
        if (!code || code.length < 4 || !user?.id) return;
        setPhase('searching');

        const { data: existing, error } = await supabase
            .from('battle_sessions')
            .select('*')
            .eq('room_code', code)
            .eq('status', 'waiting')
            .single();

        if (error || !existing) {
            console.error('Room not found or error:', error);
            setPhase('lobby');
            return;
        }

        if (existing.player1_id === user.id) {
            console.error('You cannot join your own room');
            setPhase('lobby');
            return;
        }

        // XP or Pollen check for player 2
        if (existing.xp_stake > 0 || existing.pollen_stake > 0) {
            const { data: profile } = await supabase.from('profiles').select('xp, gems').eq('id', user.id).single();
            if (existing.xp_stake > 0) {
                if (!profile || (profile.xp || 0) < existing.xp_stake) {
                    toast.error(language === 'bn' ? "আপনার পর্যাপ্ত XP নেই!" : "You don't have enough XP!");
                    return;
                }
            } else if (existing.pollen_stake > 0) {
                if (!profile || (profile.gems || 0) < existing.pollen_stake) {
                    toast.error(language === 'bn' ? "আপনার পর্যাপ্ত মধুরেণু (Pollen) নেই!" : "You don't have enough Pollen!");
                    return;
                }
            }
        }

        const qs = existing.question_ids?.length
            ? await fetchQuestionsByIds(existing.question_ids)
            : await fetchBattleQuestions(null);

        setQuestions(qs);

        const { data: updated } = await supabase
            .from('battle_sessions')
            .update({
                player2_id: user.id,
                status: 'in_game',
                started_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single();

        if (!updated) { setPhase('lobby'); return; }
        setSession(updated);
        await fetchOpponent(updated.player1_id);
        setPhase('matchmaking');
        subscribeToSession(updated.id, updated.player1_id);
        setTimeout(() => startGame(qs), 3000);
    }, [joinCode, user?.id, fetchQuestionsByIds, fetchBattleQuestions, fetchOpponent, subscribeToSession, startGame]);

    const handleCreateRoom = useCallback(async (forcedCodeParam = null, forcedCourseParam = null) => {
        // Ensure we don't treat event objects from onClick as room codes
        const forcedCode = typeof forcedCodeParam === 'string' ? forcedCodeParam : null;
        const forcedCourse = (forcedCourseParam && typeof forcedCourseParam === 'object' && !forcedCourseParam.nativeEvent) ? forcedCourseParam : null;

        if (!user?.id) return;

        // XP or Pollen check for creator
        const b = betInfoRef.current;
        if (matchModeRef.current !== 'bot' && b.amount > 0) {
            const { data: profile } = await supabase.from('profiles').select('xp, gems').eq('id', user.id).single();
            if (b.type === 'xp') {
                if (!profile || (profile.xp || 0) < b.amount) {
                    toast.error(language === 'bn' ? "আপনার পর্যাপ্ত XP নেই!" : "You don't have enough XP!");
                    return;
                }
            } else if (b.type === 'pollen') {
                if (!profile || (profile.gems || 0) < b.amount) {
                    toast.error(language === 'bn' ? "আপনার পর্যাপ্ত মধুরেণু (Pollen) নেই!" : "You don't have enough Pollen!");
                    return;
                }
            }
        }

        setPhase('searching');
        setSearchCountdown(20);
        isBotGameActive.current = false;
        setIsVsBot(false);

        clearInterval(searchCountdownRef.current);
        searchCountdownRef.current = setInterval(() => {
            setSearchCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(searchCountdownRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        const code = forcedCode || generateRoomCode();
        setRoomCode(code);

        const activeCourse = forcedCourse || selectedCourse;

        const qs = await fetchBattleQuestions({
            courseId: activeCourse?.id,
            unitId: selectedModule?.id
        });
        const qIds = qs.map(q => q.id);

        if (qIds.length === 0) {
            toast.error(language === 'bn' ? "কোনো উপযুক্ত প্রশ্ন পাওয়া যায়নি!" : "No suitable questions found!");
            clearInterval(searchCountdownRef.current);
            setPhase('lobby');
            return;
        }

        if (matchModeRef.current === 'bot') {
            clearInterval(searchCountdownRef.current);
            startBotGame(qs);
            return;
        }

        const { data: newSession, error } = await supabase
            .from('battle_sessions')
            .insert({
                room_code: code,
                player1_id: user.id,
                status: 'waiting',
                question_ids: qIds,
                course_id: selectedCourse?.id,
                xp_stake: betInfoRef.current.type === 'xp' ? betInfoRef.current.amount : 0,
                pollen_stake: betInfoRef.current.type === 'pollen' ? betInfoRef.current.amount : 0
            })
            .select()
            .single();

        if (error || !newSession) {
            clearInterval(searchCountdownRef.current);
            setPhase('lobby');
            return;
        }
        setSession(newSession);
        setQuestions(qs);

        // If it's a direct challenge, send notification to the learner
        if (challengeId) {
            const stakeAmt = betInfoRef.current.amount || 0;
            const stakeType = betInfoRef.current.type || 'xp';
            const stakeText = stakeAmt > 0 ? ` ( Bet - ${stakeAmt}${stakeType === 'pollen' ? ' Pollen' : 'XP'} )` : '';

            await supabase.from('notifications').insert({
                user_id: challengeId,
                actor_id: user.id,
                type: 'battle_invite',
                title: language === 'bn' ? `ব্যাটেল চ্যালেঞ্জ!${stakeText}` : `Battle Challenge!${stakeText}`,
                message: language === 'bn'
                    ? `${userProfile?.full_name || 'কেউ একজন'} আপনাকে একটি ব্যাটেল চ্যালেঞ্জ পাঠিয়েছেন।`
                    : `${userProfile?.full_name || 'Someone'} has sent you a battle challenge.`,
                data: {
                    roomCode: code,
                    display_title: language === 'bn' ? `ব্যাটেল চ্যালেঞ্জ${stakeText}` : `BATTLE CHALLENGE${stakeText}`,
                    display_msg: language === 'bn'
                        ? `${userProfile?.full_name || 'কেউ একজন'} চ্যালেঞ্জ পাঠিয়েছেন।`
                        : `${userProfile?.full_name || 'Someone'} has sent a challenge.`,
                    course_name: activeCourse?.title || (language === 'bn' ? 'সাধারণ ব্যাটল' : 'General Battle'),
                    stake_type: stakeType,
                    stake_amount: stakeAmt
                }
            });
        }

        // Only add to public invitations if NOT a direct challenge
        if (!challengeId) {
            await supabase.from('battle_invitations').insert({
                room_code: code,
                sender_id: user.id,
                course_title: activeCourse?.title || (language === 'bn' ? 'সাধারণ ব্যাটল' : 'General Battle'),
                xp_stake: betInfoRef.current.type === 'xp' ? betInfoRef.current.amount : 0,
                pollen_stake: betInfoRef.current.type === 'pollen' ? betInfoRef.current.amount : 0
            });
        }

        clearTimeout(botTimeoutRef.current);
        let waitChannel;
        botTimeoutRef.current = setTimeout(() => {
            if (phaseRef.current === 'searching') {
                clearInterval(searchCountdownRef.current);
                supabase.from('battle_invitations').delete().eq('room_code', code).eq('sender_id', user.id);
                supabase.from('battle_sessions').update({ status: 'cancelled' }).eq('id', newSession.id).then(({ error }) => {
                    if (error) console.error('Error cancelling session:', error);
                });
                if (waitChannel) supabase.removeChannel(waitChannel);

                if (matchModeRef.current === 'pvp') {
                    setPhase('search_failed');
                } else {
                    startBotGame(qs);
                }
            }
        }, 20000);

        waitChannel = supabase
            .channel(`battle-wait-${newSession.id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'battle_sessions', filter: `id=eq.${newSession.id}` },
                async (payload) => {
                    const s = payload.new;
                    if (s.player2_id && s.status === 'in_game') {
                        clearTimeout(botTimeoutRef.current);
                        clearInterval(searchCountdownRef.current);
                        supabase.from('battle_invitations').delete().eq('room_code', code).eq('sender_id', user.id);
                        setSession(s);
                        await fetchOpponent(s.player2_id);
                        setPhase('matchmaking');
                        supabase.removeChannel(waitChannel);
                        subscribeToSession(s.id, s.player2_id);
                        setTimeout(() => startGame(qs), 3000);
                    }
                }
            )
            .subscribe((status, err) => {
                if (err) console.error(`Wait channel error:`, err);
            });
    }, [user?.id, language, selectedCourse, selectedModule, challengeId, userProfile?.full_name, fetchBattleQuestions, startBotGame, fetchOpponent, subscribeToSession, startGame]);


    // ── Challenge Tracking ────────────────────────────────────
    useEffect(() => {
        const cId = searchParams.get('challengeId');
        if (cId && user?.id) {
            setChallengeId(cId);
            const fetchChallengeProfile = async (id) => {
                const { data } = await supabase
                    .from('profiles')
                    .select('id, full_name, display_name, battle_mode')
                    .eq('id', id)
                    .single();
                
                if (data) {
                    if (data.battle_mode === false) {
                        toast.error(language === 'bn' ? 'এই শিক্ষার্থী বর্তমানে ব্যাটেল মোড বন্ধ রেখেছেন' : 'This learner has disabled battle mode');
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete('challengeId');
                        setSearchParams(newParams, { replace: true });
                        setChallengeId(null);
                    } else {
                        setChallengeProfile(data);
                    }
                }
            };
            fetchChallengeProfile(cId);
        }
    }, [searchParams, user?.id]);

    // ── Auto-join from URL ────────────────────────────────────
    useEffect(() => {
        const code = searchParams.get('joinCode');
        if (code && user?.id && phase === 'lobby') {
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('joinCode');
            setSearchParams(newParams, { replace: true });

            setJoinCode(code);
            handleJoinRoom(code);
        }
    }, [searchParams, user?.id, phase, handleJoinRoom]);

    // ── Auto-host from URL (Direct Invite) ────────────────────
    useEffect(() => {
        const code = searchParams.get('roomCode');
        const role = searchParams.get('role');

        if (code && role === 'host' && user?.id && phase === 'lobby' && allCourses.length > 0) {
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('roomCode');
            newParams.delete('role');
            setSearchParams(newParams, { replace: true });

            // Default to first course if none selected
            const defaultCourse = allCourses[0];
            setSelectedCourse(defaultCourse);
            handleCreateRoom(code, defaultCourse);
        }
    }, [searchParams, user?.id, phase, allCourses, handleCreateRoom]);

    // ── cleanup on unmount ────────────────────────────────────
    useEffect(() => {
        return () => {
            if (channelRef.current) supabase.removeChannel(channelRef.current);
            clearInterval(timerRef.current);
            clearTimeout(autoAdvanceRef.current);
        };
    }, []);

    // ── opponent disconnect → auto-win ────────────────────────
    useEffect(() => {
        if (!opponentOnline && phase === 'game' && session?.id) {
            const timeout = setTimeout(async () => {
                await supabase.from('battle_sessions').update({
                    status: 'finished',
                    winner_id: user?.id,
                    finished_at: new Date().toISOString()
                }).eq('id', session.id);
                setPhase('result');
            }, 5000);
            return () => clearTimeout(timeout);
        }
    }, [opponentOnline, phase, session?.id, user?.id]);

    // ── reset ─────────────────────────────────────────────────
    const handleReset = () => {
        if (channelRef.current) supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        clearInterval(timerRef.current);
        clearTimeout(autoAdvanceRef.current);
        clearTimeout(botTimeoutRef.current);
        clearInterval(searchCountdownRef.current);
        isBotGameActive.current = false;
        setIsVsBot(false);
        isBotRef.current = false;
        setSearchCountdown(20);
        setPhase('lobby');
        setSession(null);
        setOpponentProfile(null);
        setQuestions([]);
        setQIndex(0);
        setMyScore(0);
        setOppScore(0);
        setOppCorrect(0);
        setOppQIndex(0);
        setJoinCode('');
        setSelectedCourse(null);
        setSelectedModule(null);
        setIsSavingRecord(false);
    };

    const finishGame = useCallback(async () => {
        // !! IMPORTANT: Snapshot ref values BEFORE any await, to avoid stale closures
        const isBotMatch = isBotRef.current;
        const myFinalScore = myScoreRef.current;
        const oppFinalScore = oppScoreRef.current;
        const myFinalCorrect = myCorrectRef.current;
        const p1 = isPlayer1Ref.current;
        const currentQIndex = qIndexRef.current;
        const totalQs = questionsRef.current.length || TOTAL_QUESTIONS;

        isBotGameActive.current = false;
        
        // Transition to result phase immediately
        setPhase('result');

        const sessId = sessionRef.current?.id;
        if (!sessId) return;

        // Fetch direct ground truth from database to completely avoid any caching/real-time lag problems
        const { data: dbSess, error: dbError } = await supabase
            .from('battle_sessions')
            .select('*')
            .eq('id', sessId)
            .single();

        if (dbError || !dbSess) {
            console.error('Error fetching latest session state inside finishGame:', dbError);
            return;
        }

        const sess = dbSess;

        const winnerId = myFinalScore > oppFinalScore
            ? user?.id
            : myFinalScore < oppFinalScore
                ? (p1 ? sess.player2_id : sess.player1_id)
                : null;

        const updateData = p1
            ? { player1_score: myFinalScore, player1_correct: myFinalCorrect, player1_q_index: currentQIndex, status: 'finished', winner_id: winnerId, finished_at: new Date().toISOString() }
            : { player2_score: myFinalScore, player2_correct: myFinalCorrect, player2_q_index: currentQIndex, status: 'finished', winner_id: winnerId, finished_at: new Date().toISOString() };

        // Perform update in background
        supabase.from('battle_sessions').update(updateData).eq('id', sess.id).then(({ error }) => {
            if (error) console.error('Error finalising session:', error);
        });

        const myAcc = totalQs > 0 ? Math.round((myFinalCorrect / totalQs) * 100) : 0;
        const isWinner = myFinalScore > oppFinalScore;
        const isEligible = myAcc >= 50;

        console.log('[finishGame] isBotMatch:', isBotMatch, '| isWinner:', isWinner, '| isEligible:', isEligible, '| xp_stake:', sess.xp_stake, '| pollen_stake:', sess.pollen_stake);

        // ── Normal Rewards (Any winner gets normal rewards if eligible) ──
        if (isWinner && isEligible) {
            const normalXp = Math.round((myFinalCorrect / totalQs) * 10);
            const normalPollen = 2;

            if (normalXp > 0) {
                supabase.rpc('award_user_xp', { p_user_id: user.id, p_amount: normalXp, p_source: 'battle_win' })
                    .then(({ error }) => {
                        if (error) console.error('Error awarding normal XP:', error);
                    });
            }
            if (normalPollen > 0) {
                supabase.rpc('award_user_gems', { p_user_id: user.id, p_amount: normalPollen, p_source: 'battle_win' })
                    .then(({ error }) => {
                        if (error) console.error('Error awarding normal Pollen:', error);
                    });
            }
        }

        // Insert notification record on game completion
        const normalXp = Math.round((myFinalCorrect / totalQs) * 10);
        const normalPollen = 2;

        let notificationTitle = '';
        let notificationMsg = '';

        if (isWinner && isEligible) {
            if (language === 'bn') {
                notificationTitle = 'ব্যাটেল বিজয়!';
                notificationMsg = `অভিনন্দন! আপনি ব্যাটেলে জিতেছেন। রিওয়ার্ড: +${normalXp} XP এবং +${normalPollen} মধুরেণু (Pollen)।`;
                if (sess.xp_stake > 0) {
                    notificationMsg += ` সাথে ${sess.xp_stake} XP বাজি বোনাস পেয়েছেন!`;
                }
                if (sess.pollen_stake > 0) {
                    notificationMsg += ` সাথে ${sess.pollen_stake} মধুরেণু বাজি বোনাস পেয়েছেন!`;
                }
            } else {
                notificationTitle = 'Battle Victory!';
                notificationMsg = `Congrats! You won the battle. Rewards: +${normalXp} XP and +${normalPollen} Pollen.`;
                if (sess.xp_stake > 0) {
                    notificationMsg += ` Plus you earned ${sess.xp_stake} XP stake bonus!`;
                }
                if (sess.pollen_stake > 0) {
                    notificationMsg += ` Plus you earned ${sess.pollen_stake} Pollen stake bonus!`;
                }
            }
        } else if (isWinner && !isEligible) {
            if (language === 'bn') {
                notificationTitle = 'ব্যাটেল বিজয়!';
                notificationMsg = `আপনি ব্যাটেলে জিতেছেন কিন্তু রিওয়ার্ড পেতে নূন্যতম ৫০% সঠিক উত্তর দিতে হবে।`;
            } else {
                notificationTitle = 'Battle Victory!';
                notificationMsg = `You won the battle but minimum 50% accuracy is required for rewards.`;
            }
        } else {
            if (language === 'bn') {
                notificationTitle = 'ব্যাটেল পরাজয়';
                notificationMsg = `আপনি ব্যাটেলে পরাজিত হয়েছেন।`;
                if (sess.xp_stake > 0) {
                    notificationMsg += ` আপনার বাজি ধরা ${sess.xp_stake} XP কেটে নেওয়া হয়েছে।`;
                }
                if (sess.pollen_stake > 0) {
                    notificationMsg += ` আপনার বাজি ধরা ${sess.pollen_stake} মধুরেণু কেটে নেওয়া হয়েছে।`;
                }
            } else {
                notificationTitle = 'Battle Defeat';
                notificationMsg = `You were defeated in the battle.`;
                if (sess.xp_stake > 0) {
                    notificationMsg += ` Your staked ${sess.xp_stake} XP was deducted.`;
                }
                if (sess.pollen_stake > 0) {
                    notificationMsg += ` Your staked ${sess.pollen_stake} Pollen was deducted.`;
                }
            }
        }

        supabase.from('notifications').insert({
            user_id: user.id,
            actor_id: sess.player1_id === user.id ? sess.player2_id : sess.player1_id,
            type: 'battle_result',
            title: notificationTitle,
            message: notificationMsg,
            is_read: false,
            data: {
                is_winner: isWinner,
                is_eligible: isEligible,
                xp_stake: sess.xp_stake,
                pollen_stake: sess.pollen_stake,
                normal_xp: normalXp,
                normal_pollen: normalPollen,
                display_title: notificationTitle,
                display_msg: notificationMsg
            }
        }).then(({ error }) => {
            if (error) console.error('Error inserting battle notification:', error);
        });
    }, [user?.id, language]);

    const moveToNextQuestion = useCallback(async () => {
        const currentIdx = qIndexRef.current;
        const total = Math.min(TOTAL_QUESTIONS, questionsRef.current.length);

        if (currentIdx + 1 >= total) {
            await finishGame();
        } else {
            setQIndex(prev => prev + 1);
        }
    }, [finishGame]);

    const scheduleNextQuestion = useCallback(() => {
        clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = setTimeout(() => {
            moveToNextQuestion();
        }, 2000);
    }, [moveToNextQuestion]);

    const handleTimeUp = useCallback(() => {
        if (isAnswerLockedRef.current || phaseRef.current !== 'game') return;
        setIsAnswerLocked(true);
        isAnswerLockedRef.current = true;
        setSelectedOption('timeout');

        // Broadcast progress even on timeout to sync opponent's view
        if (!isBotRef.current) {
            const currentScore = myScoreRef.current;
            const currentCorrect = myCorrectRef.current;
            const nextIdx = qIndexRef.current + 1;

            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'score_update',
                    payload: { user_id: user?.id, score: currentScore, correct: currentCorrect, qIndex: nextIdx }
                });
            }
            if (sessionRef.current?.id) {
                const field = isPlayer1Ref.current
                    ? { player1_score: currentScore, player1_correct: currentCorrect, player1_q_index: nextIdx }
                    : { player2_score: currentScore, player2_correct: currentCorrect, player2_q_index: nextIdx };
                supabase.from('battle_sessions').update(field).eq('id', sessionRef.current.id).then(() => { });
            }
        }

        scheduleNextQuestion();
    }, [scheduleNextQuestion, user?.id]);

    const handleAnswer = useCallback(async (option) => {
        if (isAnswerLockedRef.current || phaseRef.current !== 'game') return;
        clearInterval(timerRef.current);
        setIsAnswerLocked(true);
        isAnswerLockedRef.current = true;
        setSelectedOption(option.id);

        const correct = option.is_correct;
        const speedBonus = calcSpeed(timeLeft);
        const gained = correct ? (MAX_SCORE_PER_Q + speedBonus) : 0;

        const newScore = myScoreRef.current + gained;
        const newCorrect = myCorrectRef.current + (correct ? 1 : 0);
        setMyScore(newScore);
        if (correct) setMyCorrect(newCorrect);

        if (!isBotRef.current) {
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'score_update',
                    payload: { user_id: user?.id, score: newScore, correct: newCorrect, qIndex: qIndexRef.current + 1 }
                });
            }
            if (sessionRef.current?.id) {
                const field = isPlayer1Ref.current
                    ? { player1_score: newScore, player1_correct: newCorrect, player1_q_index: qIndexRef.current + 1 }
                    : { player2_score: newScore, player2_correct: newCorrect, player2_q_index: qIndexRef.current + 1 };
                supabase.from('battle_sessions').update(field).eq('id', sessionRef.current.id).then(() => { });
            }
        }

        scheduleNextQuestion();
    }, [isAnswerLocked, timeLeft, user?.id, scheduleNextQuestion]);

    const handleExitGame = () => {
        setShowExitConfirm(true);
    };

    const confirmExit = async () => {
        if (!isBotRef.current && sessionRef.current?.id) {
            const { error } = await supabase.from('battle_sessions')
                .update({ status: 'cancelled' })
                .eq('id', sessionRef.current.id);
            if (error) console.error('Error cancelling session on exit:', error);
        }
        handleReset();
        setShowExitConfirm(false);
    };


    useEffect(() => {
        if (phase !== 'game') return;

        setTimeLeft(QUESTION_TIME);
        setIsAnswerLocked(false);
        isAnswerLockedRef.current = false;
        setSelectedOption(null);

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(timerRef.current);
            clearTimeout(autoAdvanceRef.current);
        };
    }, [qIndex, phase]); // Removed handleTimeUp to prevent feedback loop

    useEffect(() => {
        if (phase === 'result' && !isSavingRecord && user?.id) {
            saveBattleResult();
        }
    }, [phase]);

    const saveBattleResult = async () => {
        setIsSavingRecord(true);
        try {
            const finalResult = myScoreRef.current === oppScoreRef.current ? 'draw' : (myScoreRef.current > oppScoreRef.current ? 'win' : 'loss');
            const isWinner = finalResult === 'win';
            const accuracyPercent = qIndexRef.current > 0 ? Math.round((myCorrectRef.current / qIndexRef.current) * 100) : 0;
            const isEligible = accuracyPercent >= 50;

            // Use secure stored procedure for result storage & anti-cheat
            await supabase.rpc('record_battle_result', {
                p_opponent_id: isBotRef.current ? null : (opponentProfile?.id || null),
                p_opponent_name: oppName || 'Opponent',
                p_opponent_avatar: opponentProfile?.avatar_url || null,
                p_my_score: myScoreRef.current,
                p_opponent_score: oppScoreRef.current,
                p_my_correct: myCorrectRef.current,
                p_is_bot: isBotRef.current,
                p_is_initiator: isPlayer1Ref.current,
                p_xp_stake: sessionRef.current?.xp_stake || 0,
                p_pollen_stake: sessionRef.current?.pollen_stake || 0
            });

            fetchHistory(0);
        } catch (err) {
            console.error('Error saving history via RPC:', err);
        }
    };

    const fetchHistory = useCallback(async (page = 0) => {
        if (!user?.id) return;
        const PAGE_SIZE = 10;
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        setIsLoadingHistory(true);
        try {
            const { data, count, error } = await supabase
                .from('battle_history')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (data) {
                setBattleHistory(data);
                if (count !== null) setTotalHistory(count);
                setHistoryPage(page);
            }
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setIsLoadingHistory(false);
        }
    }, [user?.id]);

    const handleOpenHistory = () => {
        fetchHistory(0);
        setShowHistory(true);
    };

    const handleCopyRoomCode = () => {
        if (!roomCode) return;

        const doCopy = (text) => {
            if (navigator.clipboard && window.isSecureContext) {
                return navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                return new Promise((res, rej) => {
                    document.execCommand('copy') ? res() : rej();
                    textArea.remove();
                });
            }
        };

        doCopy(roomCode)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => {
                console.error('Failed to copy room code');
            });
    };

    const handleToggleBattleMode = async () => {
        if (isUpdatingMode) return;
        setIsUpdatingMode(true);
        const newMode = !battleMode;
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ battle_mode: newMode })
                .eq('id', user.id);
            if (!error) {
                setBattleMode(newMode);
            }
        } catch (err) {
            console.error('Error updating battle mode:', err);
        } finally {
            setIsUpdatingMode(false);
        }
    };

    const currentQ = questions[qIndex];
    const myProgress = Math.min((qIndex) / Math.max(questions.length, 1) * 100, 100);
    const oppProgress = Math.min((oppQIndex) / Math.max(questions.length, 1) * 100, 100);
    const myAcc = qIndex > 0 ? Math.round((myCorrect / qIndex) * 100) : 0;
    const oppAcc = qIndex > 0 ? Math.round((oppCorrect / qIndex) * 100) : 0;
    const myName = userProfile?.full_name || userProfile?.display_name || 'আমি';
    const oppName = opponentProfile?.full_name || opponentProfile?.display_name || 'প্রতিপক্ষ';
    const isWinner = myScore > oppScore;
    const isDraw = myScore === oppScore;
    const isEligible = myAcc >= 50;

    // ── LOBBY ─────────────────────────────────────────────────
    if (phase === 'lobby' && allCourses.length === 0 && isLoadingCourses) {
        return <BattleSkeleton />;
    }

    if (phase === 'lobby') return (
        <div key="phase-lobby" className={styles.lobbyWrap}>
            <AnimatePresence>
                {showHistory && (
                    <HistoryModal
                        history={battleHistory}
                        onClose={() => setShowHistory(false)}
                        language={language}
                        currentPage={historyPage}
                        totalCount={totalHistory}
                        onPageChange={fetchHistory}
                        isLoading={isLoadingHistory}
                    />
                )}
            </AnimatePresence>

            <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <motion.div
                    initial={{ opacity: 0, y: 32, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className={`${styles.lobbyCard} ${!battleMode ? styles.lobbyCardDisabled : ''}`}
                >
                    {/* Floating Controls */}
                    <div className={styles.modeToggleFloating}>
                        <button
                            className={`${styles.toggleSwitchSmall} ${battleMode ? styles.toggleOn : styles.toggleOff}`}
                            onClick={handleToggleBattleMode}
                            disabled={isUpdatingMode}
                            title={language === 'bn' ? 'ব্যাটেল মোড' : 'Battle Mode'}
                        >
                            <span className={styles.toggleKnobSmall} />
                        </button>
                    </div>

                    <div className={styles.historyBtnFloating}>
                        <button className={styles.iconBtnMinimal} onClick={handleOpenHistory}>
                            <History size={18} />
                        </button>
                    </div>

                    {/* Hero Section */}
                    <div className={styles.lobbyHero}>
                        <div className={styles.vsCircle}>
                            <motion.div
                                animate={battleMode ? {
                                    rotate: [-5, 5],
                                    scale: [1, 1.1],
                                    opacity: 1
                                } : {
                                    rotate: 0,
                                    scale: 1,
                                    opacity: 1
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    repeatType: "reverse"
                                }}
                            >
                                <Swords size={48} strokeWidth={2.5} />
                            </motion.div>
                        </div>
                        <h2 className={styles.lobbyTitle}>
                            {language === 'bn' ? 'লাইভ কুইজ ব্যাটেল' : 'Live Quiz Battle'}
                        </h2>
                        <p className={styles.lobbySubtitle}>
                            {language === 'bn' ? 'অন্যদের সাথে রিয়েল-টাইমে প্রতিযোগিতা করুন এবং সর্বোচ্চ স্কোর তুলুন!' : 'Compete in real-time and achieve the ultimate victory!'}
                        </p>
                    </div>

                    {/* Challenge Indicator */}
                    {challengeProfile && (
                        <motion.div
                            className={styles.challengeIndicator}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className={styles.challengePulse} />
                            <span>
                                {language === 'bn' ? 'চ্যালেঞ্জ করছেন: ' : 'Challenging: '}
                                <strong>{challengeProfile.full_name || challengeProfile.display_name}</strong>
                            </span>
                            <button
                                className={styles.cancelChallenge}
                                onClick={() => {
                                    setChallengeId(null);
                                    setChallengeProfile(null);
                                    const newParams = new URLSearchParams(searchParams);
                                    newParams.delete('challengeId');
                                    setSearchParams(newParams, { replace: true });
                                }}
                            >
                                <X size={14} />
                            </button>
                        </motion.div>
                    )}

                    {/* Lobby Actions */}
                    <div className={styles.lobbyActions}>
                        <div className={styles.selectGroup}>
                            <label className={styles.selectLabel}>{language === 'bn' ? 'কোর্স নির্বাচন করুন' : 'Select Course'}</label>
                            {isLoadingCourses ? (
                                <div className={styles.selectLoader}><Loader2 className={styles.spin} size={20} /></div>
                            ) : (
                                <CustomSelect
                                    value={selectedCourse?.id || ''}
                                    onChange={(e) => {
                                        const course = allCourses.find(c => c.id === e.target.value);
                                        setSelectedCourse(course);
                                        cachedSelectedCourse = course;
                                        setSelectedModule(null);
                                        cachedSelectedModule = null;
                                        if (course) fetchModules(course.id);
                                    }}
                                    options={allCourses.map(c => ({ value: c.id, label: c.title }))}
                                    placeholder={language === 'bn' ? 'কোর্স...' : 'Course...'}
                                />
                            )}
                        </div>

                        {selectedCourse ? (
                            <motion.div 
                                key="selected-course-module-select"
                                className={styles.selectGroup}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <label className={styles.selectLabel}>
                                    {t('select_module')} {language === 'bn' ? '(ঐচ্ছিক)' : '(Optional)'}
                                </label>
                                {isLoadingModules ? (
                                    <div className={styles.selectLoader}><Loader2 className={styles.spin} size={18} /></div>
                                ) : (
                                    <CustomSelect
                                        value={selectedModule?.id || ''}
                                        onChange={(e) => {
                                            const mod = allModules.find(m => m.id === e.target.value);
                                            setSelectedModule(mod);
                                            cachedSelectedModule = mod;
                                        }}
                                        options={allModules.map(m => ({ value: m.id, label: m.title }))}
                                        disabled={!battleMode}
                                        placeholder={language === 'bn' ? '-- সকল মডিউল --' : '-- All Modules --'}
                                    />
                                )}
                            </motion.div>
                        ) : null}

                        <motion.button
                            className={styles.createBtn}
                            onClick={() => handleCreateRoom()}
                            disabled={!battleMode || !selectedCourse}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Zap size={18} fill="currentColor" />
                            {language === 'bn' ? 'ব্যাটেল শুরু করুন' : 'Start Battle'}
                        </motion.button>

                        <BattleModeSelector
                            language={language}
                            value={matchMode}
                            onChange={setMatchMode}
                            difficulty={difficulty}
                            onDifficultyChange={setDifficulty}
                        />

                        {matchMode !== 'bot' ? (
                            <div key="battle-bet-wrapper" style={{ width: '100%', minWidth: '100%' }}>
                                <BattleBetSelector
                                    language={language}
                                    value={betInfo}
                                    onChange={setBetInfo}
                                />
                            </div>
                        ) : null}
                    </div>
                </motion.div>

                {/* Quick Enable Overlay */}
                <AnimatePresence>
                    {!battleMode && (
                        <motion.div
                            className={styles.disabledOverlay}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div 
                                className={styles.noticeCard}
                                initial={{ scale: 0.9, y: 10 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 10 }}
                            >
                                <div className={styles.noticeIconWrap}>
                                    <XCircle size={48} strokeWidth={2.5} />
                                </div>
                                <div className={styles.noticeContentCenter}>
                                    <h3>{language === 'bn' ? 'ব্যাটেল মোড বন্ধ আছে' : 'Battle Mode Inactive'}</h3>
                                    <p>
                                        {language === 'bn' 
                                            ? 'সেরাদের সাথে লাইভ ব্যাটেলে অংশ নিতে মোডটি চালু করুন' 
                                            : 'Enable battle mode to challenge others and compete on the leaderboard.'}
                                    </p>
                                </div>
                                <button 
                                    className={styles.enableQuickBtn} 
                                    onClick={handleToggleBattleMode}
                                    disabled={isUpdatingMode}
                                >
                                    {isUpdatingMode ? (
                                        <Loader2 size={18} className={styles.spin} />
                                    ) : (
                                        <>
                                            <Power size={16} strokeWidth={3} />
                                            {language === 'bn' ? 'ব্যাটেল অন করুন' : 'Enable Battle Mode'}
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );



    // ── SEARCHING (created room, waiting) ─────────────────────
    if (phase === 'searching') return (
        <div key="phase-searching" className={styles.lobbyWrap}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.searchingCard}
            >
                {/* HUD: Top Status & Countdown */}
                <div className={styles.countdownTop}>
                    <div className={styles.countdownNum}>{searchCountdown}s</div>
                </div>

                <div className={styles.matchmakingGrid}>
                    {/* LEFT: MY PROFILE */}
                    <motion.div
                        className={styles.playerSide}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className={styles.playerAvatar}>
                            <Avatar url={userProfile?.avatar_url} name={myName} size={70} />
                        </div>
                        <div className={styles.playerName}>{myName}</div>
                    </motion.div>

                    {/* CENTER: VS SEPARATOR */}
                    <motion.div
                        className={styles.vsContainer}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{
                            scale: 1,
                            rotate: 0
                        }}
                        transition={{ type: "spring", delay: 0.4 }}
                    >
                        <motion.div
                            className={styles.vsBadge}
                            animate={{
                                scale: [1, 1.1, 1],
                                rotate: [-10, -5, -12, -10],
                                filter: ["brightness(1) contrast(1)", "brightness(1.2) contrast(1.1)", "brightness(1) contrast(1)"]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <motion.span
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            >
                                VS
                            </motion.span>
                        </motion.div>
                    </motion.div>

                    {/* RIGHT: SEARCHING AREA */}
                    <div className={styles.searchingSide}>
                        {/* Rotating Radar Sweep */}
                        <motion.div
                            className={styles.radarSweep}
                            animate={{ rotate: 360 }}
                            transition={{
                                duration: 5,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                        />

                        {/* Center Search Icon Animation (Scanning Motion) */}
                        <motion.div
                            className={styles.centerSearchIcon}
                            animate={{
                                x: [0, 15, -15, 0],
                                y: [0, -10, 10, 0],
                                rotate: [0, 20, -20, 0],
                                scale: [1, 1.15, 1]
                            }}
                            transition={{
                                duration: 5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <Search size={32} strokeWidth={2.5} />
                        </motion.div>

                        {/* Radar Rings */}
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <motion.div
                                key={i}
                                className={styles.radarRing}
                                initial={{ scale: 1, opacity: 0 }}
                                animate={{ scale: 3.5, opacity: [0, 0.6, 0] }}
                                transition={{
                                    duration: 6,
                                    repeat: Infinity,
                                    delay: i * 0.9,
                                    ease: "easeOut"
                                }}
                            />
                        ))}

                        {/* Floating phantom profiles */}
                        {[1, 2, 3].map(i => (
                            <motion.div
                                key={i}
                                className={styles.phantomAvatar}
                                animate={{
                                    x: [Math.random() * 80 - 40, Math.random() * 80 - 40],
                                    y: [Math.random() * 80 - 40, Math.random() * 80 - 40],
                                    opacity: [0, 0.6, 0]
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    delay: i * 1,
                                    ease: "easeInOut"
                                }}
                            >
                                <User size={16} />
                            </motion.div>
                        ))}
                    </div>
                </div>

            </motion.div>

            {/* SEPARATE FOOTER SECTION */}
            <motion.div
                className={styles.searchingFooter}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <motion.button
                    className={styles.cancelBtn}
                    onClick={handleReset}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </motion.button>
            </motion.div>
        </div>
    );

    // ── SEARCH FAILED (No opponent found for PvP) ─────────────
    if (phase === 'search_failed') return (
        <div key="phase-search-failed" className={styles.lobbyWrap}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.searchingCard}
                style={{
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '20px',
                    minHeight: '350px',
                    padding: '2.5rem',
                    position: 'relative'
                }}
            >
                {/* Close Button Top Right */}
                <button
                    onClick={handleReset}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <X size={20} />
                </button>

                <div style={{ color: 'var(--color-danger)', display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                    <UserX size={48} strokeWidth={1.5} />
                </div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text)', fontWeight: '800', lineHeight: '1.4', maxWidth: '340px' }}>
                    {language === 'bn' ? 'ওহ! এখানে কোনো শিক্ষার্থী নেই। কিছুক্ষণ পরে আবার দেখুন' : 'Oh! No learners found here. Please check back later.'}
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', maxWidth: '300px', lineHeight: '1.5' }}>
                    {language === 'bn' 
                        ? 'লাইভ ব্যাটেল খেলার জন্য কোনো সক্রিয় লার্নার পাওয়া যায়নি। আপনি আবার চেষ্টা করতে পারেন অথবা এআই বটের সাথে খেলতে পারেন।' 
                        : 'No active learners were found for the PvP match. You can try again or play against an AI bot.'}
                </p>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', width: '100%', justifyContent: 'center' }}>
                    <motion.button
                        className={styles.createBtn}
                        style={{ padding: '10px 16px', flex: 1, minWidth: '130px', maxWidth: '160px', height: '70px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        onClick={() => handleCreateRoom()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <RotateCcw size={20} />
                        <span style={{ whiteSpace: 'nowrap' }}>{language === 'bn' ? 'পুনরায় খুঁজুন' : 'Search Again'}</span>
                    </motion.button>
                    <motion.button
                        className={styles.createBtn}
                        style={{ padding: '10px 16px', flex: 1, minWidth: '130px', maxWidth: '160px', height: '70px', fontSize: '0.82rem', background: 'transparent', border: '1px solid #ffffff', color: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        onClick={() => {
                            matchModeRef.current = 'bot';
                            setMatchMode('bot');
                            handleCreateRoom();
                        }}
                        whileHover={{ scale: 1.05, background: 'rgba(255, 255, 255, 0.1)' }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Brain size={20} />
                        <span style={{ whiteSpace: 'nowrap' }}>{language === 'bn' ? 'এআই এজেন্ট' : 'AI Agent'}</span>
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );

    // ── MATCHMAKING (countdown) ───────────────────────────────
    if (phase === 'matchmaking') return (
        <div key="phase-matchmaking" className={styles.lobbyWrap}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={styles.matchmakingCard}
            >
                <div className={styles.splitScreen}>
                    <div className={styles.playerPanel}>
                        <Avatar url={userProfile?.avatar_url} name={myName} size={64} />
                        <div className={styles.playerLevel}>
                            {getTierName(userProfile?.league_id || 1, language)}
                        </div>
                        <span className={styles.playerName}>{myName}</span>
                    </div>

                    <motion.div
                        className={styles.vsBadge}
                        animate={{
                            scale: [1, 1.15, 1],
                            rotate: [-12, -8, -14, -12],
                        }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <motion.span
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            VS
                        </motion.span>
                    </motion.div>

                    <div className={styles.playerPanel}>
                        <Avatar url={opponentProfile?.avatar_url} name={oppName} size={64} />
                        {isVsBot ? (
                            <span className={styles.botBadge}>🤖 {language === 'bn' ? 'এআই এজেন্ট' : 'AI agent'}</span>
                        ) : (
                            <div className={styles.playerLevel}>
                                {getTierName(opponentProfile?.league_id || 1, language)}
                            </div>
                        )}
                        <span className={styles.playerName}>{oppName}</span>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className={styles.startingLabel}
                >
                    <Loader2 size={16} className={styles.spin} />
                    {language === 'bn' ? 'ব্যাটল শুরু হচ্ছে...' : 'Battle starting...'}
                </motion.div>
            </motion.div>
        </div>
    );

    // ── GAME ──────────────────────────────────────────────────
    if (phase === 'game') return (
        <div key="phase-game" className={styles.gameWrap}>
            <AnimatePresence>
                {showExitConfirm && (
                    <ExitModal
                        language={language}
                        onConfirm={confirmExit}
                        onCancel={() => setShowExitConfirm(false)}
                    />
                )}
            </AnimatePresence>

            <button
                className={styles.gameExitBtn}
                onClick={handleExitGame}
                title={language === 'bn' ? 'বের হয়ে যান' : 'Exit Battle'}
            >
                <X size={18} />
            </button>

            <div className={styles.gameHeader}>
                {/* LEFT SIDE: YOU */}
                <div className={styles.playerWrapper}>
                    <div className={styles.playerTop}>
                        <Avatar url={userProfile?.avatar_url} name={myName} size={32} />
                        <span className={styles.scoreValue}>{myScore}</span>
                    </div>
                    <div className={styles.progressBar}>
                        <motion.div
                            className={styles.progressFill}
                            style={{ background: 'var(--color-primary)' }}
                            animate={{ width: `${myProgress}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>

                {/* CENTER: TIMER */}
                <div className={`${styles.timerCircle} ${timeLeft <= 5 ? styles.timerUrgent : ''}`}>
                    <span>{timeLeft}</span>
                </div>

                {/* RIGHT SIDE: OPPONENT */}
                <div className={styles.playerWrapper} style={{ alignItems: 'flex-end' }}>
                    <div className={styles.playerTop} style={{ flexDirection: 'row-reverse' }}>
                        <Avatar url={opponentProfile?.avatar_url} name={oppName} size={32} />
                        <span className={styles.scoreValue}>{oppScore}</span>
                    </div>
                    <div className={styles.progressBar}>
                        <motion.div
                            className={styles.progressFill}
                            style={{ background: '#E74C3C', marginLeft: 'auto' }}
                            animate={{ width: `${oppProgress}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {!opponentOnline && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={styles.offlineBanner}
                    >
                        <WifiOff size={14} />
                        {language === 'bn' ? 'প্রতিপক্ষ ডিসকানেক্ট হয়েছেন' : 'Opponent disconnected'}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={styles.qCounter}>
                <span>{language === 'bn' ? `প্রশ্ন ${qIndex + 1} / ${Math.min(TOTAL_QUESTIONS, questions.length)}` : `Question ${qIndex + 1} / ${Math.min(TOTAL_QUESTIONS, questions.length)}`}</span>
            </div>

            <AnimatePresence mode="wait">
                {currentQ && (
                    <motion.div
                        key={qIndex}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
                        className={styles.questionSection}
                    >
                        <h2 className={styles.questionTitle}>
                            {currentQ.question_text}
                        </h2>

                        {selectedOption === 'timeout' && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={styles.timeoutWarning}
                            >
                                {language === 'bn' ? 'সময় শেষ!' : 'Time Up!'}
                            </motion.div>
                        )}

                        <div className={styles.optionsList}>
                            {(currentQ.mcq_options || []).map((opt, optIdx) => {
                                const isSelected = selectedOption === opt.id;
                                const showCorrect = isAnswerLocked && opt.is_correct;
                                const showWrong = isAnswerLocked && isSelected && !opt.is_correct;

                                return (
                                    <button
                                        key={opt.id}
                                        className={`
                                            ${styles.optionBtn}
                                            ${isSelected ? styles.optionSelected : ''}
                                            ${showCorrect ? styles.optionCorrect : ''}
                                            ${showWrong ? styles.optionWrong : ''}
                                        `}
                                        onClick={() => handleAnswer(opt)}
                                        disabled={isAnswerLocked}
                                    >
                                        <div className={styles.optionIndex}>
                                            {optionLabels[optIdx]}
                                        </div>
                                        <span className={styles.optionText}>{opt.option_text}</span>

                                        {showCorrect && (
                                            <div className={styles.feedbackIcon}>
                                                <CheckCircle2 size={24} color="var(--color-success)" strokeWidth={2.5} />
                                            </div>
                                        )}
                                        {showWrong && (
                                            <div className={styles.feedbackIcon}>
                                                <XCircle size={24} color="var(--color-danger)" strokeWidth={2.5} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    // ── RESULT ────────────────────────────────────────────────
    if (phase === 'result') return (
        <div key="phase-result" className={styles.resultWrap}>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', bounce: 0.3 }}
                className={styles.resultCard}
            >
                <div className={styles.resultHero}>
                    {isDraw ? (
                        <div className={styles.drawBadge}>
                            <Shield size={34} />
                            <h3>{language === 'bn' ? 'ড্র!' : 'Draw!'}</h3>
                        </div>
                    ) : (
                        <div className={styles.winnerBadge}>
                            {isWinner && (
                                <div className={styles.fireworksWrapper}>
                                    <LottieWrapper src="/models/Fireworks.lottie" />
                                </div>
                            )}

                            <motion.div
                                animate={{ rotate: [-8, 8, -8] }}
                                transition={{ repeat: Infinity, duration: 1.4 }}
                                style={{ position: 'relative', zIndex: 2 }}
                            >
                                <Trophy size={40} className={isWinner ? styles.trophyGold : styles.trophySilver} />
                            </motion.div>
                            <h3>{isWinner
                                ? (language === 'bn' ? 'আপনি জিতেছেন!' : 'You Won!')
                                : (language === 'bn' ? 'পরাজিত' : 'Defeated')}</h3>
                        </div>
                    )}
                </div>

                {isWinner && isEligible ? (
                    <motion.div
                        className={styles.rewardSummary}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <div className={styles.rewardItem}>
                            <Star size={14} fill="var(--color-primary)" color="var(--color-primary)" />
                            <span>+{Math.round((myCorrect / TOTAL_QUESTIONS) * 10)} XP</span>
                        </div>
                        {isWinner && (
                            <div className={styles.rewardItem}>
                                <PollenIcon size={14} />
                                <span>+2 {language === 'bn' ? 'মধুরেণু' : 'Pollen'}</span>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    isWinner && (
                        <motion.div
                            className={styles.rewardNotice}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Shield size={14} className={styles.noticeIcon} />
                            <span>
                                {language === 'bn'
                                    ? 'রিওয়ার্ড পেতে নূন্যতম ৫০% সঠিক উত্তর দিতে হবে'
                                    : 'Minimum 50% correct answers required for rewards'}
                            </span>
                        </motion.div>
                    )
                )}

                {(session?.xp_stake > 0 || session?.pollen_stake > 0) && (
                    <motion.div
                        className={styles.rewardSummary}
                        style={{
                            background: (isWinner && isEligible) ? 'rgba(46, 204, 113, 0.12)' : (!isWinner ? 'rgba(231, 76, 60, 0.12)' : 'rgba(255, 255, 255, 0.05)'),
                            border: (isWinner && isEligible) ? '1px solid rgba(46, 204, 113, 0.3)' : (!isWinner ? '1px solid rgba(231, 76, 60, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'),
                            opacity: (isWinner && !isEligible) ? 0.6 : 1
                        }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        {session?.xp_stake > 0 && (
                            <div className={styles.rewardItem} style={{ 
                                color: (isWinner && isEligible) ? '#f1c40f' : (!isWinner ? '#e74c3c' : '#afafaf'),
                                background: 'transparent',
                                border: 'none'
                            }}>
                                <Star size={14} fill={(isWinner && isEligible) ? '#f1c40f' : (!isWinner ? '#e74c3c' : '#afafaf')} color={(isWinner && isEligible) ? '#f1c40f' : (!isWinner ? '#e74c3c' : '#afafaf')} />
                                <span>
                                    {isWinner ? (isEligible ? '+' : '+0 ') : '-'}
                                    {session?.xp_stake} XP {language === 'bn' ? '(বাজি)' : '(Bet)'}
                                </span>
                            </div>
                        )}
                        {session?.pollen_stake > 0 && (
                            <div className={styles.rewardItem} style={{ 
                                color: (isWinner && isEligible) ? '#f1c40f' : (!isWinner ? '#e74c3c' : '#afafaf'),
                                background: 'transparent',
                                border: 'none'
                            }}>
                                <PollenIcon size={14} />
                                <span>
                                    {isWinner ? (isEligible ? '+' : '+0 ') : '-'}
                                    {session?.pollen_stake} {language === 'bn' ? 'মধুরেণু (বাজি)' : 'Pollen (Bet)'}
                                </span>
                            </div>
                        )}
                    </motion.div>
                )}


                <div className={styles.scoreComparison}>
                    <div className={`${styles.scoreBlock} ${isWinner ? styles.scoreBlockWinner : ''}`}>
                        <Avatar url={userProfile?.avatar_url} name={myName} size={40} />
                        <span className={styles.finalScore}>{myScore}</span>
                        <span className={styles.finalName}>{myName}</span>
                        <div className={styles.statRow}>
                            <CheckCircle2 size={11} color="#f1c40f" />
                            <span>{myCorrect}/{Math.min(TOTAL_QUESTIONS, questions.length)}</span>
                            <span>·</span>
                            <span>{myAcc}%</span>
                        </div>
                    </div>
                    <div className={styles.vsSmall}>VS</div>
                    <div className={`${styles.scoreBlock} ${!isWinner && !isDraw ? styles.scoreBlockWinner : ''}`}>
                        <Avatar url={opponentProfile?.avatar_url} name={oppName} size={40} />
                        <span className={styles.finalScore}>{oppScore}</span>
                        <span className={styles.finalName}>{oppName}</span>
                        <div className={styles.statRow}>
                            <CheckCircle2 size={11} color="#f1c40f" />
                            <span>{oppCorrect}/{Math.min(TOTAL_QUESTIONS, questions.length)}</span>
                        </div>
                    </div>
                </div>

                <button className={styles.createBtn} onClick={handleReset}>
                    <RotateCcw size={15} />
                    {language === 'bn' ? 'আবার খেলুন' : 'Play Again'}
                </button>
            </motion.div>

            <AnimatePresence>
                {showHistory && (
                    <HistoryModal
                        history={battleHistory}
                        totalCount={totalHistory}
                        currentPage={historyPage}
                        onPageChange={fetchHistory}
                        onClose={() => setShowHistory(false)}
                        language={language}
                        isLoading={isLoadingHistory}
                    />
                )}
            </AnimatePresence>
        </div>
    );

    return null;
};

export default BattleWar;
