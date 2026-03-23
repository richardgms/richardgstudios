import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                display: ["Outfit", "sans-serif"],
                body: ["Inter", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
            },
            colors: {
                surface: {
                    DEFAULT: "#18181b",
                    hover: "#27272a",
                    elevated: "#3f3f46",
                },
                accent: {
                    DEFAULT: "#6366f1",
                    hover: "#818cf8",
                    light: "#a5b4fc",
                    glow: "rgba(99, 102, 241, 0.15)",
                },
            },
            animation: {
                "fade-in": "fadeIn 0.3s ease-out",
                "slide-up": "slideUp 0.3s ease-out",
                "pulse-glow": "pulseGlow 2s ease-in-out infinite",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { opacity: "0", transform: "translateY(8px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                pulseGlow: {
                    "0%, 100%": { boxShadow: "0 0 15px rgba(99, 102, 241, 0.1)" },
                    "50%": { boxShadow: "0 0 25px rgba(99, 102, 241, 0.25)" },
                },
            },
        },
    },
    plugins: [],
};
export default config;
