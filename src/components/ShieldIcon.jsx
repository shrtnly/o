import React from 'react';
import { getShieldLevel } from '../utils/shieldSystem';

// Import shield images (you'll need to add these images to src/assets/shields/)
// For now, we'll use a fallback if images don't exist
const getShieldImage = (level) => {
    const images = {
        SILVER: '/src/assets/shields/silver-shield.png',
        GOLD: '/src/assets/shields/gold-shield.png',
        PLATINUM: '/src/assets/shields/platinum-shield.png',
        DIAMOND: '/src/assets/shields/diamond-shield.png'
    };
    return images[level] || null;
};

/**
 * ShieldIcon Component
 * Displays an ornate gaming-style shield with wings and gem
 * Uses actual images when available, falls back to SVG
 */
const ShieldIcon = ({ xp = 0, size = 24, showTooltip = true, useImage = true, showShadow = true }) => {
    const level = getShieldLevel(xp);
    const shieldImage = getShieldImage(level.level);
    const [imageError, setImageError] = React.useState(false);

    // If using images and image exists and hasn't errored
    if (useImage && shieldImage && !imageError) {
        return (
            <div
                style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: size,
                    height: size
                }}
                title={showTooltip ? `${level.name} (${xp} XP)` : ''}
            >
                <img
                    src={shieldImage}
                    alt={level.name}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        filter: showShadow ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))' : 'none',
                        transition: 'all 0.3s ease'
                    }}
                    onError={() => setImageError(true)}
                />
            </div>
        );
    }

    // Fallback to SVG shield
    const scale = size / 100;

    return (
        <div
            style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: size,
                height: size,
                transform: `scale(${scale})`
            }}
            title={showTooltip ? `${level.name} (${xp} XP)` : ''}
        >
            <svg
                width="150"
                height="100"
                viewBox="0 0 150 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                    filter: showShadow ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))' : 'none',
                    transition: 'all 0.3s ease'
                }}
            >
                <defs>
                    {/* Shield Main Gradient */}
                    <linearGradient id={`shieldMain${xp}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={level.color} stopOpacity="1" />
                        <stop offset="50%" stopColor={level.secondaryColor || level.color} stopOpacity="0.9" />
                        <stop offset="100%" stopColor={level.color} stopOpacity="0.8" />
                    </linearGradient>

                    {/* Gem Glow */}
                    <radialGradient id={`gemGlow${xp}`}>
                        <stop offset="0%" stopColor={level.gemColor} stopOpacity="0.8" />
                        <stop offset="100%" stopColor={level.gemColor} stopOpacity="0" />
                    </radialGradient>

                    {/* Metallic Shine */}
                    <linearGradient id={`shine${xp}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
                        <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.3" />
                    </linearGradient>

                    {/* Wing Gradient */}
                    <linearGradient id={`wing${xp}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={level.color} stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
                    </linearGradient>
                </defs>

                {/* Left Wing Ornament */}
                <g transform="translate(15, 35)">
                    <path d="M0,0 Q-10,-10 -15,-5 Q-12,0 -10,5 Q-8,10 -5,8 Q-3,6 0,5 Z" fill={`url(#wing${xp})`} opacity="0.8" />
                    <path d="M0,10 Q-12,5 -18,12 Q-15,18 -10,18 Q-5,16 0,15 Z" fill={`url(#wing${xp})`} opacity="0.7" />
                    <path d="M0,20 Q-10,18 -15,25 Q-12,30 -8,30 Q-4,28 0,25 Z" fill={`url(#wing${xp})`} opacity="0.6" />
                </g>

                {/* Right Wing Ornament */}
                <g transform="translate(135, 35) scale(-1, 1)">
                    <path d="M0,0 Q-10,-10 -15,-5 Q-12,0 -10,5 Q-8,10 -5,8 Q-3,6 0,5 Z" fill={`url(#wing${xp})`} opacity="0.8" />
                    <path d="M0,10 Q-12,5 -18,12 Q-15,18 -10,18 Q-5,16 0,15 Z" fill={`url(#wing${xp})`} opacity="0.7" />
                    <path d="M0,20 Q-10,18 -15,25 Q-12,30 -8,30 Q-4,28 0,25 Z" fill={`url(#wing${xp})`} opacity="0.6" />
                </g>

                {/* Crown Top Ornament */}
                <path d="M75,10 L70,15 L72,20 L75,18 L78,20 L80,15 Z" fill={level.secondaryColor || level.color} opacity="0.9" />
                <circle cx="75" cy="12" r="3" fill={level.gemColor} opacity="0.8" />

                {/* Main Shield Body */}
                <path
                    d="M75 15 L95 25 L95 50 Q95 70, 75 90 Q55 70, 55 50 L55 25 Z"
                    fill={`url(#shieldMain${xp})`}
                    stroke="rgba(0, 0, 0, 0.5)"
                    strokeWidth="2"
                />

                {/* Shield Border - Metallic Frame */}
                <path
                    d="M75 15 L95 25 L95 50 Q95 70, 75 90 Q55 70, 55 50 L55 25 Z"
                    fill="none"
                    stroke={level.secondaryColor || level.color}
                    strokeWidth="3"
                    opacity="0.7"
                />

                {/* Inner Shield Border */}
                <path
                    d="M75 20 L90 28 L90 50 Q90 67, 75 83 Q60 67, 60 50 L60 28 Z"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth="1.5"
                />

                {/* Central Gem/Emblem */}
                <ellipse cx="75" cy="52" rx="12" ry="18" fill={`url(#gemGlow${xp})`} opacity="0.4" />
                <ellipse cx="75" cy="52" rx="10" ry="15" fill={level.gemColor} opacity="0.85" />
                <ellipse cx="75" cy="48" rx="6" ry="8" fill="rgba(255, 255, 255, 0.4)" />

                {/* Gem Highlight */}
                <ellipse cx="73" cy="46" rx="3" ry="4" fill="rgba(255, 255, 255, 0.7)" />

                {/* Decorative Lines */}
                <line x1="65" y1="35" x2="65" y2="65" stroke="rgba(0, 0, 0, 0.2)" strokeWidth="1" />
                <line x1="85" y1="35" x2="85" y2="65" stroke="rgba(0, 0, 0, 0.2)" strokeWidth="1" />

                {/* Metallic Shine Overlay */}
                <path
                    d="M62 25 Q68 22, 70 25 L70 55 Q68 52, 62 55 Z"
                    fill={`url(#shine${xp})`}
                    opacity="0.5"
                />

                {/* Bottom Shield Accent */}
                <path d="M75 75 L70 80 L75 85 L80 80 Z" fill="rgba(0, 0, 0, 0.3)" />
                <path d="M75 75 L70 80 L75 83 L80 80 Z" fill={level.secondaryColor || level.color} opacity="0.6" />
            </svg>
        </div>
    );
};

export default ShieldIcon;
