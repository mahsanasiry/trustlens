'use client';

import { useEffect, useState } from 'react';
import { Toast } from '@/components/toast';

interface Outcome {
  tone: 'success' | 'error';
  title: string;
}

interface ActionToastProps {
  /** Changes with every answer from the server, so each one is shown once. */
  resultId: number;
  /** Set while the action runs. */
  pendingTitle: string | null;
  outcome: Outcome | null;
  closeLabel: string;
}

const closeAfterMs = { success: 5000, error: 8000 } as const;

// Shows what a form action is doing and how it ended: a progress message while
// it runs, then a confirmation or an error that closes by itself.
export function ActionToast({
  resultId,
  pendingTitle,
  outcome,
  closeLabel,
}: ActionToastProps) {
  const [closedId, setClosedId] = useState(0);

  const showing = pendingTitle === null && outcome !== null && closedId !== resultId;
  const tone = outcome?.tone;

  useEffect(() => {
    if (!showing || !tone) return;
    const timer = window.setTimeout(() => setClosedId(resultId), closeAfterMs[tone]);
    return () => window.clearTimeout(timer);
  }, [showing, tone, resultId]);

  return (
    <div className="toast-region">
      {pendingTitle !== null ? (
        <Toast
          key="progress"
          tone="progress"
          title={pendingTitle}
          closeLabel={closeLabel}
        />
      ) : showing && outcome ? (
        <Toast
          key={resultId}
          tone={outcome.tone}
          title={outcome.title}
          closeLabel={closeLabel}
          onClose={() => setClosedId(resultId)}
        />
      ) : null}
    </div>
  );
}
