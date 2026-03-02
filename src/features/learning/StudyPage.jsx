import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Lightbulb, Star, ArrowRight, Clock, Infinity, Zap, ShoppingBag, CreditCard, Loader2, Sparkles, CircleCheckBig, CircleX, Square, Circle, CheckSquare, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { supabase } from '../../lib/supabaseClient';
import HoneyDropIcon from '../../components/HoneyDropIcon';
import { useAuth } from '../../context/AuthContext';
import { useHeartRefill } from '../../hooks/useHeartRefill';
import { rewardService } from '../../services/rewardService';
import { honeyJarService } from '../../services/honeyJarService';
import { shopService } from '../../services/shopService';
import { useLanguage } from '../../context/LanguageContext';
import InlineLoader from '../../components/ui/InlineLoader';

import { createAvatar } from '@dicebear/core';
import { lorelei } from '@dicebear/collection';

import styles from './StudyPage.module.css';
import { cn } from '../../lib/utils';

const SparkleBurst = ({ large = false }) => {
    const spreadX = large ? 1.4 : 0.42;
    const spreadY = large ? 1.0 : 0.42;
    const elements = [
        { Icon: Star, tx: -30 * spreadX, ty: -38 * spreadY, delay: 0, size: large ? 16 : 13 },
        { Icon: Circle, tx: 35 * spreadX, ty: -32 * spreadY, delay: 0.1, size: large ? 10 : 8 },
        { Icon: Square, tx: -42 * spreadX, ty: -52 * spreadY, delay: 0.15, size: large ? 11 : 9 },
        { Icon: Star, tx: 0 * spreadX, ty: -58 * spreadY, delay: 0.2, size: large ? 18 : 14 },
        { Icon: Circle, tx: 42 * spreadX, ty: -22 * spreadY, delay: 0.25, size: large ? 9 : 7 },
        { Icon: Star, tx: -46 * spreadX, ty: -22 * spreadY, delay: 0.3, size: large ? 14 : 11 },
        { Icon: Square, tx: 28 * spreadX, ty: -42 * spreadY, delay: 0.2, size: large ? 10 : 8 },
        { Icon: Circle, tx: 46 * spreadX, ty: -48 * spreadY, delay: 0.15, size: large ? 10 : 8 },
        { Icon: Square, tx: 18 * spreadX, ty: -62 * spreadY, delay: 0.35, size: large ? 9 : 7 },
        { Icon: Circle, tx: -32 * spreadX, ty: -44 * spreadY, delay: 0.3, size: large ? 8 : 6 },
        { Icon: Star, tx: -14 * spreadX, ty: -46 * spreadY, delay: 0.25, size: large ? 12 : 10 },
    ];
    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
            {elements.map((el, i) => (
                <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
                    animate={{
                        scale: [0, 1.1, 0],
                        opacity: [1, 1, 0],
                        x: `calc(-50% + ${el.tx}px)`,
                        y: `calc(-50% + ${el.ty}px)`,
                        rotate: [0, 180],
                    }}
                    transition={{ duration: 2, delay: el.delay, ease: 'easeOut' }}
                    style={{ position: 'absolute', left: '50%', top: large ? '0%' : '50%' }}
                >
                    <el.Icon
                        size={el.size}
                        color="#f1c40f"
                        fill="none"
                        strokeWidth={1.5}
                        style={{ filter: `drop-shadow(0 0 ${large ? '5px' : '3px'} rgba(241,196,15,0.6))` }}
                    />
                </motion.div>
            ))}
        </div>
    );
};

const AvatarImage = ({ seed, className }) => {
    const avatar = createAvatar(lorelei, {
        seed: seed,
        backgroundType: ["transparent"]
    });

    return (
        <div
            className={className}
            dangerouslySetInnerHTML={{ __html: avatar.toString() }}
        />
    );
};

const StorytellingDisplay = ({ content, visibleCount }) => {
    let dialogues = [];
    try {
        dialogues = JSON.parse(content || '[]');
    } catch (e) {
        return null;
    }

    if (!Array.isArray(dialogues) || dialogues.length === 0) return null;

    const characters = {
        rakib: { label: 'রাকিব', class: styles.rakibBubble, avatarClass: styles.rakibAvatar, seed: 'Emery' },
        lisa: { label: 'লিসা', class: styles.lisaBubble, avatarClass: styles.lisaAvatar, seed: 'Eliza' },
        assistant: { label: 'সহকারী', class: styles.assistantBubble, avatarClass: styles.assistantAvatar, seed: 'Eden' },
        andrea: { label: 'আন্দ্রেয়া', class: styles.andreaBubble, avatarClass: styles.andreaAvatar, seed: 'Andrea' }
    };

    return (
        <div className={styles.dialogueContainer}>
            {dialogues.slice(0, visibleCount + 1).map((d, i) => {
                const char = characters[d.avatar] || characters.rakib;
                const isLatest = i === visibleCount;

                return (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={styles.dialogueItem}
                    >
                        <AvatarImage
                            seed={char.seed}
                            className={cn(
                                styles.avatarCircle,
                                char.avatarClass,
                                isLatest && styles.speakingAvatar
                            )}
                        />
                        <div className={cn(
                            styles.speechBubble,
                            char.class,
                            isLatest && styles.activeSpeechBubble
                        )}>
                            {d.text}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};

const StudyPage = () => {
    const { courseId, chapterId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useLanguage();

    // Use heart refill system
    const {
        hearts,
        maxHearts,
        refillTimeDisplay,
        deductHeart,
        canAnswer,
        needsRefill,
        isPremium,
        loading: heartsLoading
    } = useHeartRefill(user?.id);

    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showResults, setShowResults] = useState(false);
    const [stats, setStats] = useState({ correct: 0, total: 0 });
    const [shake, setShake] = useState(false);

    // Missing heart/checkout states
    const [showNoHeartsModal, setShowNoHeartsModal] = useState(false);
    const [showNoHeartsCheckout, setShowNoHeartsCheckout] = useState(null); // { type, label, price }
    const [checkoutProcessing, setCheckoutProcessing] = useState(false);

    // Animation states
    const [dotLottie, setDotLottie] = useState(null);
    const [selectedAnimation, setSelectedAnimation] = useState(() => {
        const saved = localStorage.getItem('studyPageAnimation');
        return saved || 'random';
    });
    const [currentModel, setCurrentModel] = useState('/models/NewBee.lottie');
    const [profile, setProfile] = useState(null);
    const [sparkleEnabled, setSparkleEnabled] = useState(() => {
        const saved = localStorage.getItem('sparkleEffectsEnabled');
        return saved !== null ? saved === 'true' : true;
    });

    const [showExitConfirmation, setShowExitConfirmation] = useState(false);

    const [activeDialogueIndex, setActiveDialogueIndex] = useState(0);
    const [answersHistory, setAnswersHistory] = useState({}); // { [index]: { selectedOption, isCorrect } }
    const scrollRef = React.useRef(null);

    // Matching Interaction State
    const [selectedLeft, setSelectedLeft] = useState(null);
    const [matches, setMatches] = useState({}); // { leftIdx: rightIdx }
    const [shuffledRight, setShuffledRight] = useState([]);
    const [failedOptions, setFailedOptions] = useState([]); // Track wrong attempts for current question

    const dialogues = React.useMemo(() => {
        if (questions[currentIndex]?.type === 'storytelling') {
            try { return JSON.parse(questions[currentIndex].narrative || '[]'); } catch (e) { return []; }
        }
        return [];
    }, [questions, currentIndex]);

    const isStoryInProgress = questions[currentIndex]?.type === 'storytelling' && activeDialogueIndex < dialogues.length;

    // Auto-scroll: only when moving to new question, not on every isAnswered change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [currentIndex, activeDialogueIndex]);

    // Read sound preference once per render cycle via ref — avoids repeated localStorage hits
    const soundEnabledRef = React.useRef(localStorage.getItem('soundEffectsEnabled') !== 'false');
    useEffect(() => {
        const handler = () => { soundEnabledRef.current = localStorage.getItem('soundEffectsEnabled') !== 'false'; };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    // Audio pre-loading
    const correctAudio = React.useRef(null);
    const wrongAudio = React.useRef(null);
    const completeAudio = React.useRef(null);

    useEffect(() => {
        // Initialize and pre-load sounds
        const sounds = {
            correct: '/sound/Correct_answer.mp3',
            wrong: '/sound/Wrong_answer.mp3',
            complete: '/sound/Chapter_complete.mp3'
        };

        const initAudio = (path, ref) => {
            const audio = new Audio(path);
            audio.preload = 'auto';
            audio.load();
            ref.current = audio;
        };

        initAudio(sounds.correct, correctAudio);
        initAudio(sounds.wrong, wrongAudio);
        initAudio(sounds.complete, completeAudio);

        return () => {
            [correctAudio, wrongAudio, completeAudio].forEach(ref => {
                if (ref.current) {
                    ref.current.pause();
                    ref.current.src = "";
                }
            });
        };
    }, []);

    const handleNoHeartsCheckout = (type) => {
        if (type === 'hearts') {
            setShowNoHeartsCheckout({ type: 'hearts', label: '140P ইনস্ট্যান্ট রিফিল', price: 5 });
        } else if (type === 'subscription') {
            const beeName = profile?.gender === 'male' ? t('king_bee_mode') : 'কুইন বী মোড';
            setShowNoHeartsCheckout({ type: 'subscription', label: `${beeName} (মাসিক)`, price: 99 });
        }
    };

    const completeNoHeartsCheckout = async () => {
        if (!showNoHeartsCheckout || !user) return;
        setCheckoutProcessing(true);
        try {
            const { type, price } = showNoHeartsCheckout;
            let result;
            if (type === 'hearts') {
                result = await shopService.buyHearts(user.id, 5, price, 'heart_p1');
                if (result?.success) {
                    setShowNoHeartsCheckout(null);
                    setShowNoHeartsModal(false);
                    toast?.success('4টি হানি ড্রপ যোক্ত হয়েছে! 🍯');
                }
            } else if (type === 'subscription') {
                result = await shopService.subscribeToPremium(user.id, 'monthly', price);
                if (result?.success) {
                    setShowNoHeartsCheckout(null);
                    setShowNoHeartsModal(false);
                    const beeName = profile?.gender === 'male' ? t('king_bee_mode') : 'কুইন বী মোড';
                    toast?.success(`অভিনন্দন! আপনি এখন ${beeName}! 👑`);
                }
            }
            if (!result?.success) {
                toast?.error('পেমেন্ট সফল হয়নি। পুনরায় চেষ্টা করুন।');
            }
        } catch (err) {
            console.error('Checkout error:', err);
            toast?.error('পেমেন্ট সফল হয়নি। পুনরায় চেষ্টা করুন।');
        } finally {
            setCheckoutProcessing(false);
        }
    };

    // Load animation preference and profile from localStorage/DB
    useEffect(() => {
        const savedAnimation = localStorage.getItem('studyPageAnimation');
        if (savedAnimation) {
            setSelectedAnimation(savedAnimation);
        }

        const fetchProfile = async () => {
            if (!user?.id) return;
            const { data } = await supabase.from('profiles').select('gender').eq('id', user.id).single();
            setProfile(data);
        };
        fetchProfile();
    }, [user?.id]);

    useEffect(() => {
        if (!dotLottie || selectedAnimation === 'none') return;
        // All animations will just loop normally
        dotLottie.setLoop(true);
        dotLottie.play();
    }, [dotLottie, selectedAnimation, currentModel]);

    // Randomize mascot every question if animation is enabled
    useEffect(() => {
        if (selectedAnimation !== 'none') {
            const models = [
                '/models/Bee - lounging.lottie',
                '/models/Bee looking.lottie',
                '/models/Ceras bee.lottie',
                '/models/Happy Bee.lottie',
                '/models/Honey bee.lottie',
                '/models/Loading Flying Beee.lottie',
                '/models/NewBee.lottie',
                '/models/awkward bee.lottie'
            ];
            const randomModel = models[Math.floor(Math.random() * models.length)];
            setCurrentModel(randomModel);
        }
    }, [currentIndex, selectedAnimation]);

    useEffect(() => {
        const fetchContent = async () => {
            // Only show initial loading screen if we don't have questions yet
            if (questions.length === 0) {
                setLoading(true);
            }
            try {
                const { data: points, error: pErr } = await supabase
                    .from('learning_points')
                    .select('*, mcq_questions(*, mcq_options(*))')
                    .eq('chapter_id', chapterId)
                    .order('order_index', { ascending: true });

                if (pErr) throw pErr;

                if (points && points.length > 0) {
                    const enrichedQuestions = [];
                    points.forEach(point => {
                        if (point.mcq_questions && point.mcq_questions.length > 0) {
                            point.mcq_questions.sort((a, b) => a.order_index - b.order_index).forEach(q => {
                                enrichedQuestions.push({
                                    ...q,
                                    learning_point_id: point.id,
                                    narrative: q.narrative || point.content,
                                    type: point.type,
                                    mcq_options: q.mcq_options.sort((a, b) => a.order_index - b.order_index)
                                });
                            });
                        }
                    });

                    setQuestions(enrichedQuestions);
                    setStats(prev => ({ ...prev, total: enrichedQuestions.length }));
                }
            } catch (err) {
                console.error('Error fetching study content:', err);
            } finally {
                setLoading(false);
            }
        };

        if (chapterId && user?.id) fetchContent();
    }, [chapterId, user?.id]);

    // Initialize Shuffled Right for Matching
    useEffect(() => {
        const q = questions[currentIndex];
        if (q?.question_type === 'matching' && q.metadata?.pairs) {
            const rightOptions = q.metadata.pairs.map((p, i) => ({ text: p.right, originalIdx: i }));
            setShuffledRight([...rightOptions].sort(() => Math.random() - 0.5));
            setMatches({});
            setSelectedLeft(null);
        }
        setFailedOptions([]); // Clear wrong attempts when moving to new question
    }, [currentIndex, questions]);

    const handleOptionSelect = React.useCallback((optionId) => {
        if (isAnswered) return;
        setSelectedOption(optionId);
    }, [isAnswered]);

    const handleMatchSelect = async (type, index) => {
        if (isAnswered) return;
        if (type === 'left') {
            // Toggle off if same card clicked again
            setSelectedLeft(prev => prev === index ? null : index);
        } else if (type === 'right' && selectedLeft !== null) {
            const currentQuestion = questions[currentIndex];
            const pairs = currentQuestion.metadata.pairs;
            const isCorrectPair = pairs[selectedLeft].right === shuffledRight[index].text;

            // Record this match visually
            const newMatches = { ...matches, [selectedLeft]: index };
            setMatches(newMatches);
            setSelectedLeft(null);

            if (!isCorrectPair) {
                // Add to failed list for red styling
                setFailedOptions(prev => [...prev, { left: selectedLeft, right: index }]);
                setShake(true);
                setTimeout(() => setShake(false), 500);

                const soundEnabled = localStorage.getItem('soundEffectsEnabled') !== 'false';
                if (wrongAudio.current && soundEnabled) {
                    wrongAudio.current.currentTime = 0;
                    wrongAudio.current.play().catch(e => console.error(e));
                }

                if (user) await deductHeart(1);

                // After flash delay, clear the wrong match so they can re-try
                const capturedLeft = selectedLeft;
                setTimeout(() => {
                    setMatches(prev => {
                        const updated = { ...prev };
                        delete updated[capturedLeft];
                        return updated;
                    });
                }, 800);
            }

            // Check if all pairs are now matched (correct or not) — unlock 'Check' button
            if (Object.keys(newMatches).length === pairs.length) {
                if (isCorrectPair) {
                    // Verify all existing matches are correct
                    const allCorrect = Object.entries(newMatches).every(([lIdx, rIdx]) =>
                        pairs[parseInt(lIdx)].right === shuffledRight[rIdx].text
                    );
                    if (allCorrect) {
                        setIsCorrect(true);
                        setIsAnswered(true);

                        const soundEnabled = localStorage.getItem('soundEffectsEnabled') !== 'false';
                        if (correctAudio.current && soundEnabled) {
                            correctAudio.current.currentTime = 0;
                            correctAudio.current.play().catch(e => console.error(e));
                        }

                        setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
                        if (user) {
                            rewardService.awardXP(user.id, 1, 'correct_answer');
                            honeyJarService.addPollenToJar(user.id, 1);
                        }
                        setAnswersHistory(prev => ({ ...prev, [currentIndex]: { matches: newMatches, isCorrect: true } }));
                    }
                }
            }
        }
    };

    // For matching: 'যাচাই করুন' submits all current matches
    const handleMatchSubmit = async () => {
        const currentQuestion = questions[currentIndex];
        const pairs = currentQuestion.metadata.pairs || [];

        const requiredMatchCount = pairs.filter(p => p.left && p.left.trim() !== '').length;
        const matchedCount = Object.keys(matches).length;

        // Verify all required items are matched
        if (matchedCount < requiredMatchCount) {
            setShake(true);
            setTimeout(() => setShake(false), 500);
            return;
        }

        const allCorrect = Object.entries(matches).every(([lIdx, rIdx]) =>
            pairs[parseInt(lIdx)].right === shuffledRight[rIdx].text
        );

        setIsCorrect(allCorrect);
        setIsAnswered(true);

        const soundEnabled = localStorage.getItem('soundEffectsEnabled') !== 'false';
        if (allCorrect) {
            if (correctAudio.current && soundEnabled) {
                correctAudio.current.currentTime = 0;
                correctAudio.current.play().catch(e => console.error(e));
            }
            setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
            if (user) {
                rewardService.awardXP(user.id, 1, 'correct_answer');
                honeyJarService.addPollenToJar(user.id, 1);
            }
        } else {
            if (wrongAudio.current && soundEnabled) {
                wrongAudio.current.currentTime = 0;
                wrongAudio.current.play().catch(e => console.error(e));
            }
            setShake(true);
            setTimeout(() => setShake(false), 500);
        }

        setAnswersHistory(prev => ({ ...prev, [currentIndex]: { matches, isCorrect: allCorrect } }));
    };

    const handleCheck = React.useCallback(async () => {
        const currentQuestion = questions[currentIndex];
        const isMatching = currentQuestion.question_type === 'matching';

        if (isMatching || !selectedOption || isAnswered) return;

        if (!canAnswer) {
            setShowNoHeartsModal(true);
            return;
        }

        const selected = currentQuestion.mcq_options.find(o => o.id === selectedOption);
        const correct = !!selected?.is_correct;

        // Update UI immediately — don't await anything before this
        setIsCorrect(correct);
        setIsAnswered(true);
        setAnswersHistory(prev => ({ ...prev, [currentIndex]: { selectedOption, isCorrect: correct } }));

        const soundEnabled = soundEnabledRef.current;

        if (correct) {
            if (correctAudio.current && soundEnabled) {
                try { correctAudio.current.currentTime = 0; correctAudio.current.play(); } catch (err) {}
            }
            setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
            // Fire-and-forget background tasks
            if (user) {
                rewardService.awardXP(user.id, 1, 'correct_answer');
                honeyJarService.addPollenToJar(user.id, 1);
            }
        } else {
            setFailedOptions(prev => [...prev, selectedOption]);
            if (wrongAudio.current && soundEnabled) {
                try { wrongAudio.current.currentTime = 0; wrongAudio.current.play(); } catch (err) {}
            }
            setShake(true);
            setTimeout(() => setShake(false), 500);
            // Deduct heart in background — don't await
            if (user) deductHeart(1).catch(console.error);
        }
    }, [questions, currentIndex, selectedOption, isAnswered, canAnswer, user, deductHeart]);

    const handleNext = async () => {
        if (currentIndex < questions.length - 1) {
            if (!isPremium && hearts === 0) {
                setShowNoHeartsModal(true);
                return;
            }
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setIsAnswered(false);
            setIsCorrect(false);
            setActiveDialogueIndex(0);
        } else {
            if (user && courseId && chapterId) {
                try {
                    const earnedXp = stats.correct;
                    const { data: existingProgress } = await supabase
                        .from('user_progress')
                        .select('id, xp_earned')
                        .eq('user_id', user.id)
                        .eq('chapter_id', chapterId)
                        .single();

                    if (!existingProgress) {
                        await supabase.from('user_progress').insert({
                            user_id: user.id,
                            course_id: courseId,
                            chapter_id: chapterId,
                            is_completed: true,
                            completed_at: new Date().toISOString(),
                            total_questions: stats.total,
                            correct_answers: stats.correct,
                            xp_earned: earnedXp,
                            last_accessed: new Date().toISOString()
                        });
                    } else {
                        await supabase.from('user_progress')
                            .update({
                                is_completed: true,
                                completed_at: new Date().toISOString(),
                                total_questions: stats.total,
                                correct_answers: stats.correct,
                                xp_earned: earnedXp,
                                last_accessed: new Date().toISOString()
                            })
                            .eq('id', existingProgress.id);
                    }
                } catch (err) {
                    console.error('Error updating progress:', err);
                }
            }
            // Play completion sound
            const soundEnabled = localStorage.getItem('soundEffectsEnabled') !== 'false';
            if (completeAudio.current && soundEnabled) {
                try {
                    completeAudio.current.currentTime = 0;
                    completeAudio.current.play().catch(e => {
                        console.error("Audio playback failed, retrying...", e);
                        completeAudio.current.src = '/sound/Chapter_complete.mp3';
                        completeAudio.current.play();
                    });
                } catch (err) {
                    console.error("Audio error:", err);
                }
            }

            setShowResults(true);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-screen w-full bg-[#0b0e11]">
            <InlineLoader />
        </div>
    );

    if (questions.length === 0) return (
        <div className={styles.loadingContainer}>
            <div className="text-center space-y-4">
                <h2 className="text-xl font-bold">এই অধ্যায়ে কোনো প্রশ্ন পাওয়া যায়নি।</h2>
                <button onClick={() => navigate(-1)} className="bg-[#ffa202] text-white px-6 py-2 rounded-xl shadow-[0_4px_0_#e69200] active:translate-y-1 active:shadow-none transition-all">ফিরে যান</button>
            </div>
        </div>
    );

    const currentQuestion = questions[currentIndex];
    const optionLabels = ['A', 'B', 'C', 'D', 'E'];
    // Derived — no separate state needed, always in sync
    const progress = questions.length > 0 ? ((currentIndex + (isAnswered ? 1 : 0)) / questions.length) * 100 : 0;


    return (
        <div className={styles.studyPage}>
            <header className={styles.header}>
                <button className={styles.closeBtn} onClick={() => setShowExitConfirmation(true)}>
                    <X size={24} strokeWidth={3} />
                </button>
                <div className={styles.progressContainer}>
                    <div className={styles.progressBar}>
                        {/* Clip wrapper keeps fill rounded inside bar */}
                        <div className={styles.progressFillClip}>
                            <motion.div
                                className={styles.progressFill}
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                            />
                        </div>
                        {/* Bubble burst at fill tip on correct answer */}
                        <AnimatePresence>
                            {isCorrect && (
                                <motion.div
                                    key={`burst-${currentIndex}`}
                                    className={styles.progressBurstWrap}
                                    style={{ left: `${Math.max(progress, 2)}%` }}
                                    initial={{ opacity: 1 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0, transition: { delay: 0.8 } }}
                                >
                                    {[...Array(10)].map((_, i) => {
                                        // Randomised but deterministic per question
                                        const baseAngle = (i / 10) * 360;
                                        const jitter = ((i * 37 + currentIndex * 13) % 60) - 30; // -30 to +30 deg
                                        const angle = baseAngle + jitter - 90;
                                        const rad = (angle * Math.PI) / 180;
                                        const dist = 20 + ((i * 11 + currentIndex * 7) % 18); // 20–38px
                                        const tx = Math.cos(rad) * dist;
                                        const ty = Math.sin(rad) * dist;
                                        const isRing = i % 3 === 1;
                                        const size = 7 + (i % 3) * 2.5; // 7, 9.5, 12px
                                        return (
                                            <motion.span
                                                key={i}
                                                className={isRing ? styles.progressBubbleRing : styles.progressBubbleDot}
                                                style={{ width: size, height: size, ...(isRing && { width: size, height: size }) }}
                                                initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                                                animate={{ x: tx, y: ty, scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
                                                transition={{ duration: 0.6, delay: 0.35 + i * 0.03, ease: 'easeOut' }}
                                            />
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                <div className={styles.heartsContainer}>
                    <motion.div animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}} transition={{ duration: 0.4 }}>
                        <HoneyDropIcon
                            size={28}
                            isEmpty={hearts === 0 && refillTimeDisplay}
                        />
                    </motion.div>
                    {!(hearts === 0 && refillTimeDisplay) && (
                        isPremium ? (
                            <Infinity size={24} strokeWidth={3} style={{ marginLeft: '4px', color: '#ff4b4b' }} />
                        ) : (
                            <span className={styles.heartCount}>{hearts}</span>
                        )
                    )}
                    {needsRefill && refillTimeDisplay && (
                        <span className={styles.refillTimer}>
                            <Clock size={12} />
                            {refillTimeDisplay}
                        </span>
                    )}
                </div>
            </header>

            <main className={styles.mainContent}>
                <div className={styles.studyContentWrapper}>


                    <AnimatePresence mode="wait">
                        <div className="space-y-12">
                            {(() => {
                                const currentLPId = questions[currentIndex]?.learning_point_id;
                                // Find the first index of the current node group
                                let startIdx = currentIndex;
                                while (startIdx > 0 && questions[startIdx - 1].learning_point_id === currentLPId) {
                                    startIdx--;
                                }

                                return questions.slice(startIdx, currentIndex + 1).map((q, arrayIdx) => {
                                    const globalIdx = startIdx + arrayIdx;
                                    const isLatest = globalIdx === currentIndex;
                                    const isStory = q.type === 'storytelling';
                                    const answer = answersHistory[globalIdx];

                                    // Narrative logic: Only show narrative if it changed or it's the start of the node
                                    const hasPrevSameNarrative = arrayIdx > 0 && questions[startIdx + arrayIdx - 1].narrative === q.narrative;
                                    const showStory = isStory && (!hasPrevSameNarrative || isLatest);
                                    const showMCQ = !isStory || (isLatest ? !isStoryInProgress : true);

                                    return (
                                        <motion.div
                                            key={q.id}
                                            initial={isLatest ? { x: 40 } : false}
                                            animate={{ x: 0 }}
                                            transition={isLatest ? { duration: 1.1, ease: [0.25, 1, 0.5, 1] } : {}}
                                            className={cn(styles.questionSection, !isLatest && "opacity-60 grayscale-[0.5] scale-[0.98] transition-all")}
                                        >
                                            {showStory && (
                                                <StorytellingDisplay
                                                    content={q.narrative}
                                                    visibleCount={isLatest ? activeDialogueIndex : 999}
                                                />
                                            )}

                                            {showMCQ && (
                                                <div className="space-y-8">
                                                    {!isStory && (q.narrative || q.explanation) && (
                                                        <div className={styles.contextText}>
                                                            <span className={styles.lightbulb}><Lightbulb size={20} color="#ffa202" /></span>
                                                            {q.narrative?.replace(/^💡\s*পড়াশোনার বিষয়\/হিন্ট:\s*/, '').trim() || "মনোযোগ দিয়ে পড়ুন..."}
                                                        </div>
                                                    )}

                                                    <h2 className={styles.questionTitle}>
                                                        {isLatest && selectedAnimation !== 'none' && (
                                                            <span className={styles.mascotMini}>
                                                                <DotLottieReact
                                                                    key={currentModel}
                                                                    src={currentModel}
                                                                    autoplay={true}
                                                                    loop={true}
                                                                    speed={1}
                                                                    renderConfig={{ renderer: 'svg' }}
                                                                    dotLottieRefCallback={setDotLottie}
                                                                />
                                                            </span>
                                                        )}
                                                        {q.question_text}
                                                    </h2>

                                                    <div className={cn(styles.optionsList, q.question_type === 'boolean' && styles.booleanRow)}>
                                                        {q.question_type === 'matching' ? (
                                                            <div className={styles.matchingContainer}>
                                                                <div className={styles.matchingColumn}>
                                                                    {(q.metadata?.pairs || []).map((pair, pIdx) => {
                                                                        const isMatched = matches[pIdx] !== undefined;
                                                                        const rIdx = matches[pIdx];
                                                                        const showResult = isLatest ? isAnswered : true;
                                                                        // A match exists right now for this left card
                                                                        const isMatchCorrect = isMatched && (q.metadata.pairs[pIdx].right === shuffledRight[rIdx]?.text);
                                                                        // Red: currently matched but WRONG (temp flash before 800ms clear)
                                                                        const isMatchWrong = (isLatest && isMatched && !isMatchCorrect) ||
                                                                            (showResult && !isLatest && isMatched && !isMatchCorrect);
                                                                        // After a failure, this left card has been tried before
                                                                        const hasFailed = isLatest && failedOptions.some(f => f.left === pIdx);

                                                                        if (!pair.left || pair.left.trim() === '') return null;

                                                                        return (
                                                                            <div
                                                                                key={`l-${pIdx}`}
                                                                                className={cn(
                                                                                    styles.matchingCard,
                                                                                    selectedLeft === pIdx && styles.selectedCard,
                                                                                    isMatchCorrect && styles.matched,
                                                                                    isMatchWrong && styles.mismatch,
                                                                                    hasFailed && !isMatched && styles.hasFailed // subtle indicator
                                                                                )}
                                                                                onClick={() => isLatest && !isMatchCorrect && handleMatchSelect('left', pIdx)}
                                                                            >
                                                                                {pair.left}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <div className={styles.matchingColumn}>
                                                                    {shuffledRight.map((opt, rIdx) => {
                                                                        const lIdx = Object.keys(matches).find(k => matches[k] === parseInt(rIdx) || matches[k] === rIdx);
                                                                        const isMatched = lIdx !== undefined;
                                                                        const isMatchCorrect = isMatched && (q.metadata.pairs[lIdx]?.right === opt.text);
                                                                        const showResult = isLatest ? isAnswered : true;

                                                                        // GREEN HINT: This right card is the correct answer for any left card that has failed
                                                                        // Persists after failure so learner knows where to click next
                                                                        const isHint = isLatest && !isMatchCorrect && !isMatched &&
                                                                            failedOptions.some(f => q.metadata.pairs[f.left]?.right === opt.text);

                                                                        // RED: currently matched wrong (temp - clears after 800ms)
                                                                        const isMatchWrong = isLatest && isMatched && !isMatchCorrect;

                                                                        return (
                                                                            <div
                                                                                key={`r-${rIdx}`}
                                                                                className={cn(
                                                                                    styles.matchingCard,
                                                                                    isMatchCorrect && styles.matched,  // green for correct match
                                                                                    isMatchWrong && styles.mismatch,   // red for wrong current match
                                                                                    isHint && styles.hintCard          // green-outline hint for guidance
                                                                                )}
                                                                                onClick={() => isLatest && handleMatchSelect('right', rIdx)}
                                                                            >
                                                                                {opt.text}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            (q.mcq_options || []).map((option, optIdx) => {
                                                                const isSelected = (isLatest ? selectedOption : answer?.selectedOption) === option.id;
                                                                const isCorrectOpt = option.is_correct;
                                                                const showResult = isLatest ? isAnswered : true;
                                                                const isFailed = isLatest && failedOptions.includes(option.id);

                                                                // Hint: Show correct answer in green after a failure
                                                                const showCorrect = (showResult && isCorrectOpt && (isLatest ? isCorrect : answer?.isCorrect)) ||
                                                                    (isLatest && failedOptions.length > 0 && isCorrectOpt);

                                                                return (
                                                                    <button
                                                                        key={option.id}
                                                                        className={cn(
                                                                            styles.optionBtn,
                                                                            isSelected && styles.selected,
                                                                            showCorrect && styles.correct,
                                                                            (showResult && isSelected && !isCorrectOpt) || isFailed ? styles.incorrect : ''
                                                                        )}
                                                                        onClick={() => isLatest && handleOptionSelect(option.id)}
                                                                        disabled={!isLatest || isAnswered || isFailed}
                                                                    >
                                                                        <div className={styles.optionIndex}>
                                                                            {q.question_type === 'checkmark' ? <CheckSquare size={16} /> : optionLabels[optIdx]}
                                                                        </div>
                                                                        <span className={styles.optionText}>{option.option_text}</span>
                                                                        {showResult && isCorrectOpt && (isLatest ? isCorrect : answer?.isCorrect) && (
                                                                            <div className={styles.correctIcon}><CircleCheckBig size={20} /></div>
                                                                        )}
                                                                        {showResult && isSelected && !isCorrectOpt && (
                                                                            <div className={styles.incorrectIcon}><CircleX size={20} /></div>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {isLatest && <div ref={scrollRef} className="h-4" />}
                                        </motion.div>
                                    );
                                });
                            })()}
                        </div>
                    </AnimatePresence>
                </div>
            </main>

            <footer className={`${styles.footer} ${isAnswered ? (isCorrect ? styles.footerCorrect : styles.footerIncorrect) : ''}`}>
                <div className={styles.footerContent}>
                    {!isAnswered ? (
                        <>
                            {isStoryInProgress ? (
                                <div className="w-full flex justify-end">
                                    <button
                                        className={styles.checkBtn}
                                        onClick={() => setActiveDialogueIndex(prev => prev + 1)}
                                    >
                                        আগিয়ে যান
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full flex gap-3 justify-between">
                                    <button className={styles.skipBtn} onClick={handleNext}>এগিয়ে যান</button>
                                    {questions[currentIndex]?.question_type === 'matching' ? (
                                        <button
                                            className={`${styles.checkBtn} ${Object.keys(matches).length < (questions[currentIndex]?.metadata?.pairs?.length || 0) ? styles.checkBtnDisabled : ''}`}
                                            aria-disabled={Object.keys(matches).length < (questions[currentIndex]?.metadata?.pairs?.length || 0)}
                                            onClick={() => {
                                                if (Object.keys(matches).length >= (questions[currentIndex]?.metadata?.pairs?.length || 0)) handleMatchSubmit();
                                            }}
                                        >
                                            যাচাই করুন
                                        </button>
                                    ) : (
                                        <button
                                            className={`${styles.checkBtn} ${!selectedOption ? styles.checkBtnDisabled : ''}`}
                                            aria-disabled={!selectedOption}
                                            onClick={() => { if (selectedOption) handleCheck(); }}
                                        >
                                            যাচাই করুন
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className={styles.resultOverlay}>
                            <div className={styles.resultCardInner}>
                                <div className={styles.resultStatus}>
                                    <div className={styles.statusHeader}>
                                        <div className={styles.statusIcon}>{isCorrect ? <CircleCheckBig size={24} strokeWidth={1.5} /> : <CircleX size={24} strokeWidth={1.5} />}</div>
                                        <h3>{isCorrect ? "সঠিক উত্তর !" : "ভুল উত্তর !"}</h3>
                                    </div>
                                    <p className={styles.explanationText}>
                                        {isCorrect
                                            ? "আপনার উত্তরটি সঠিক হয়েছে।"
                                            : currentQuestion.explanation
                                                ? `সঠিক উত্তর : ${currentQuestion.explanation}`
                                                : `ভুল থেকে শেখাই আসল শেখা। আপনার কাছে আর মাত্র ${hearts}টি ${t('honey_drop')} আছে।`
                                        }
                                    </p>
                                </div>
                                <button className={styles.continueBtn} onClick={handleNext}>
                                    {isCorrect && sparkleEnabled && <SparkleBurst large={true} />}
                                    <span>{currentIndex < questions.length - 1 ? 'এগিয়ে যান' : 'সম্পন্ন করুন'}</span>
                                    <ArrowRight size={20} strokeWidth={3} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </footer>

            <AnimatePresence>
                {showResults && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={styles.resultModal}>
                        <motion.div initial={{ scale: 0.8, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", damping: 15 }} className={styles.resultCard}>
                            <div className={styles.chartContainer}>
                                <svg viewBox="0 0 100 100" className={styles.radialChart}>
                                    <circle cx="50" cy="50" r="45" className={styles.chartBg} />
                                    <motion.circle cx="50" cy="50" r="45" className={styles.chartFill} initial={{ strokeDasharray: "0 283" }} animate={{ strokeDasharray: `${(stats.correct / (stats.total || 1)) * 283} 283` }} transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }} />
                                </svg>
                                <div className={styles.chartText}>
                                    <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 }}>{Math.round((stats.correct / (stats.total || 1)) * 100)}%</motion.span>
                                    <p>সফলতা</p>
                                </div>
                            </div>
                            <div className={styles.statsSummary}>
                                <div className={styles.summaryItem}>
                                    <div className={styles.summaryIcon} style={{ background: 'rgba(255, 162, 2, 0.1)' }}><CircleCheckBig size={20} color="#ffa202" strokeWidth={1.5} /></div>
                                    <div className={styles.summaryInfo}><span>সঠিক উত্তর</span><strong>{stats.correct}</strong></div>
                                </div>
                                <div className={styles.summaryItem}>
                                    <div className={styles.summaryIcon} style={{ background: 'rgba(255, 75, 75, 0.1)' }}><CircleX size={20} color="#ff4b4b" strokeWidth={1.5} /></div>
                                    <div className={styles.summaryInfo}><span>ভুল উত্তর</span><strong>{stats.total - stats.correct}</strong></div>
                                </div>
                                <div className={styles.summaryItem}>
                                    <div className={styles.summaryIcon} style={{ background: 'rgba(255, 162, 2, 0.1)' }}><Star size={20} color="#ffa202" /></div>
                                    <div className={styles.summaryInfo}><span>অর্জিত XP</span><strong>+{stats.correct}</strong></div>
                                </div>
                            </div>
                            <button className={styles.finishBtn} onClick={() => navigate(-1)}>চালিয়ে যান</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showNoHeartsModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={styles.resultModal}
                        onClick={() => setShowNoHeartsModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.88, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.88, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 20, stiffness: 300 }}
                            className={`${styles.resultCard} ${styles.noHeartsCard}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button className={styles.modalCloseBtn} onClick={() => setShowNoHeartsModal(false)}>
                                <X size={18} strokeWidth={2.5} />
                            </button>

                            <div className={styles.noHeartsContent}>
                                {/* Hero Area */}
                                <div className={styles.noHeartsHero}>
                                    <div className={styles.honeyEmoji}>🍯</div>
                                    <div className={styles.noHeartsTextBlock}>
                                        <h2 className={styles.noHeartsTitle}>আপনার মৌচাকে মধু শেষ!</h2>
                                        <p className={styles.noHeartsSub}>চিন্তা নেই! মৌমাছিরা আবার মধু সংগ্রহের জন্য প্রস্তুত।</p>
                                    </div>
                                </div>

                                {/* Refill Timer */}
                                {refillTimeDisplay && (
                                    <div className={styles.refillTimerRow}>
                                        <div className={styles.refillTimerLeft}>
                                            <Clock size={15} />
                                            <span>রিফিল হবে {refillTimeDisplay}-এ</span>
                                        </div>
                                        <button
                                            className={styles.shopInlineBtn}
                                            onClick={() => { setShowNoHeartsModal(false); window.location.href = '/shop'; }}
                                        >
                                            <ShoppingBag size={14} />
                                            <span>শপ এ যান</span>
                                        </button>
                                    </div>
                                )}

                                {/* Divider */}
                                <div className={styles.noHeartsDivider} />

                                {/* Action Buttons */}
                                <div className={styles.noHeartsButtons}>
                                    {/* Primary: Instant Refill */}
                                    <button
                                        className={`${styles.btn3d} ${styles.instantRefillBtn}`}
                                        onClick={() => handleNoHeartsCheckout('hearts')}
                                    >
                                        <Zap size={18} fill="currentColor" strokeWidth={0} />
                                        <span>আনলিমিটেড 24 ঘন্টা - মাত্র 4 টাকা</span>
                                    </button>

                                    {/* Secondary: Premium Mode */}
                                    <button
                                        className={`${styles.btn3d} ${styles.premiumCardBtn}`}
                                        onClick={() => handleNoHeartsCheckout('subscription')}
                                    >
                                        <span>👑</span>
                                        <span>{profile?.gender === 'male' ? t('king_bee_mode') : t('queen_bee_mode')} — যাত্রা মাত্র 99 টাকা</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* No Hearts Checkout Modal */}
            {showNoHeartsCheckout && (
                <div className={styles.checkoutOverlay} onClick={() => setShowNoHeartsCheckout(null)}>
                    <motion.div
                        initial={{ scale: 0.88, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.88, opacity: 0 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className={styles.checkoutCard}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className={styles.checkoutCardHeader}>
                            <div className={styles.checkoutCardIcon}>
                                {showNoHeartsCheckout.type === 'hearts' ? '🍯' : '👑'}
                            </div>
                            <h2 className={styles.checkoutCardTitle}>পেমেন্ট কনফার্ম করুন</h2>
                            <p className={styles.checkoutCardSub}>নিচের বিবরণ যাচাই করুন</p>
                        </div>

                        {/* Order summary */}
                        <div className={styles.checkoutSummary}>
                            <div className={styles.checkoutSummaryRow}>
                                <span>আইটেম</span>
                                <span>{showNoHeartsCheckout.label}</span>
                            </div>
                            <div className={`${styles.checkoutSummaryRow} ${styles.checkoutSummaryTotal}`}>
                                <span>মোট</span>
                                <span>৳ {showNoHeartsCheckout.price}</span>
                            </div>
                        </div>

                        {/* Payment methods */}
                        <div className={styles.checkoutMethods}>
                            <div className={`${styles.checkoutMethodBtn} ${styles.checkoutMethodActive}`}>
                                <CreditCard size={22} />
                                <span>বিকাশ</span>
                            </div>
                            <div className={styles.checkoutMethodBtn}>
                                <ShoppingBag size={22} />
                                <span>নগদ</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className={styles.checkoutCardActions}>
                            <button
                                className={styles.checkoutCancelBtn}
                                onClick={() => setShowNoHeartsCheckout(null)}
                                disabled={checkoutProcessing}
                            >
                                বাতিল
                            </button>
                            <button
                                className={styles.checkoutConfirmBtn}
                                onClick={completeNoHeartsCheckout}
                                disabled={checkoutProcessing}
                            >
                                {checkoutProcessing
                                    ? <Loader2 size={20} className={styles.spinnerIcon} />
                                    : 'এখনই পে করুন'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Emotional Exit Confirmation Modal */}
            <AnimatePresence>
                {showExitConfirmation && (
                    <div className={styles.confirmModalOverlay} onClick={() => setShowExitConfirmation(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className={styles.confirmCard}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={styles.confirmMascot}>
                                <DotLottieReact
                                    src="/models/awkward bee.lottie"
                                    autoplay
                                    loop
                                    style={{ width: 140, height: 140 }}
                                />
                            </div>
                            <h2 className={styles.confirmTitle}>
                                আপনি কি সত্যিই ফিরে যেতে চান?
                            </h2>
                            <p className={styles.confirmDesc}>
                                "এখন চলে গেলে চ্যাপ্টার শেষ হবে না..." <br />
                                আপনার শেখার লক্ষ্য অর্জনে আর মাত্র কয়েকটি ধাপ বাকি!
                            </p>
                            <div className={styles.confirmActions}>
                                <button
                                    className={styles.stayBtn}
                                    onClick={() => setShowExitConfirmation(false)}
                                >
                                    শেখা চালিয়ে যান
                                </button>
                                <button
                                    className={styles.leaveBtn}
                                    onClick={() => navigate(-1)}
                                >
                                    পরে ফিরে আসবো
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudyPage;
