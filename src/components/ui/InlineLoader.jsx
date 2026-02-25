import React from 'react';

const InlineLoader = ({ size = 200 }) => {
    const spinnerSize = Math.max(28, size * 0.14);
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '40px 0',
            gap: '14px'
        }}>
            <style>{`
                @keyframes _bee_spin {
                    0%   { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes _bee_pulse {
                    0%, 100% { opacity: 1; }
                    50%       { opacity: 0.55; }
                }
            `}</style>
            <div style={{
                width: `${spinnerSize}px`,
                height: `${spinnerSize}px`,
                borderRadius: '50%',
                border: `3px solid rgba(241, 196, 15, 0.2)`,
                borderTopColor: '#f1c40f',
                borderRightColor: '#f39c12',
                animation: '_bee_spin 0.85s linear infinite',
                flexShrink: 0,
            }} />
            <p style={{
                color: '#f1c40f',
                fontWeight: '700',
                fontSize: '0.85rem',
                margin: 0,
                animation: '_bee_pulse 1.4s ease-in-out infinite',
                letterSpacing: '0.03em',
            }}>
                লোড হচ্ছে...
            </p>
        </div>
    );
};

export default InlineLoader;
