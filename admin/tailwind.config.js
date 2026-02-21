/** @type {import('tailwindcss').Config} */
export default {
  // Include all JS/TS/JSX/TSX and the styles module so Tailwind finds class names
  // used via variables (e.g. className={sp.card.container}). Otherwise they get purged.
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './src/styles/**/*.ts',
  ],
  // Safelist classes that only appear as variable refs (e.g. sp.card.container)
  // Tailwind's scanner doesn't extract classes from string variables, so we safelist them.
  safelist: [
    // Pattern-based safelist: match all utility prefixes used in sidePanelStyles.ts
    // This ensures classes like 'border', 'rounded-lg', 'bg-white', 'text-sm', etc. are always generated
    { pattern: /^(border|rounded|overflow|bg-|text-|px-|py-|pl-|pr-|mb-|ml-|flex|items-|justify-|gap-|w-|cursor-|hover:|focus:|font-|truncate|space-|select-|shrink-|ring-|shadow-|fixed|z-|pointer-|whitespace-|italic|underline|appearance-|opacity-|min-|max-)/ },
    // Specific arbitrary values and complex classes
    'text-[10px]', 'text-[11px]', 'text-[8px]', 'z-[100]',
    'bg-red-50/60', 'hover:bg-red-100/80', 'bg-amber-50/50',
    '[appearance:textfield]', '[&::-webkit-outer-spin-button]:appearance-none', '[&::-webkit-inner-spin-button]:appearance-none',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
