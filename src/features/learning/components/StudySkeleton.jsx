import React from 'react';

/* ── Shimmer keyframe injected once ──────────────────────────── */
const SHIMMER_CSS = `
@keyframes _sk_shimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}
@keyframes _sk_pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
}
`;

const injectStyle = (() => {
    let injected = false;
    return () => {
        if (injected) return;
        const el = document.createElement('style');
        el.textContent = SHIMMER_CSS;
        document.head.appendChild(el);
        injected = true;
    };
})();

/* ── Primitive building blocks ───────────────────────────────── */
const bone = (extra = {}) => ({
    position: 'relative',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    flexShrink: 0,
    ...extra,
});

const shimmerLayer = {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
    animation: '_sk_shimmer 1.6s infinite linear',
};

const Bone = ({ w, h, r = 8, style = {} }) => (
    <div style={{ ...bone({ width: w, height: h, borderRadius: r, ...style }) }}>
        <div style={shimmerLayer} />
    </div>
);

/* ── Main Skeleton ───────────────────────────────────────────── */
const StudySkeleton = () => {
    injectStyle();

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100dvh',
            background: 'var(--color-bg-deep, #0f1923)',
            overflow: 'hidden',
        }}>

            {/* ── Header (matches real: 64px, padding 0 24px) ── */}
            <div style={{
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0b0e11',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                flexShrink: 0,
            }}>
                <div style={{
                    maxWidth: 1100,
                    width: '100%',
                    height: '100%',
                    padding: '0 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    {/* Close button — 24px icon inside transparent area */}
                    <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: 'rgba(255,255,255,0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        <div style={shimmerLayer} />
                    </div>

                    {/* Progress bar — exactly matches real .progressBar */}
                    <div style={{
                        flex: 1,
                        height: 18,
                        borderRadius: 99,
                        background: '#1a2226',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        {/* Shimmer over full track */}
                        <div style={{
                            ...shimmerLayer,
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
                        }} />
                    </div>

                    {/* Hearts — HoneyDrop icon shape + count */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexShrink: 0,
                    }}>
                        {/* HoneyDrop icon placeholder (28×28 teardrop-ish) */}
                        <Bone w={28} h={28} r="50% 50% 50% 50% / 60% 60% 40% 40%" />
                        {/* Count */}
                        <Bone w={18} h={20} r={4} />
                    </div>
                </div>
            </div>


            {/* ── Main content ── */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px 16px 140px',
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
                maxWidth: 680,
                margin: '0 auto',
                width: '100%',
            }}>

                {/* Narrative hint card */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                }}>
                    <Bone w={20} h={20} r={6} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <Bone w="100%" h={13} r={4} />
                        <Bone w="75%" h={13} r={4} />
                    </div>
                </div>

                {/* Question text lines */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
                    <Bone w="90%" h={22} r={6} />
                    <Bone w="65%" h={22} r={6} />
                </div>

                {/* Answer options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[1, 0.9, 0.85, 0.7].map((opacity, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            background: 'rgba(255,255,255,0.04)',
                            border: '2px solid rgba(255,255,255,0.06)',
                            borderRadius: 14,
                            padding: '14px 16px',
                            opacity,
                        }}>
                            {/* Label badge */}
                            <Bone w={36} h={36} r={10} />
                            {/* Option text */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <Bone w={`${60 + i * 8}%`} h={14} r={4} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Footer / Check button ── */}
            <div style={{
                position: 'fixed',
                bottom: 0, left: 0, right: 0,
                padding: '16px 16px calc(16px + env(safe-area-inset-bottom))',
                background: 'var(--color-bg-deep, #0f1923)',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(10px)',
            }}>
                <div style={{
                    maxWidth: 680,
                    margin: '0 auto',
                }}>
                    <Bone w="100%" h={54} r={14} />
                </div>
            </div>
        </div>
    );
};

export default StudySkeleton;
