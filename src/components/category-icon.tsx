import type { ClaimCategory } from '@/lib/domain/enums';

export type IconKind =
  ClaimCategory | 'source' | 'columns' | 'balance' | 'search' | 'folder';

const paths: Record<IconKind, string> = {
  science: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3M8 15h8',
  education:
    'M3 5.5C5.5 4.5 8.5 4.8 12 6.5c3.5-1.7 6.5-2 9-1v13c-2.5-1-5.5-.7-9 1-3.5-1.7-6.5-2-9-1zM12 6.5v13',
  environment: 'M5 19c0-9 5-14 14-14 0 9-5 14-14 14zM5 19c3-4 6-6 9-8',
  technology:
    'M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3M7 6h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM10 10h4v4h-4z',
  social_issues:
    'M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 20v-1a3.5 3.5 0 0 0-2.5-3.3M15.5 5.2a3 3 0 0 1 0 5.6',
  public_policy: 'M3 10l9-6 9 6zM5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18',
  source: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  columns: 'M4 5h6v14H4zM14 5h6v14h-6z',
  balance: 'M12 4v16M7 20h10M4 8h16M4 8l-2 6a3 3 0 0 0 6 0zM20 8l-2 6a3 3 0 0 0 6 0z',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
};

interface CategoryIconProps {
  kind: IconKind;
  /** Borrow another category's colour, so sources get the same tinted tile. */
  tone?: ClaimCategory;
}

// Decorative: the category name is always written out next to the icon.
export function CategoryIcon({ kind, tone }: CategoryIconProps) {
  return (
    <span className={`icon-tile icon-tile--${tone ?? kind}`} aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
      >
        <path d={paths[kind]} />
      </svg>
    </span>
  );
}
