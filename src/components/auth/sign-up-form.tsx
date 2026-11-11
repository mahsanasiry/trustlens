'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { isValidationMessage, signUpSchema, type SignUpValues } from '@/lib/auth/schemas';
import { useRouter } from '@/lib/i18n/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { SubmitButton } from './submit-button';
import { TextField } from './text-field';

export function SignUpForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const translateError = (message: string | undefined) =>
    isValidationMessage(message) ? t(`errors.${message}`) : undefined;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    setFormError(null);
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, locale },
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(`/${locale}`)}`,
      },
    });
    if (error) {
      setFormError(t('errors.generic'));
      return;
    }
    if (data.session) {
      router.replace('/', { locale });
      router.refresh();
      return;
    }
    // With email confirmation enabled there is no session yet. The same
    // message is shown for an address that is already registered, so the form
    // does not reveal which addresses have accounts.
    setAwaitingConfirmation(true);
  });

  if (awaitingConfirmation) {
    return (
      <p role="status" className="alert alert--info">
        {t('signUp.checkEmail')}
      </p>
    );
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="form">
      <TextField
        id="name"
        type="text"
        autoComplete="name"
        label={t('fields.name')}
        error={translateError(errors.name?.message)}
        {...register('name')}
      />
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
        autoComplete="new-password"
        label={t('fields.password')}
        hint={t('fields.passwordHint')}
        error={translateError(errors.password?.message)}
        {...register('password')}
      />
      {formError ? (
        <p role="alert" className="alert">
          {formError}
        </p>
      ) : null}
      <SubmitButton disabled={isSubmitting}>{t('signUp.submit')}</SubmitButton>
    </form>
  );
}
