// lib/useUserId.ts
"use client";

import { useEffect, useState } from "react";
import { auth, ensureAuth } from "./firebase"; 
import { onAuthStateChanged } from "firebase/auth";

export const useUserId = (): string | null => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // 1. I-setup ang listener para sa Auth State
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid); // Kapag naka-login (Anonymous), kunin ang UID
      } else {
        // 2. Kung wala pang user, i-trigger ang Anonymous Login
        ensureAuth()
          .then((userCredential: any) => {
            setUserId(userCredential.uid);
          })
          .catch((err) => {
            console.error("Auth failed:", err);
            // Fallback kung sakaling mag-fail ang Firebase Auth
            let fallbackId = localStorage.getItem("biyahe_fallback_id");
            if (!fallbackId) {
              fallbackId = "u-" + Math.random().toString(36).substring(2, 10);
              localStorage.setItem("biyahe_fallback_id", fallbackId);
            }
            setUserId(fallbackId);
          });
      }
    });

    return () => unsubscribe();
  }, []);

  return userId;
};