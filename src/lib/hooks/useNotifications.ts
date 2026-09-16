import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axiosClient from "../axios";
import { useAuth } from "@/utils/auth";

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    category: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status: 'unread' | 'read' | 'archived' | 'deleted';
    cleared: boolean;
    createdAt: string; // ISO string for UI
    readAt?: string | null;
    actionUrl?: string;
}

interface UseNotificationsReturn {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    error: Error | null;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    clearAll: () => Promise<void>;
}


const surface = 'care_on_board';
export function useNotifications(): UseNotificationsReturn {
    const { user } = useAuth();
    const uid = user?.uid;
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const generation = useRef(0);
    const refresh = useRef<() => Promise<void>>(async () => {});
    const mutationController = useRef<AbortController | null>(null);
    useEffect(() => {
        const current = ++generation.current;
        const controller = new AbortController();
        mutationController.current = controller;
        let request: AbortController | null = null;
        setNotifications([]);
        setLoading(Boolean(uid));
        setError(null);
        const load = async () => {
            if (!uid || document.visibilityState === 'hidden' || controller.signal.aborted || request) return;
            const active = new AbortController();
            request = active;
            try {
                const { data } = await axiosClient.get<{notifications: Notification[]}>('/notifications', {
                    params: {surface, cleared: false, limit: 50}, signal: active.signal,
                });
                if (current === generation.current && !active.signal.aborted) {
                    setNotifications(data.notifications); setError(null);
                }
            } catch (cause) {
                if (current === generation.current && !active.signal.aborted) setError(cause instanceof Error ? cause : new Error('Could not load notifications'));
            } finally {
                if (current === generation.current && !active.signal.aborted) setLoading(false);
                if (request === active) request = null;
            }
        };
        refresh.current = load;
        void load();
        const interval = window.setInterval(() => void load(), 15_000);
        const visible = () => {
            if (document.visibilityState === 'hidden') { request?.abort(); request = null; }
            else void load();
        };
        document.addEventListener('visibilitychange', visible);
        window.addEventListener('focus', visible);
        return () => {
            ++generation.current; controller.abort(); request?.abort(); window.clearInterval(interval);
            document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', visible);
        };
    }, [uid]);
    const markAsRead = useCallback(async (id: string) => {
        if (!uid) return;
        const current = generation.current;
        await axiosClient.patch(`/notifications/${encodeURIComponent(id)}/read`, {}, {signal: mutationController.current?.signal});
        if (current === generation.current) {
            setNotifications(rows => rows.map(row => row.id === id ? {...row, status: 'read'} : row));
            await refresh.current();
        }
    }, [uid]);
    const bulk = useCallback(async (action: 'mark-all-read' | 'clear-all') => {
        if (!uid) return;
        const current = generation.current;
        let startAfter: string | undefined;
        do {
            const { data } = await axiosClient.post<{hasMore: boolean; nextCursor?: string}>(`/notifications/${action}`, {}, {
                params: {surface, ...(startAfter ? {startAfter} : {})}, signal: mutationController.current?.signal,
            });
            if (current !== generation.current) return;
            if (!data.hasMore) break;
            if (!data.nextCursor || data.nextCursor === startAfter) throw new Error('Could not finish updating notifications');
            startAfter = data.nextCursor;
        } while (current === generation.current);
        await refresh.current();
    }, [uid]);
    const markAllAsRead = useCallback(() => bulk('mark-all-read'), [bulk]);
    const clearAll = useCallback(() => bulk('clear-all'), [bulk]);
    const unreadCount = useMemo(() => notifications.filter(row => row.status === 'unread').length, [notifications]);
    return {notifications, unreadCount, loading, error, markAsRead, markAllAsRead, clearAll};
}
