import { Inter, Source_Serif_4 } from 'next/font/google';

const ui = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-ui',
  display: 'swap',
});

const display = Source_Serif_4({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-display',
  display: 'swap',
});

export const fontClassName = `${ui.variable} ${display.variable}`;
