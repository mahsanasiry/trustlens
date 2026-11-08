export const themeStorageKeys = {
  theme: 'trustlens-theme',
  accent: 'trustlens-accent',
  density: 'trustlens-density',
} as const;

/**
 * Runs before first paint so the stored theme is applied without a flash.
 * It is a constant string with no interpolated user input.
 */
export const themeInitScript = `(function(){try{
var d=document.documentElement,s=window.localStorage;
var t=s.getItem('${themeStorageKeys.theme}')||'system';
var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
d.setAttribute('data-theme',dark?'dark':'light');
var a=s.getItem('${themeStorageKeys.accent}');if(a)d.setAttribute('data-accent',a);
var n=s.getItem('${themeStorageKeys.density}');if(n)d.setAttribute('data-density',n);
}catch(e){}})();`;
