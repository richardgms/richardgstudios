import React from 'react';

interface GeometricBackgroundProps {
    className?: string;
    opacity?: number;
    color?: string;
}

/**
 * Hero SVG Background.
 * 
 * DESIGN CONSTRAINTS MET: 
 * - React.memo: Prevents main-thread blocking when inputs re-render.
 * - Hardware Accelerated: Uses pure CSS animations for opacity/twinkle.
 * - Reduced Motion: Adheres to a11y standards by omitting complex transforms.
 * - No `dangerouslySetInnerHTML`: Native SVG JSX for XSS prevention.
 */
export const HeroGeometricBackground = React.memo<GeometricBackgroundProps>(
    ({ className = '', opacity = 0.25, color }) => {
        return (
            <div
                className={`absolute inset-0 pointer-events-none overflow-hidden aria-hidden flex items-center justify-center ${className}`}
                style={{ opacity, ...(color ? { color } : {}) }}
                aria-hidden="true"
                role="presentation"
            >
                <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 1000 1000"
                    xmlns="http://www.w3.org/2000/svg"
                    preserveAspectRatio="xMidYMid slice"
                    className="absolute min-w-full min-h-full object-cover"
                >
                    <defs>
                        <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                        </radialGradient>

                        <style>
                            {`
                .particle-1 { animation: twinkle 9s ease-in-out infinite; }
                .particle-2 { animation: twinkle 12s ease-in-out infinite 2s; }
                .particle-3 { animation: twinkle 15s ease-in-out infinite 5s; }
                .geo-spin   { animation: spinCW 180s linear infinite; transform-origin: 500px 500px; }

                @keyframes twinkle {
                  0%, 100% { opacity: 0.1; }
                  50% { opacity: 0.8; }
                }

                @keyframes spinCW {
                  from { transform: rotate(0deg); }
                  to   { transform: rotate(360deg); }
                }

                @media (prefers-reduced-motion: reduce) {
                  .particle-1, .particle-2, .particle-3 {
                    animation: none;
                    opacity: 0.4;
                  }
                  .geo-spin { animation: none; }
                }
              `}
                        </style>
                    </defs>

                    {/* Central Glow mapped to the Tailwind currentColor (usually accent) */}
                    <rect width="100%" height="100%" fill="url(#hubGlow)" />

                    {/* Geometry Constellation + Particles — spin group */}
                    <g className="geo-spin">

                    <g stroke="currentColor" fill="none" strokeWidth="0.8" strokeOpacity="0.45">
                        <line x1="200" y1="200" x2="800" y2="800" />
                        <line x1="800" y1="200" x2="200" y2="800" />
                        <line x1="500" y1="100" x2="500" y2="900" />
                        <line x1="100" y1="500" x2="900" y2="500" />

                        <circle cx="500" cy="500" r="300" stroke="white" strokeDasharray="4 8" />
                        <circle cx="500" cy="500" r="150" stroke="white" strokeOpacity="0.25" />
                    </g>

                    {/* Animated Particles */}
                    <g fill="white">
                        <circle cx="200" cy="200" r="2" className="particle-1" />
                        <circle cx="800" cy="800" r="2" className="particle-1" />
                        <circle cx="800" cy="200" r="3" className="particle-2" />
                        <circle cx="200" cy="800" r="3" className="particle-2" />

                        <circle cx="500" cy="100" r="1.5" className="particle-3" />
                        <circle cx="500" cy="900" r="1.5" className="particle-3" />
                        <circle cx="100" cy="500" r="1.5" className="particle-3" />
                        <circle cx="900" cy="500" r="1.5" className="particle-3" />

                        {/* Center dot */}
                        <circle cx="500" cy="500" r="3" fill="white" opacity="0.6" />

                        {/* Orbiting particles (slow, isolated path) */}
                        <circle cx="712" cy="712" r="1.5" fill="white" className="particle-1" />
                        <circle cx="288" cy="288" r="1.5" fill="white" className="particle-2" />
                    </g>

                    </g>{/* end geo-spin */}
                </svg>
            </div>
        );
    }
);

HeroGeometricBackground.displayName = 'HeroGeometricBackground';
