import { z } from 'zod';

// Messages are translation keys under the "auth.errors" namespace, so the
// same schema serves every locale.
const email = z.string().trim().email({ message: 'emailInvalid' });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, { message: 'passwordRequired' }),
});

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'nameRequired' })
    .max(80, { message: 'nameTooLong' }),
  email,
  password: z
    .string()
    .min(8, { message: 'passwordTooShort' })
    .max(72, { message: 'passwordTooLong' }),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;

export const validationMessages = [
  'emailInvalid',
  'passwordRequired',
  'nameRequired',
  'nameTooLong',
  'passwordTooShort',
  'passwordTooLong',
] as const;

export type ValidationMessage = (typeof validationMessages)[number];

export function isValidationMessage(
  value: string | undefined,
): value is ValidationMessage {
  return validationMessages.some((message) => message === value);
}
