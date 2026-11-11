// A lens ring holding three bars of different lengths: evidence weighed
// side by side, which is also what the spectrum bar on the home page shows.
export function BrandMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <circle
        cx="14"
        cy="14"
        r="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <rect x="7.5" y="9" width="13" height="2.5" rx="1.25" fill="currentColor" />
      <rect x="7.5" y="13" width="8.5" height="2.5" rx="1.25" fill="currentColor" />
      <rect x="7.5" y="17" width="11" height="2.5" rx="1.25" fill="currentColor" />
    </svg>
  );
}
