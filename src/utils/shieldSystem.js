/**
 * Profile Level/Shield System
 * Determines user's achievement level based on XP
 * 4 Ornate Shield Tiers
 */

export const SHIELD_LEVELS = {
    SILVER: {
        name: 'Silver Shield',
        nameBangla: 'সিলভার শিল্ড',
        minXP: 0,
        maxXP: 2499,
        color: '#8B7355',
        secondaryColor: '#C19A6B',
        gemColor: '#654321',
        gradient: 'linear-gradient(135deg, #8B7355 0%, #D2B48C 50%, #8B7355 100%)',
        icon: '🛡️',
        winGradient: 'linear-gradient(45deg, #4A3728 0%, #8B7355 100%)'
    },
    GOLD: {
        name: 'Gold Shield',
        nameBangla: 'গোল্ড শিল্ড',
        minXP: 2500,
        maxXP: 4999,
        color: '#FFD700',
        secondaryColor: '#FFA500',
        gemColor: '#DC143C',
        gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)',
        icon: '🏆',
        winGradient: 'linear-gradient(45deg, #B8860B 0%, #FFD700 100%)'
    },
    PLATINUM: {
        name: 'Platinum Shield',
        nameBangla: 'প্ল্যাটিনাম শিল্ড',
        minXP: 5000,
        maxXP: 9999,
        color: '#5B7C99',
        secondaryColor: '#A8C5E0',
        gemColor: '#1E3A8A',
        gradient: 'linear-gradient(135deg, #5B7C99 0%, #A8C5E0 50%, #5B7C99 100%)',
        icon: '💎',
        winGradient: 'linear-gradient(45deg, #374151 0%, #5B7C99 100%)'
    },
    DIAMOND: {
        name: 'Diamond Shield',
        nameBangla: 'ডায়মন্ড শিল্ড',
        minXP: 10000,
        maxXP: Infinity,
        color: '#B9F2FF',
        secondaryColor: '#87CEEB',
        gemColor: '#00CED1',
        gradient: 'linear-gradient(135deg, #B9F2FF 0%, #00D4FF 50%, #B9F2FF 100%)',
        icon: '💠',
        winGradient: 'linear-gradient(45deg, #5DADE2 0%, #B9F2FF 100%)'
    }
};

/**
 * Get user's shield level based on XP
 * @param {number} xp - User's total XP
 * @returns {object} Shield level information
 */
export const getShieldLevel = (xp = 0) => {
    if (xp >= SHIELD_LEVELS.DIAMOND.minXP) return { ...SHIELD_LEVELS.DIAMOND, level: 'DIAMOND' };
    if (xp >= SHIELD_LEVELS.PLATINUM.minXP) return { ...SHIELD_LEVELS.PLATINUM, level: 'PLATINUM' };
    if (xp >= SHIELD_LEVELS.GOLD.minXP) return { ...SHIELD_LEVELS.GOLD, level: 'GOLD' };
    return { ...SHIELD_LEVELS.SILVER, level: 'SILVER' };
};

/**
 * Get progress to next level
 * @param {number} xp - User's total XP
 * @returns {object} Progress information
 */
export const getLevelProgress = (xp = 0) => {
    const currentLevel = getShieldLevel(xp);
    
    // If max level, return 100%
    if (currentLevel.level === 'DIAMOND') {
        return {
            current: xp,
            required: xp,
            percentage: 100,
            nextLevel: null
        };
    }

    const nextLevelXP = currentLevel.maxXP + 1;
    const currentLevelXP = currentLevel.minXP;
    const progress = xp - currentLevelXP;
    const required = nextLevelXP - currentLevelXP;
    const percentage = Math.min(100, Math.round((progress / required) * 100));

    return {
        current: xp,
        required: nextLevelXP,
        remaining: nextLevelXP - xp,
        percentage,
        nextLevel: getNextLevel(currentLevel.level)
    };
};

/**
 * Get next shield level
 * @param {string} currentLevel - Current level name
 * @returns {object|null} Next level information
 */
const getNextLevel = (currentLevel) => {
    const levels = ['SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
    const currentIndex = levels.indexOf(currentLevel);
    
    if (currentIndex === -1 || currentIndex === levels.length - 1) {
        return null;
    }

    const nextLevelName = levels[currentIndex + 1];
    return { ...SHIELD_LEVELS[nextLevelName], level: nextLevelName };
};

/**
 * Get all shield levels for display
 * @returns {Array} Array of all shield levels
 */
export const getAllShieldLevels = () => {
    return [
        { ...SHIELD_LEVELS.SILVER, level: 'SILVER' },
        { ...SHIELD_LEVELS.GOLD, level: 'GOLD' },
        { ...SHIELD_LEVELS.PLATINUM, level: 'PLATINUM' },
        { ...SHIELD_LEVELS.DIAMOND, level: 'DIAMOND' }
    ];
};
