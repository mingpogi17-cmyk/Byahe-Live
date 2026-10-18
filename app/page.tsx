"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Search, Wifi, WifiOff } from "lucide-react";
import { onValue, ref, remove, update, increment } from "firebase/database";
import { db } from "@/lib/firebase";
import RouteChips from "@/components/RouteChips";
import LiveTripCard from "@/components/LiveTripCard";
import EmptyState from "@/components/EmptyState";
import ConnectionBanner from "@/components/ConnectionBanner";
import { useConnectionStatus } from "@/components/useConnectionStatus";
import { LiveTrip } from "@/components/types";
import { ACTIVE_DESTINATIONS as DESTINATIONS } from "@/components/routes";

interface RawTrip {
  origin: string;
  destination: string;
  vehicleType: "Van" | "Bus";
  seatsLeft: number;
  seatsTotal: number;
  fare: number;
  currentShed: string;
  isEnRoute: boolean;
  updatedAt: number;
  etaMinutes?: number;
  verifiedByPassengers?: number;
  confirmations?: Record<string, boolean>;
}

const STALE_TRIP_MS = 20 * 60 * 1000; // 20 minutes
const DEVICE_ID_KEY = "biyahe-live-device-id";

function getOrCreateDeviceId(): string {
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const fresh =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `device-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  window.localStorage.setItem(DEVICE_ID_KEY, fresh);
  return fresh;
}

export default function PassengerHome() {
  const isOnline = useConnectionStatus();
  const [activeDestination, setActiveDestination] = useState("All");
  const [query, setQuery] = useState("");
  const [rawTrips, setRawTrips] = useState<Record<string, RawTrip>>({});
  const [now, setNow] = useState(() => Date.now());
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    setDeviceId(getOrCreateDeviceId());
  }, []);

  useEffect(() => {
    const tripsRef = ref(db, "liveTrips");
    const unsubscribe = onValue(tripsRef, (snapshot) => {
      const data: Record<string, RawTrip> = snapshot.val() ?? {};
      const nowMs = Date.now();
      const fresh: Record<string, RawTrip> = {};
      Object.entries(data).forEach(([id, t]) => {
        if (t.updatedAt && nowMs - t.updatedAt > STALE_TRIP_MS) {
          remove(ref(db, `liveTrips/${id}`));
        } else {
          fresh[id] = t;
        }
      });
      setRawTrips(fresh);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const trips: LiveTrip[] = useMemo(() => {
    return Object.entries(rawTrips).map(([id, t]) => ({
      id,
      origin: t.origin,
      destination: t.destination,
      vehicleType: t.vehicleType,
      plateOrUnit: "",
      currentShed: t.currentShed,
      seatsLeft: t.seatsLeft,
      seatsTotal: t.seatsTotal,
      minutesToDeparture: 0,
      etaMinutes: t.etaMinutes,
      fare: t.fare,
      reportedSecondsAgo: t.updatedAt
        ? Math.max(0, Math.floor((now - t.updatedAt) / 1000))
        : 0,
      verifiedByPassengers: t.verifiedByPassengers ?? 0,
      isEnRoute: t.isEnRoute,
    }));
  }, [rawTrips, now]);

  const visibleTrips = useMemo(() => {
    return trips.filter((trip) => {
      const matchesDestination =
        activeDestination === "All" ||
        trip.destination.includes(activeDestination) ||
        trip.origin.includes(activeDestination);
      const q = query.trim().toLowerCase();
      const matchesQuery =
        q.length === 0 ||
        trip.origin.toLowerCase().includes(q) ||
        trip.destination.toLowerCase().includes(q) ||
        trip.currentShed.toLowerCase().includes(q);
      return matchesDestination && matchesQuery;
    });
  }, [trips, activeDestination, query]);

  async function handleConfirm(tripId: string) {
    if (!deviceId) return;
    const trip = rawTrips[tripId];
    if (!trip) return;
    if (trip.confirmations?.[deviceId]) return; // na-confirm na niya dati

    await update(ref(db, `liveTrips/${tripId}`), {
      [`confirmations/${deviceId}`]: true,
      verifiedByPassengers: increment(1),
    });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-paper">
      <header className="sticky top-0 z-10 bg-paper/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-ink">
              Biyahe Live
            </h1>
            <p className="flex items-center gap-1 text-xs text-ink/50">
              <MapPin className="h-3 w-3" />
              Near Davao City
            </p>
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
              isOnline
                ? "border-route/25 text-route"
                : "border-alert/30 text-alert"
            }`}
            role="status"
          >
            {isOnline ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            {isOnline ? "Connected" : "Offline"}
          </div>
        </div>

        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-ink/40" />
            <input
              type="text"
              inputMode="search"
              placeholder="Search terminal, shed, or destination"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none"
            />
          </div>
        </div>

        <RouteChips
          destinations={DESTINATIONS}
          active={activeDestination}
          onSelect={setActiveDestination}
        />
      </header>

      {!isOnline && <ConnectionBanner />}

      <main className="flex-1 pb-8">
        {visibleTrips.length > 0 ? (
          <ul className="flex flex-col gap-2 px-4 pt-1">
            {visibleTrips.map((trip) => (
              <LiveTripCard
                key={trip.id}
                trip={trip}
                isConfirmedByMe={
                  !!deviceId && !!rawTrips[trip.id]?.confirmations?.[deviceId]
                }
                onConfirm={handleConfirm}
              />
            ))}
          </ul>
        ) : (
          <EmptyState destination={activeDestination} />
        )}
      </main>
    </div>
  );
}