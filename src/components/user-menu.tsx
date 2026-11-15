'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, usePathname } from '@/lib/i18n/navigation';

interface UserMenuProps {
  name: string;
  role: string;
  /** The accessible name of the button, which must contain the visible name. */
  label: string;
  items: { href: '/bookmarks' | '/collections'; label: string }[];
  /** Shown below the links, for the sign-out control. */
  children: ReactNode;
}

export function UserMenu({ name, role, label, items, children }: UserMenuProps) {
  const pathname = usePathname();
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // The menu remembers the page it was opened on, so moving to another page
  // closes it without an effect that resets state.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setOpenedOn(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenedOn(null);
        button.current?.focus();
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={root}>
      <button
        ref={button}
        type="button"
        className="user-menu__button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        onClick={() => setOpenedOn(open ? null : pathname)}
      >
        <span aria-hidden="true">{name}</span>
        <span className="role-badge" aria-hidden="true">
          {role}
        </span>
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div id={panelId} className="user-menu__panel" hidden={!open}>
        <ul className="user-menu__list">
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="user-menu__link">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="user-menu__footer">{children}</div>
      </div>
    </div>
  );
}
