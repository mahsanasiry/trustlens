import { describe, expect, it } from 'vitest';
import {
  isValidationMessage,
  signInSchema,
  signUpSchema,
  validationMessages,
} from '@/lib/auth/schemas';
import { safeRedirectPath } from '@/lib/auth/redirect';

function firstMessage(result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) {
  return result.error?.issues[0]?.message;
}

describe('signInSchema', () => {
  it('accepts a valid email and any non-empty password', () => {
    expect(signInSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
  });

  it('trims the email before validating', () => {
    const parsed = signInSchema.parse({ email: '  a@b.co  ', password: 'x' });
    expect(parsed.email).toBe('a@b.co');
  });

  it('rejects a malformed email and an empty password with translation keys', () => {
    expect(firstMessage(signInSchema.safeParse({ email: 'nope', password: 'x' }))).toBe(
      'emailInvalid',
    );
    expect(firstMessage(signInSchema.safeParse({ email: 'a@b.co', password: '' }))).toBe(
      'passwordRequired',
    );
  });
});

describe('signUpSchema', () => {
  const valid = { name: 'Sam', email: 'sam@example.com', password: 'longenough' };

  it('accepts valid input', () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it('enforces the name and password limits', () => {
    expect(firstMessage(signUpSchema.safeParse({ ...valid, name: '   ' }))).toBe(
      'nameRequired',
    );
    expect(firstMessage(signUpSchema.safeParse({ ...valid, name: 'x'.repeat(81) }))).toBe(
      'nameTooLong',
    );
    expect(firstMessage(signUpSchema.safeParse({ ...valid, password: 'short' }))).toBe(
      'passwordTooShort',
    );
    expect(
      firstMessage(signUpSchema.safeParse({ ...valid, password: 'x'.repeat(73) })),
    ).toBe('passwordTooLong');
  });

  it('only emits messages that the UI knows how to translate', () => {
    const result = signUpSchema.safeParse({ name: '', email: 'x', password: '' });
    expect(result.success).toBe(false);
    for (const issue of result.error?.issues ?? []) {
      expect(isValidationMessage(issue.message)).toBe(true);
    }
    expect(validationMessages).toHaveLength(6);
  });
});

describe('safeRedirectPath', () => {
  it('keeps same-site paths', () => {
    expect(safeRedirectPath('/en/claims', '/en')).toBe('/en/claims');
  });

  it.each([
    null,
    '',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'en/claims',
  ])('falls back for %j', (value) => {
    expect(safeRedirectPath(value, '/en')).toBe('/en');
  });
});
