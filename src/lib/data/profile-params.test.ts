import { describe, expect, it } from 'vitest';
import { normaliseDisplayName, parseProfileForm } from './profile-params';

function form(entries: Record<string, string | File>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe('normaliseDisplayName', () => {
  it('trims and collapses whitespace', () => {
    expect(normaliseDisplayName('  Mahsa   Asiri ')).toBe('Mahsa Asiri');
  });

  it('rejects empty, blank and non-string values', () => {
    expect(normaliseDisplayName('')).toBeNull();
    expect(normaliseDisplayName('   ')).toBeNull();
    expect(normaliseDisplayName(null)).toBeNull();
  });

  it('allows 80 characters and rejects 81, counting characters not code units', () => {
    expect(normaliseDisplayName('a'.repeat(80))).not.toBeNull();
    expect(normaliseDisplayName('a'.repeat(81))).toBeNull();
    expect(normaliseDisplayName('😀'.repeat(80))).not.toBeNull();
  });
});

describe('parseProfileForm', () => {
  it('reads a save with a picture', () => {
    const file = new File([new Uint8Array([1])], 'me.png');
    const parsed = parseProfileForm(
      form({ locale: 'fa', intent: 'save', displayName: 'Ali', avatar: file }),
    );
    expect(parsed).toMatchObject({ locale: 'fa', intent: 'save', displayName: 'Ali' });
    expect(parsed && 'file' in parsed ? parsed.file?.size : null).toBe(1);
  });

  it('treats an empty file input as no file', () => {
    const parsed = parseProfileForm(
      form({
        locale: 'en',
        intent: 'save',
        displayName: 'Ali',
        avatar: new File([], ''),
      }),
    );
    expect(parsed).toMatchObject({ intent: 'save', file: null });
  });

  it('keeps an invalid name as null so the action can report it', () => {
    expect(
      parseProfileForm(form({ locale: 'en', intent: 'save', displayName: ' ' })),
    ).toMatchObject({
      displayName: null,
    });
  });

  it('reads a removal without needing a name', () => {
    expect(parseProfileForm(form({ locale: 'en', intent: 'remove' }))).toEqual({
      locale: 'en',
      intent: 'remove',
    });
  });

  it('rejects an unknown locale or intent', () => {
    expect(parseProfileForm(form({ locale: 'xx', intent: 'save' }))).toBeNull();
    expect(parseProfileForm(form({ locale: 'en', intent: 'other' }))).toBeNull();
  });
});
