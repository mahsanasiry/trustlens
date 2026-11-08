import { Noto_Sans_Devanagari } from 'next/font/google';

const ui = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-ui',
  display: 'swap',
});

export const fontClassName = ui.variable;
