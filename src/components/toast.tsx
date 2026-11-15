import type { ReactNode } from 'react';

export type ToastTone = 'progress' | 'success' | 'error';

interface ToastProps {
  tone: ToastTone;
  title: string;
  closeLabel: string;
  /** Present only for messages the reader can dismiss. */
  onClose?: (() => void) | undefined;
}

const icons: Record<ToastTone, ReactNode> = {
  progress: <span className="toast__spinner" />,
  success: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  ),
  error: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      <path d="M12 4 2.5 20h19zM12 10v4.5M12 17.5v.01" />
    </svg>
  ),
};

// Each tone has its own icon, so the meaning never rests on colour alone.
// Errors interrupt screen readers; progress and success wait their turn.
export function Toast({ tone, title, closeLabel, onClose }: ToastProps) {
  return (
    <div className={`toast toast--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className="toast__icon" aria-hidden="true">
        {icons[tone]}
      </span>
      <p className="toast__title">{title}</p>
      {onClose ? (
        <button
          type="button"
          className="toast__close"
          onClick={onClose}
          aria-label={closeLabel}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      ) : null}
      {tone === 'progress' ? <span className="toast__bar" aria-hidden="true" /> : null}
    </div>
  );
}
