module.exports = {
    plugins: [
        require('daisyui'),
        require("@tailwindcss/typography")
    ],
    theme: {
        extend: {
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
            },
            backdropBlur: {
                xs: '2px',
            }
        }
    },
    daisyui: {
        themes: [
            {
                onedev: {
                    'color-scheme': 'dark',

                    'primary': 'oklch(65% 0.2 260)',    // Refined vibrant purple-blue
                    'primary-content': 'oklch(98% 0.01 260)',

                    'secondary': 'oklch(70% 0.15 190)',  // Polished cyan
                    'secondary-content': 'oklch(98% 0.01 190)',

                    'accent': 'oklch(75% 0.18 320)',     // Sophisticated magenta/pink
                    'accent-content': 'oklch(98% 0.01 320)',

                    'neutral': 'oklch(28% 0.02 260)',    // Deep neutral gray-purple
                    'neutral-content': 'oklch(92% 0.01 260)',

                    'base-100': 'oklch(18% 0.01 260)',   // Rich deep background
                    'base-200': 'oklch(22% 0.01 260)',   // Slightly elevated
                    'base-300': 'oklch(26% 0.01 260)',   // Even more elevated
                    'base-content': 'oklch(92% 0.01 260)',

                    'info': 'oklch(70% 0.15 220)',
                    'success': 'oklch(70% 0.15 140)',
                    'warning': 'oklch(80% 0.15 80)',
                    'error': 'oklch(65% 0.2 20)',

                    "--rounded-box": "1.5rem",
                    "--rounded-btn": "0.75rem",
                    "--rounded-badge": "1.9rem",
                    "--animation-btn": "0.25s",
                    "--animation-input": "0.2s",
                    "--btn-focus-scale": "0.95",
                    "--border-btn": "1px",
                    "--tab-border": "1px",
                    "--tab-radius": "0.75rem",
                },
            },
            'dark',
            'light'
        ]
    }
};
