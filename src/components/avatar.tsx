import Image from 'next/image';
import type { CSSProperties } from 'react';

interface AvatarProps {
  name: string;
  url: string | null;
  size?: 'sm' | 'lg';
}

const pixels = { sm: 24, lg: 96 } as const;

// Decorative: the name is always written next to it. Without a picture the
// first letter of the name stands in, on a tile tinted by that letter so
// people are told apart at a glance.
export function Avatar({ name, url, size = 'sm' }: AvatarProps) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? '?';
  const hue = ((initial.codePointAt(0) ?? 0) * 47) % 360;

  return (
    <span
      className={`avatar avatar--${size}`}
      style={{ '--avatar-hue': hue } as CSSProperties}
      aria-hidden="true"
    >
      {url ? (
        // Served from the storage bucket, which has its own caching; the
        // optimiser would only add a second copy.
        <Image src={url} alt="" width={pixels[size]} height={pixels[size]} unoptimized />
      ) : (
        initial
      )}
    </span>
  );
}
