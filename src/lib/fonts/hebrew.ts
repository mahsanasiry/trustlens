import { Noto_Sans_Hebrew } from 'next/font/google';

const ui = Noto_Sans_Hebrew({
  subsets: ['hebrew'],
  variable: '--font-ui',
  display: 'swap',
});

export const fontClassName = ui.variable;
