import React from 'react';

const PollenIcon = ({ size = 24, className = "" }) => {
    const gradientId = "pollen_grad";
    const filterId = "pollen_glow";

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
                <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.2" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <radialGradient id={gradientId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 12) rotate(90) scale(10)">
                    <stop stopColor="#FFEA00" />
                    <stop offset="1" stopColor="#FF9900" />
                </radialGradient>
            </defs>

            {/* Main fuzzy pollen body - represented by multiple soft circles */}
            <g filter={`url(#${filterId})`}>
                {/* Core */}
                <circle cx="12" cy="12" r="6" fill={`url(#${gradientId})`} />

                {/* Smaller particles around the core to give it a fuzzy/pollen look */}
                <circle cx="12" cy="5" r="2.5" fill="#FFEA00" />
                <circle cx="18.5" cy="8.5" r="2.2" fill="#FFD700" />
                <circle cx="19" cy="15.5" r="2.5" fill="#FFB700" />
                <circle cx="12" cy="19.5" r="2.2" fill="#FF9900" />
                <circle cx="5" cy="15.5" r="2.5" fill="#FFB700" />
                <circle cx="5.5" cy="8.5" r="2.2" fill="#FFD700" />

                {/* Inner highlights */}
                <circle cx="10" cy="10" r="2" fill="white" fillOpacity="0.4" />
            </g>
        </svg>
    );
};

export default PollenIcon;
