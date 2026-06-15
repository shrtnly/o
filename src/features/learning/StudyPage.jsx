import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Lightbulb, Star, ArrowRight, Clock, Infinity, Zap, ShoppingBag, CreditCard, Loader2, Sparkles, CircleCheckBig, CircleX, Square, Circle, CheckSquare, User, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { supabase } from '../../lib/supabaseClient';
import HoneyDropIcon from '../../components/HoneyDropIcon';
import PollenIcon from '../../components/PollenIcon';
import { useAuth } from '../../context/AuthContext';
import { useHeartRefill } from '../../hooks/useHeartRefill';
import { rewardService } from '../../services/rewardService';
import { shopService } from '../../services/shopService';
import { useLanguage } from '../../context/LanguageContext';
import InlineLoader from '../../components/ui/InlineLoader';
import CourseFeedbackCard from './components/CourseFeedbackCard';
import StudySkeleton from './components/StudySkeleton';
import { courseService } from '../../services/courseService';

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
                        color="#FFB800"
                        fill="none"
                        strokeWidth={1.5}
                        style={{ filter: `drop-shadow(0 0 ${large ? '5px' : '3px'} rgba(255, 184, 0,0.6))` }}
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
    const { user, profile: authProfile } = useAuth();
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
    const [selectedOptions, setSelectedOptions] = useState(new Set()); // for checkmark multi-select
    const [pendingRetries, setPendingRetries] = useState(new Set()); // original indices awaiting retry
    const originalQuestionsLength = React.useRef(0); // set once on first load
    const [chapterInfo, setChapterInfo] = useState(null);
    const [nextChapter, setNextChapter] = useState(null);
    const [startTime] = useState(Date.now());
    const [timeTaken, setTimeTaken] = useState(0);
    const [streakInfo, setStreakInfo] = useState({ current_streak: 0 });

    // Missing heart/checkout states
    const [showNoHeartsModal, setShowNoHeartsModal] = useState(false);
    const [showNoHeartsCheckout, setShowNoHeartsCheckout] = useState(null); // { type, label, price }
    const [checkoutProcessing, setCheckoutProcessing] = useState(false);

    // Animation states
    const [dotLottie, setDotLottie] = useState(null);
    const [selectedAnimation, setSelectedAnimation] = useState(() => {
        if (authProfile?.study_page_animation) return authProfile.study_page_animation;
        const saved = localStorage.getItem('studyPageAnimation');
        return saved || 'random';
    });
    const [currentModel, setCurrentModel] = useState('/models/NewBee.lottie');
    const [mascotReady, setMascotReady] = useState(false);
    const [profile, setProfile] = useState(null);
    const [sparkleEnabled, setSparkleEnabled] = useState(() => {
        if (authProfile?.sparkle_effects_enabled !== undefined) return authProfile.sparkle_effects_enabled;
        const saved = localStorage.getItem('sparkleEffectsEnabled');
        return saved !== null ? saved === 'true' : true;
    });

    const [showExitConfirmation, setShowExitConfirmation] = useState(false);
    const [isProcessingResults, setIsProcessingResults] = useState(false);
    const [resultLoadingProgress, setResultLoadingProgress] = useState(0);
    const [showReview, setShowReview] = useState(false);

    const [activeDialogueIndex, setActiveDialogueIndex] = useState(0);
    const [answersHistory, setAnswersHistory] = useState({}); // { [index]: { selectedOption, isCorrect } }
    const resultsActive = showResults || showReview;
    const scrollRef = React.useRef(null);
    const activeQuestionRef = React.useRef(null);
    const mainContentRef = React.useRef(null);
    const prevIndexRef = React.useRef(-1); // Start at -1 to trigger for the first question (0)
    const isFirstCompletion = React.useRef(true); // Tracks if this chapter was previously completed

    // Matching Interaction State
    const [selectedLeft, setSelectedLeft] = useState(null);
    const [matches, setMatches] = useState({}); // { leftIdx: rightIdx }
    const [shuffledRight, setShuffledRight] = useState([]);
    const [failedOptions, setFailedOptions] = useState([]); // Track wrong attempts for current question
    const [flashingMatches, setFlashingMatches] = useState(new Set()); // leftIdx keys currently flashing green

    const dialogues = React.useMemo(() => {
        if (questions[currentIndex]?.type === 'storytelling') {
            try { return JSON.parse(questions[currentIndex].narrative || '[]'); } catch (e) { return []; }
        }
        return [];
    }, [questions, currentIndex]);

    const [isMobile, setIsMobile] = useState(false);
    const [lastInteractionWasFooter, setLastInteractionWasFooter] = useState(false);

    // Feedback System States
    const [showFeedbackCard, setShowFeedbackCard] = useState(false);
    const [alreadyRated, setAlreadyRated] = useState(false);
    const ratingTimerFired = React.useRef(false); // ensures timer fires only once per session

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const isStoryInProgress = questions[currentIndex]?.type === 'storytelling' && activeDialogueIndex < dialogues.length;

    // Auto-scroll: ensures active content is visible above footer when it expands or changes
    useEffect(() => {
        const isNewQuestion = prevIndexRef.current !== currentIndex;
        prevIndexRef.current = currentIndex;

        // On mobile, only auto-scroll on new questions, when answered, or if user touched footer
        if (isMobile && !isNewQuestion && !isAnswered && !lastInteractionWasFooter) {
            return;
        }

        const timer = setTimeout(() => {
            if (isNewQuestion && activeQuestionRef.current) {
                // For new questions, strictly scroll to the top of the section (including spacer)
                activeQuestionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (scrollRef.current) {
                // Within a section (like new dialogue), show the new line but never hide the header
                scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            // Reset footer interaction flag after scroll
            if (isMobile) setLastInteractionWasFooter(false);
        }, 220); // Increased from 150 for mobile responsiveness
        return () => clearTimeout(timer);
    }, [currentIndex, activeDialogueIndex, isAnswered, failedOptions.length, isMobile]);

    // Sync preferences from AuthContext profile
    useEffect(() => {
        if (authProfile) {
            soundEnabledRef.current = authProfile.sound_effects_enabled !== false;
            setSparkleEnabled(authProfile.sparkle_effects_enabled !== false);
            setSelectedAnimation(authProfile.study_page_animation || 'random');
            // If gender exists in profile, use it
            if (authProfile.gender) setProfile(p => ({ ...p, gender: authProfile.gender }));
        }
    }, [authProfile]);

    const soundEnabledRef = React.useRef(true);

    useEffect(() => {
        if (authProfile) {
            soundEnabledRef.current = authProfile.sound_effects_enabled !== false;
        } else {
            soundEnabledRef.current = localStorage.getItem('soundEffectsEnabled') !== 'false';
        }
        
        const handler = () => { 
            if (!authProfile) {
                soundEnabledRef.current = localStorage.getItem('soundEffectsEnabled') !== 'false'; 
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, [authProfile]);

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

    useEffect(() => {
        if (authProfile?.study_page_animation) {
            setSelectedAnimation(authProfile.study_page_animation);
        } else {
            const savedAnimation = localStorage.getItem('studyPageAnimation');
            if (savedAnimation) {
                setSelectedAnimation(savedAnimation);
            }
        }
    }, [authProfile?.study_page_animation]);

    useEffect(() => {
        if (!dotLottie || selectedAnimation === 'none') return;
        dotLottie.setLoop(true);
        dotLottie.play();
        // Show mascot only after first play fires
        const handlePlay = () => setMascotReady(true);
        dotLottie.addEventListener('play', handlePlay);
        return () => dotLottie.removeEventListener('play', handlePlay);
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
            setMascotReady(false); // hide until new model fires play
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
                // Fetch chapter info
                const { data: chapter, error: cErr } = await supabase
                    .from('chapters')
                    .select('title, order_index, unit_id')
                    .eq('id', chapterId)
                    .single();
                if (!cErr && chapter) {
                    setChapterInfo(chapter);
                    // Fetch next chapter info using unit_id since course_id is not directly in chapters table
                    const { data: nextC } = await supabase
                        .from('chapters')
                        .select('title')
                        .eq('unit_id', chapter.unit_id)
                        .gt('order_index', chapter?.order_index || 0)
                        .order('order_index', { ascending: true })
                        .limit(1)
                        .maybeSingle();
                    if (nextC) setNextChapter(nextC);
                }

                // Fetch streak info + check if chapter was already completed
                if (user?.id) {
                    const streak = await rewardService.getUserStreak(user.id);
                    if (streak) setStreakInfo(streak);

                    // Check prior completion to gate pollen reward
                    const { data: existingProgress } = await supabase
                        .from('user_progress')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('chapter_id', chapterId)
                        .eq('is_completed', true)
                        .limit(1)
                        .maybeSingle();
                    // If a completed record exists → this is NOT the first time
                    isFirstCompletion.current = !existingProgress;
                }

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
                    originalQuestionsLength.current = enrichedQuestions.length;
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

    // Check if user has already rated this course (DB check + localStorage fallback)
    useEffect(() => {
        const checkRating = async () => {
            if (!user?.id || !courseId) return;

            // Fast local check first
            const localKey = `rated_${courseId}_${user.id}`;
            if (localStorage.getItem(localKey) === 'true') {
                setAlreadyRated(true);
                return;
            }

            // DB check
            const rated = await courseService.checkUserRating(user.id, courseId);
            if (rated) {
                localStorage.setItem(localKey, 'true');
                setAlreadyRated(true);
            }
        };
        checkRating();
    }, [user?.id, courseId]);

    // Trigger feedback card after 2 minutes — fires ONCE per course session
    useEffect(() => {
        // Guard: skip if already rated, not logged in, still loading, or timer already fired
        if (alreadyRated || !user?.id || loading || ratingTimerFired.current) return;

        const timer = setTimeout(() => {
            ratingTimerFired.current = true; // prevent any future re-trigger
            setShowFeedbackCard(true);
        }, 2 * 60 * 1000); // 2 minutes

        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [alreadyRated, user?.id, loading]); // intentionally omit resultsActive to avoid re-trigger

    // Initialize Shuffled Right for Matching
    useEffect(() => {
        const q = questions[currentIndex];
        if (q?.question_type === 'matching' && q.metadata?.pairs) {
            const rightOptions = q.metadata.pairs.map((p, i) => ({ text: p.right, originalIdx: i }));
            setShuffledRight([...rightOptions].sort(() => Math.random() - 0.5));
            setMatches({});
            setSelectedLeft(null);
            setFlashingMatches(new Set());
        }
        setFailedOptions([]); // Clear wrong attempts when moving to new question
    }, [currentIndex, questions]);

    const handleOptionSelect = React.useCallback((optionId, questionType) => {
        if (isAnswered) return;
        if (questionType === 'checkmark') {
            // Multi-select: toggle in/out
            setSelectedOptions(prev => {
                const next = new Set(prev);
                if (next.has(optionId)) next.delete(optionId);
                else next.add(optionId);
                return next;
            });
        } else {
            setSelectedOption(optionId);
        }
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

            if (isCorrectPair) {
                // Flash green for 550ms then settle to disabled style
                const capturedLeft = selectedLeft;
                setFlashingMatches(prev => new Set(prev).add(capturedLeft));
                setTimeout(() => {
                    setFlashingMatches(prev => {
                        const next = new Set(prev);
                        next.delete(capturedLeft);
                        return next;
                    });
                }, 550);
            }

            if (!isCorrectPair) {
                // Add to failed list for red styling (blink)
                const failedEntry = { left: selectedLeft, right: index };
                setFailedOptions(prev => [...prev, failedEntry]);
                setShake(true);
                setTimeout(() => setShake(false), 500);

                const soundEnabled = soundEnabledRef.current;
                if (wrongAudio.current && soundEnabled) {
                    wrongAudio.current.currentTime = 0;
                    wrongAudio.current.play().catch(e => console.error(e));
                }

                if (user) await deductHeart(1);

                // After blink: clear wrong match AND remove red state → back to unselected
                const capturedLeft = selectedLeft;
                setTimeout(() => {
                    setMatches(prev => {
                        const updated = { ...prev };
                        delete updated[capturedLeft];
                        return updated;
                    });
                    // Remove only this specific failed entry so card returns to normal
                    setFailedOptions(prev =>
                        prev.filter(f => !(f.left === failedEntry.left && f.right === failedEntry.right))
                    );
                }, 800);
            }

            // No auto-submit — learner must manually click যাচাই করুন
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

        const soundEnabled = soundEnabledRef.current;
        if (allCorrect) {
            if (correctAudio.current && soundEnabled) {
                correctAudio.current.currentTime = 0;
                correctAudio.current.play().catch(e => console.error(e));
            }
            if (!questions[currentIndex]?.isRetry) {
                setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
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
        const isCheckmark = currentQuestion.question_type === 'checkmark';

        if (isMatching) return;

        // ── Checkmark: multi-select validation ──
        if (isCheckmark) {
            if (selectedOptions.size === 0 || isAnswered) return;
            if (!canAnswer) { setShowNoHeartsModal(true); return; }

            const correctIds = new Set(
                currentQuestion.mcq_options.filter(o => o.is_correct).map(o => o.id)
            );
            // All selected must be correct AND all correct must be selected
            const allCorrectSelected = [...correctIds].every(id => selectedOptions.has(id));
            const noWrongSelected = [...selectedOptions].every(id => correctIds.has(id));
            const correct = allCorrectSelected && noWrongSelected;

            setIsCorrect(correct);
            setIsAnswered(true);
            setAnswersHistory(prev => ({ ...prev, [currentIndex]: { selectedOptions: [...selectedOptions], isCorrect: correct } }));

            const soundEnabled = soundEnabledRef.current;
            if (correct) {
                if (correctAudio.current && soundEnabled) {
                    try { correctAudio.current.currentTime = 0; correctAudio.current.play(); } catch (err) { }
                }
                setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
            } else {
                // Mark wrong selections as failed
                const wrongSelected = [...selectedOptions].filter(id => !correctIds.has(id));
                setFailedOptions(prev => [...prev, ...wrongSelected]);
                if (wrongAudio.current && soundEnabled) {
                    try { wrongAudio.current.currentTime = 0; wrongAudio.current.play(); } catch (err) { }
                }
                setShake(true);
                setTimeout(() => setShake(false), 500);
                if (user) deductHeart(1).catch(console.error);
            }
            return;
        }

        // ── Standard single-select ──
        if (!selectedOption || isAnswered) return;
        if (!canAnswer) { setShowNoHeartsModal(true); return; }

        const selected = currentQuestion.mcq_options.find(o => o.id === selectedOption);
        const correct = !!selected?.is_correct;

        setIsCorrect(correct);
        setIsAnswered(true);
        setAnswersHistory(prev => ({ ...prev, [currentIndex]: { selectedOption, isCorrect: correct } }));

        const soundEnabled = soundEnabledRef.current;
        if (correct) {
            if (correctAudio.current && soundEnabled) {
                try { correctAudio.current.currentTime = 0; correctAudio.current.play(); } catch (err) { }
            }
            if (!questions[currentIndex]?.isRetry) {
                setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
            }
        } else {
            setFailedOptions(prev => [...prev, selectedOption]);
            if (wrongAudio.current && soundEnabled) {
                try { wrongAudio.current.currentTime = 0; wrongAudio.current.play(); } catch (err) { }
            }
            setShake(true);
            setTimeout(() => setShake(false), 500);
            if (user) deductHeart(1).catch(console.error);
        }
    }, [questions, currentIndex, selectedOption, selectedOptions, isAnswered, canAnswer, user, deductHeart]);

    const handleNext = async () => {
        const isSkip = !isAnswered;
        const isCurrentRetry = !!questions[currentIndex]?.isRetry;
        const isWrongAnswer = isAnswered && !isCorrect;

        // Accumulate retries for original questions only
        let updatedRetries = pendingRetries;
        if (!isCurrentRetry && (isSkip || isWrongAnswer)) {
            updatedRetries = new Set(pendingRetries).add(currentIndex);
            setPendingRetries(updatedRetries);
        }

        const isAtLastQuestion = currentIndex >= questions.length - 1;
        const isAtLastOriginal = currentIndex === originalQuestionsLength.current - 1;

        if (!isAtLastQuestion) {
            // Mid-chapter: just advance normally
            if (!isPremium && hearts === 0) {
                setShowNoHeartsModal(true);
                return;
            }
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setSelectedOptions(new Set());
            setIsAnswered(false);
            setIsCorrect(false);
            setActiveDialogueIndex(0);
        } else if (isAtLastOriginal && updatedRetries.size > 0) {
            // Just finished last ORIGINAL question — append retry round
            const retryQuestionsToAdd = [...updatedRetries]
                .sort((a, b) => a - b)
                .map(idx => ({
                    ...questions[idx],
                    isRetry: true,
                    id: `retry-${questions[idx].id}`,
                }));
            setQuestions(prev => [...prev, ...retryQuestionsToAdd]);
            setPendingRetries(new Set());
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setSelectedOptions(new Set());
            setIsAnswered(false);
            setIsCorrect(false);
            setActiveDialogueIndex(0);
        } else {
            if (isProcessingResults) return;
            setIsProcessingResults(true);
            setResultLoadingProgress(0);

            // Start an interval to simulate progress
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 15 + 5;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                    setTimeout(() => {
                        setIsProcessingResults(false);
                        setShowResults(true);
                    }, 600);
                }
                setResultLoadingProgress(progress);
            }, 180);

            if (user && courseId && chapterId) {
                try {
                    // Reward Logic: XP (Max 10), Pollen (Max 14 — first completion only)
                    const earnedXp = Math.round((stats.correct / (stats.total || 1)) * 10);
                    const earnedPollen = isFirstCompletion.current
                        ? Math.round((stats.correct / (stats.total || 1)) * 14)
                        : 0;

                    // Update user progress via Atomic RPC for better reliability and RLS bypass
                    const { error: rpcErr } = await supabase.rpc('upsert_user_progress', {
                        p_user_id: user.id,
                        p_course_id: courseId,
                        p_chapter_id: chapterId,
                        p_total_questions: stats.total,
                        p_correct_answers: stats.correct,
                        p_xp_earned: earnedXp
                    });

                    if (rpcErr) throw rpcErr;

                    // Update Profile Stats & Streak via Reward Service
                    if (user?.id) {
                        // This awards XP, logs activity, and updates streaks (always)
                        await rewardService.awardXP(user.id, earnedXp, 'chapter_complete', {
                            courseId,
                            chapterId,
                            accuracy: stats.correct / (stats.total || 1)
                        });

                        // This awards pollen — only on first completion
                        if (earnedPollen > 0) {
                            await rewardService.awardGems(user.id, earnedPollen, 'chapter_complete', {
                                courseId,
                                chapterId
                            });
                        }
                    }
                } catch (err) {
                    console.error('Error updating progress:', err);
                }
            }

            // Calculate time taken in 0.0 min format
            const durationMs = Date.now() - startTime;
            const durationMins = (durationMs / 60000).toFixed(1);
            setTimeTaken(durationMins);

            // Refetch streak to show updated streak if it was incremented
            if (user?.id) {
                rewardService.getUserStreak(user.id).then(s => {
                    if (s) setStreakInfo(s);
                });
            }

            // Play completion sound
            const soundEnabled = soundEnabledRef.current;
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

        }
    };

    if (loading) return <StudySkeleton />;

    if (questions.length === 0) return (
        <div className={styles.loadingContainer}>
            <div className="text-center space-y-6 max-w-sm px-6">
                <div className="bg-[#ffa202]/10 p-6 rounded-2xl border-2 border-dashed border-[#ffa202]/30">
                    <Lightbulb size={48} className="mx-auto mb-4 text-[#ffa202]" strokeWidth={1.5} />
                    <h2 className="text-xl font-bold text-white mb-2">এই অধ্যায়ে কোনো প্রশ্ন পাওয়া যায়নি।</h2>
                    <p className="text-gray-400 text-sm">সম্ভবত এই অধ্যায়টি শীঘ্রই আপডেট করা হবে। আপনি চাইলে এখন এটি সম্পন্ন করে এগিয়ে যেতে পারেন।</p>
                </div>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={handleNext} 
                        className="w-full bg-[#ffa202] text-white px-6 py-3 rounded-xl font-bold shadow-[0_4px_0_#e69200] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                        অধ্যায়টি সম্পন্ন করুন <ArrowRight size={20} />
                    </button>
                    <button 
                        onClick={() => navigate(-1)} 
                        className="w-full bg-[#2d383e] text-white/60 px-6 py-3 rounded-xl font-medium hover:text-white transition-colors"
                    >
                        ফিরে যান
                    </button>
                </div>
            </div>
        </div>
    );

    const currentQuestion = questions[currentIndex];
    const optionLabels = ['A', 'B', 'C', 'D', 'E'];
    // Derived — no separate state needed, always in sync
    const progress = questions.length > 0 ? ((currentIndex + (isAnswered ? 1 : 0)) / questions.length) * 100 : 0;


    return (
        <div className={`${styles.studyPage} ${(showResults || isProcessingResults) ? styles.resultsActive : ''}`}>
            <header className={`${styles.header} ${(showResults || isProcessingResults || showReview) ? styles.headerHidden : ''}`}>
                <div className={styles.headerContent}>
                    <button className={styles.closeBtn} onClick={() => setShowExitConfirmation(true)}>
                        <X size={24} strokeWidth={3} />
                    </button>
                    <div className={styles.progressContainer}>
                        <div className={styles.progressBar}>
                            <div className={styles.progressFillClip}>
                                <motion.div
                                    className={styles.progressFill}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                />
                            </div>
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
                                            const baseAngle = (i / 10) * 360;
                                            const jitter = ((i * 37 + currentIndex * 13) % 60) - 30;
                                            const angle = baseAngle + jitter - 90;
                                            const rad = (angle * Math.PI) / 180;
                                            const dist = 20 + ((i * 11 + currentIndex * 7) % 18);
                                            const tx = Math.cos(rad) * dist;
                                            const ty = Math.sin(rad) * dist;
                                            const isRing = i % 3 === 1;
                                            const size = 7 + (i % 3) * 2.5;
                                            return (
                                                <motion.span
                                                    key={i}
                                                    className={isRing ? styles.progressBubbleRing : styles.progressBubbleDot}
                                                    style={{ width: size, height: size }}
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
                </div>
            </header>

            <main ref={mainContentRef} className={styles.mainContent}>
                <div className={styles.studyContentWrapper}>

                    {/* ── Review Screen ── (fixed overlay between header and footer) */}

                    {/* ── Results Loading Overlay (Calculating rewards) ── */}
                    <AnimatePresence>
                        {isProcessingResults && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className={styles.resultsLoadingOverlay}
                            >
                                <div className={styles.loadingInner}>
                                    <DotLottieReact
                                        src="/models/Honey bee.lottie"
                                        autoplay
                                        loop
                                        className={styles.loadingBee}
                                    />
                                    <h2 className={styles.loadingText}> ফলাফল তৈরি করা হচ্ছে...</h2>
                                    <div className={styles.loadingBarContainer}>
                                        <motion.div
                                            className={styles.loadingBarFill}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${resultLoadingProgress}%` }}
                                            transition={{ ease: "linear" }}
                                        />
                                    </div>
                                    <span className={styles.loadingPercent}>{Math.round(resultLoadingProgress)}%</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Inline Result Card (shown when chapter is completed) ── */}
                    <AnimatePresence mode="wait">
                        {resultsActive && (
                            <motion.div
                                key="inline-result"
                                initial={{ opacity: 0, y: 30 }}
                                animate={showReview
                                    ? { opacity: 0.3, y: 12, scale: 0.93 }
                                    : { opacity: 1, y: 0, scale: 1 }
                                }
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                                className={styles.inlineResultCard}
                            >
                                {/* ── Fireworks celebration animation ── */}
                                <div className={styles.fireworksWrap}>
                                    <DotLottieReact
                                        src="/models/Fireworks.lottie"
                                        autoplay
                                        loop
                                        className={styles.fireworksAnim}
                                    />
                                </div>

                                <div className={styles.beeHeader}>
                                    <DotLottieReact
                                        src={
                                            (stats.correct / (stats.total || 1)) >= 0.67
                                                ? "/models/Honey bee.lottie"
                                                : (stats.correct / (stats.total || 1)) >= 0.34
                                                    ? "/models/Bee looking.lottie"
                                                    : "/models/awkward bee.lottie"
                                        }
                                        autoplay
                                        loop
                                        className={styles.resultBee}
                                    />
                                </div>

                                <div className={styles.resultDivider} />

                                <div className={styles.dualChartsArea}>
                                    {/* Chart 1: Accuracy Meter Chart */}
                                    <div className={styles.chartWrapper}>
                                        <div className={cn(styles.minimalChart, styles.chart1, styles.meterChart)}>
                                            <svg viewBox="0 0 100 60" className={styles.meterSvg}>
                                                <path
                                                    d="M 10,50 A 40,40 0 0 1 90,50"
                                                    className={styles.meterTrack}
                                                    strokeWidth="10"
                                                    fill="none"
                                                />
                                                <motion.path
                                                    d="M 10,50 A 40,40 0 0 1 90,50"
                                                    className={styles.meterFill}
                                                    strokeWidth="10"
                                                    fill="none"
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: stats.correct / (stats.total || 1) }}
                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                />
                                            </svg>
                                            <div className={styles.meterContent}>
                                                <span className={styles.percentText}>{Math.round((stats.correct / (stats.total || 1)) * 100)}%</span>
                                                <span className={styles.successLabel}>সঠিক</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chart 2: Rewards Meter Chart */}
                                    <div className={styles.chartWrapper}>
                                        <div className={cn(styles.minimalChart, styles.chart1, styles.meterChart)}>
                                            {(() => {
                                                const ARC = 125.7;
                                                const accuracy = stats.correct / (stats.total || 1);
                                                const showPollen = isFirstCompletion.current;
                                                const earnedPollen = showPollen ? Math.round(accuracy * 14) : 0;
                                                const earnedXp = Math.round(accuracy * 10);
                                                // Normalizer: 24 when pollen shown, 10 when xp-only
                                                const TOTAL = showPollen ? 24 : 10;
                                                const pollenArc = (earnedPollen / TOTAL) * ARC;
                                                const xpArc = (earnedXp / TOTAL) * ARC;
                                                return (
                                                    <svg viewBox="0 0 100 60" className={styles.meterSvg}>
                                                        {/* Track (blank background arc) */}
                                                        <path
                                                            d="M 10,50 A 40,40 0 0 1 90,50"
                                                            className={styles.meterTrack}
                                                            strokeWidth="10"
                                                            fill="none"
                                                        />
                                                        {/* Pollen segment — first completion only */}
                                                        {showPollen && (
                                                            <motion.path
                                                                d="M 10,50 A 40,40 0 0 1 90,50"
                                                                className={cn(styles.meterFill, styles.pollenSegment)}
                                                                strokeWidth="10"
                                                                fill="none"
                                                                initial={{ strokeDasharray: `0 ${ARC}` }}
                                                                animate={{ strokeDasharray: `${pollenArc} ${ARC}` }}
                                                                transition={{ duration: 1.4, delay: 0.3, ease: "easeOut" }}
                                                            />
                                                        )}
                                                        {/* XP segment — starts right after pollen (or from start if no pollen) */}
                                                        <motion.path
                                                            d="M 10,50 A 40,40 0 0 1 90,50"
                                                            className={cn(styles.meterFill, styles.xpSegment)}
                                                            strokeWidth="10"
                                                            fill="none"
                                                            strokeDashoffset={-pollenArc}
                                                            initial={{ strokeDasharray: `0 ${ARC}` }}
                                                            animate={{ strokeDasharray: `${xpArc} ${ARC}` }}
                                                            transition={{ duration: 1.1, delay: 0.55, ease: "easeOut" }}
                                                        />
                                                    </svg>
                                                );
                                            })()}
                                            <div className={styles.meterContent}>
                                                <div className={styles.rewardIconsCompact}>
                                                    {isFirstCompletion.current && (
                                                        <div className={styles.rewardIconGroup}>
                                                            <PollenIcon size={13} />
                                                            <span className={styles.rewardValSmall}>+{Math.round((stats.correct / (stats.total || 1)) * 14)}</span>
                                                        </div>
                                                    )}
                                                    <div className={styles.rewardIconGroup}>
                                                        <Zap size={13} fill="#1cb0f6" stroke="none" />
                                                        <span className={styles.rewardValSmall}>+{Math.round((stats.correct / (stats.total || 1)) * 10)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!showResults && (
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
                                                ref={isLatest ? activeQuestionRef : null}
                                                initial={isLatest ? { x: 40 } : false}
                                                animate={{ x: 0 }}
                                                transition={isLatest ? { duration: 1.1, ease: [0.25, 1, 0.5, 1] } : {}}
                                                className={cn(styles.questionSection, !isLatest && "opacity-60 grayscale-[0.5] scale-[0.98] transition-all")}
                                            >
                                                {/* Mobile Safety Spacer: Prevents content from going behind fixed header on start-scroll */}
                                                {isLatest && isMobile && <div className={styles.mobileTopSpacer} />}
                                                {showStory && (
                                                    <StorytellingDisplay
                                                        content={q.narrative}
                                                        visibleCount={isLatest ? activeDialogueIndex : 999}
                                                    />
                                                )}

                                                {showMCQ && (
                                                    <div className="space-y-8">
                                                        {/* ── Retry banner ── */}
                                                        {isLatest && q.isRetry && (
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 8,
                                                                padding: '7px 12px',
                                                                borderRadius: 10,
                                                                background: 'rgba(255, 184, 0,0.06)',
                                                                border: '1px solid rgba(255, 184, 0,0.2)',
                                                                marginBottom: 4,
                                                            }}>
                                                                <span style={{ fontSize: '1rem' }}>🔄</span>
                                                                <div>
                                                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFB800' }}>{t('re_practice')}</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {!isStory && (q.narrative || q.explanation) && (

                                                            <div className={styles.contextText}>
                                                                <span className={styles.lightbulb}><Lightbulb size={20} color="#ffa202" /></span>
                                                                {q.narrative?.replace(/^💡\s*পড়াশোনার বিষয়\/হিন্ট:\s*/, '').trim() || "মনোযোগ দিয়ে পড়ুন..."}
                                                            </div>
                                                        )}

                                                        <h2 className={styles.questionTitle}>
                                                            {isLatest && selectedAnimation !== 'none' && (
                                                                <span
                                                                    className={styles.mascotMini}
                                                                    style={{
                                                                        opacity: mascotReady ? 1 : 0,
                                                                        transition: 'opacity 0.2s ease',
                                                                    }}
                                                                >
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
                                                                            // Green flash: newly correct match (first 550ms)
                                                                            const isFlashing = isLatest && flashingMatches.has(pIdx);

                                                                            if (!pair.left || pair.left.trim() === '') return null;

                                                                            return (
                                                                                <div
                                                                                    key={`l-${pIdx}`}
                                                                                    className={cn(
                                                                                        styles.matchingCard,
                                                                                        selectedLeft === pIdx && styles.selectedCard,
                                                                                        isFlashing && styles.matchFlash,
                                                                                        !isFlashing && isMatchCorrect && styles.matched,
                                                                                        isMatchWrong && styles.mismatch,
                                                                                        hasFailed && !isMatched && styles.hasFailed
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
                                                                            const isFlashingRight = isLatest && isMatchCorrect && flashingMatches.has(parseInt(lIdx));

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
                                                                                        isFlashingRight && styles.matchFlash,
                                                                                        !isFlashingRight && isMatchCorrect && styles.matched,
                                                                                        isMatchWrong && styles.mismatch,
                                                                                        isHint && styles.hintCard
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
                                                                    const isCheckmark = q.question_type === 'checkmark';
                                                                    // For checkmark: use selectedOptions Set; for others: single selectedOption
                                                                    const isSelected = isCheckmark
                                                                        ? (isLatest ? selectedOptions.has(option.id) : answer?.selectedOptions?.includes(option.id))
                                                                        : (isLatest ? selectedOption : answer?.selectedOption) === option.id;
                                                                    const isCorrectOpt = option.is_correct;
                                                                    const showResult = isLatest ? isAnswered : true;
                                                                    const isFailed = isLatest && failedOptions.includes(option.id);

                                                                    // For checkmark: show correct options green whenever answer submitted wrong
                                                                    // For MCQ: show correct only when question answered correctly OR after a failure
                                                                    const checkmarkRevealCorrect = isCheckmark && isLatest && isAnswered && !isCorrect && isCorrectOpt;
                                                                    const showCorrect = (showResult && isCorrectOpt && (isLatest ? isCorrect : answer?.isCorrect)) ||
                                                                        (isLatest && failedOptions.length > 0 && isCorrectOpt) ||
                                                                        checkmarkRevealCorrect;

                                                                    // Wrong: selected a wrong option (checkmark) or standard failed
                                                                    const isWrongSelected = isCheckmark
                                                                        ? isAnswered && isSelected && !isCorrectOpt  // submitted & selected wrong
                                                                        : (showResult && isSelected && !isCorrectOpt) || isFailed;

                                                                    return (
                                                                        <button
                                                                            key={option.id}
                                                                            className={cn(
                                                                                styles.optionBtn,
                                                                                isSelected && !isWrongSelected && !showCorrect && styles.selected,
                                                                                showCorrect && styles.correct,
                                                                                isWrongSelected || isFailed ? styles.incorrect : ''
                                                                            )}
                                                                            onClick={() => isLatest && handleOptionSelect(option.id, q.question_type)}
                                                                            disabled={!isLatest || isAnswered || isFailed}
                                                                        >
                                                                            <div className={styles.optionIndex}>
                                                                                {isCheckmark ? <CheckSquare size={16} /> : optionLabels[optIdx]}
                                                                            </div>
                                                                            <span className={styles.optionText}>{option.option_text}</span>
                                                                            {/* ✅ correct icon — show on correct answer after submit */}
                                                                            {showResult && isCorrectOpt && (isCheckmark ? (isAnswered && !isCorrect) || isCorrect : (isLatest ? isCorrect : answer?.isCorrect)) && (
                                                                                <div className={styles.correctIcon}><CircleCheckBig size={20} /></div>
                                                                            )}
                                                                            {/* ❌ wrong icon — wrong selected option */}
                                                                            {isWrongSelected && (
                                                                                <div className={styles.incorrectIcon}><CircleX size={20} /></div>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {isLatest && <div ref={scrollRef} className={styles.scrollAnchor} />}
                                            </motion.div>
                                        );
                                    });
                                })()}
                            </div>
                        </AnimatePresence>
                    )}

                </div>
            </main>

            <footer
                className={`${styles.footer} ${resultsActive ? styles.footerResults : (isAnswered ? (isCorrect ? styles.footerCorrect : styles.footerIncorrect) : '')} ${isProcessingResults ? styles.footerHidden : ''}`}
                onPointerDown={() => isMobile && setLastInteractionWasFooter(true)}
            >
                <div className={styles.footerContent}>
                    {resultsActive ? (
                        /* ── Result / Review footer ── */
                        <div className="w-full flex gap-3 justify-between">
                            <button
                                className={styles.reviewBtn}
                                onClick={() => {
                                    setLastInteractionWasFooter(true);
                                    setShowReview(!showReview);
                                }}
                            >
                                {showReview ? 'ফলাফল দেখুন' : 'রিভিউ করুন'}
                            </button>
                            {!showReview && (
                                <button
                                    className={styles.continueFinishBtn}
                                    onClick={() => navigate(`/learn/${courseId}`)}
                                >
                                    অব্যাহত রাখুন
                                </button>
                            )}
                        </div>
                    ) : !isAnswered ? (
                        <>
                            {isStoryInProgress ? (
                                <div className="w-full flex justify-end">
                                    <button
                                        className={styles.checkBtn}
                                        onClick={() => {
                                            setLastInteractionWasFooter(true);
                                            setActiveDialogueIndex(prev => prev + 1);
                                        }}
                                    >
                                        এগিয়ে যান
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full flex gap-3 justify-between">
                                    <button className={styles.skipBtn} onClick={() => {
                                        setLastInteractionWasFooter(true);
                                        handleNext();
                                    }}>এগিয়ে যান</button>
                                    {questions[currentIndex]?.question_type === 'matching' ? (
                                        <button
                                            className={`${styles.checkBtn} ${Object.keys(matches).length < (questions[currentIndex]?.metadata?.pairs?.length || 0) ? styles.checkBtnDisabled : ''}`}
                                            aria-disabled={Object.keys(matches).length < (questions[currentIndex]?.metadata?.pairs?.length || 0)}
                                            onClick={() => {
                                                setLastInteractionWasFooter(true);
                                                if (Object.keys(matches).length >= (questions[currentIndex]?.metadata?.pairs?.length || 0)) handleMatchSubmit();
                                            }}
                                        >
                                            যাচাই করুন
                                        </button>
                                    ) : (
                                        <button
                                            className={`${styles.checkBtn} ${
                                                questions[currentIndex]?.question_type === 'checkmark'
                                                    ? selectedOptions.size === 0 ? styles.checkBtnDisabled : ''
                                                    : !selectedOption ? styles.checkBtnDisabled : ''
                                            }`}
                                            aria-disabled={
                                                questions[currentIndex]?.question_type === 'checkmark'
                                                    ? selectedOptions.size === 0
                                                    : !selectedOption
                                            }
                                            onClick={() => {
                                                setLastInteractionWasFooter(true);
                                                const hasSelection = questions[currentIndex]?.question_type === 'checkmark'
                                                    ? selectedOptions.size > 0
                                                    : !!selectedOption;
                                                if (hasSelection) handleCheck();
                                            }}
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
                                <button className={styles.continueBtn} onClick={() => {
                                    setLastInteractionWasFooter(true);
                                    handleNext();
                                }}>
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
                            <button className={styles.modalCloseBtn} onClick={() => setShowNoHeartsModal(false)}>
                                <X size={18} strokeWidth={2.5} />
                            </button>

                            <div className={styles.noHeartsContent}>
                                <div className={styles.noHeartsHero}>
                                    <div className={styles.honeyEmoji}>🍯</div>
                                    <div className={styles.noHeartsTextBlock}>
                                        <h2 className={styles.noHeartsTitle}>আপনার মৌচাকে মধু শেষ!</h2>
                                        <p className={styles.noHeartsSub}>চিন্তা নেই! মৌমাছিরা আবার মধু সংগ্রহের জন্য প্রস্তুত।</p>
                                    </div>
                                </div>

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

                                <div className={styles.noHeartsDivider} />

                                <div className={styles.noHeartsButtons}>
                                    <button
                                        className={`${styles.btn3d} ${styles.instantRefillBtn}`}
                                        onClick={() => { setShowNoHeartsModal(false); navigate('/shop'); }}
                                    >
                                        <Zap size={18} fill="currentColor" strokeWidth={0} />
                                        <span>আনলিমিটেড 24 ঘন্টা - মাত্র 4 টাকা</span>
                                    </button>

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
                        <div className={styles.checkoutCardHeader}>
                            <div className={styles.checkoutCardIcon}>
                                {showNoHeartsCheckout.type === 'hearts' ? '🍯' : '👑'}
                            </div>
                            <h2 className={styles.checkoutCardTitle}>পেমেন্ট কনফার্ম করুন</h2>
                            <p className={styles.checkoutCardSub}>নিচের বিবরণ যাচাই করুন</p>
                        </div>

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
                                    onClick={() => navigate(`/learn/${courseId}`)}
                                >
                                    পরে ফিরে আসবো
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {showReview && (
                    <motion.div
                        key="review-overlay"
                        initial={{ opacity: 0, y: 40, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.98 }}
                        transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
                        className={styles.reviewOverlay}
                    >
                        <div className={styles.reviewList}>
                            {questions.map((q, idx) => {
                                const hist = answersHistory[idx];
                                if (!hist) return null;
                                const correct = hist.isCorrect;

                                let chosenText = null;
                                let correctText = null;
                                if (q.question_type !== 'matching') {
                                    const chosen = q.mcq_options?.find(o => o.id === hist.selectedOption);
                                    const corr = q.mcq_options?.find(o => o.is_correct);
                                    chosenText = chosen?.option_text ?? null;
                                    correctText = corr?.option_text ?? null;
                                }

                                return (
                                    <div
                                        key={q.id}
                                        className={`${styles.reviewCard} ${correct ? styles.reviewCardCorrect : styles.reviewCardWrong}`}
                                    >
                                        <div className={styles.reviewQNum}>প্রশ্ন {(idx + 1).toLocaleString('bn-BD')}</div>
                                        <p className={styles.reviewQText}>{q.question_text}</p>

                                        {q.question_type === 'matching' ? (
                                            <div className={`${styles.reviewAnswer} ${correct ? styles.reviewAnswerCorrect : styles.reviewAnswerWrong}`}>
                                                {correct ? '✓ সব জোড়া সঠিক' : '✗ ভুল জোড়া ছিল'}
                                            </div>
                                        ) : (
                                            <div className={styles.reviewAnswerBlock}>
                                                <div className={`${styles.reviewAnswer} ${correct ? styles.reviewAnswerCorrect : styles.reviewAnswerWrong}`}>
                                                    {correct ? '✓' : '✗'} {chosenText}
                                                </div>
                                                {!correct && correctText && (
                                                    <div className={styles.reviewCorrectHint}>
                                                        <span className={styles.reviewHintLabel}>সঠিক উত্তর:</span> {correctText}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {showFeedbackCard && user && (
                <CourseFeedbackCard
                    courseId={courseId}
                    userId={user.id}
                    onDismiss={() => setShowFeedbackCard(false)}
                    onRated={() => {
                        // Mark as rated permanently so it never shows again for this course
                        const localKey = `rated_${courseId}_${user.id}`;
                        localStorage.setItem(localKey, 'true');
                        setAlreadyRated(true);
                        setShowFeedbackCard(false);
                    }}
                />
            )}
        </div >
    );
};

export default StudyPage;
