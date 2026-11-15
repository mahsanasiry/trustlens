'use client';

import { useEffect, useRef, useState } from 'react';

interface CopyLinkFieldProps {
  id: string;
  label: string;
  hint: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
}

const confirmationMs = 2500;

export function CopyLinkField({
  id,
  label,
  hint,
  value,
  copyLabel,
  copiedLabel,
}: CopyLinkFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), confirmationMs);
    } catch {
      // Clipboard access can be refused; selecting the text lets the reader copy it by hand.
      input.current?.select();
    }
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="copy-field">
        <input
          ref={input}
          id={id}
          readOnly
          value={value}
          dir="ltr"
          onFocus={(event) => event.currentTarget.select()}
        />
        <button type="button" className="btn btn--primary" onClick={() => void copy()}>
          {copyLabel}
        </button>
      </div>
      <p className="field__hint">{hint}</p>
      <p className="field__hint copy-field__status" role="status">
        {copied ? copiedLabel : ''}
      </p>
    </div>
  );
}
