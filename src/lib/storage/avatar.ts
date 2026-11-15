export const avatarBucket = 'avatars';
export const avatarMaxBytes = 2 * 1024 * 1024;
// Phone photos are far larger than the bucket allows, so the browser shrinks them
// before sending. This is the largest original it will try to read.
export const avatarSourceMaxBytes = 25 * 1024 * 1024;
export const avatarEdge = 512;

export const avatarTypes = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
} as const;

export type AvatarMime = keyof typeof avatarTypes;

export function isAvatarMime(value: string): value is AvatarMime {
  return Object.keys(avatarTypes).includes(value);
}

function startsWith(
  bytes: Uint8Array,
  signature: readonly number[],
  offset = 0,
): boolean {
  return signature.every((value, index) => bytes[offset + index] === value);
}

// The browser's reported type and the file name are both chosen by the sender, so
// the type is read from the first bytes instead.
export function detectAvatarType(bytes: Uint8Array): AvatarMime | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return 'image/png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  // RIFF....WEBP
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'image/webp';
  }
  return null;
}

export function avatarObjectPath(userId: string, mime: AvatarMime, now: number): string {
  return `${userId}/${now}.${avatarTypes[mime]}`;
}

// Returns null when the project URL is unknown, so callers fall back to initials.
export function avatarUrl(
  supabaseUrl: string | undefined,
  path: string | null,
): string | null {
  if (!supabaseUrl || !path) return null;
  const base = supabaseUrl.replace(/\/+$/, '');
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `${base}/storage/v1/object/public/${avatarBucket}/${encoded}`;
}
