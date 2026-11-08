import { Noto_Sans_Bengali } from 'next/font/google';

const ui = Noto_Sans_Bengali({
  subsets: ['bengali'],
  variable: '--font-ui',
  display: 'swap',
});

export const fontClassName = ui.variable;
