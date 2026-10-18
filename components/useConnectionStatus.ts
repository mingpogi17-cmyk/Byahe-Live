"use client";

import { useEffect, useState } from "react";

/**
 * Tracks browser online/offline state. Provincial highways between
 * sheds (e.g. the Sta. Cruz–Digos stretch, Carmen–Panabo) regularly
 * drop signal, so the passenger and driver screens both need to know
 * the instant connectivity is lost to switch into SMS-fallback mode.
 */
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}
