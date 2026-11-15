import { describe, expect, it } from 'vitest';
import { avatarObjectPath, avatarUrl, detectAvatarType, isAvatarMime } from './avatar';

const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0];
const jpeg = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10];
const webp = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];

describe('detectAvatarType', () => {
  it('recognises the three accepted formats from their first bytes', () => {
    expect(detectAvatarType(Uint8Array.from(png))).toBe('image/png');
    expect(detectAvatarType(Uint8Array.from(jpeg))).toBe('image/jpeg');
    expect(detectAvatarType(Uint8Array.from(webp))).toBe('image/webp');
  });

  it('rejects other content, including a RIFF file that is not WebP', () => {
    expect(
      detectAvatarType(
        new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">'),
      ),
    ).toBeNull();
    expect(detectAvatarType(Uint8Array.from([0x47, 0x49, 0x46, 0x38]))).toBeNull();
    expect(
      detectAvatarType(
        Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45]),
      ),
    ).toBeNull();
    expect(detectAvatarType(new Uint8Array())).toBeNull();
  });
});

describe('avatarObjectPath', () => {
  it('puts the file in the owner folder with an extension from the detected type', () => {
    expect(avatarObjectPath('u1', 'image/jpeg', 5)).toBe('u1/5.jpg');
    expect(avatarObjectPath('u1', 'image/webp', 5)).toBe('u1/5.webp');
  });
});

describe('avatarUrl', () => {
  it('builds the public address of a stored picture', () => {
    expect(avatarUrl('https://x.supabase.co/', 'u1/5.png')).toBe(
      'https://x.supabase.co/storage/v1/object/public/avatars/u1/5.png',
    );
  });

  it('returns null without a path or a project address', () => {
    expect(avatarUrl('https://x.supabase.co', null)).toBeNull();
    expect(avatarUrl(undefined, 'u1/5.png')).toBeNull();
  });
});

describe('isAvatarMime', () => {
  it('accepts the three image types and nothing else', () => {
    expect(isAvatarMime('image/png')).toBe(true);
    expect(isAvatarMime('image/webp')).toBe(true);
    expect(isAvatarMime('image/gif')).toBe(false);
    expect(isAvatarMime('toString')).toBe(false);
    expect(isAvatarMime('')).toBe(false);
  });
});
