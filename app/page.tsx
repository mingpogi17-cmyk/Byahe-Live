"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { database, ensureAuth } from "@/lib/firebase";
import { ref, set, remove, update } from "firebase/database";
import { 
  Navigation, Play, Square, CheckCircle2, QrCode, Minus, Plus, 
  ShieldAlert, Timer, Wallet, Power, AlertOctagon, Map 
} from "lucide-react";

export default function DriverPage() {
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState<"Available" | "Standing" | "Full">("Available");
  const [tripId, setTripId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [seatsTotal] = useState(14);
  const [seatsAvailable, setSeatsAvailable] = useState(14);

  // NEW FEATURES STATE
  const [fare, setFare] = useState(15);
  const [earnings, setEarnings] = useState(0);
  const [isOutOfService, setIsOutOfService] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);

  const [reservedSeats, setReservedSeats] = useState(2);
  const [isReservedActive, setIsReservedActive] = useState(false);
  const [reservedTimer, setReservedTimer] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const storedTripId = localStorage.getItem("biyahe_trip_id");
    if (storedTripId) setTripId(storedTripId);
    else {
      const newTripId = "trip_" + Math.random().toString(36).substring(2, 9);
      localStorage.setItem("biyahe_trip_id", newTripId);
      setTripId(newTripId);
    }

    const savedLive = localStorage.getItem("biyahe_is_live");
    const savedSeats = localStorage.getItem("biyahe_seats");
    if (savedLive === "true") setIsLive(true);
    if (savedSeats) setSeatsAvailable(parseInt(savedSeats));
  }, []);

  useEffect(() => {
    localStorage.setItem("biyahe_is_live", isLive.toString());
    localStorage.setItem("biyahe_seats", seatsAvailable.toString());
  }, [isLive, seatsAvailable]);

  const triggerVibration = (type: "available" | "standing" | "full") => {
    if (navigator.vibrate) {
      if (type === "available") navigator.vibrate(50);
      else if (type === "standing") navigator.vibrate([50, 50, 50]);
      else if (type === "full") navigator.vibrate([100, 50, 100, 50, 100]);
    }
  };

  const pushLocationToFirebase = async (position: GeolocationPosition, currentStatus: string, currentSeats: number, currentReserved: number) => {
    if (!tripId) return;
    try {
      await ensureAuth();
      const currentCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
      const tripRef = ref(database, `live_trips/${tripId}`);
      await set(tripRef, {
        tripId, 
        status: isOutOfService ? "Full" : currentStatus, // Kung out of service, itago sa listahan
        location: currentCoords, 
        seatsAvailable: currentSeats, 
        reservedSeats: currentReserved,
        fare,
        isOutOfService,
        isEmergency,
        updatedAt: Date.now(),
      });
      setErrorMessage(null);
    } catch (err) { setErrorMessage("Maling koneksyon sa internet."); }
  };

  const handleStartTrip = async () => {
    if (!navigator.geolocation) return setErrorMessage("Walang Geolocation.");
    setIsLive(true); setErrorMessage(null); setEarnings(0); // Reset earnings sa simula
    try { await ensureAuth(); } catch (err) { return setErrorMessage("Hindi maka-login."); }

    navigator.geolocation.getCurrentPosition(
      (pos) => pushLocationToFirebase(pos, status, seatsAvailable, isReservedActive ? reservedSeats : 0),
      () => setErrorMessage("Paki-allow ang Location.")
    );

    let latestPos: GeolocationPosition | null = null;
    watchIdRef.current = navigator.geolocation.watchPosition((pos) => {
      latestPos = pos;
      pushLocationToFirebase(pos, status, seatsAvailable, isReservedActive ? reservedSeats : 0);
    });

    intervalIdRef.current = setInterval(() => {
      if (latestPos) pushLocationToFirebase(latestPos, status, seatsAvailable, isReservedActive ? reservedSeats : 0);
    }, 10000);
  };

  const handleEndTrip = async () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (intervalIdRef.current !== null) clearInterval(intervalIdRef.current);
    if (timerRef.current !== null) clearInterval(timerRef.current);
    if (tripId) {
      try { await ensureAuth(); await remove(ref(database, `live_trips/${tripId}`)); } catch (err) { console.error(err); }
    }
    setIsLive(false);
    setIsReservedActive(false);
    setIsOutOfService(false);
    setIsEmergency(false);
    localStorage.removeItem("biyahe_is_live");
    localStorage.removeItem("biyahe_seats");
  };

  const updateSeats = async (delta: number) => {
    const newSeats = Math.max(0, Math.min(seatsTotal, seatsAvailable + delta));
    setSeatsAvailable(newSeats);
    
    // KUNG MAY SUMAKAY (-1), DAGDAG SA EARNINGS
    if (delta === -1) {
      setEarnings(prev => prev + fare);
    }

    let newStatus: "Available" | "Standing" | "Full" = "Available";
    if (newSeats === 0) newStatus = "Full";
    else if (newSeats <= 3) newStatus = "Standing";
    setStatus(newStatus);

    triggerVibration(newStatus.toLowerCase() as any);

    if (isLive && tripId) {
      try { await ensureAuth(); await update(ref(database, `live_trips/${tripId}`), { seatsAvailable: newSeats, status: newStatus }); } catch (err) { console.error(err); }
    }
  };

  const toggleReservedSeats = () => {
    if (isReservedActive) {
      setIsReservedActive(false);
      if (timerRef.current !== null) clearInterval(timerRef.current);
      setReservedTimer(0);
    } else {
      setIsReservedActive(true);
      setReservedTimer(180);
      timerRef.current = setInterval(() => {
        setReservedTimer(prev => {
          if (prev <= 1) {
            if (timerRef.current !== null) clearInterval(timerRef.current);
            setIsReservedActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const toggleEmergency = async () => {
    const newState = !isEmergency;
    setIsEmergency(newState);
    if (newState) {
      // Send alert to commuters
      try {
        await set(ref(database, "community_alert"), { id: "alert_" + Date.now(), type: "Emergency", timestamp: Date.now() });
      } catch (err) {}
    } else {
      try {
        await remove(ref(database, "community_alert"));
      } catch (err) {}
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`min-h-screen bg-slate-900 text-white p-4 md:p-8 flex flex-col items-center justify-between relative ${isEmergency ? 'bg-rose-950' : ''}`}>
      
      {/* Waze & Scanner Floating Buttons */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <a href="https://waze.com/ul" target="_blank" rel="noopener noreferrer" className="p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl transition-all flex items-center justify-center">
          <Map className="w-6 h-6" />
        </a>
        {isLive && (
          <Link href="/driver/scan" className="p-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full shadow-2xl transition-all flex items-center gap-2">
            <QrCode className="w-6 h-6" /><span className="font-bold pr-2">Scan</span>
          </Link>
        )}
      </div>

      <div className="w-full max-w-md text-center my-4">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Navigation className="w-8 h-8 text-emerald-400" /> BIYAHE LIVE - DRIVER
        </h1>
      </div>

      <div className="w-full max-w-md bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 space-y-4">
        
        {/* TRIP STATUS & OUT OF SERVICE */}
        <div className={`p-4 rounded-xl flex items-center justify-between ${isLive ? (isOutOfService ? 'bg-slate-700 border-slate-500' : 'bg-emerald-950/80 border-emerald-500/50') : 'bg-slate-700/50'}`}>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">TRIP STATUS</p>
            <p className="font-bold text-lg">{isLive ? (isOutOfService ? "OUT OF SERVICE" : "LIVE BROADCASTING") : "OFFLINE"}</p>
          </div>
          {isLive && !isOutOfService && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
        </div>

        {errorMessage && <div className="p-3 bg-rose-950 text-rose-200 rounded-lg text-sm">{errorMessage}</div>}

        {/* EARNINGS & FARE SETTINGS */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-400 mb-1" />
            <p className="text-[10px] text-slate-400">KITA NGAYON</p>
            <p className="text-xl font-black text-white">₱{earnings}</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center">
            <p className="text-[10px] text-slate-400 mb-1">PAMASAHE (BAWAT SAKAY)</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setFare(Math.max(5, fare - 5))} className="text-slate-400 hover:text-white">-</button>
              <p className="text-xl font-black text-amber-400">₱{fare}</p>
              <button onClick={() => setFare(fare + 5)} className="text-slate-400 hover:text-white">+</button>
            </div>
          </div>
        </div>
        
        {/* SEAT COUNTER */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 text-center mb-3">AVAILABLE SEATS</p>
          <div className="flex items-center justify-between">
            <button onClick={() => updateSeats(-1)} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl active:scale-95"><Minus className="w-6 h-6" /></button>
            <span className={`text-4xl font-black ${seatsAvailable === 0 ? 'text-rose-500' : seatsAvailable <= 3 ? 'text-amber-400' : 'text-emerald-400'}`}>{seatsAvailable}</span>
            <button onClick={() => updateSeats(1)} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl active:scale-95"><Plus className="w-6 h-6" /></button>
          </div>
        </div>

        {/* RESERVED SEATS */}
        <div className={`p-4 rounded-xl border transition-all ${isReservedActive ? 'bg-amber-950/50 border-amber-500/50' : 'bg-slate-900 border-slate-700'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className={`w-5 h-5 ${isReservedActive ? 'text-amber-400' : 'text-slate-500'}`} />
              <div>
                <p className="text-sm font-bold">Reserved Seats</p>
                <p className="text-[10px] text-slate-500">Para sa mga walang cellphone</p>
              </div>
            </div>
            <button onClick={toggleReservedSeats} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isReservedActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              {isReservedActive ? "ON" : "OFF"}
            </button>
          </div>
          {isReservedActive && (
            <div className="mt-3 pt-3 border-t border-amber-800/30 flex items-center justify-between">
              <span className="text-xs text-amber-300 flex items-center gap-1"><Timer className="w-3 h-3" /> Timer:</span>
              <span className="font-mono text-lg font-bold text-amber-400">{formatTime(reservedTimer)}</span>
            </div>
          )}
        </div>

        {/* UTILITY BUTTONS */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setIsOutOfService(!isOutOfService)} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${isOutOfService ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
            <Power className="w-5 h-5" />
            <span className="text-xs font-bold">OUT OF SERVICE</span>
          </button>
          <button onClick={toggleEmergency} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${isEmergency ? 'bg-rose-600 border-rose-400 text-white animate-pulse' : 'bg-slate-900 border-slate-700 text-rose-400'}`}>
            <AlertOctagon className="w-5 h-5" />
            <span className="text-xs font-bold">EMERGENCY</span>
          </button>
        </div>

        {/* START / END TRIP */}
        {!isLive ? (
          <button onClick={handleStartTrip} className="w-full py-5 bg-emerald-500 text-slate-950 font-black text-xl rounded-2xl mt-2">START TRIP</button>
        ) : (
          <button onClick={handleEndTrip} className="w-full py-5 bg-rose-600 text-white font-black text-xl rounded-2xl mt-2">END TRIP</button>
        )}
      </div>
    </div>
  );
}