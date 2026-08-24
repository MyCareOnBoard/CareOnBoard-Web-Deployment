/**
 * Presence Hooks
 * Real-time subscriptions for user online/offline status
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  Timestamp,
  DocumentData,
} from "firebase/firestore";
import { db } from "../firebase-firestore";

// ==================== Type Definitions ====================

export interface UserPresence {
  status: "online" | "offline";
  lastSeen: Date | null;
  updatedAt: Date | null;
}
interface UseUserPresenceReturn {
  presence: UserPresence | null;
  loading: boolean;
  error: Error | null;
}

interface UseMultiplePresenceReturn {
  presenceMap: Record<string, UserPresence>;
  loading: boolean;
  error: Error | null;
}

// ==================== Helper Functions ====================

function parsePresenceDoc(data: DocumentData): UserPresence {
  return {
    status: data.status || "offline",
    lastSeen: data.lastSeen instanceof Timestamp
      ? data.lastSeen.toDate()
      : data.lastSeen instanceof Date
      ? data.lastSeen
      : data.lastSeen
      ? new Date(data.lastSeen)
      : null,
    updatedAt: data.updatedAt instanceof Timestamp
      ? data.updatedAt.toDate()
      : data.updatedAt instanceof Date
      ? data.updatedAt
      : data.updatedAt
      ? new Date(data.updatedAt)
      : null,
  };
}
// ==================== Hooks ====================

/**
 * Hook to subscribe to a single user's presence
 */
export function useUserPresence(userId: string | null): UseUserPresenceReturn {
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setPresence(null);
      return;
    }

    setLoading(true);
    setError(null);

    const presenceRef = doc(db, "userPresence", userId);

    const unsubscribe = onSnapshot(
      presenceRef,
      { includeMetadataChanges: false },
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setPresence(parsePresenceDoc(data));
        } else {
          setPresence({
            status: "offline",
            lastSeen: null,
            updatedAt: null,
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching presence:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return {
    presence,
    loading,
    error,
  };
}

/**
 * Hook to subscribe to multiple users' presence
 * Optimized for conversation participants
 */
export function useMultiplePresence(
  userIds: string[]
): UseMultiplePresenceReturn {
  const [presenceMap, setPresenceMap] = useState<Record<string, UserPresence>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userIds || userIds.length === 0) {
      setLoading(false);
      setPresenceMap({});
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to each user's presence document
    const unsubscribes: Array<() => void> = [];
    const initialPresence: Record<string, UserPresence> = {};

    userIds.forEach((userId) => {
      const presenceRef = doc(db, "userPresence", userId);

      const unsubscribe = onSnapshot(
        presenceRef,
        { includeMetadataChanges: false },
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            setPresenceMap((prev) => ({
              ...prev,
              [userId]: parsePresenceDoc(data),
            }));
          } else {
            setPresenceMap((prev) => ({
              ...prev,
              [userId]: {
                status: "offline",
                lastSeen: null,
                updatedAt: null,
              },
            }));
          }
        },
        (err) => {
          console.error(`Error fetching presence for ${userId}:`, err);
          setError(err);
        }
      );

      unsubscribes.push(unsubscribe);
    });

    // Set loading to false after initial setup
    setLoading(false);

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [userIds.join(",")]); // Use join to create stable dependency

  return {
    presenceMap,
    loading,
    error,
  };
}
