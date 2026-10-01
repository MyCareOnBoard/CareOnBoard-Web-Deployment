import { useEffect, useRef } from 'react';

export function useScMonitoringRefresh({ scopeKey, timezone, refresh, enabled }: {
  scopeKey: string; timezone?: string | null; refresh: (signal: AbortSignal) => Promise<unknown>; enabled: boolean;
}) {
  const callback = useRef(refresh); callback.current = refresh;
  useEffect(() => {
    if (!enabled) return;
    let pending: AbortController | null = null;
    const date = () => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC' }).format(new Date()); } catch { return null; } };
    let day = date();
    const run = () => {
      if (pending || document.visibilityState === 'hidden') return;
      const controller = new AbortController(); pending = controller;
      void callback.current(controller.signal).catch(() => {}).finally(() => { if (pending === controller) pending = null; });
    };
    const timer = window.setInterval(() => { const next = date(); if (next !== day) { day = next; run(); } }, 60000);
    window.addEventListener('focus', run); document.addEventListener('visibilitychange', run);
    return () => { pending?.abort(); window.clearInterval(timer); window.removeEventListener('focus', run); document.removeEventListener('visibilitychange', run); };
  }, [scopeKey, timezone, enabled]);
}
