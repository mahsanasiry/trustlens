/* eslint-disable jsx-a11y/no-noninteractive-tabindex --
   A scrollable area has to be focusable, otherwise keyboard users cannot scroll it. */
import type { ReactNode } from 'react';

interface ScrollRegionProps {
  label: string;
  children: ReactNode;
}

export function ScrollRegion({ label, children }: ScrollRegionProps) {
  return (
    <div className="table-wrap" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
