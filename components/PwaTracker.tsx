"use client";

import { useEffect } from "react";
import { database } from "@/lib/firebase";
import { ref, runTransaction } from "firebase/database";

export function PwaTracker() {
  useEffect(() => {
    window.addEventListener("appinstalled", () => {
      // 🚨 +1 sa Firebase counter kapag may nag-install
      const installRef = ref(database, "analytics/pwa_installs");
      runTransaction(installRef, (current) => (current || 0) + 1);
    });
  }, []);

  return null;
}