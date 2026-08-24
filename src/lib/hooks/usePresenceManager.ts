import { useEffect } from "react";
import axiosClient from "../axios";
import { useAuth } from "@/utils/auth";

class PresenceManager {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000;
  private isActive = false;

  constructor(private userId: string | null) {}

  start() {
    if (!this.userId || this.isActive) return;

    this.isActive = true;
    this.sendHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.HEARTBEAT_INTERVAL);

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
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      return;
    }

    if (this.isActive && !this.heartbeatInterval) {
      this.sendHeartbeat();
      this.heartbeatInterval = setInterval(() => {
        this.sendHeartbeat();
      }, this.HEARTBEAT_INTERVAL);
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

let presenceManager: PresenceManager | null = null;

/** Manages only API heartbeat/offline lifecycle; real-time Firestore subscriptions stay demand-loaded. */
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
