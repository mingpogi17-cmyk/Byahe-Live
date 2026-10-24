"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { database, ensureAuth } from "@/lib/firebase";
import { ref, set, remove, update, onValue } from "firebase/database";
import { 
  Navigation, Play, Square, CheckCircle2, QrCode, Minus, Plus, 
  ShieldAlert, Timer, Wallet, Power, AlertOctagon, Map, Siren, X, Check, Upload, Bell, Car, Bus, UserMinus, Settings, Users
} from "lucide-react";

export default function DriverPage() {
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState<"Available" | "Standing" | "Full">("Available");
  const [tripId, setTripId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [vehicleType, setVehicleType] = useState<"Van" | "Bus" | "Taxi" | "Tricycle" | "Motor">("Van");
  const [plateNumber, setPlateNumber] = useState("");
  const [isAircon, setIsAircon] = useState(true);
  const [seatsTotal, setSeatsTotal] = useState(14); 
  const [seatsAvailable, setSeatsAvailable] = useState(14);
  const [reservedSeatsLeft, setReservedSeatsLeft] = useState(2);

  const [fare, setFare] = useState(15);
  const [earnings, setEarnings] = useState(0);
  const [isOutOfService, setIsOutOfService] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [isTerminalMode, setIsTerminalMode] = useState(false);
  const [isGcashEnabled, setIsGcashEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [sosAlert, setSosAlert] = useState<any>(null);
  const [isSosAcknowledged, setIsSosAcknowledged] = useState(false);
  const [paymentNotif, setPaymentNotif] = useState<any>(null);
  const [waitingAlert, setWaitingAlert] = useState<any>(null);
  const [stopAlert, setStopAlert] = useState<any>(null);

  const [reservedSeats, setReservedSeats] = useState(2);
  const [isReservedActive, setIsReservedActive] = useState(false);
  const [reservedTimer, setReservedTimer] = useState(0);

  const [gcashQr, setGcashQr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<any>(null);

  // 🚨 AUDIO UNLOCK FUNCTION
  const unlockAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSiren = () => { /* ... same ... */ };
  const playDing = () => { /* ... same ... */ };
  const startAlarm = () => { /* ... same ... */ };
  const stopAlarm = () => { /* ... same ... */ };

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
    const savedGcash = localStorage.getItem("biyahe_gcash_qr");
    const savedGcashToggle = localStorage.getItem("biyahe_gcash_enabled");
    const savedVehicle = localStorage.getItem("biyahe_vehicle") as any;
    const savedPlate = localStorage.getItem("biyahe_plate");
    const savedAircon = localStorage.getItem("biyahe_aircon");
    const savedSeatsTotal = localStorage.getItem("biyahe_seats_total");

    if (savedLive === "true") setIsLive(true);
    if (savedSeats) setSeatsAvailable(parseInt(savedSeats));
    if (savedGcash) setGcashQr(savedGcash);
    if (savedGcashToggle === "true") setIsGcashEnabled(true);
    if (savedVehicle) setVehicleType(savedVehicle);
    if (savedPlate) setPlateNumber(savedPlate);
    if (savedAircon) setIsAircon(savedAircon === "true");
    if (savedSeatsTotal) setSeatsTotal(parseInt(savedSeatsTotal));

    const unsubSOS = onValue(ref(database, "sos_alert"), (snap) => {
      if (snap.exists()) { setSosAlert(snap.val()); setIsSosAcknowledged(false); startAlarm(); }
      else { setSosAlert(null); stopAlarm(); }
    });

    const unsubPayment = onValue(ref(database, "payment_requests"), (snap) => {
      if (snap.exists()) { setPaymentNotif(snap.val()); playDing(); }
      else setPaymentNotif(null);
    });

    const unsubWaiting = onValue(ref(database, "waiting_commuters"), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        if (data.expiresAt && Date.now() > data.expiresAt) { remove(ref(database, "waiting_commuters")); setWaitingAlert(null); }
        else { setWaitingAlert(data); playDing(); }
      } else setWaitingAlert(null);
    });

    const unsubStop = onValue(ref(database, "stop_request"), (snap) => {
      if (snap.exists()) { setStopAlert(snap.val()); playDing(); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); }
      else setStopAlert(null);
    });

    return () => { unsubSOS(); unsubPayment(); unsubWaiting(); unsubStop(); stopAlarm(); };
  }, []);

  useEffect(() => {
    localStorage.setItem("biyahe_is_live", isLive.toString());
    localStorage.setItem("biyahe_seats", seatsAvailable.toString());
    localStorage.setItem("biyahe_gcash_enabled", isGcashEnabled.toString());
    localStorage.setItem("biyahe_vehicle", vehicleType);
    localStorage.setItem("biyahe_plate", plateNumber);
    localStorage.setItem("biyahe_aircon", isAircon.toString());
    localStorage.setItem("biyahe_seats_total", seatsTotal.toString());
  }, [isLive, seatsAvailable, isGcashEnabled, vehicleType, plateNumber, isAircon, seatsTotal]);

  const handleVehicleTypeChange = (type: "Van" | "Bus" | "Taxi" | "Tricycle" | "Motor") => {
    setVehicleType(type);
    let capacity = 14;
    if (type === "Bus") capacity = 60;
    else if (type === "Taxi") capacity = 4;
    else if (type === "Tricycle") capacity = 6;
    else if (type === "Motor") capacity = 1;
    setSeatsTotal(capacity);
    setSeatsAvailable(capacity);
  };

  const handleGcashUpload = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... same ... */ };
  const removeGcashQr = () => { /* ... same ... */ };

  const pushLocationToFirebase = async (position: GeolocationPosition, currentStatus: string, currentSeats: number, currentReserved: number) => {
    if (!tripId) return;
    try {
      await ensureAuth();
      const currentCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
      const speedKmh = position.coords.speed ? Math.round(position.coords.speed * 3.6) : 0;
      
      const tripRef = ref(database, `live_trips/${tripId}`);
      await set(tripRef, {
        tripId, status: isOutOfService ? "Full" : currentStatus,
        location: currentCoords, seatsAvailable: currentSeats, 
        reservedSeats: currentReserved, fare, isOutOfService, isEmergency,
        isGcashEnabled, vehicleType, isAircon, plateNumber,
        isTerminalMode, speed: speedKmh, updatedAt: Date.now(),
      });
      setErrorMessage(null);
    } catch (err) { setErrorMessage("Maling koneksyon sa internet."); }
  };

  const handleStartTrip = async () => {
    if (!navigator.geolocation) return setErrorMessage("Walang Geolocation.");
    setIsLive(true); setErrorMessage(null); setEarnings(0);
    unlockAudio();
    try { await ensureAuth(); } catch (err) { return setErrorMessage("Hindi maka-login."); }

    navigator.geolocation.getCurrentPosition(
      (pos) => pushLocationToFirebase(pos, status, seatsAvailable, reservedSeatsLeft),
      () => setErrorMessage("Paki-allow ang Location.")
    );

    let latestPos: GeolocationPosition | null = null;
    watchIdRef.current = navigator.geolocation.watchPosition((pos) => {
      latestPos = pos;
      pushLocationToFirebase(pos, status, seatsAvailable, reservedSeatsLeft);
    });

    intervalIdRef.current = setInterval(() => {
      if (latestPos) pushLocationToFirebase(latestPos, status, seatsAvailable, reservedSeatsLeft);
    }, 10000);
  };

  const handleEndTrip = async () => { /* ... same ... */ };

  const updateSeats = async (delta: number) => { /* ... same ... */ };

  const handleAddWalkIn = async () => {
    if (reservedSeatsLeft <= 0) {
      alert("Wala nang reserved seats para sa walk-in. Kailangan nilang pumila.");
      return;
    }
    
    setReservedSeatsLeft(prev => prev - 1);
    const newSeats = Math.max(0, seatsAvailable - 1);
    setSeatsAvailable(newSeats);
    
    if (isLive && tripId) {
      try {
        await ensureAuth();
        await update(ref(database, `live_trips/${tripId}`), { 
          seatsAvailable: newSeats,
          reservedSeats: reservedSeatsLeft - 1,
          status: newSeats === 0 ? "Full" : newSeats <= 3 ? "Standing" : "Available"
        });
      } catch (err) { console.error(err); }
    }
    
    if (navigator.vibrate) navigator.vibrate(50);
    alert(`Walk-in passenger added. Reserved seats left: ${reservedSeatsLeft - 1}`);
  };

  const toggleReservedSeats = () => { /* ... same ... */ };
  const toggleEmergency = async () => { /* ... same ... */ };
  const handleAcknowledge = () => { setIsSosAcknowledged(true); stopAlarm(); };
  const dismissSOS = async () => { /* ... same ... */ };
  const handlePaymentConfirm = async () => { /* ... same ... */ };
  const dismissWaiting = async () => { /* ... same ... */ };
  const dismissStop = async () => { /* ... same ... */ };
  const formatTime = (seconds: number) => { /* ... same ... */ };

  return (
    <div 
      onClick={unlockAudio}
      className={`min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center relative p-4 ${isEmergency ? 'bg-rose-950' : ''}`}
    >
      
      {/* ALERTS STACK */}
      <div className="fixed top-0 left-0 w-full z-[100] flex flex-col gap-2 p-2 max-w-md mx-auto">
        {/* ... SOS, Payment, Waiting, Stop Alerts same ... */}
      </div>

      <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-3">
        <a href="https://waze.com/ul" target="_blank" rel="noopener noreferrer" className="p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl transition-all flex items-center justify-center"><Map className="w-6 h-6" /></a>
        {isLive && !isTerminalMode && (<Link href="/driver/scan" className="p-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full shadow-2xl transition-all flex items-center gap-2"><QrCode className="w-6 h-6" /><span className="font-bold pr-2">Scan</span></Link>)}
      </div>

      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2"><Navigation className="w-6 h-6 text-emerald-400" /> BIYAHE LIVE</h1>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 ${isLive ? (isOutOfService ? 'bg-slate-700 text-slate-300' : 'bg-emerald-500 text-slate-950') : 'bg-slate-800 text-slate-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isLive && !isOutOfService ? 'bg-slate-950 animate-ping' : 'bg-slate-500'}`}></span>
          {isLive ? (isOutOfService ? "OUT OF SERVICE" : "LIVE") : "OFFLINE"}
        </div>
      </div>

      <div className="w-full max-w-md bg-slate-800 rounded-2xl p-5 shadow-xl border border-slate-700 space-y-4">
        
        <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-700">
          <div className="flex items-center gap-2">
            {(["Van", "Bus", "Taxi", "Tricycle", "Motor"] as const).map(type => (
              <button key={type} onClick={() => handleVehicleTypeChange(type)} className={`px-2 py-1 rounded text-[10px] font-bold ${vehicleType === type ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{type}</button>
            ))}
          </div>
          <button onClick={() => setIsAircon(!isAircon)} className={`text-[10px] font-bold px-2 py-1 rounded ${isAircon ? 'bg-blue-950 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>{isAircon ? "❄️ Aircon" : "🌬️ Non"}</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 flex flex-col items-center justify-center">
            <p className="text-[10px] text-slate-400">KITA</p>
            <p className="text-lg font-black text-white">₱{earnings}</p>
          </div>
          
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 flex flex-col items-center justify-center">
            <p className="text-[10px] text-slate-400 mb-1">PAMASAHE</p>
            <div className="flex items-center gap-1">
              <span className="text-lg font-black text-amber-400">₱</span>
              <input type="number" value={fare} onChange={(e) => setFare(Number(e.target.value))} className="w-16 bg-transparent text-lg font-black text-amber-400 text-center focus:outline-none border-b border-amber-400/30" />
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
          <p className="text-[10px] text-slate-400 text-center mb-2">AVAILABLE SEATS ({seatsTotal} Total)</p>
          <div className="flex items-center justify-between">
            <button onClick={() => updateSeats(-1)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl active:scale-95"><Minus className="w-6 h-6" /></button>
            <span className={`text-4xl font-black ${seatsAvailable === 0 ? 'text-rose-500' : seatsAvailable <= 3 ? 'text-amber-400' : 'text-emerald-400'}`}>{seatsAvailable}</span>
            <button onClick={() => updateSeats(1)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl active:scale-95"><Plus className="w-6 h-6" /></button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={toggleReservedSeats} className={`p-2 rounded-xl border flex items-center justify-center gap-1 transition-all ${isReservedActive ? 'bg-amber-950/50 border-amber-500/50 text-amber-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
            <ShieldAlert className="w-4 h-4" /> <span className="text-xs font-bold">Reserved</span> {isReservedActive && <span className="text-[10px]">{formatTime(reservedTimer)}</span>}
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl border bg-slate-900 border-slate-700 text-slate-400 flex items-center justify-center gap-1">
            <Settings className="w-4 h-4" /> <span className="text-xs font-bold">Settings</span>
          </button>
        </div>

        <button 
          onClick={handleAddWalkIn} 
          disabled={reservedSeatsLeft <= 0}
          className={`w-full mt-2 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            reservedSeatsLeft > 0 
              ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg' 
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Users className="w-4 h-4" /> Add Walk-in (Reserved: {reservedSeatsLeft})
        </button>

        <div className="pt-2">
          {!isLive ? (
            <button onClick={handleStartTrip} className="w-full py-4 bg-emerald-500 text-slate-950 font-black text-lg rounded-2xl hover:bg-emerald-400 transition-all">START TRIP</button>
          ) : (
            <button onClick={handleEndTrip} className="w-full py-4 bg-rose-600 text-white font-black text-lg rounded-2xl hover:bg-rose-500 transition-all">END TRIP</button>
          )}
        </div>
      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-1 text-slate-400 hover:text-white transition"><X className="w-5 h-5" /></button>
            </div>
            
            <input type="text" placeholder="Plate Number (Optional)" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value.toUpperCase())} className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500" />

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setIsTerminalMode(!isTerminalMode)} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${isTerminalMode ? 'bg-blue-950/50 border-blue-500/50 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><Map className="w-5 h-5" /><span className="text-[10px] font-bold text-center">TERMINAL MODE</span></button>
              <button onClick={() => setIsOutOfService(!isOutOfService)} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${isOutOfService ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><Power className="w-5 h-5" /><span className="text-[10px] font-bold text-center">OUT OF SERVICE</span></button>
            </div>

            <div className="bg-slate-800 p-3 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white">GCash Payment</p>
                <button onClick={() => { if (!gcashQr) return alert("Mag-upload muna ng GCash QR."); setIsGcashEnabled(!isGcashEnabled); }} className={`px-3 py-1 rounded-lg text-xs font-bold ${isGcashEnabled ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{isGcashEnabled ? "ON" : "OFF"}</button>
              </div>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleGcashUpload} className="hidden" />
              {gcashQr ? (<div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg"><img src={gcashQr} alt="GCash QR" className="w-10 h-10 object-contain bg-white rounded" /><button onClick={removeGcashQr} className="text-xs text-rose-400 font-bold px-2 py-1 hover:bg-rose-950/30 rounded">Remove</button></div>) : (<button onClick={() => fileInputRef.current?.click()} className="w-full py-2 bg-blue-950/30 border border-blue-900/50 text-blue-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-900/30"><Upload className="w-3 h-3" /> Upload GCash QR</button>)}
            </div>

            <button onClick={toggleEmergency} className={`w-full p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${isEmergency ? 'bg-rose-600 border-rose-400 text-white animate-pulse' : 'bg-slate-800 border-slate-700 text-rose-400'}`}><AlertOctagon className="w-5 h-5" /><span className="text-xs font-bold">EMERGENCY ALERT</span></button>
            
            <button onClick={() => setShowSettings(false)} className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl text-sm hover:bg-slate-700 transition-all">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}