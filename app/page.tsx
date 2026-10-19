"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { Bus, MapPin, Clock, WifiOff, AlertTriangle, Ticket, Navigation, RefreshCw } from "lucide-react";

interface TripData {
  tripId: string;
  status: "Available" | "Standing" | "Full";
  location: { lat: number; lng: number };
  seatsAvailable?: number;
  updatedAt: number;
}

export default function HomePage() {
  const [trips, setTrips] = useState<TripData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  // Timer para sa "X minutes ago"
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Monitor network offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Realtime Firebase listener
  useEffect(() => {
    setLoading(true);
    const tripsRef = ref(database, "live_trips");
    
    const unsubscribe = onValue(
      tripsRef,
      (snapshot) => {
        setLoading(false);
        setErrorMsg(null);
        setLastRefresh(Date.now());
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const list: TripData[] = Object.values(data);
          setTrips(list);
        } else {
          setTrips([]);
        }
      },
      (error) => {
        setLoading(false);
        setErrorMsg("Hindi makakonekta sa server. Paki-check ang iyong internet.");
      }
    );
    return () => unsubscribe();
  }, []);

  const getMinutesAgo = (timestamp: number) => {
    const diffMs = now - timestamp;
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  const handleManualRefresh = () => {
    setLoading(true);
    setLastRefresh(Date.now());
    // The onValue listener will automatically fetch the latest data
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-md my-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bus className="w-7 h-7 text-emerald-400" />
          <h1 className="text-xl font-bold tracking-wide">BIYAHE LIVE</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/driver" className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-slate-700 transition-all">
            <Navigation className="w-3.5 h-3.5" /> Driver
          </Link>
          <Link href="/commuter/ticket" className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-emerald-500 hover:text-white transition-all">
            <Ticket className="w-3.5 h-3.5" /> Ticket
          </Link>
        </div>
      </header>

      <main className="w-full max-w-md space-y-4">
        {/* Refresh Bar */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Na-update: {getMinutesAgo(lastRefresh) === 0 ? "Ngayon lang" : `${getMinutesAgo(lastRefresh)} min ang nakalipas`}
          </span>
          <button 
            onClick={handleManualRefresh} 
            className={`p-1.5 rounded-lg hover:bg-slate-800 transition-all ${loading ? 'animate-spin text-emerald-400' : 'text-slate-400'}`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Offline Warning */}
        {isOffline && (
          <div className="p-4 bg-amber-950/90 border border-amber-600/50 rounded-xl flex items-center gap-3 text-amber-200">
            <WifiOff className="w-6 h-6 shrink-0 text-amber-400" />
            <div>
              <p className="font-bold text-sm">Walang Koneksyon sa Internet</p>
              <p className="text-xs text-amber-300/80">Nasa offline mode ka ngayon.</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {errorMsg && !isOffline && (
          <div className="p-4 bg-rose-950/90 border border-rose-600/50 rounded-xl flex items-center gap-3 text-rose-200">
            <AlertTriangle className="w-6 h-6 shrink-0 text-rose-400" />
            <div>
              <p className="font-bold text-sm">Nagkaroon ng Problema</p>
              <p className="text-xs text-rose-300/80">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* SKELETON LOADING (Premium Feel) */}
        {loading && (
          <div className="space-y-3">
            <div className="h-4 w-32 bg-slate-800 rounded animate-pulse"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 animate-pulse"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/2 bg-slate-800 rounded animate-pulse"></div>
                    <div className="h-3 w-1/3 bg-slate-800 rounded animate-pulse"></div>
                  </div>
                  <div className="h-6 w-20 bg-slate-800 rounded-full animate-pulse"></div>
                </div>
                <div className="h-3 w-1/3 bg-slate-800 rounded animate-pulse pt-2 border-t border-slate-800"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && trips.length === 0 && !errorMsg && (
          <div className="py-12 px-6 bg-slate-900 rounded-2xl border border-slate-800 text-center space-y-3">
            <Bus className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="font-bold text-slate-300">Walang biyahe sa ngayon</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">Mag-refresh mamaya kapag may paparating na sasakyan.</p>
          </div>
        )}

        {/* Vehicle Cards List */}
        {!loading && trips.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              PAPARATING NA SASAKYAN ({trips.length})
            </p>

            {trips.map((trip) => {
              const minsAgo = getMinutesAgo(trip.updatedAt);
              const isStale = minsAgo >= 30;

              return (
                <div
                  key={trip.tripId}
                  className={`p-5 rounded-2xl border transition-all ${
                    isStale
                      ? "bg-slate-900/40 border-slate-800 opacity-40 grayscale"
                      : "bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-950/60 rounded-xl border border-emerald-800/40 text-emerald-400">
                        <Bus className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-base text-slate-100">PUJ / PUV #{trip.tripId.slice(-4).toUpperCase()}</h2>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {trip.location.lat.toFixed(4)}, {trip.location.lng.toFixed(4)}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge with Seat Count */}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      trip.status === "Available" ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60"
                      : trip.status === "Standing" ? "bg-amber-950/80 text-amber-300 border-amber-700/60"
                      : "bg-rose-950/80 text-rose-300 border-rose-700/60"
                    }`}>
                      {trip.status === "Available" 
                        ? `${trip.seatsAvailable ?? '?'} upuan` 
                        : trip.status === "Standing" ? "Tayo Lang" : "Puno Na"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {minsAgo === 0 ? "Bago lang na-update" : `${minsAgo} min ang nakalipas`}
                    </span>

                    {isStale && (
                      <span className="text-[10px] text-rose-400 font-semibold bg-rose-950/50 px-2 py-0.5 rounded border border-rose-900">
                        Huli na ang update (&gt;30m)
                                        </span>
              </div>
            </div>
          );
        })}
      </main>

      <footer className="text-center text-xs text-slate-500 my-8">
        Biyahe Live © 2026 · Developed by Ray Mar P Olandria
      </footer>
    </div>
  );
}