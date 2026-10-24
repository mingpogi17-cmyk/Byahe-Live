// lib/useUserId.ts
"use client";

import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "./constants";

// Gumagawa ng unique ID para sa bawat user (walang kailangang login)
const generateId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "u-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
};

export const useUserId = (): string | null => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    try {
      let id = localStorage.getItem(STORAGE_KEYS.userId);
      if (!id) {
        id = generateId();
        localStorage.setItem(STORAGE_KEYS.userId, id);
      }
      setUserId(id);
    } catch {
      // Fallback kung naka-private mode ang browser (blocked ang localStorage)
      setUserId(generateId());
    }
  }, []);

  return userId;
};