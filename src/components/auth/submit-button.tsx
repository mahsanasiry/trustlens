import { type ComponentProps } from 'react';

export function SubmitButton({ children, ...button }: ComponentProps<'button'>) {
  return (
    <button type="submit" className="btn btn--primary btn--block" {...button}>
      {children}
    </button>
  );
}
