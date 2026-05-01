import React from 'react';
import { Check } from 'lucide-react';

const BattleModeSelector = ({ language, value, onChange, difficulty = 'easy', onDifficultyChange }) => {
    const isLiveActive = value === 'both' || value === 'pvp';
    const isAiActive = value === 'both' || value === 'bot';

    const toggleLive = () => {
        if (isLiveActive && isAiActive) {
            onChange('bot');
        } else if (isLiveActive && !isAiActive) {
            onChange('bot');
        } else {
            onChange('both');
        }
    };

    const toggleAi = () => {
        if (isLiveActive && isAiActive) {
            onChange('pvp');
        } else if (!isLiveActive && isAiActive) {
            onChange('pvp');
        } else {
            onChange('both');
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            marginTop: '16px',
            alignItems: 'flex-start'
        }}>
            {/* Horizontal Line with centered text */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                marginBottom: '4px'
            }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
                <span style={{
                    padding: '0 12px',
                    fontSize: '0.72rem',
                    color: 'var(--color-text-muted)',
                    fontWeight: '700',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.4px'
                }}>
                    {language === 'bn' ? 'ব্যাটেল মোড নির্বাচন করুন' : 'Select Battle Mode'}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
            </div>

            {/* Flex Row Aligned with Left */}
            <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
                flexWrap: 'wrap',
                gap: '16px',
                width: '100%',
                padding: '2px 0'
            }}>
                {/* Live Player Option */}
                <div 
                    onClick={toggleLive}
                    style={{
                        width: 'fit-content',
                        height: '34px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        userSelect: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        padding: '0 6px'
                    }}
                >
                    {/* Checkbox with tick mark inside */}
                    <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        border: isLiveActive ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.25)',
                        background: isLiveActive ? '#ffffff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                    }}>
                        {isLiveActive && <Check size={12} strokeWidth={3} style={{ color: 'var(--color-bg-deep, #000)' }} />}
                    </div>

                    {/* Label inside */}
                    <span style={{
                        color: isLiveActive ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        transition: 'all 0.2s ease',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap'
                    }}>
                        {language === 'bn' ? 'লাইভ শিক্ষার্থী' : 'Live Learner'}
                    </span>
                </div>

                {/* AI Option */}
                <div 
                    onClick={toggleAi}
                    style={{
                        width: 'fit-content',
                        height: '34px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        userSelect: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        padding: '0 6px'
                    }}
                >
                    {/* Checkbox with tick mark inside */}
                    <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        border: isAiActive ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.25)',
                        background: isAiActive ? '#ffffff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                    }}>
                        {isAiActive && <Check size={12} strokeWidth={3} style={{ color: 'var(--color-bg-deep, #000)' }} />}
                    </div>

                    {/* Label inside */}
                    <span style={{
                        color: isAiActive ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        transition: 'all 0.2s ease',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap'
                    }}>
                        {language === 'bn' ? 'এআই বট' : 'AI Bot'}
                    </span>
                </div>
            </div>

            {/* Horizontal Line with centered text for Difficulty */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                marginTop: '12px',
                marginBottom: '4px'
            }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
                <span style={{
                    padding: '0 12px',
                    fontSize: '0.72rem',
                    color: 'var(--color-text-muted)',
                    fontWeight: '700',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.4px'
                }}>
                    {language === 'bn' ? 'প্রশ্নের লেভেল নির্বাচন করুন' : 'Select Question Difficulty'}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
            </div>

            {/* Difficulty Flex Row */}
            <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
                flexWrap: 'wrap',
                gap: '16px',
                width: '100%',
                padding: '2px 0'
            }}>
                {/* Easy Option */}
                <div 
                    onClick={() => onDifficultyChange && onDifficultyChange('easy')}
                    style={{
                        width: 'fit-content',
                        height: '34px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        userSelect: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        padding: '0 6px'
                    }}
                >
                    {/* Checkbox with tick mark inside */}
                    <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        border: difficulty === 'easy' ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.25)',
                        background: difficulty === 'easy' ? '#ffffff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                    }}>
                        {difficulty === 'easy' && <Check size={12} strokeWidth={3} style={{ color: 'var(--color-bg-deep, #000)' }} />}
                    </div>

                    {/* Label inside */}
                    <span style={{
                        color: difficulty === 'easy' ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        transition: 'all 0.2s ease',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap'
                    }}>
                        {language === 'bn' ? 'সহজ' : 'Easy'}
                    </span>
                </div>

                {/* Hard Option */}
                <div 
                    onClick={() => onDifficultyChange && onDifficultyChange('hard')}
                    style={{
                        width: 'fit-content',
                        height: '34px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        userSelect: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        padding: '0 6px'
                    }}
                >
                    {/* Checkbox with tick mark inside */}
                    <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        border: difficulty === 'hard' ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.25)',
                        background: difficulty === 'hard' ? '#ffffff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                    }}>
                        {difficulty === 'hard' && <Check size={12} strokeWidth={3} style={{ color: 'var(--color-bg-deep, #000)' }} />}
                    </div>

                    {/* Label inside */}
                    <span style={{
                        color: difficulty === 'hard' ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        transition: 'all 0.2s ease',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap'
                    }}>
                        {language === 'bn' ? 'কঠিন' : 'Hard'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default BattleModeSelector;
