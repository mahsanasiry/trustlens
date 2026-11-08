import { Noto_Nastaliq_Urdu } from 'next/font/google';

const ui = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  variable: '--font-ui',
  display: 'swap',
});

export const fontClassName = ui.variable;
