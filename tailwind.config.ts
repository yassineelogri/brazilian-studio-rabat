import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        salon: {
          pink:  '#F8D7DA',
          rose:  '#E8B4B8',
          gold:  '#B76E79',
          dark:  '#6B3A3F',
          cream: '#FDF6F0',
          muted: '#9E7B7F',
          'sidebar-bottom': '#4A2528',
          'cream-light':    '#FDF0F3',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      boxShadow: {
        'card':       '0 2px 8px rgba(107,58,63,0.10)',
        'card-hover': '0 4px 16px rgba(107,58,63,0.14)',
      },
    },
  },
  plugins: [],
}
export default config
