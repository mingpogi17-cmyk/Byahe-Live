// lib/useAlerts.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import { ref, onValue, set, remove } from "firebase/database";
import { database } from "@/lib/firebase";
import { useUserId } from "./useUserId";
import { COOLDOWNS } from "./constants";

export const useAlerts = (selectedShedName: string) => {
  const userId = useUserId();
  const [activeAlert, setActiveAlert] = useState<any>(null);
  const [waitingCount, setWaitingCount] = useState(0);

  // 1. Listen sa Community Alert (Global)
  useEffect(() => {
    const alertRef = ref(database, "community_alert");
    const unsub = onValue(alertRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Auto-delete kung expired na
        if (data.expiresAt && Date.now() > data.expiresAt) {
          remove(alertRef);
          setActiveAlert(null);
        } else {
          setActiveAlert(data);
        }
      } else {
        setActiveAlert(null);
      }
    }, (error) => console.error("Alert listener error:", error));

    return () => unsub();
  }, []);

  // 2. Listen sa Waiting Commuters (Ibinibilang kung ilan ang naghihintay sa Shed na napili)
  useEffect(() => {
    if (!selectedShedName) return;
    const waitingRef = ref(database, "waiting_commuters");
    
    const unsub = onValue(waitingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        let count = 0;
        Object.values(data).forEach((val: any) => {
          if (val.shed === selectedShedName && (!val.expiresAt || Date.now() < val.expiresAt)) {
            count++;
          }
        });
        setWaitingCount(count);
      } else {
        setWaitingCount(0);
      }
    }, (error) => console.error("Waiting listener error:", error));

    return () => unsub();
  }, [selectedShedName]);

  // 3. ACTIONS (Gagamit na ng userId para hindi mag-patungan)
    const sendWaitingPing = useCallback(async (lat: number, lng: number, vehicleType: string = "Any", customShedName?: string) => {
    if (!userId) return;
    try {
      await set(ref(database, `waiting_commuters/${userId}`), {
        id: userId,
        shed: customShedName || selectedShedName, // 🚨 Gagamitin ang custom shed kung meron
        vehicleType: vehicleType,
        timestamp: Date.now(),
        expiresAt: Date.now() + COOLDOWNS.waitingPingTtlMs,
        lat,
        lng
      });
    } catch (err) {
      console.error("Error sending waiting ping:", err);
    }
  }, [userId, selectedShedName]);

  const cancelWaitingPing = useCallback(async () => {
    if (!userId) return;
    try {
      await remove(ref(database, `waiting_commuters/${userId}`));
    } catch (err) {
      console.error("Error canceling waiting ping:", err);
    }
  }, [userId]);

  const requestStop = useCallback(async () => {
    if (!userId) return;
    try {
      await set(ref(database, `stop_request/${userId}`), {
        id: userId,
        shed: selectedShedName,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error("Error requesting stop:", err);
    }
  }, [userId, selectedShedName]);

  const sendCommunityReport = useCallback(async (type: string) => {
    try {
      await set(ref(database, "community_alert"), {
        id: "alert_" + Date.now(),
        type,
        timestamp: Date.now(),
        expiresAt: Date.now() + COOLDOWNS.alertTtlMs
      });
    } catch (err) {
      console.error("Error sending community report:", err);
    }
  }, []);

  const clearCommunityAlert = useCallback(async () => {
    try {
      await remove(ref(database, "community_alert"));
    } catch (err) {
      console.error("Error clearing alert:", err);
    }
  }, []);

  const triggerSOS = useCallback(async () => {
    if (!userId) return;
    try {
      await set(ref(database, `sos_alert/${userId}`), {
        id: userId,
        shed: selectedShedName,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error("Error triggering SOS:", err);
    }
  }, [userId, selectedShedName]);

  return {
    activeAlert,
    waitingCount,
    sendWaitingPing,
    cancelWaitingPing,
    requestStop,
    sendCommunityReport,
    clearCommunityAlert,
    triggerSOS
  };
};