import type { Client } from '@/lib/api/clients';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useClientDocumentRefresh({ requestKey, enabled, documentsActive, load }: {
  requestKey: string; enabled: boolean; documentsActive: boolean; load: (signal: AbortSignal) => Promise<Client>;
}) {
  const [state, setState] = useState({ key: requestKey, client: null as Client | null, loading: enabled, refreshing: false, error: null as string | null });
  const loadRef = useRef(load); loadRef.current = load;
  const context = useRef(requestKey);
  const snapshot = useRef<Client | null>(null);
  const sequence = useRef(0);
  const lastSuccess = useRef<number | null>(null);
  const inFlight = useRef<{ controller: AbortController; promise: Promise<void> } | null>(null);

  const refresh = useCallback((force = false): Promise<void> => {
    if (!enabled || context.current !== requestKey) return Promise.resolve();
    if (!force && inFlight.current) return inFlight.current.promise;
    if (!force && lastSuccess.current !== null && Date.now() - lastSuccess.current < 60000) return Promise.resolve();
    inFlight.current?.controller.abort();
    const controller = new AbortController(), seq = ++sequence.current;
    const current = () => seq === sequence.current && context.current === requestKey && !controller.signal.aborted;
    setState(previous => ({ ...previous, key: requestKey, loading: !snapshot.current, refreshing: Boolean(snapshot.current), error: null }));
    const promise = (async () => {
      try {
        const client = await loadRef.current(controller.signal);
        if (!current()) return;
        snapshot.current = client; lastSuccess.current = Date.now();
        setState({ key: requestKey, client, loading: false, refreshing: false, error: null });
      } catch (cause) {
        if (!current()) return;
        const failure = cause as { response?: { status?: number }; status?: number; name?: string; code?: string };
        if (failure?.name === 'AbortError' || failure?.code === 'ERR_CANCELED') return;
        const denied = [401, 403, 404].includes(failure?.response?.status ?? failure?.status ?? 0);
        if (denied) snapshot.current = null;
        setState({ key: requestKey, client: snapshot.current, loading: false, refreshing: false,
          error: denied ? 'Client details are no longer available.' : 'Could not load the checklist. Try again.' });
      } finally {
        if (current()) {
          inFlight.current = null;
          setState(previous => ({ ...previous, loading: false, refreshing: false }));
        }
      }
    })();
    inFlight.current = { controller, promise };
    return promise;
  }, [enabled, requestKey]);

  useEffect(() => {
    context.current = requestKey; snapshot.current = null; lastSuccess.current = null;
    setState({ key: requestKey, client: null, loading: enabled, refreshing: false, error: null });
    void refresh();
    return () => { ++sequence.current; inFlight.current?.controller.abort(); inFlight.current = null; };
  }, [requestKey, enabled, refresh]);
  useEffect(() => {
    if (!documentsActive || !enabled) return;
    const onFocus = () => { void refresh(); };
    void refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [documentsActive, enabled, refresh]);

  return { ...(state.key === requestKey && enabled ? state : { client: null, loading: enabled, refreshing: false, error: null }), refresh };
}
