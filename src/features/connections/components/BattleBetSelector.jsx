import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import PollenIcon from '../../../components/PollenIcon';

const BattleBetSelector = ({ language, value, onChange }) => {
    // value is expected to be an object: { type: 'xp' | 'pollen', amount: number }
    const [showTooltip, setShowTooltip] = useState(false);
    const [betType, setBetType] = useState(value?.type || 'xp');

    const options = [25, 50, 100];

    const currentAmount = value?.amount || 0;

    const handleToggleType = (type) => {
        setBetType(type);
        // Reset amount or change type
        onChange({ type, amount: currentAmount });
    };

    const handleSelectAmount = (amt) => {
        // Toggle the amount off if it's already selected
        if (currentAmount === amt && value?.type === betType) {
            onChange({ type: betType, amount: 0 });
        } else {
            onChange({ type: betType, amount: amt });
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
            {/* Header/Label row with Tooltip */}
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
                    {language === 'bn' ? 'ব্যাটেল বাজি' : 'Battle Stake'}
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
                                        <li style={{ marginBottom: '6px' }}><strong>ব্যাটেল বাজি:</strong> ম্যাচ শুরু করার আগে আপনার জমানো XP বা মধুরেণু (Pollen) বাজিতে রাখতে পারবেন।</li>
                                        <li><strong>ফলাফল:</strong> ম্যাচটি জিতলে দ্বিগুণ XP/পোলেন পাবেন, এবং হারলে বাজি ধরা পরিমাণ কেটে নেওয়া হবে (কমপক্ষে ৫০% সঠিক উত্তরের শর্ত প্রযোজ্য)।</li>
                                    </ul>
                                ) : (
                                    <ul style={{ margin: 0, paddingLeft: '14px' }}>
                                        <li style={{ marginBottom: '6px' }}><strong>Battle Stake:</strong> You can stake a specific amount of XP or Pollen from your balance before playing.</li>
                                        <li><strong>Outcome:</strong> If you win, you receive double the staked currency; if you lose, the staked amount is deducted {"(must achieve >= 50% accuracy)"}.</li>
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Currency switch toggle + Stake amount options row */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                flexWrap: 'wrap',
                gap: '12px',
                width: '100%',
                padding: '2px 0'
            }}>
                {/* Switch Toggle (XP vs Pollen) */}
                <div style={{
                    display: 'flex',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '2px',
                    height: '34px',
                    alignItems: 'center',
                    gap: '2px'
                }}>
                    <div 
                        onClick={() => handleToggleType('xp')}
                        style={{
                            padding: '4px 10px',
                            background: betType === 'xp' ? '#ffffff' : 'transparent',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '26px'
                        }}
                    >
                        <span style={{
                            color: betType === 'xp' ? 'var(--color-bg-deep, #141419)' : '#ffffff',
                            fontSize: '0.72rem',
                            fontWeight: '700'
                        }}>
                            XP
                        </span>
                    </div>

                    <div 
                        onClick={() => handleToggleType('pollen')}
                        style={{
                            padding: '4px 10px',
                            background: betType === 'pollen' ? '#ffffff' : 'transparent',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '26px',
                            gap: '4px'
                        }}
                    >
                        <PollenIcon size={14} />
                    </div>
                </div>

                {/* Amount Selectors for Active Currency */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    gap: '10px'
                }}>
                    {options.map(opt => {
                        const isActive = currentAmount === opt && value?.type === betType;
                        return (
                            <div 
                                key={opt}
                                onClick={() => handleSelectAmount(opt)}
                                style={{
                                    padding: '6px 14px',
                                    height: '34px',
                                    background: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
                                    border: isActive ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    userSelect: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <span style={{
                                    color: isActive ? 'var(--color-bg-deep, #141419)' : '#ffffff',
                                    fontSize: '0.74rem',
                                    fontWeight: '700',
                                    transition: 'all 0.2s ease',
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    {opt}
                                    {betType === 'xp' ? (
                                        ' XP'
                                    ) : (
                                        <PollenIcon size={12} />
                                    )}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default BattleBetSelector;
