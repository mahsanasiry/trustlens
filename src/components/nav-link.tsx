'use client';

import type { ReactNode } from 'react';
import { Link, usePathname } from '@/lib/i18n/navigation';

interface NavLinkProps {
  href: '/claims' | '/sources' | '/search';
  children: ReactNode;
}

export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link href={href} className="nav-link" aria-current={active ? 'page' : undefined}>
      {children}
    </Link>
  );
}
