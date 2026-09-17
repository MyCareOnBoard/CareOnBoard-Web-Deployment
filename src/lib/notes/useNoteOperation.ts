import { useRef, useState } from 'react';

type NoteOperationIntent = { action: 'submit' | 'approve' | 'return'; resourceId: string; noteIds?: string[]; contentKey?: string };

/** Retry identity only. The calling form owns saving and validation. */
export function useNoteOperation() {
  const operation = useRef<{ key: string; id: string; promise?: Promise<unknown> } | null>(null);
  const [pending, setPending] = useState(false);
  function run<T>(intent: NoteOperationIntent, send: (operationId: string) => Promise<T>): Promise<T> {
    const key = JSON.stringify([intent.action, intent.resourceId, [...(intent.noteIds ?? [])].sort(), intent.contentKey ?? null]);
    if (operation.current?.promise) return operation.current.promise as Promise<T>;
    if (operation.current?.key !== key) operation.current = { key, id: crypto.randomUUID() };
    const current = operation.current!;
    setPending(true);
    current.promise = Promise.resolve().then(() => send(current.id)).then(value => {
      operation.current = null;
      return value;
    }, (error: unknown) => {
      const status = (error as {status?: number})?.status;
      if (typeof status === 'number' && status >= 400 && status < 500 && status !== 408 && status !== 429) operation.current = null;
      throw error;
    }).finally(() => { current.promise = undefined; setPending(false); });
    return current.promise as Promise<T>;
  }
  return { run, pending };
}
