// lib/useTrips.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase"; 
import { TripData } from "./constants";

export const useTrips = () => {
  const [rawTrips, setRawTrips] = useState<TripData[]>([]);
  const [reports, setReports] = useState<Record<string, { correct: number; wrong: number }>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  useEffect(() => {
    const tripsRef = ref(database, "live_trips");
    const reportsRef = ref(database, "reports");

    // 1. Listen sa Live Trips
    const unsubTrips = onValue(
      tripsRef,
      (snapshot) => {
        setLoading(false);
        setErrorMsg(null);
        setLastRefresh(Date.now());
        if (snapshot.exists()) {
          setRawTrips(Object.values(snapshot.val()));
        } else {
          setRawTrips([]);
        }
      },
      (error) => {
        setLoading(false);
        setErrorMsg("Hindi makakonekta sa server.");
        console.error("Trips listener error:", error);
      }
    );

    // 2. Listen sa Reports
    const unsubReports = onValue(
      reportsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setReports(snapshot.val());
        }
      },
      (error) => console.error("Reports listener error:", error)
    );

    // Cleanup kapag na-unmount ang component
    return () => {
      unsubTrips();
      unsubReports();
    };
  }, []);

  // 3. Pagsamahin (Merge) ang Trips at Reports nang walang race condition
  const trips = useMemo(() => {
    return rawTrips.map((trip) => ({
      ...trip,
      reports: reports[trip.tripId] || { correct: 0, wrong: 0 },
    }));
  }, [rawTrips, reports]);

  return { trips, loading, errorMsg, lastRefresh };
};