import React, { useId } from 'react';

const HoneyDropIcon = ({ size = 24, isEmpty = false, className = "" }) => {
    const id = useId();
    const gradientId = `honey_grad_${isEmpty ? 'empty' : 'full'}_${id.replace(/:/g, '')}`;
    const filterId = `glow_${isEmpty ? 'empty' : 'full'}_${id.replace(/:/g, '')}`;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={{
                filter: isEmpty ? 'none' : 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))',
                verticalAlign: 'middle'
            }}
        >
            <defs>
                <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="0.6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <linearGradient id={gradientId} x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">
                    {isEmpty ? (
                        <>
                            <stop stopColor="#afafaf" stopOpacity="0.4" />
                            <stop offset="1" stopColor="#7e7e7e" stopOpacity="0.2" />
                        </>
                    ) : (
                        <>
                            <stop offset="0%" stopColor="#FFEA00" />
                            <stop offset="40%" stopColor="#FFD700" />
                            <stop offset="100%" stopColor="#E67E22" />
                        </>
                    )}
                </linearGradient>
            </defs>

            {/* Main Drop Path - Child 2 of SVG */}
            <path
                d="M12 3C12 3 18.5 10 18.5 15C18.5 18.3137 15.5899 21 12 21C8.41015 21 5.5 18.3137 5.5 15C5.5 10 12 3 12 3Z"
                fill={`url(#${gradientId})`}
                filter={isEmpty ? "" : `url(#${filterId})`}
                stroke={isEmpty ? "#7e7e7e" : "rgba(255, 255, 255, 0.2)"}
                strokeWidth={isEmpty ? 1 : 0.5}
            />

            {/* Dynamic Shine/Highlights */}
            {!isEmpty && (
                <>
                    {/* Main Shine */}
                    <path
                        d="M9.5 13.5C9.5 11.5 10.5 10 12 9"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        opacity="0.8"
                    />
                    {/* Subtle point highlight */}
                    <circle cx="14" cy="16.5" r="1.2" fill="white" opacity="0.4" />
                </>
            )}
        </svg>
    );
};

export default HoneyDropIcon;


