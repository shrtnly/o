import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { useLanguage } from '../../../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Swords, Trophy, Crown, Zap, Clock, CheckCircle2, XCircle,
    Users, Search, Loader2, Shield, Star, RotateCcw, ChevronRight, ChevronLeft,
    Wifi, WifiOff, Target, Award
} from 'lucide-react';
import styles from './BattleWar.module.css';
import CustomSelect from '../../../components/ui/CustomSelect';
import { toast } from 'sonner';

// ─── constants ────────────────────────────────────────────────
const TOTAL_QUESTIONS = 15;
const QUESTION_TIME = 10; // seconds
const MAX_SCORE_PER_Q = 100;

// ─── helpers ──────────────────────────────────────────────────
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function calcSpeed(timeLeft) {
    return Math.round((timeLeft / QUESTION_TIME) * 50);
}

// ─── sub-components ───────────────────────────────────────────
const ShieldIcon = ({ tier = 1, size = 28 }) => {
    const colors = ['#95a5a6', '#F1C40F', '#E67E22', '#E74C3C', '#8E44AD'];
    const c = colors[Math.min(tier - 1, 4)];
    return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Shield size={size} color={c} fill={c} fillOpacity={0.25} strokeWidth={2} />
        </div>
    );
};

const Avatar = ({ url, name, size = 42 }) => (
    <div className={styles.avatar} style={{ width: size, height: size }}>
        {url
            ? <img src={url} alt={name} />
            : <span style={{ fontSize: size * 0.42, fontWeight: 700, color: 'var(--color-primary)' }}>
                {(name || '?')[0].toUpperCase()}
              </span>
        }
    </div>
);

// ─── main component ───────────────────────────────────────────
const BattleWar = ({ user, userProfile }) => {
    const { t, language } = useLanguage();

    // ── phase: 'lobby' | 'searching' | 'matchmaking' | 'game' | 'result'
    const [phase, setPhase] = useState('lobby');
    const [roomCode, setRoomCode] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [session, setSession] = useState(null);
    const [opponentProfile, setOpponentProfile] = useState(null);
    const [battleMode, setBattleMode] = useState(userProfile?.battle_mode !== false);
    const [isUpdatingMode, setIsUpdatingMode] = useState(false);

    // Setup state
    const [allCourses, setAllCourses] = useState([]);
    const [allModules, setAllModules] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedModule, setSelectedModule] = useState(null);
    const [isLoadingSetup, setIsLoadingSetup] = useState(false);

    // game state
    const [questions, setQuestions] = useState([]);
    const [qIndex, setQIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
    const [myScore, setMyScore] = useState(0);
    const [oppScore, setOppScore] = useState(0);
    const [myCorrect, setMyCorrect] = useState(0);
    const [oppCorrect, setOppCorrect] = useState(0);
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
    useEffect(() => { sessionRef.current = session; }, [session]);
    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { isBotRef.current = isVsBot; }, [isVsBot]);

    const isPlayer1 = session ? session.player1_id === user?.id : false;
    const isPlayer1Ref = useRef(isPlayer1);
    useEffect(() => { isPlayer1Ref.current = isPlayer1; }, [isPlayer1]);

    // Keep latest game state in refs to avoid stale closures
    const myScoreRef = useRef(0);
    const myCorrectRef = useRef(0);
    const oppScoreRef = useRef(0);
    const qIndexRef = useRef(0);
    const questionsRef = useRef([]);
    const isBotGameActive = useRef(false);

    useEffect(() => { myScoreRef.current = myScore; }, [myScore]);
    useEffect(() => { myCorrectRef.current = myCorrect; }, [myCorrect]);
    useEffect(() => { oppScoreRef.current = oppScore; }, [oppScore]);
    useEffect(() => { qIndexRef.current = qIndex; }, [qIndex]);
    useEffect(() => { questionsRef.current = questions; }, [questions]);

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
        let query = supabase
            .from('mcq_questions')
            .select(`
                id, question_text, question_type,
                mcq_options(id, option_text, is_correct, order_index),
                learning_points!inner(
                    chapters!inner(
                        unit_id,
                        units!inner(course_id)
                    )
                )
            `)
            .in('question_type', ['mcq', 'boolean']);

        if (unitId) {
            query = query.eq('learning_points.chapters.unit_id', unitId);
        } else if (courseId) {
            query = query.eq('learning_points.chapters.units.course_id', courseId);
        }

        const { data, error } = await query;
        if (error || !data || data.length === 0) return [];

        // filter out duplicates by text and those with fewer than 2 options
        const uniqueQs = [];
        const seenTexts = new Set();
        (data || []).forEach(q => {
            const text = q.question_text?.trim();
            if (text && !seenTexts.has(text) && q.mcq_options && q.mcq_options.length >= 2) {
                seenTexts.add(text);
                uniqueQs.push(q);
            }
        });
        
        // shuffle and take TOTAL_QUESTIONS
        return [...uniqueQs].sort(() => Math.random() - 0.5).slice(0, TOTAL_QUESTIONS).map(q => ({
            ...q,
            mcq_options: (q.mcq_options || []).sort(() => Math.random() - 0.5)
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
                    } else {
                        setOppScore(s.player1_score || 0);
                        setOppCorrect(s.player1_correct || 0);
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
    const fetchCourses = useCallback(async () => {
        if (!user?.id) return;
        setIsLoadingSetup(true);
        // Only fetch courses the user is enrolled in
        const { data, error } = await supabase
            .from('user_courses')
            .select(`
                course_id,
                courses!inner(id, title)
            `)
            .eq('user_id', user.id);
        
        if (!error && data) {
            // Transform data to get course objects and sort by title
            const enrolledCourses = data
                .map(item => item.courses)
                .filter(Boolean)
                .sort((a, b) => a.title.localeCompare(b.title));
            
            setAllCourses(enrolledCourses);
        }
        setIsLoadingSetup(false);
    }, [user?.id]);

    const fetchModules = useCallback(async (courseId) => {
        setIsLoadingSetup(true);
        const { data } = await supabase.from('units').select('id, title').eq('course_id', courseId).order('order_index');
        if (data) setAllModules(data);
        setIsLoadingSetup(false);
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
            mcq_options: (q.mcq_options || []).sort((a,b) => a.order_index - b.order_index)
        }));
    }, []);

    // ── start game ────────────────────────────────────────────
    const startGame = useCallback((qs) => {
        setPhase('game');
        setQIndex(0);
        setMyScore(0);
        setOppScore(0);
        setMyCorrect(0);
        setOppCorrect(0);
        setSelectedOption(null);
        setIsAnswerLocked(false);
        setTimeLeft(QUESTION_TIME);
    }, []);

    // ── join existing room ────────────────────────────────────
    const handleJoinRoom = useCallback(async (forcedCode = null) => {
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

        // fetch same questions as player1
        const qs = existing.question_ids?.length
            ? await fetchQuestionsByIds(existing.question_ids)
            : await fetchBattleQuestions(null);

        setQuestions(qs);

        // Update session: add player2 and start
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

    const [searchParams, setSearchParams] = useSearchParams();

    // ── Auto-join from URL ────────────────────────────────────
    useEffect(() => {
        const code = searchParams.get('joinCode');
        if (code && user?.id && phase === 'lobby') {
            console.log('Auto-joining battle from URL:', code);
            // Clear param from URL and join
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('joinCode');
            setSearchParams(newParams, { replace: true });
            
            setJoinCode(code);
            handleJoinRoom(code);
        }
    }, [searchParams, user?.id, phase, handleJoinRoom]);

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

    // ── Bot simulation: answer after random delay ────────────
    const scheduleBotAnswer = useCallback((qs, idx) => {
        if (!isBotRef.current || !isBotGameActive.current) return;
        // Bot answers between 2-8 seconds, with ~85% accuracy
        const delay = 2000 + Math.random() * 6000;
        const isCorrect = Math.random() < 0.85;
        setTimeout(() => {
            if (!isBotRef.current || !isBotGameActive.current) return;
            const gained = isCorrect ? (MAX_SCORE_PER_Q + Math.floor(Math.random() * 30)) : 0;
            const newOppScore = oppScoreRef.current + gained;
            const newOppCorrect = oppScoreRef.current + (isCorrect ? 1 : 0);
            setOppScore(newOppScore);
            if (isCorrect) setOppCorrect(prev => prev + 1);
        }, delay);
    }, []);

    // ── Start vs Bot game ─────────────────────────────────────
    const startBotGame = useCallback((qs) => {
        // Clear search timers
        clearTimeout(botTimeoutRef.current);
        clearInterval(searchCountdownRef.current);

        const BOT_NAMES = ['অর্জুন AI', 'প্রজ্ঞা Bot', 'বুদ্ধিমান Bot', 'কিরণ AI'];
        const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];

        setIsVsBot(true);
        isBotRef.current = true;
        isBotGameActive.current = true;

        // Set bot as opponent with a fake profile
        setOpponentProfile({
            id: 'bot',
            full_name: botName,
            display_name: botName,
            avatar_url: null,
            xp: Math.floor(Math.random() * 500) + 200,
            league_id: Math.floor(Math.random() * 3) + 1,
            isBot: true
        });

        setPhase('matchmaking');
        setTimeout(() => {
            startGame(qs);
        }, 3000);
    }, [startGame]);

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
        setJoinCode('');
        setSelectedCourse(null);
        setSelectedModule(null);
    };
    const handleCreateRoom = async () => {
        if (!user?.id) {
            console.error('User not authenticated for Battle War');
            return;
        }
        setPhase('searching');
        setSearchCountdown(20);
        isBotGameActive.current = false;
        setIsVsBot(false);

        const code = generateRoomCode();
        setRoomCode(code);

        // fetch questions from selected module or course
        const qs = await fetchBattleQuestions({ 
            courseId: selectedCourse?.id, 
            unitId: selectedModule?.id 
        });
        const qIds = qs.map(q => q.id);

        if (qIds.length === 0) {
            toast.error("No suitable questions found!");
            setPhase('setup');
            return;
        }

        const { data: newSession, error } = await supabase
            .from('battle_sessions')
            .insert({
                room_code: code,
                player1_id: user.id,
                status: 'waiting',
                question_ids: qIds,
                course_id: selectedCourse?.id
            })
            .select()
            .single();

        if (error || !newSession) { setPhase('lobby'); return; }
        setSession(newSession);
        setQuestions(qs);

        // Insert invitation into DB
        await supabase.from('battle_invitations').insert({
            room_code: code,
            sender_id: user.id,
            course_title: selectedCourse?.title || (language === 'bn' ? 'সাধারণ ব্যাটল' : 'General Battle')
        });

        // ── 20s countdown — then fallback to bot ────────────────
        let countdown = 20;
        setSearchCountdown(20);
        clearInterval(searchCountdownRef.current);
        searchCountdownRef.current = setInterval(() => {
            countdown -= 1;
            setSearchCountdown(countdown);
            if (countdown <= 0) clearInterval(searchCountdownRef.current);
        }, 1000);

        // After 20s with no player, start bot game
        clearTimeout(botTimeoutRef.current);
        botTimeoutRef.current = setTimeout(() => {
            // Only trigger bot if still searching
            if (phaseRef.current === 'searching') {
                clearInterval(searchCountdownRef.current);
                // Clean up the waiting session and invitation
                supabase.from('battle_invitations').delete().eq('room_code', code).eq('sender_id', user.id);
                supabase.from('battle_sessions').update({ status: 'cancelled' }).eq('id', newSession.id);
                supabase.removeChannel(waitChannel);
                startBotGame(qs);
            }
        }, 20000);

        // Wait for real player 2
        const waitChannel = supabase
            .channel(`battle-wait-${newSession.id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'battle_sessions', filter: `id=eq.${newSession.id}` },
                async (payload) => {
                    const s = payload.new;
                    if (s.player2_id && s.status === 'in_game') {
                        // Real player found — cancel bot fallback
                        clearTimeout(botTimeoutRef.current);
                        clearInterval(searchCountdownRef.current);
                        // Clean up invitation
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
    };

    // ── start game ──────────────────────────────────────────── (moved up)

    // ── timer ─────────────────────────────────────────────────
    useEffect(() => {
        if (phase !== 'game') return;
        setTimeLeft(QUESTION_TIME);
        setIsAnswerLocked(false);
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

        return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [qIndex, phase]);

    const handleTimeUp = useCallback(() => {
        if (isAnswerLocked) return;
        setIsAnswerLocked(true);
        setSelectedOption(null);
        scheduleNextQuestion();
    }, [isAnswerLocked]);

    const scheduleNextQuestion = useCallback(() => {
        clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = setTimeout(() => {
            moveToNextQuestion();
        }, 1800);
    }, []);

    const moveToNextQuestion = useCallback(async () => {
        const nextIdx = qIndexRef.current + 1;
        if (nextIdx >= Math.min(TOTAL_QUESTIONS, questionsRef.current.length)) {
            await finishGame();
        } else {
            setQIndex(nextIdx);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const finishGame = useCallback(async () => {
        if (!sessionRef.current?.id) { setPhase('result'); return; }
        const sess = sessionRef.current;
        const myFinalScore = myScoreRef.current;
        const oppFinalScore = oppScoreRef.current;
        const myFinalCorrect = myCorrectRef.current;
        const p1 = isPlayer1Ref.current;

        const winnerId = myFinalScore > oppFinalScore
            ? user?.id
            : myFinalScore < oppFinalScore
                ? (p1 ? sess.player2_id : sess.player1_id)
                : null;

        const updateData = p1
            ? { player1_score: myFinalScore, player1_correct: myFinalCorrect, status: 'finished', winner_id: winnerId, finished_at: new Date().toISOString() }
            : { player2_score: myFinalScore, player2_correct: myFinalCorrect, status: 'finished', winner_id: winnerId, finished_at: new Date().toISOString() };

        await supabase.from('battle_sessions').update(updateData).eq('id', sess.id);
        setPhase('result');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    // ── answer a question ─────────────────────────────────────
    const handleAnswer = useCallback(async (option) => {
        if (isAnswerLocked) return;
        clearInterval(timerRef.current);
        setIsAnswerLocked(true);
        setSelectedOption(option.id);

        const correct = option.is_correct;
        const speedBonus = calcSpeed(timeLeft);
        const gained = correct ? (MAX_SCORE_PER_Q + speedBonus) : 0;

        const newScore = myScoreRef.current + gained;
        const newCorrect = myCorrectRef.current + (correct ? 1 : 0);
        setMyScore(newScore);
        if (correct) setMyCorrect(newCorrect);

        // If vs bot: simulate bot answer, skip real-time channel
        if (isBotRef.current) {
            scheduleBotAnswer(questionsRef.current, qIndexRef.current);
        } else {
            // Broadcast to real opponent
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'score_update',
                    payload: { user_id: user?.id, score: newScore, correct: newCorrect }
                });
            }
            // Persist my score to DB
            if (sessionRef.current?.id) {
                const field = isPlayer1Ref.current
                    ? { player1_score: newScore, player1_correct: newCorrect }
                    : { player2_score: newScore, player2_correct: newCorrect };
                supabase.from('battle_sessions').update(field).eq('id', sessionRef.current.id).then(() => {});
            }
        }

        scheduleNextQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAnswerLocked, timeLeft, scheduleBotAnswer]);

    // ── start game ──────────────────────────────────────────── (moved up)

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

    // ── derived ───────────────────────────────────────────────
    const currentQ = questions[qIndex];
    const myProgress = Math.min((qIndex) / Math.max(questions.length, 1) * 100, 100);
    const oppProgress = Math.min((qIndex) / Math.max(questions.length, 1) * 100, 100);
    const myAcc = qIndex > 0 ? Math.round((myCorrect / qIndex) * 100) : 0;
    const oppAcc = qIndex > 0 ? Math.round((oppCorrect / qIndex) * 100) : 0;
    const myName = userProfile?.full_name || userProfile?.display_name || 'আমি';
    const oppName = opponentProfile?.full_name || opponentProfile?.display_name || 'প্রতিপক্ষ';
    const isWinner = myScore > oppScore;
    const isDraw = myScore === oppScore;

    // ══════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════

    // ── LOBBY ─────────────────────────────────────────────────
    if (phase === 'lobby') return (
        <div className={styles.lobbyWrap}>
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={styles.lobbyCard}
            >
                <div className={styles.lobbyHero}>
                    <div className={styles.vsCircle}>
                        <Swords size={32} />
                    </div>
                    <h2 className={styles.lobbyTitle}>
                        {language === 'bn' ? 'ব্যাটল ওয়ার' : 'Battle War'}
                    </h2>
                    <p className={styles.lobbySubtitle}>
                        {language === 'bn'
                            ? 'রিয়েল-টাইম কুইজ প্রতিযোগিতায় আপনার দক্ষতা প্রমাণ করুন!'
                            : 'Prove your knowledge in a real-time quiz duel!'}
                    </p>
                </div>

                <div className={styles.lobbyActions}>
                    <div className={styles.modeToggleRow}>
                        <div className={styles.modeLabelGroup}>
                            <Zap size={16} className={battleMode ? styles.zapActive : styles.zapInactive} />
                            <span className={styles.modeTitle}>{t('battle_mode')}</span>
                        </div>
                        <button 
                            className={`${styles.toggleSwitch} ${battleMode ? styles.toggleOn : styles.toggleOff}`}
                            onClick={handleToggleBattleMode}
                            disabled={isUpdatingMode}
                        >
                            <span className={styles.toggleKnob} />
                            <span className={styles.toggleText}>
                                {battleMode ? t('battle_mode_active') : t('battle_mode_inactive')}
                            </span>
                        </button>
                    </div>

                    <button 
                        className={styles.createBtn} 
                        onClick={() => {
                            setPhase('setup');
                            fetchCourses();
                        }} 
                        disabled={!battleMode}
                    >
                        <Swords size={18} />
                        {language === 'bn' ? 'নতুন ব্যাটল তৈরি করুন' : 'Create Battle'}
                    </button>

                    <div className={styles.dividerRow}>
                        <span className={styles.divider}>{language === 'bn' ? 'অথবা' : 'or'}</span>
                    </div>

                    <div className={styles.joinRow}>
                        <input
                            className={styles.codeInput}
                            placeholder={language === 'bn' ? 'রুম কোড লিখুন...' : 'Enter room code...'}
                            value={joinCode}
                            onChange={e => setJoinCode(e.target.value.toUpperCase())}
                            maxLength={6}
                        />
                        <button 
                            className={styles.joinBtn} 
                            onClick={handleJoinRoom} 
                            disabled={joinCode.length < 4 || !battleMode}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className={styles.rulesSection}>
                    <div className={styles.ruleItem}><Clock size={14} /><span>{language === 'bn' ? `প্রতিটি প্রশ্নে ${QUESTION_TIME} সেকেন্ড` : `${QUESTION_TIME}s per question`}</span></div>
                    <div className={styles.ruleItem}><Target size={14} /><span>{language === 'bn' ? `${TOTAL_QUESTIONS}টি প্রশ্ন` : `${TOTAL_QUESTIONS} questions`}</span></div>
                    <div className={styles.ruleItem}><Zap size={14} /><span>{language === 'bn' ? 'দ্রুত উত্তরে বেশি পয়েন্ট' : 'Speed = bonus points'}</span></div>
                </div>
            </motion.div>
        </div>
    );

    // ── SETUP (Course/Module Selection) ──────────────────────
    if (phase === 'setup') return (
        <div className={styles.lobbyWrap}>
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.lobbyCard}
                style={{ maxWidth: '420px' }}
            >
                <div className={styles.setupHeader}>
                    <button className={styles.backBtn} onClick={() => setPhase('lobby')}>
                        <ChevronLeft size={20} />
                    </button>
                    <h3 className={styles.setupTitle}>{t('battle_create')}</h3>
                </div>

                <div className={styles.setupBody}>
                    <div className={styles.selectGroup}>
                        <label className={styles.selectLabel}>{t('select_course')}</label>
                        <CustomSelect
                            value={selectedCourse?.id || ''}
                            onChange={(e) => {
                                const course = allCourses.find(c => c.id === e.target.value);
                                setSelectedCourse(course);
                                setSelectedModule(null);
                                if (course) fetchModules(course.id);
                            }}
                            options={allCourses.map(c => ({ value: c.id, label: c.title }))}
                            placeholder={language === 'bn' ? '-- কোর্স --' : '-- Course --'}
                        />
                    </div>

                    <div className={styles.selectGroup}>
                        <label className={styles.selectLabel}>{t('select_module')}</label>
                        {isLoadingSetup ? (
                            <div className={styles.selectLoader}><Loader2 className={styles.spin} size={18} /></div>
                        ) : (
                            <CustomSelect
                                value={selectedModule?.id || ''}
                                onChange={(e) => {
                                    const mod = allModules.find(m => m.id === e.target.value);
                                    setSelectedModule(mod);
                                }}
                                options={allModules.map(m => ({ value: m.id, label: m.title }))}
                                disabled={!selectedCourse}
                                placeholder={language === 'bn' ? '-- সকল মডিউল --' : '-- All Modules --'}
                            />
                        )}
                    </div>
                </div>

                <div className={styles.setupFooter}>
                    <button 
                        className={styles.startBtn}
                        disabled={!selectedCourse || isLoadingSetup}
                        onClick={handleCreateRoom}
                    >
                        <Zap size={18} />
                        {t('start_battle')}
                    </button>
                </div>
            </motion.div>
        </div>
    );

    // ── SEARCHING (created room, waiting) ─────────────────────
    if (phase === 'searching') return (
        <div className={styles.lobbyWrap}>
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className={styles.lobbyCard}
            >
                <div className={styles.searchingHero}>
                    {/* Countdown Ring */}
                    <div className={styles.countdownRing}>
                        <svg viewBox="0 0 100 100" className={styles.countdownSvg}>
                            <circle cx="50" cy="50" r="44" className={styles.countdownTrack} />
                            <circle
                                cx="50" cy="50" r="44"
                                className={styles.countdownFill}
                                strokeDasharray={`${2 * Math.PI * 44}`}
                                strokeDashoffset={`${2 * Math.PI * 44 * (1 - searchCountdown / 20)}`}
                            />
                        </svg>
                        <div className={styles.countdownInner}>
                            <span className={styles.countdownNum}>{searchCountdown}</span>
                            <span className={styles.countdownLabel}>sec</span>
                        </div>
                    </div>

                    <h3 className={styles.lobbyTitle}>
                        {language === 'bn' ? 'প্রতিপক্ষ খোঁজা হচ্ছে...' : 'Finding opponent...'}
                    </h3>
                    <p className={styles.lobbySubtitle}>
                        {searchCountdown > 10
                            ? (language === 'bn' ? 'অন্য লার্নারদের জন্য অপেক্ষা করছি...' : 'Waiting for other learners...')
                            : (language === 'bn' ? 'কেউ না পেলে AI বট দিয়ে শুরু হবে!' : 'No player found, AI bot will join!')
                        }
                    </p>
                    <div className={styles.roomCodeDisplay}>{roomCode}</div>
                </div>
                <button className={styles.cancelBtn} onClick={handleReset}>
                    {language === 'bn' ? 'বাতিল করুন' : 'Cancel'}
                </button>
            </motion.div>
        </div>
    );

    // ── MATCHMAKING (countdown) ───────────────────────────────
    if (phase === 'matchmaking') return (
        <div className={styles.lobbyWrap}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={styles.matchmakingCard}
            >
                <div className={styles.splitScreen}>
                    {/* Player 1 (Me) */}
                    <div className={styles.playerPanel}>
                        <Avatar url={userProfile?.avatar_url} name={myName} size={64} />
                        <ShieldIcon tier={userProfile?.league_id || 1} size={32} />
                        <span className={styles.playerName}>{myName}</span>
                        <span className={styles.youBadge}>{language === 'bn' ? 'আমি' : 'You'}</span>
                    </div>

                    {/* VS */}
                    <div className={styles.vsBadge}>
                        <span>VS</span>
                    </div>

                    {/* Player 2 (Opponent) */}
                    <div className={styles.playerPanel}>
                        <Avatar url={opponentProfile?.avatar_url} name={oppName} size={64} />
                        {isVsBot ? (
                            <span className={styles.botBadge}>🤖 AI Bot</span>
                        ) : (
                            <ShieldIcon tier={opponentProfile?.league_id || 1} size={32} />
                        )}
                        <span className={styles.playerName}>{oppName}</span>
                        {isVsBot && <span className={styles.botSubtext}>{language === 'bn' ? 'কোনো লার্নার পাওয়া যায়নি' : 'No player found'}</span>}
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
        <div className={styles.gameWrap}>
            {/* ── Header: dual progress ── */}
            <div className={styles.gameHeader}>
                {/* Me */}
                <div className={styles.playerHeader}>
                    <Avatar url={userProfile?.avatar_url} name={myName} size={34} />
                    <div className={styles.progressBar}>
                        <motion.div
                            className={styles.progressFill}
                            style={{ background: 'var(--color-primary)' }}
                            animate={{ width: `${myProgress}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                    <span className={styles.scoreLabel}>{myScore}</span>
                </div>

                {/* Timer */}
                <div className={`${styles.timerCircle} ${timeLeft <= 5 ? styles.timerUrgent : ''}`}>
                    <span>{timeLeft}</span>
                </div>

                {/* Opponent */}
                <div className={styles.playerHeader} style={{ flexDirection: 'row-reverse' }}>
                    <Avatar url={opponentProfile?.avatar_url} name={oppName} size={34} />
                    <div className={styles.progressBar}>
                        <motion.div
                            className={styles.progressFill}
                            style={{ background: '#E74C3C', marginLeft: 'auto' }}
                            animate={{ width: `${oppProgress}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                    <span className={styles.scoreLabel}>{oppScore}</span>
                </div>
            </div>

            {/* Offline warning */}
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

            {/* Q counter */}
            <div className={styles.qCounter}>
                <span>{language === 'bn' ? `প্রশ্ন ${qIndex + 1} / ${Math.min(TOTAL_QUESTIONS, questions.length)}` : `Question ${qIndex + 1} / ${Math.min(TOTAL_QUESTIONS, questions.length)}`}</span>
            </div>

            {/* Question & options */}
            <AnimatePresence mode="wait">
                {currentQ && (
                    <motion.div
                        key={qIndex}
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.98 }}
                        transition={{ duration: 0.25 }}
                        className={`${styles.questionCard}`}
                    >
                        <p className={styles.questionText}>{currentQ.question_text}</p>

                        <div className={styles.optionsGrid}>
                            {(currentQ.mcq_options || []).map((opt) => {
                                const isSelected = selectedOption === opt.id;
                                const showCorrect = isAnswerLocked && opt.is_correct;
                                const showWrong = isAnswerLocked && isSelected && !opt.is_correct;

                                return (
                                    <motion.button
                                        key={opt.id}
                                        whileTap={!isAnswerLocked ? { scale: 0.97 } : {}}
                                        className={`${styles.optionBtn}
                                            ${isSelected ? styles.optionSelected : ''}
                                            ${showCorrect ? styles.optionCorrect : ''}
                                            ${showWrong ? styles.optionWrong : ''}
                                        `}
                                        onClick={() => handleAnswer(opt)}
                                        disabled={isAnswerLocked}
                                    >
                                        {opt.option_text}
                                        {showCorrect && <CheckCircle2 size={16} className={styles.feedbackIcon} />}
                                        {showWrong && <XCircle size={16} className={styles.feedbackIcon} />}
                                    </motion.button>
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
        <div className={styles.resultWrap}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', bounce: 0.3 }}
                className={styles.resultCard}
            >
                {/* Winner crown */}
                <div className={styles.resultHero}>
                    {isDraw ? (
                        <div className={styles.drawBadge}>
                            <Shield size={40} />
                            <h3>{language === 'bn' ? 'ড্র!' : 'Draw!'}</h3>
                        </div>
                    ) : (
                        <div className={styles.winnerBadge}>
                            <motion.div
                                animate={{ rotate: [-8, 8, -8] }}
                                transition={{ repeat: Infinity, duration: 1.4 }}
                            >
                                <Crown size={48} className={isWinner ? styles.crownGold : styles.crownSilver} />
                            </motion.div>
                            <h3>{isWinner
                                ? (language === 'bn' ? '🎉 আপনি জিতেছেন!' : '🎉 You Won!')
                                : (language === 'bn' ? 'পরাজিত' : 'Defeated')}</h3>
                        </div>
                    )}
                </div>

                {/* Score comparison */}
                <div className={styles.scoreComparison}>
                    <div className={`${styles.scoreBlock} ${isWinner ? styles.scoreBlockWinner : ''}`}>
                        <Avatar url={userProfile?.avatar_url} name={myName} size={52} />
                        <span className={styles.finalScore}>{myScore}</span>
                        <span className={styles.finalName}>{myName}</span>
                        <div className={styles.statRow}>
                            <CheckCircle2 size={13} color="#2ecc71" />
                            <span>{myCorrect}/{Math.min(TOTAL_QUESTIONS, questions.length)}</span>
                            <span>·</span>
                            <span>{myAcc}%</span>
                        </div>
                    </div>

                    <div className={styles.vsSmall}>VS</div>

                    <div className={`${styles.scoreBlock} ${!isWinner && !isDraw ? styles.scoreBlockWinner : ''}`}>
                        <Avatar url={opponentProfile?.avatar_url} name={oppName} size={52} />
                        <span className={styles.finalScore}>{oppScore}</span>
                        <span className={styles.finalName}>{oppName}</span>
                        <div className={styles.statRow}>
                            <CheckCircle2 size={13} color="#2ecc71" />
                            <span>{oppCorrect}/{Math.min(TOTAL_QUESTIONS, questions.length)}</span>
                        </div>
                    </div>
                </div>

                <button className={styles.createBtn} onClick={handleReset} style={{ marginTop: '1.5rem' }}>
                    <RotateCcw size={16} />
                    {language === 'bn' ? 'আবার খেলুন' : 'Play Again'}
                </button>
            </motion.div>
        </div>
    );

    return null;
};

export default BattleWar;
