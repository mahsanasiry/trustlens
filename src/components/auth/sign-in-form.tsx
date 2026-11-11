'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { isValidationMessage, signInSchema, type SignInValues } from '@/lib/auth/schemas';
import { useRouter } from '@/lib/i18n/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { SubmitButton } from './submit-button';
import { TextField } from './text-field';

export function SignInForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const translateError = (message: string | undefined) =>
    isValidationMessage(message) ? t(`errors.${message}`) : undefined;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setFormError(
        t(
          error.code === 'invalid_credentials'
            ? 'errors.invalidCredentials'
            : 'errors.generic',
        ),
      );
      return;
    }
    router.replace('/', { locale });
    router.refresh();
  });

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="form">
      <TextField
        id="email"
        type="email"
        autoComplete="email"
        label={t('fields.email')}
        error={translateError(errors.email?.message)}
        {...register('email')}
      />
      <TextField
        id="password"
        type="password"
        autoComplete="current-password"
        label={t('fields.password')}
        error={translateError(errors.password?.message)}
        {...register('password')}
      />
      {formError ? (
        <p role="alert" className="alert">
          {formError}
        </p>
      ) : null}
      <SubmitButton disabled={isSubmitting}>{t('signIn.submit')}</SubmitButton>
    </form>
  );
}
