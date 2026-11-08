import { Noto_Sans_Arabic } from 'next/font/google';

const ui = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-ui',
  display: 'swap',
});

export const fontClassName = ui.variable;
