/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          base: '#3B82F6',
          dark: '#1D4ED8',
          light: '#EFF6FF',
        },
        secondary: {
          base: '#10B981',
          dark: '#047857',
          light: '#ECFDF5',
        },
        accent: {
          purple: '#8B5CF6',
          indigo: '#6366F1',
          rose: '#F43F5E',
        },
        status: {
          success: '#10B981',
          error: '#EF4444',
          warning: '#F59E0B',
          info: '#3B82F6',
        },
        appBg: '#F8FAFC',
        cardBg: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#F1F5F9',
        type: {
          heading: '#0F172A',
          body: '#475569',
          contrast: '#1E293B',
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-sm': '0 4px 16px 0 rgba(31, 38, 135, 0.05)',
        'tier-light': '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.06)',
        'tier-medium': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'tier-dark': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'premium': '0 0 50px rgba(0, 0, 0, 0.03), 0 10px 30px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
