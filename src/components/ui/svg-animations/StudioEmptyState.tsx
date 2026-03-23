import React from 'react';

interface Props {
    className?: string;
    mediaType?: 'image' | 'video';
}

/**
 * Animated SVG for Empty Gallery state.
 * Memoized to prevent repainting when the user types in the input prompt.
 */
export const StudioEmptyState = React.memo<Props>(({
    className = '',
    mediaType = 'image'
}) => {
    return (
        <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
        >
            <defs>
                <style>
                    {`
            .float {
              animation: float 6s ease-in-out infinite;
              transform-origin: center;
            }
            .sparkle {
              animation: twinkle 3s ease-in-out infinite;
            }
            @keyframes float {
              0%, 100% { transform: translateY(0) rotate(0deg); }
              50% { transform: translateY(-8px) rotate(2deg); }
            }
            @keyframes twinkle {
              0%, 100% { opacity: 0.2; transform: scale(0.8); }
              50% { opacity: 0.8; transform: scale(1.2); }
            }
            @media (prefers-reduced-motion: reduce) {
              .float, .sparkle { animation: none; opacity: 0.6; }
            }
          `}
                </style>
                <linearGradient id="emptyGlow" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                    <stop stopColor="currentColor" stopOpacity="0.2" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Soft Glow Background */}
            <circle cx="60" cy="60" r="50" fill="url(#emptyGlow)" />

            {/* Abstract Media Representation */}
            <g className="float text-text-muted/40">
                {mediaType === 'image' ? (
                    <>
                        <rect x="30" y="35" width="60" height="50" rx="8" stroke="currentColor" strokeWidth="3" />
                        <circle cx="45" cy="50" r="6" stroke="currentColor" strokeWidth="2" />
                        <path d="M30 75L50 55L70 75L90 60L90 85H30V75Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    </>
                ) : (
                    <>
                        <rect x="25" y="35" width="70" height="50" rx="6" stroke="currentColor" strokeWidth="3" />
                        <path d="M50 50L65 60L50 70V50Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                        {/* Film strip holes */}
                        <circle cx="32" cy="42" r="2" fill="currentColor" />
                        <circle cx="32" cy="50" r="2" fill="currentColor" />
                        <circle cx="32" cy="58" r="2" fill="currentColor" />
                        <circle cx="32" cy="66" r="2" fill="currentColor" />
                        <circle cx="32" cy="74" r="2" fill="currentColor" />
                        <circle cx="88" cy="42" r="2" fill="currentColor" />
                        <circle cx="88" cy="50" r="2" fill="currentColor" />
                        <circle cx="88" cy="58" r="2" fill="currentColor" />
                        <circle cx="88" cy="66" r="2" fill="currentColor" />
                        <circle cx="88" cy="74" r="2" fill="currentColor" />
                    </>
                )}
            </g>

            {/* Floating Magic Sparks */}
            <g className="text-accent" fill="currentColor">
                <path d="M96 20L97 24L100 25L97 26L96 30L95 26L92 25L95 24L96 20Z" className="sparkle" style={{ animationDelay: '0s' }} />
                <path d="M26 80L26.5 82L29 82.5L26.5 83L26 85L25.5 83L23 82.5L25.5 82L26 80Z" className="sparkle" style={{ animationDelay: '1s' }} />
                <path d="M30 25L30.5 26.5L32 27L30.5 27.5L30 29L29.5 27.5L28 27L29.5 26.5L30 25Z" className="sparkle text-purple-400" style={{ animationDelay: '0.5s' }} />
            </g>
        </svg>
    );
});

StudioEmptyState.displayName = 'StudioEmptyState';
