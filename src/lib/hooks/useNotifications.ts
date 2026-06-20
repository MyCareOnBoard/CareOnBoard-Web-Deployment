import { useState, useEffect, useMemo, useCallback } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    doc,
    getDocs,
    updateDoc,
    writeBatch,
    Timestamp,
    serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
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

/**
 * Parses Firestore document data into a typed Notification object
 */
function parseNotificationDoc(docId: string, data: Record<string, unknown>): Notification {
    const createdAt = data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : new Date().toISOString();

    const readAt = data.readAt instanceof Timestamp
        ? data.readAt.toDate().toISOString()
        : (data.readAt as string | null | undefined);

    return {
        id: docId,
        title: (data.title as string) ?? '',
        message: (data.message as string) ?? '',
        type: (data.type as string) ?? 'info',
        category: (data.category as string) ?? 'general',
        priority: (data.priority as Notification['priority']) ?? 'normal',
        status: (data.status as Notification['status']) ?? 'unread',
        cleared: (data.cleared as boolean) ?? false,
        createdAt,
        readAt,
        actionUrl: data.actionUrl as string | undefined,
    };
}

export function useNotifications(): UseNotificationsReturn {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Memoize unread count to prevent recalculation on every render
    const unreadCount = useMemo(
        () => notifications.filter(n => n.status === 'unread').length,
        [notifications]
    );

    // Reset state when user logs out
    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setLoading(false);
            setError(null);
        }
    }, [user]);

    // Subscribe to Firestore notifications
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const notificationsRef = collection(db, "notifications");

        // Query: specific user, exclude cleared, order by newest first, limit to 50
        const q = query(
            notificationsRef,
            where("uid", "==", user.uid),
            where("cleared", "==", false),
            orderBy("createdAt", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const newNotifications: Notification[] = snapshot.docs.map(doc =>
                    parseNotificationDoc(doc.id, doc.data())
                );
                setNotifications(newNotifications);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching notifications:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user?.uid]);

    /**
     * Mark a single notification as read with optimistic update
     */
    const markAsRead = useCallback(async (notificationId: string) => {
        if (!user?.uid) return;

        // Optimistic update - immediately update local state
        setNotifications(prev =>
            prev.map(n =>
                n.id === notificationId
                    ? { ...n, status: 'read' as const, readAt: new Date().toISOString() }
                    : n
            )
        );

        try {
            const notificationRef = doc(db, "notifications", notificationId);
            await updateDoc(notificationRef, {
                status: 'read',
                readAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        } catch (err) {
            // Rollback optimistic update on error
            console.error("Error marking notification as read:", err);
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId
                        ? { ...n, status: 'unread' as const, readAt: null }
                        : n
                )
            );
            throw err;
        }
    }, [user?.uid]);

    /**
     * Mark all unread notifications as read with optimistic update
     */
    const markAllAsRead = useCallback(async () => {
        if (!user?.uid || notifications.length === 0) return;

        const unreadNotifications = notifications.filter(n => n.status === 'unread');
        if (unreadNotifications.length === 0) return;

        const unreadIds = new Set(unreadNotifications.map(n => n.id));
        const previousNotifications = [...notifications];

        // Optimistic update - immediately mark all as read
        setNotifications(prev =>
            prev.map(n =>
                unreadIds.has(n.id)
                    ? { ...n, status: 'read' as const, readAt: new Date().toISOString() }
                    : n
            )
        );

        try {
            const batch = writeBatch(db);

            unreadNotifications.forEach(notification => {
                const ref = doc(db, "notifications", notification.id);
                batch.update(ref, {
                    status: 'read',
                    readAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            });

            await batch.commit();
        } catch (err) {
            // Rollback optimistic update on error
            console.error("Error marking all as read:", err);
            setNotifications(previousNotifications);
            throw err;
        }
    }, [user?.uid, notifications]);

    /**
     * Clear every uncleared notification for the user (not just the loaded page)
     * by setting `cleared: true`. The Firestore listener filters out cleared
     * notifications, so they leave the list.
     */
    const clearAll = useCallback(async () => {
        if (!user?.uid || notifications.length === 0) return;

        const previousNotifications = [...notifications];

        // Optimistic update - the listener filters cleared, so remove them locally now
        setNotifications([]);

        try {
            // Clear all uncleared docs, not just the <=50 currently loaded in the popover
            const clearQuery = query(
                collection(db, "notifications"),
                where("uid", "==", user.uid),
                where("cleared", "==", false)
            );
            const snapshot = await getDocs(clearQuery);

            // writeBatch is capped at 500 ops, so commit in chunks
            for (let i = 0; i < snapshot.docs.length; i += 500) {
                const batch = writeBatch(db);
                snapshot.docs.slice(i, i + 500).forEach(docSnap => {
                    batch.update(docSnap.ref, {
                        cleared: true,
                        clearedAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                });
                await batch.commit();
            }
        } catch (err) {
            // Rollback optimistic update on error
            console.error("Error clearing notifications:", err);
            setNotifications(previousNotifications);
            throw err;
        }
    }, [user?.uid, notifications]);

    return {
        notifications,
        unreadCount,
        loading,
        error,
        markAsRead,
        markAllAsRead,
        clearAll
    };
}
