import React from 'react';

interface Props {
    className?: string;
    size?: number;
}

/**
 * Animated SVG for media generation state (IsGenerating = true).
 * Ensures smooth 60fps via pure CSS transformations while the main 
 * thread is blocked by network polling (videoPolling.status). 
 */
export const StudioGeneratingIcon = React.memo<Props>(({
    className = '',
    size = 48
}) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
        >
            <defs>
                <style>
                    {`
            .ring-spin {
              transform-origin: 24px 24px;
              animation: spin 3s linear infinite;
            }
            .ring-spin-reverse {
              transform-origin: 24px 24px;
              animation: spin-reverse 4s ease-in-out infinite;
            }
            .core-pulse {
              transform-origin: 24px 24px;
              animation: pulse 2s ease-in-out infinite;
            }
            @keyframes spin { 100% { transform: rotate(360deg); } }
            @keyframes spin-reverse { 
              0% { transform: rotate(0deg) scale(0.9); } 
              50% { transform: rotate(-180deg) scale(1.1); opacity: 0.5; }
              100% { transform: rotate(-360deg) scale(0.9); } 
            }
            @keyframes pulse { 
              0%, 100% { transform: scale(0.8); opacity: 0.6; }
              50% { transform: scale(1.1); opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .ring-spin, .ring-spin-reverse, .core-pulse {
                animation: none;
              }
            }
          `}
                </style>
            </defs>

            {/* Outer Glow */}
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1" strokeOpacity="0.1" />

            {/* Reverse Spinning Ring */}
            <circle
                cx="24" cy="24" r="16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="25 60"
                strokeLinecap="round"
                className="ring-spin-reverse text-accent"
            />

            {/* Main Spinning Ring */}
            <circle
                cx="24" cy="24" r="12"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="15 40"
                strokeLinecap="round"
                className="ring-spin text-accent-light"
            />

            {/* Core Energy */}
            <circle cx="24" cy="24" r="4" fill="currentColor" className="core-pulse text-accent" />

            {/* Decorative stars */}
            <path d="M24 2L25 5L28 6L25 7L24 10L23 7L20 6L23 5L24 2Z" fill="currentColor" className="core-pulse" style={{ animationDelay: '0.5s' }} />
            <path d="M12 36L12.5 38L15 38.5L12.5 39L12 41L11.5 39L9 38.5L11.5 38L12 36Z" fill="currentColor" className="core-pulse text-purple-400" style={{ animationDelay: '1s' }} />
        </svg>
    );
});

StudioGeneratingIcon.displayName = 'StudioGeneratingIcon';
