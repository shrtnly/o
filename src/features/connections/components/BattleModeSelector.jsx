import React, { useState } from 'react';
import { Check, HelpCircle } from 'lucide-react';

const BattleModeSelector = ({ language, value, onChange }) => {
    const [showTooltip, setShowTooltip] = useState(false);
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
            gap: '8px',
            width: '100%',
            marginTop: '16px',
            alignItems: 'flex-start',
            position: 'relative'
        }}>
            {/* Left aligned header/label with question small icon */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '2px'
            }}>
                <span style={{
                    fontSize: '0.72rem',
                    color: 'var(--color-text-muted)',
                    fontWeight: '700',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.4px'
                }}>
                    {language === 'bn' ? 'ব্যাটেল মোড নির্বাচন করুন' : 'Select Battle Mode'}
                </span>
                <div 
                    onClick={() => setShowTooltip(!showTooltip)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                        transition: 'color 0.2s ease',
                        padding: '2px',
                        position: 'relative'
                    }}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                >
                    <HelpCircle size={14} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />

                    {/* Tooltip Box with Arrow pointing to the question icon */}
                    {showTooltip && (
                        <div style={{
                            position: 'absolute',
                            bottom: '26px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '260px',
                            background: 'var(--color-bg-deep, #141419)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            padding: '12px',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
                            zIndex: 9999,
                            pointerEvents: 'none'
                        }}>
                            {/* Little triangle arrow pointing down to the question icon */}
                            <div style={{
                                position: 'absolute',
                                bottom: '-5px',
                                left: '50%',
                                transform: 'translateX(-50%) rotate(45deg)',
                                width: '8px',
                                height: '8px',
                                background: 'var(--color-bg-deep, #141419)',
                                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                            }} />

                            <div style={{
                                fontSize: '0.74rem',
                                color: '#ffffff',
                                lineHeight: '1.4',
                                fontWeight: '500'
                            }}>
                                {language === 'bn' ? (
                                    <ul style={{ margin: 0, paddingLeft: '14px' }}>
                                        <li style={{ marginBottom: '6px' }}><strong>লাইভ শিক্ষার্থী:</strong> অন্য একজন সক্রিয় শিক্ষার্থীর সাথে ম্যাচ খুঁজবে।</li>
                                        <li><strong>এআই এজেন্ট:</strong> সরাসরি একটি কৃত্রিম বুদ্ধিমত্তা সম্পন্ন রোবটের সাথে খেলা শুরু হবে।</li>
                                    </ul>
                                ) : (
                                    <ul style={{ margin: 0, paddingLeft: '14px' }}>
                                        <li style={{ marginBottom: '6px' }}><strong>Live Learner:</strong> Matches you with another active real learner.</li>
                                        <li><strong>AI Agent:</strong> Lets you play instantly against an AI bot.</li>
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Combined Flex Row Aligned with Left for Battle Mode */}
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
                        {language === 'bn' ? 'এআই এজেন্ট' : 'AI Agent'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default BattleModeSelector;
