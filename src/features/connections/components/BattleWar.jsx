import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { useLanguage } from '../../../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Swords, Trophy, Crown, Zap, Clock, CheckCircle2, XCircle,
    Users, Search, Loader2, Star, RotateCcw, ChevronRight, ChevronLeft,
    Wifi, WifiOff, Target, Award, Copy, User, X
} from 'lucide-react';
import styles from './BattleWar.module.css';
import CustomSelect from '../../../components/ui/CustomSelect';
import { toast } from 'sonner';

// ─── constants ────────────────────────────────────────────────
const TOTAL_QUESTIONS = 15;
const QUESTION_TIME = 15; // seconds
const MAX_SCORE_PER_Q = 100;

// ─── helpers ──────────────────────────────────────────────────
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function calcSpeed(timeLeft) {
    return Math.round((timeLeft / QUESTION_TIME) * 50);
}

// ─── sub-components ───────────────────────────────────────────
const getTierName = (tier) => {
    const tiersEn = ["Bee Kid", "Bee Warrior", "Bee Master", "Bee Champion", "Bee Legend"];
    const idx = Math.min(Math.max((tier || 1) - 1, 0), 4);
    return tiersEn[idx];
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
    useEffect(() => { sessionRef.current = session; }, [session]);
    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { isBotRef.current = isVsBot; }, [isVsBot]);

    useEffect(() => {
        if (onPhaseChange) onPhaseChange(phase);
    }, [phase, onPhaseChange]);


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

    useEffect(() => { myScoreRef.current = myScore; }, [myScore]);
    useEffect(() => { myCorrectRef.current = myCorrect; }, [myCorrect]);
    useEffect(() => { oppScoreRef.current = oppScore; }, [oppScore]);
    useEffect(() => { oppQIndexRef.current = oppQIndex; }, [oppQIndex]);
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

    // Fetch courses on mount so selectors are ready in the lobby
    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);

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

            const maxBonus = delay < 9000 ? 45 : delay < 14000 ? 25 : 8;
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

    const [searchParams, setSearchParams] = useSearchParams();

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
    };

    const finishGame = useCallback(async () => {
        isBotGameActive.current = false;
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
            ? { player1_score: myFinalScore, player1_correct: myFinalCorrect, player1_q_index: qIndexRef.current, status: 'finished', winner_id: winnerId, finished_at: new Date().toISOString() }
            : { player2_score: myFinalScore, player2_correct: myFinalCorrect, player2_q_index: qIndexRef.current, status: 'finished', winner_id: winnerId, finished_at: new Date().toISOString() };

        await supabase.from('battle_sessions').update(updateData).eq('id', sess.id);
        setPhase('result');
    }, [user?.id]);

    const moveToNextQuestion = useCallback(async () => {
        const nextIdx = qIndexRef.current + 1;
        if (nextIdx >= Math.min(TOTAL_QUESTIONS, questionsRef.current.length)) {
            await finishGame();
        } else {
            setQIndex(nextIdx);
        }
    }, [finishGame]);

    const scheduleNextQuestion = useCallback(() => {
        clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = setTimeout(() => {
            moveToNextQuestion();
        }, 1800);
    }, [moveToNextQuestion]);

    const handleTimeUp = useCallback(() => {
        if (isAnswerLocked) return;
        setIsAnswerLocked(true);
        setSelectedOption('timeout'); // Set explicit timeout state
        scheduleNextQuestion();
    }, [isAnswerLocked, scheduleNextQuestion]);

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
        const msg = language === 'bn'
            ? 'আপনি কি নিশ্চিত যে আপনি ব্যাটল থেকে বের হতে চান?'
            : 'Are you sure you want to exit the battle?';
        if (window.confirm(msg)) {
            handleReset();
        }
    };

    const handleCreateRoom = async () => {
        if (!user?.id) return;
        setPhase('searching');
        setSearchCountdown(20);
        isBotGameActive.current = false;
        setIsVsBot(false);

        const code = generateRoomCode();
        setRoomCode(code);

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

        await supabase.from('battle_invitations').insert({
            room_code: code,
            sender_id: user.id,
            course_title: selectedCourse?.title || (language === 'bn' ? 'সাধারণ ব্যাটল' : 'General Battle')
        });

        let countdown = 20;
        setSearchCountdown(20);
        clearInterval(searchCountdownRef.current);
        searchCountdownRef.current = setInterval(() => {
            countdown -= 1;
            setSearchCountdown(countdown);
            if (countdown <= 0) clearInterval(searchCountdownRef.current);
        }, 1000);

        clearTimeout(botTimeoutRef.current);
        botTimeoutRef.current = setTimeout(() => {
            if (phaseRef.current === 'searching') {
                clearInterval(searchCountdownRef.current);
                supabase.from('battle_invitations').delete().eq('room_code', code).eq('sender_id', user.id);
                supabase.from('battle_sessions').update({ status: 'cancelled' }).eq('id', newSession.id);
                supabase.removeChannel(waitChannel);
                startBotGame(qs);
            }
        }, 20000);

        const waitChannel = supabase
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
    };

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
    }, [qIndex, phase]);



    const handleCopyRoomCode = () => {
        if (!roomCode) return;

        const doCopy = (text) => {
            // Modern API
            if (navigator.clipboard && window.isSecureContext) {
                return navigator.clipboard.writeText(text);
            } else {
                // Fallback: execCommand('copy')
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
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

    // ── LOBBY ─────────────────────────────────────────────────
    if (phase === 'lobby') return (
        <div className={styles.lobbyWrap}>
            <motion.div
                initial={{ opacity: 0, y: 32, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={styles.lobbyCard}
            >
                <div className={styles.lobbyHero}>
                    <div className={styles.modeToggleFloating}>
                        <button
                            className={`${styles.toggleSwitchSmall} ${battleMode ? styles.toggleOn : styles.toggleOff}`}
                            onClick={handleToggleBattleMode}
                            disabled={isUpdatingMode}
                        >
                            <span className={styles.toggleKnobSmall} />
                        </button>
                    </div>
                    <motion.div
                        className={styles.vsCircle}
                        initial={{ rotate: -20, scale: 0.5, opacity: 0 }}
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
                            initial: { delay: 0.2, type: "spring", stiffness: 200 },
                            rotate: battleMode ? { duration: 0.8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } : { duration: 0.4 },
                            scale: battleMode ? { duration: 0.8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } : { duration: 0.4 }
                        }}
                    >
                        <Swords size={36} />
                    </motion.div>
                    <motion.h2
                        className={styles.lobbyTitle}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        {language === 'bn' ? 'ব্যাটল ওয়ার' : 'Battle War'}
                    </motion.h2>
                    <motion.p
                        className={styles.lobbySubtitle}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        {language === 'bn'
                            ? 'সেরাদের সাথে লাইভ ব্যাটেলে আসুন জিতে নিন এক্সক্লুসিভ রিওয়ার্ড!'
                            : 'Prove yourself the best in the live quiz duel!'}
                    </motion.p>
                </div>

                <motion.div
                    className={styles.lobbyActions}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    {/* Course selector */}
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
                            disabled={!battleMode || isLoadingSetup}
                        />
                    </div>

                    {/* Module selector - Only show if course is selected */}
                    {selectedCourse && (
                        <motion.div
                            className={styles.selectGroup}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                        >
                            <label className={styles.selectLabel}>
                                {t('select_module')} {language === 'bn' ? '(ঐচ্ছিক)' : '(Optional)'}
                            </label>
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
                                    disabled={!battleMode}
                                    placeholder={language === 'bn' ? '-- সকল মডিউল --' : '-- All Modules --'}
                                />
                            )}
                        </motion.div>
                    )}

                    <motion.button
                        className={styles.createBtn}
                        onClick={handleCreateRoom}
                        disabled={!battleMode || !selectedCourse}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Swords size={18} />
                        {language === 'bn' ? 'নতুন ব্যাটল তৈরি করুন' : 'Create Battle'}
                    </motion.button>

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
                </motion.div>
            </motion.div>
        </div>
    );



    // ── SEARCHING (created room, waiting) ─────────────────────
    if (phase === 'searching') return (
        <div className={styles.lobbyWrap}>
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
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", delay: 0.4 }}
                    >
                        <div className={styles.vsBadge}>
                            <span>VS</span>
                        </div>
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
                <motion.div
                    className={styles.roomCodeBottom}
                    onClick={handleCopyRoomCode}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <span className={styles.codeLabel}>
                        {copied
                            ? (language === 'bn' ? 'অনুলিপি!' : 'COPIED!')
                            : (language === 'bn' ? 'রুম কোড:' : 'ROOM CODE:')
                        }
                    </span>
                    <span className={styles.codeVal}>{roomCode}</span>

                    <div className={styles.copyIconWrap}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={copied ? 'check' : 'copy'}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                            >
                                {copied ? <CheckCircle2 size={16} color="#2ecc71" /> : <Copy size={16} />}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </motion.div>

                <motion.button
                    className={styles.cancelBtn}
                    style={{ padding: '10px 20px', fontSize: '0.8rem' }}
                    onClick={handleReset}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </motion.button>
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
                    <div className={styles.playerPanel}>
                        <Avatar url={userProfile?.avatar_url} name={myName} size={64} />
                        <div className={styles.playerLevel}>
                            {getTierName(userProfile?.league_id || 1)}
                        </div>
                        <span className={styles.playerName}>{myName}</span>
                        <span className={styles.youBadge}>{language === 'bn' ? 'আমি' : 'You'}</span>
                    </div>

                    <div className={styles.vsBadge}>
                        <span>VS</span>
                    </div>

                    <div className={styles.playerPanel}>
                        <Avatar url={opponentProfile?.avatar_url} name={oppName} size={64} />
                        {isVsBot ? (
                            <span className={styles.botBadge}>🤖 AI Bot</span>
                        ) : (
                            <div className={styles.playerLevel}>
                                {getTierName(opponentProfile?.league_id || 1)}
                            </div>
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
