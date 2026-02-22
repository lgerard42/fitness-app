/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    'text-[10px]', 'text-[11px]', 'text-[8px]', 'z-[100]',
    'bg-red-50/60', 'bg-red-50/90', 'bg-red-50/80', 'bg-red-50/70',
    'hover:bg-red-100/80', 'bg-amber-50/50', 'bg-red-100/80',
    'text-red-600/70',
    '[appearance:textfield]',
    '[&::-webkit-outer-spin-button]:appearance-none',
    '[&::-webkit-inner-spin-button]:appearance-none',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
