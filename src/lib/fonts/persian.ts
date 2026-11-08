import { Vazirmatn } from 'next/font/google';

const ui = Vazirmatn({
  subsets: ['arabic', 'latin'],
  variable: '--font-ui',
  display: 'swap',
});

export const fontClassName = ui.variable;
