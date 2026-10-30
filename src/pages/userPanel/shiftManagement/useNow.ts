import {useEffect, useState} from 'react';

/** The current time, refreshed every `intervalMs` (a minute by default) while `enabled`. */
export function useNow(intervalMs = 60_000, enabled = true) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        if (!enabled) return;
        setNow(new Date());
        const timer = window.setInterval(() => setNow(new Date()), intervalMs);
        return () => window.clearInterval(timer);
    }, [intervalMs, enabled]);
    return now;
}
