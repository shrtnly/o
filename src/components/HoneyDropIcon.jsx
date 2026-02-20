import React from 'react';

const HoneyDropIcon = ({ size = 24, isEmpty = false, className = "" }) => {
    const gradientId = `honey_grad_${isEmpty ? 'empty' : 'full'}`;
    const filterId = `glow_${isEmpty ? 'empty' : 'full'}`;

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
                <filter id={filterId}>
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <linearGradient id={gradientId} x1="12" y1="2.5" x2="12" y2="20.5" gradientUnits="userSpaceOnUse">
                    {isEmpty ? (
                        <>
                            <stop stopColor="#afafaf" stopOpacity="0.3" />
                            <stop offset="1" stopColor="#7e7e7e" stopOpacity="0.1" />
                        </>
                    ) : (
                        <>
                            <stop stopColor="#FFD700" />
                            <stop offset="1" stopColor="#E67E22" />
                        </>
                    )}
                </linearGradient>
            </defs>

            <path
                d="M12 2.5C12 2.5 6 9.5 6 14.5C6 17.8137 8.68629 20.5 12 20.5C15.3137 20.5 18 17.8137 18 14.5C18 9.5 12 2.5 12 2.5Z"
                fill={`url(#${gradientId})`}
                filter={isEmpty ? "" : `url(#${filterId})`}
                stroke={isEmpty ? "#7e7e7e" : "none"}
                strokeWidth={isEmpty ? 1 : 0}
            />

            {!isEmpty && (
                <path
                    d="M10 13C10 11.5 11 10 12 9"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity="0.6"
                />
            )}
        </svg>
    );
};

export default HoneyDropIcon;
