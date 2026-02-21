import React, { useEffect, useState } from 'react';
import { Sparkles, Gift, X } from 'lucide-react';
import styles from './HoneyJarGiftModal.module.css';

const GIFT_CONFIG = {
    pollen: {
        emoji: '🌼',
        color: '#FFD700',
        title: 'পরাগরেণু পুরস্কার!',
        subtitle: (amount) => `আপনি ${amount}টি পরাগরেণু (জেম) জিতেছেন!`,
    },
    honey_drops: {
        emoji: '🍯',
        color: '#F1A20F',
        title: 'মধু ফোঁটা পুরস্কার!',
        subtitle: (amount) => `আপনি ${amount}টি মধু ফোঁটা (হার্ট) জিতেছেন!`,
    },
    flaming_badge: {
        emoji: '🔥',
        color: '#FF4500',
        title: 'ফ্লেমিং ব্যাজ!',
        subtitle: () => '২৪ ঘণ্টার জন্য আপনার প্রোফাইলে আগুনের ব্যাজ সক্রিয় হয়েছে!',
    },
};

export default function HoneyJarGiftModal({ gift, onClaim, onClose }) {
    const [phase, setPhase] = useState('reveal');    // reveal → claiming → claimed
    const [revealed, setRevealed] = useState(false);

    const cfg = gift ? GIFT_CONFIG[gift.gift_type] : null;

    useEffect(() => {
        if (!gift) return;
        const t = setTimeout(() => setRevealed(true), 400);
        return () => clearTimeout(t);
    }, [gift]);

    const handleClaim = async () => {
        setPhase('claiming');
        await onClaim(gift.id);
        setPhase('claimed');
        setTimeout(onClose, 1800);
    };

    if (!gift || !cfg) return null;

    return (
        <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={styles.modal}>
                {/* Sparkles header */}
                <div className={styles.sparkleRow}>
                    <Sparkles size={16} className={styles.sparkleIcon} />
                    <span className={styles.sparkleText}>মৌ-উপহার পেয়েছেন!</span>
                    <Sparkles size={16} className={styles.sparkleIcon} />
                </div>

                <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>

                {/* Jar overflow / gift box animation */}
                <div className={styles.giftBox}>
                    <div className={`${styles.jarOverflow} ${revealed ? styles.visible : ''}`}>
                        <div className={styles.overflowHoney} />
                        <div className={styles.overflowHoney} />
                        <div className={styles.overflowHoney} />
                    </div>

                    <div className={`${styles.giftEmoji} ${revealed ? styles.emojiReveal : ''}`}
                        style={{ '--gift-color': cfg.color }}>
                        {cfg.emoji}
                    </div>
                </div>

                {/* Gift info */}
                <div className={`${styles.giftInfo} ${revealed ? styles.visible : ''}`}>
                    <h2 className={styles.giftTitle} style={{ color: cfg.color }}>
                        {cfg.title}
                    </h2>
                    <p className={styles.giftSubtitle}>
                        {cfg.subtitle(gift.gift_amount)}
                    </p>
                </div>

                {/* Claim button */}
                {phase === 'reveal' && (
                    <button
                        className={styles.claimBtn}
                        onClick={handleClaim}
                        disabled={!revealed}
                    >
                        <Gift size={18} />
                        <span>পুরস্কার সংগ্রহ করুন</span>
                    </button>
                )}

                {phase === 'claiming' && (
                    <div className={styles.claimingText}>সংগ্রহ করা হচ্ছে...</div>
                )}

                {phase === 'claimed' && (
                    <div className={styles.claimedText}>
                        <Sparkles size={20} />
                        <span>সফলভাবে সংগ্রহ হয়েছে!</span>
                    </div>
                )}

                {/* Badge note */}
                {gift.gift_type === 'flaming_badge' && (
                    <p className={styles.badgeNote}>
                        🔥 ব্যাজটি ২৪ ঘণ্টার জন্য সক্রিয় থাকবে
                    </p>
                )}
            </div>
        </div>
    );
}
