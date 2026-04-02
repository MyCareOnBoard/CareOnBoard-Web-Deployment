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
import { db } from "../firebase";
import { useAuth } from "@/utils/auth";
import axiosClient from "../axios";

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

// ==================== Presence Manager ====================

/**
 * Presence Manager Service
 * Handles heartbeat updates and presence lifecycle
 */
class PresenceManager {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private isActive = false;

  constructor(private userId: string | null) {}

  start() {
    if (!this.userId || this.isActive) return;

    this.isActive = true;
    this.sendHeartbeat();

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.HEARTBEAT_INTERVAL);

    // Handle page visibility changes
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  stop() {
    this.isActive = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }

    // Set offline on stop
    if (this.userId) {
      this.setOffline();
    }
  }

  private sendHeartbeat = async () => {
    if (!this.userId || !this.isActive) return;

    try {
      await axiosClient.post("/presence/heartbeat");
    } catch (error) {
      console.error("Error sending presence heartbeat:", error);
    }
  };

  private handleVisibilityChange = () => {
    if (typeof document === "undefined") return;

    if (document.hidden) {
      // Tab is inactive, pause heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    } else {
      // Tab is active, resume heartbeat
      if (this.isActive && !this.heartbeatInterval) {
        this.sendHeartbeat();
        this.heartbeatInterval = setInterval(() => {
          this.sendHeartbeat();
        }, this.HEARTBEAT_INTERVAL);
      }
    }
  };

  private async setOffline() {
    if (!this.userId) return;

    try {
      await axiosClient.post("/presence/offline");
    } catch (error) {
      console.error("Error setting presence offline:", error);
    }
  }

  updateUserId(newUserId: string | null) {
    const wasActive = this.isActive;
    this.stop();
    this.userId = newUserId;
    if (wasActive && newUserId) {
      this.start();
    }
  }
}

// Global presence manager instance
let presenceManager: PresenceManager | null = null;

/**
 * Hook to manage presence heartbeat
 * Should be called once at app level
 */
export function usePresenceManager() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) {
      if (presenceManager) {
        presenceManager.stop();
        presenceManager = null;
      }
      return;
    }

    // Initialize presence manager
    if (!presenceManager) {
      presenceManager = new PresenceManager(user.uid);
    } else {
      presenceManager.updateUserId(user.uid);
    }

    presenceManager.start();

    return () => {
      if (presenceManager) {
        presenceManager.stop();
      }
    };
  }, [user?.uid]);
}
