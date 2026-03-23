import React from 'react';

interface AnimatedIconProps {
  className?: string;
}

/**
 * Animated SVG wrapper for individual Module Cards.
 * Encapsulates the animation logic via CSS only (group-hover).
 * ZERO JS RERENDERS.
 */
export const StudioModuleIcon = React.memo<AnimatedIconProps>(({
  className = ''
}) => {
  return (
    <svg
      className={`${className} transition-transform duration-500 ease-out group-hover:scale-110`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <style>
          {`
            .spark {
              transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
              stroke-dasharray: 10;
              stroke-dashoffset: 10;
              opacity: 0;
            }
            .core-shape {
              transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
              transform-origin: center;
              transform: rotate(0deg) scale(1);
            }
            .group:hover .spark {
              stroke-dashoffset: 0;
              opacity: 1;
            }
            .group:hover .core-shape {
              transform: rotate(15deg) scale(1.05);
            }
          `}
        </style>
      </defs>

      {/* Background soft glow / base */}
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" className="core-shape" />

      {/* Banana Icon (Official Paths) */}
      <g className="core-shape">
        <path
          d="M4 13c3.5-2 8-2 10 2a5.5 5.5 0 0 1 8 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.15 17.89c5.52-1.52 8.65-6.89 7-12C11.55 4 11.5 2 13 2c3.22 0 5 5.5 5 8 0 6.5-4.2 12-10.49 12C5.11 22 2 22 2 20c0-1.5 1.14-1.55 3.15-2.11Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Magic Sparks (Only appear on hover) */}
      <path d="M4 6L5 7M6 4L7 5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="spark" />
      <path d="M20 18L19 17M18 20L17 19" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="spark" />
    </svg>
  );
});

StudioModuleIcon.displayName = 'StudioModuleIcon';
