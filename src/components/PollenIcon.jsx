import React, { useId } from 'react';

const PollenIcon = ({ size = 24, className = "" }) => {
    const id = useId();
    const gradientId = `pollen_grad_${id.replace(/:/g, '')}`;
    const filterId = `pollen_glow_${id.replace(/:/g, '')}`;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <radialGradient id={gradientId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 12) rotate(90) scale(10)">
                    <stop stopColor="#FFEA00" />
                    <stop offset="1" stopColor="#F1C40F" />
                </radialGradient>
            </defs>

            {/* Background Glow Removed */}

            {/* Main fuzzy pollen body */}
            <g>
                {/* Core */}
                <circle cx="12" cy="12" r="6" fill={`url(#${gradientId})`} />

                {/* Smaller fuzzy particles around the core */}
                <circle cx="12" cy="5.5" r="2.8" fill="#FFEA00" />
                <circle cx="18" cy="8.5" r="2.5" fill="#FFD700" />
                <circle cx="18.5" cy="15.5" r="2.8" fill="#FFB700" />
                <circle cx="12" cy="18.5" r="2.5" fill="#F39C12" />
                <circle cx="5.5" cy="15.5" r="2.8" fill="#FFB700" />
                <circle cx="6" cy="8.5" r="2.5" fill="#FFD700" />

                {/* High-detail interior dots to look like textured pollen */}
                <circle cx="10" cy="9" r="1.2" fill="white" fillOpacity="0.4" />
                <circle cx="14" cy="11" r="0.8" fill="white" fillOpacity="0.3" />
                <circle cx="11" cy="15" r="1" fill="white" fillOpacity="0.2" />
            </g>
        </svg>
    );
};

export default PollenIcon;

