"use client";

import { useState, useEffect, useRef } from "react";
import { database, ensureAuth } from "@/lib/firebase";
import { ref, set, remove } from "firebase/database";
import { Navigation, Play, Square, Users, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function DriverPage() {
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState<"Available" | "Standing" | "Full">("Available");
  const [tripId, setTripId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // Generate unique trip ID on mount if not present
  useEffect(() => {
    const storedTripId = localStorage.getItem("biyahe_trip_id");
    if (storedTripId) {
      setTripId(storedTripId);
    } else {
      const newTripId = "trip_" + Math.random().toString(36).substring(2, 9);
      localStorage.setItem("biyahe_trip_id", newTripId);
      setTripId(newTripId);
    }
  }, []);

  // Update position in Firebase
  const pushLocationToFirebase = async (position: GeolocationPosition, currentStatus: "Available" | "Standing" | "Full") => {
    if (!tripId) return;

    try {
      await ensureAuth(); // Siguraduhing may auth bago mag-save

      const currentCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setCoords(currentCoords);

      const tripRef = ref(database, `live_trips/${tripId}`);
      await set(tripRef, {
        tripId,
        status: currentStatus,
        location: currentCoords,
        speed: position.coords.speed || 0,
        heading: position.coords.heading || 0,
        updatedAt: Date.now(),
      });

      setLastUpdated(new Date());
      setErrorMessage(null);
    } catch (err) {
      console.error("Firebase error:", err);
      setErrorMessage("Maling koneksyon sa internet. Sinusubukang muli...");
    }
  };

  // START TRIP
  const handleStartTrip = async () => {
    if (!navigator.geolocation) {
      setErrorMessage("Hindi suportado ng browser mo ang Geolocation.");
      return;
    }

    setIsLive(true);
    setErrorMessage(null);

    // 🚨 HINTAYIN MUNA ANG LOGIN BAGO MAG-SAVE
    try {
      await ensureAuth();
    } catch (err) {
      console.error("Auth failed before starting trip:", err);
      setErrorMessage("Hindi maka-login sa server. I-refresh ang page.");
      setIsLive(false);
      return;
    }

    // Initial position fetch
    navigator.geolocation.getCurrentPosition(
      (pos) => pushLocationToFirebase(pos, status),
      (err) => setErrorMessage("Paki-payagan ang Location Permission sa iyong phone."),
      { enableHighAccuracy: true }
    );

    // Watch position
    let latestPosition: GeolocationPosition | null = null;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        latestPosition = pos;
        pushLocationToFirebase(pos, status);
      },
      (err) => console.error("WatchPosition error:", err),
      { enableHighAccuracy: true }
    );

    // Periodic heartbeat push every 10 seconds
    intervalIdRef.current = setInterval(() => {
      if (latestPosition) {
        pushLocationToFirebase(latestPosition, status);
      }
    }, 10000);
  };

  // END TRIP
  const handleEndTrip = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    if (tripId) {
      try {
        await ensureAuth();
        const tripRef = ref(database, `live_trips/${tripId}`);
        await remove(tripRef);
      } catch (err) {
        console.error("Error removing trip:", err);
      }
    }

    setIsLive(false);
    setCoords(null);
    setLastUpdated(null);
  };

  // Status toggle handler
  const handleStatusChange = async (newStatus: "Available" | "Standing" | "Full") => {
    setStatus(newStatus);
    if (isLive && coords && tripId) {
      try {
        await ensureAuth();
        const tripRef = ref(database, `live_trips/${tripId}`);
        await set(tripRef, {
          tripId,
          status: newStatus,
          location: coords,
          updatedAt: Date.now(),
        });
      } catch (err) {
        console.error("Status update error:", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8 flex flex-col items-center justify-between">
      <div className="w-full max-w-md text-center my-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Navigation className="w-8 h-8 text-emerald-400 animate-pulse" />
          <h1 className="text-2xl font-bold tracking-wide">BIYAHE LIVE - DRIVER</h1>
        </div>
        <p className="text-sm text-slate-400">Davao Region Commuter Telemetry System</p>
      </div>

      <div className="w-full max-w-md bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 space-y-6">
        <div className={`p-4 rounded-xl flex items-center justify-between ${isLive ? 'bg-emerald-950/80 border border-emerald-500/50' : 'bg-slate-700/50'}`}>
          <div className="flex items-center gap-3">
            <span className={`w-3.5 h-3.5 rounded-full ${isLive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">TRIP STATUS</p>
              <p className="font-bold text-lg">{isLive ? "LIVE BROADCASTING" : "OFFLINE"}</p>
            </div>
          </div>
          {isLive && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-lg flex items-center gap-3 text-rose-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4" /> KONTROLIN ANG STATUS NG MGA UPUAN
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["Available", "Standing", "Full"] as const).map((st) => (
              <button
                key={st}
                onClick={() => handleStatusChange(st)}
                className={`py-3 px-2 rounded-xl text-sm font-bold border transition-all ${
                  status === st
                    ? st === "Available"
                      ? "bg-emerald-600 border-emerald-400 text-white shadow-lg"
                      : st === "Standing"
                      ? "bg-amber-600 border-amber-400 text-white shadow-lg"
                      : "bg-rose-600 border-rose-400 text-white shadow-lg"
                    : "bg-slate-700/60 border-slate-600 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {st === "Available" ? "may UPUAN" : st === "Standing" ? "TAYO LANG" : "PUNO NA"}
              </button>
            ))}
          </div>
        </div>

        {!isLive ? (
          <button
            onClick={handleStartTrip}
            className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xl rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Play className="w-7 h-7 fill-current" /> START TRIP
          </button>
        ) : (
          <button
            onClick={handleEndTrip}
            className="w-full py-5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xl rounded-2xl shadow-lg shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Square className="w-7 h-7 fill-current" /> END TRIP
          </button>
        )}

        {isLive && lastUpdated && (
          <div className="text-center space-y-1 text-xs text-slate-400 border-t border-slate-700 pt-4">
            <div className="flex items-center justify-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
              <span>Huling nailipat ang lokasyon: {lastUpdated.toLocaleTimeString()}</span>
            </div>
            {coords && (
              <p className="font-mono text-[10px] text-slate-500">
                GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </p>
            )}
          </div>
        )}
      </div>

      <footer className="text-center text-xs text-slate-500 my-4">
        Developed by Ray Mar Olandria · 0969-149-1319
      </footer>
    </div>
  );
}