"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { database } from "@/lib/firebase";
import { ref, onValue, set, remove } from "firebase/database";
import { 
  Navigation, Users, Settings, ShieldCheck, 
  WifiOff, Siren, ArrowLeft, Play, Square, MapPin, QrCode
} from "lucide-react";
import { useUserId } from "@/lib/useUserId";
import { useToast } from "@/components/Toast";
import { getDistance } from "@/lib/geo";

export default function DriverDashboard() {
  const userId = useUserId();
  const { toast } = useToast();

  // STATES
  const [isTripActive, setIsTripActive] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // 🚨 Bago: Para hindi mag-flash ang UI
  const [vehicleType, setVehicleType] = useState<"Van" | "Bus" | "MiniBus" | "Taxi" | "Tricycle" | "Motor">("Van");
  const [isAircon, setIsAircon] = useState(true);
  const [seats, setSeats] = useState(14);
  const [earnings, setEarnings] = useState(0);
  const [fare, setFare] = useState(15);
  const [dailyEarnings, setDailyEarnings] = useState(0);
  const [dailyPassengers, setDailyPassengers] = useState(0);
  
  // ALERTS STATE
  const [waitingCount, setWaitingCount] = useState(0);
  const [waitingByShed, setWaitingByShed] = useState<Record<string, number>>({});
  const [showStopAlert, setShowStopAlert] = useState(false);
  const [showSosAlert, setShowSosAlert] = useState(false);
  const [showHarassmentAlert, setShowHarassmentAlert] = useState(false);
  
  // GPS Ref
  const watchIdRef = useRef<number | null>(null);
  const prevWaitingCountRef = useRef(0);
  const driverLocRef = useRef<{lat: number, lng: number} | null>(null);

  // Dynamic Seats logic
  const maxSeatsMap = { Van: 14, Bus: 49, MiniBus: 30, Taxi: 4, Tricycle: 6, Motor: 1 };

  // 🚨 1. LOCAL STORAGE PERSISTENCE (Para hindi mawala ang Trip)
  useEffect(() => {
    const savedTrip = localStorage.getItem("biyahe_trip_active");
    if (savedTrip === "true") {
      setIsTripActive(true);
    }
    const savedDailyEarnings = parseFloat(localStorage.getItem("biyahe_daily_earnings") || "0");
    const savedDailyPassengers = parseInt(localStorage.getItem("biyahe_daily_passengers") || "0");
    setDailyEarnings(savedDailyEarnings);
    setDailyPassengers(savedDailyPassengers);
    setIsMounted(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("biyahe_current_fare", fare.toString());
  }, [fare]);

  // 2. GLOBAL GPS TRACKER PARA SA ALERTS
  useEffect(() => {
    if (navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          driverLocRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        },
        (err) => console.log("GPS Error (Alerts will still work):", err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(id);
    }
  }, []);

  // 3. WAITING PINGS (May Audio at Distance Filter)
  useEffect(() => {
    const waitingRef = ref(database, "waiting_commuters");
    const unsub = onValue(waitingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const counts: Record<string, number> = {};
        let total = 0;

        Object.values(data).forEach((val: any) => {
          if (!val.expiresAt || Date.now() < val.expiresAt) {
            if (!driverLocRef.current) {
              counts[val.shed] = (counts[val.shed] || 0) + 1;
              total++;
            } else {
              const dist = getDistance(driverLocRef.current.lat, driverLocRef.current.lng, val.lat || 6.7497, val.lng || 125.3572);
              if (dist <= 15) { // 15km radius
                counts[val.shed] = (counts[val.shed] || 0) + 1;
                total++;
              }
            }
          }
        });

        if (total > prevWaitingCountRef.current) {
          try { new Audio('/notification.mp3').play().catch(()=>{}); } catch(e) {}
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          toast("May bagong commuter na naghihintay!", "info");
        }
        
        prevWaitingCountRef.current = total;
        setWaitingByShed(counts);
        setWaitingCount(total);
      } else {
        prevWaitingCountRef.current = 0;
        setWaitingByShed({});
        setWaitingCount(0);
      }
    });
    return () => unsub();
  }, [toast]);

  // 4. STOP REQUEST (Bababa Ako)
  useEffect(() => {
    const stopRef = ref(database, "stop_request");
    const unsub = onValue(stopRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const hasRecentRequest = Object.values(data).some((req: any) => {
          if (Date.now() - req.timestamp > 60000) return false;
          if (!driverLocRef.current) return true;
          const dist = getDistance(driverLocRef.current.lat, driverLocRef.current.lng, req.lat || 6.7497, req.lng || 125.3572);
          return dist <= 15;
        });

        if (hasRecentRequest) {
          try { new Audio('/notification.mp3').play().catch(()=>{}); } catch(e) {}
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          setShowStopAlert(true);
          setTimeout(() => setShowStopAlert(false), 5000);
        }
      }
    });
    return () => unsub();
  }, []);

  // 5. SOS & HARASSMENT ALERT
  useEffect(() => {
    const sosRef = ref(database, "sos_alert");
    const unsub = onValue(sosRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();

        const hasRecentHarassment = Object.values(data).some((req: any) =>
          req.type === "harassment" && Date.now() - req.timestamp < 60000
        );

        const hasRecentSos = Object.values(data).some((req: any) => 
          req.type !== "harassment" && Date.now() - req.timestamp < 60000
        );

        if (hasRecentHarassment) {
          setShowHarassmentAlert(true);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          setTimeout(() => setShowHarassmentAlert(false), 10000);
        }

        if (hasRecentSos) {
          setShowSosAlert(true);
          if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
          try { new Audio('/siren.mp3').play().catch(()=>{}); } catch(e) {}
        }
      }
    });
    return () => unsub();
  }, []);

  // 6. LIVE GPS TRACKING (Kapag naka-Start Trip)
  useEffect(() => {
    if (isTripActive && userId) {
      if (navigator.geolocation) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const tripData = {
              tripId: userId,
              vehicleType,
              isAircon,
              seatsAvailable: seats,
              fare,
              status: seats > 0 ? "Available" : "Full",
              location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
              speed: (pos.coords.speed || 0) * 3.6,
              updatedAt: Date.now(),
              isOutOfService: false
            };
            set(ref(database, `live_trips/${userId}`), tripData);
          },
          (err) => console.error("GPS Error:", err),
          { enableHighAccuracy: true }
        );
      }
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (userId) remove(ref(database, `live_trips/${userId}`));
    }

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [isTripActive, userId, vehicleType, isAircon, seats, fare]);

  const handleStartTrip = () => {
    setIsTripActive(true);
    localStorage.setItem("biyahe_trip_active", "true"); // 🚨 I-save sa phone
    toast("Biyahe Started! Ingat sa byahe.", "success");
    try { new Audio('/notification.mp3').play().catch(()=>{}); } catch(e) {}
  };

  const handleEndTrip = () => {
    setIsTripActive(false);
    localStorage.setItem("biyahe_trip_active", "false"); // 🚨 I-save sa phone
    toast("Biyahe Ended. Salamat!", "info");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col items-center relative">
      
      {showHarassmentAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] w-11/12 max-w-sm bg-rose-600 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-white shrink-0" />
            <div>
              <p className="font-black text-sm uppercase tracking-wider text-white">HARASSMENT ALERT</p>
              <p className="text-xs font-bold text-rose-100">Emergency inside vehicle!</p>
            </div>
          </div>
          <button onClick={() => setShowHarassmentAlert(false)} className="px-3 py-1 bg-black/20 rounded-lg hover:bg-black/40 text-xs font-bold">OK</button>
        </div>
      )}

      {showSosAlert && (
        <div className="fixed inset-0 z-[999] bg-rose-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in">
          <Siren className="w-24 h-24 text-rose-500 animate-pulse mb-4" />
          <h1 className="text-3xl font-black text-white mb-2">EMERGENCY SOS!</h1>
          <p className="text-rose-200 mb-6 font-bold">May commuter na nangangailangan ng tulong sa area mo!</p>
          <button onClick={() => setShowSosAlert(false)} className="px-8 py-3 bg-white text-rose-900 font-black rounded-full">I-ACKNOWLEDGE</button>
        </div>
      )}

      {showStopAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] w-11/12 max-w-sm bg-amber-600 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="font-black text-base">May Pasaherong Bababa!</p>
              <p className="text-xs text-amber-100">Paki-check ang gilid.</p>
            </div>
          </div>
          <button onClick={() => setShowStopAlert(false)} className="px-3 py-1 bg-black/20 rounded-lg hover:bg-black/40 text-sm font-bold">OK</button>
        </div>
      )}

      <header className="w-full max-w-md flex items-center justify-between mt-4 mb-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </Link>
          <Navigation className="w-6 h-6 text-emerald-400 ml-2" />
          <h1 className="text-lg font-black tracking-widest">BIYAHE LIVE</h1>
        </div>
        
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
          waitingCount > 0 ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-slate-900 border-slate-700 opacity-60'
        }`}>
          <span className="relative flex h-3 w-3">
            {waitingCount > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${
              waitingCount > 5 ? 'bg-rose-500' : waitingCount > 0 ? 'bg-emerald-500' : 'bg-slate-500'
            }`}></span>
          </span>
          <span className={`text-[10px] font-bold ${
            waitingCount > 0 ? 'text-emerald-400' : 'text-slate-500'
          }`}>
            {waitingCount > 0 ? `${waitingCount} Naghihintay` : 'Wala'}
          </span>
        </div>
      </header>

      <main className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
        
        {Object.keys(waitingByShed).length > 0 && (
          <div className="bg-emerald-950/30 border border-emerald-800/50 p-3 rounded-2xl mb-2 animate-in fade-in">
            <p className="text-[10px] text-emerald-400 font-bold mb-2 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3" /> May Naghihintay Sa:
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(waitingByShed).map(([shedName, count]) => (
                <div key={shedName} className="flex items-center gap-1.5 bg-emerald-900/50 px-2.5 py-1 rounded-lg border border-emerald-700/50">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  <span className="text-xs font-bold text-white">{shedName}:</span>
                  <span className="text-xs font-black text-emerald-300">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {["Van", "Bus", "MiniBus", "Taxi", "Tricycle", "Motor"].map((v) => (
            <button 
              key={v} 
              onClick={() => {
                setVehicleType(v as any);
                setSeats(maxSeatsMap[v as keyof typeof maxSeatsMap]);
              }}
              className={`py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${vehicleType === v ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
            <p className="text-[10px] text-slate-500 font-bold tracking-wider">KITA</p>
            <p className="text-2xl font-black text-white">₱{earnings}</p>
          </div>
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center relative">
            <p className="text-[10px] text-slate-500 font-bold tracking-wider">PAMASAHE</p>
            <p className="text-2xl font-black text-amber-400">₱ <input type="number" value={fare} onChange={(e) => setFare(Number(e.target.value))} className="bg-transparent w-12 outline-none text-amber-400" /></p>
            <button onClick={() => setIsAircon(!isAircon)} className={`absolute top-2 right-2 p-1 rounded text-[10px] font-bold ${isAircon ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
              ❄️
            </button>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-300">
              Today's Summary: <span className="text-emerald-400 font-black">₱{dailyEarnings}</span> <span className="text-slate-600">|</span> <span className="text-amber-400 font-black">{dailyPassengers}</span> Passengers
            </p>
          </div>
          <button
            onClick={() => {
              setDailyEarnings(0);
              setDailyPassengers(0);
              localStorage.removeItem("biyahe_daily_earnings");
              localStorage.removeItem("biyahe_daily_passengers");
              toast("Summary reset!", "info");
            }}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition"
          >
            Reset
          </button>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <button onClick={() => setSeats(Math.max(0, seats - 1))} className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-2xl font-black text-slate-300 hover:bg-slate-700">-</button>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 font-bold">AVAILABLE SEATS</p>
            <p className={`text-4xl font-black ${seats === 0 ? 'text-rose-500' : seats <= 3 ? 'text-amber-500' : 'text-emerald-400'}`}>{seats}</p>
          </div>
          <button onClick={() => setSeats(seats + 1)} className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-2xl font-black text-slate-300 hover:bg-slate-700">+</button>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <Link href="/driver/scan" className="flex items-center justify-center gap-2 py-3 bg-blue-600/20 text-blue-400 border border-blue-600/50 rounded-xl font-bold hover:bg-blue-600/30 transition-all text-xs">
            <QrCode className="w-4 h-4" /> Scan Ticket
          </Link>
          <button className="flex items-center justify-center gap-2 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-all text-xs">
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>

        {/* 🚨 PINALITAN NATIN ITO PARA MAYA-OS ANG FLASHING */}
        {!isMounted ? (
          <div className="w-full py-5 bg-slate-800 rounded-2xl mt-4 animate-pulse"></div>
        ) : !isTripActive ? (
          <button onClick={handleStartTrip} className="w-full py-5 bg-emerald-500 text-slate-950 font-black text-lg rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 mt-4">
            <Play className="w-6 h-6" /> START TRIP
          </button>
        ) : (
          <button onClick={handleEndTrip} className="w-full py-5 bg-rose-600 text-white font-black text-lg rounded-2xl shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:bg-rose-500 transition-all flex items-center justify-center gap-2 mt-4">
            <Square className="w-6 h-6" /> END TRIP
          </button>
        )}

      </main>
    </div>
  );
}