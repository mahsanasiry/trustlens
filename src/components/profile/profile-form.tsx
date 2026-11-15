'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef, useState } from 'react';
import { updateProfile } from '@/app/[locale]/profile/actions';
import { Avatar } from '@/components/avatar';
import { Toast, type ToastTone } from '@/components/toast';
import type { ProfileError, ProfileState } from '@/lib/data/profile-params';
import { avatarMaxBytes, avatarSourceMaxBytes, isAvatarMime } from '@/lib/storage/avatar';
import { prepareAvatar } from '@/lib/storage/prepare-avatar';

interface ProfileFormProps {
  locale: string;
  displayName: string;
  pictureUrl: string | null;
}

interface Pick {
  // The id of the result on screen when the file was chosen. A new result
  // (the form has been submitted) retires the choice without any reset code.
  forId: number;
  nonce: number;
  previewUrl: string | null;
  error: ProfileError | null;
}

interface ToastModel {
  key: string;
  tone: ToastTone;
  title: string;
}

const idle: ProfileState = { id: 0, status: 'idle' };
const autoCloseMs = { success: 5000, error: 8000 } as const;

export function ProfileForm({ locale, displayName, pictureUrl }: ProfileFormProps) {
  const t = useTranslations('profile');
  const [state, formAction, pending] = useActionState(updateProfile, idle);
  const [pick, setPick] = useState<Pick | null>(null);
  const [closedKey, setClosedKey] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const picks = useRef(0);

  const current = pick && pick.forId === state.id ? pick : null;
  const previewUrl = current?.previewUrl ?? null;

  // Blob addresses hold the file in memory until they are released.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function onPick(input: HTMLInputElement) {
    const file = input.files?.[0];
    const nonce = ++picks.current;
    if (!file) {
      setPreparing(false);
      setPick(null);
      return;
    }

    const reject = (error: ProfileError) => {
      // Nothing is sent: a file that cannot be used never leaves the browser.
      input.value = '';
      setPreparing(false);
      setPick({ forId: state.id, nonce, previewUrl: null, error });
    };

    if (!isAvatarMime(file.type)) {
      reject('type');
      return;
    }
    if (file.size > avatarSourceMaxBytes) {
      reject('size');
      return;
    }

    setPreparing(true);
    let ready: File;
    try {
      ready = await prepareAvatar(file);
    } catch {
      // A browser that cannot resize can still send a file that already fits.
      if (file.size > avatarMaxBytes) {
        reject('size');
        return;
      }
      ready = file;
    }
    // A newer choice replaced this one while it was being prepared.
    if (nonce !== picks.current) return;

    const transfer = new DataTransfer();
    transfer.items.add(ready);
    input.files = transfer.files;
    setPreparing(false);
    setPick({
      forId: state.id,
      nonce,
      previewUrl: URL.createObjectURL(ready),
      error: null,
    });
  }

  let toast: ToastModel | null = null;
  if (preparing) {
    toast = { key: 'progress', tone: 'progress', title: t('preparing') };
  } else if (pending) {
    toast = {
      key: 'progress',
      tone: 'progress',
      title: t(previewUrl ? 'uploading' : 'saving'),
    };
  } else if (current?.error) {
    toast = {
      key: `pick-${current.nonce}`,
      tone: 'error',
      title: t(`errors.${current.error}`),
    };
  } else if (state.status === 'saved') {
    toast = { key: `result-${state.id}`, tone: 'success', title: t(state.message) };
  } else if (state.status === 'error') {
    toast = {
      key: `result-${state.id}`,
      tone: 'error',
      title: t(`errors.${state.error}`),
    };
  }

  const visible =
    toast && toast.tone !== 'progress' && toast.key === closedKey ? null : toast;
  const closeKey = visible && visible.tone !== 'progress' ? visible.key : null;
  const closeAfter =
    visible && visible.tone !== 'progress' ? autoCloseMs[visible.tone] : 0;

  useEffect(() => {
    if (!closeKey) return;
    const timer = window.setTimeout(() => setClosedKey(closeKey), closeAfter);
    return () => window.clearTimeout(timer);
  }, [closeKey, closeAfter]);

  return (
    <>
      <form action={formAction} className="card profile-form">
        <input type="hidden" name="locale" value={locale} />

        <div className="profile-picture">
          <Avatar name={displayName} url={previewUrl ?? pictureUrl} size="lg" />
          <div className="profile-picture__controls field">
            <label htmlFor="profile-avatar">{t('picture.label')}</label>
            <input
              // Remounting after each answer empties the chosen file.
              key={state.id}
              id="profile-avatar"
              name="avatar"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-describedby="profile-avatar-hint"
              aria-invalid={current?.error ? true : undefined}
              disabled={pending}
              onChange={(event) => void onPick(event.currentTarget)}
            />
            <p
              id="profile-avatar-hint"
              className={current?.error ? 'field__error' : 'field__hint'}
            >
              {current?.error ? t(`errors.${current.error}`) : t('picture.hint')}
            </p>
          </div>
        </div>

        <div className="field">
          <label htmlFor="profile-name">{t('fields.displayName')}</label>
          <input
            id="profile-name"
            name="displayName"
            required
            maxLength={80}
            pattern=".*\S.*"
            defaultValue={displayName}
            autoComplete="name"
            dir="auto"
            readOnly={pending}
          />
        </div>

        <div className="profile-actions">
          <button
            type="submit"
            name="intent"
            value="save"
            className="btn btn--primary"
            disabled={pending || preparing}
          >
            {t('actions.save')}
          </button>
          {pictureUrl ? (
            <button
              type="submit"
              name="intent"
              value="remove"
              formNoValidate
              className="btn btn--quiet"
              disabled={pending}
            >
              {t('actions.removePicture')}
            </button>
          ) : null}
        </div>
      </form>

      <div className="toast-region">
        {visible ? (
          <Toast
            key={visible.key}
            tone={visible.tone}
            title={visible.title}
            closeLabel={t('dismiss')}
            onClose={
              visible.tone === 'progress' ? undefined : () => setClosedKey(visible.key)
            }
          />
        ) : null}
      </div>
    </>
  );
}
