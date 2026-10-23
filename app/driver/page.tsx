"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { database, ensureAuth } from "@/lib/firebase";
import { ref, set, remove, update, onValue } from "firebase/database";
import { 
  Navigation, Play, Square, CheckCircle2, QrCode, Minus, Plus, 
  ShieldAlert, Timer, Wallet, Power, AlertOctagon, Map, Siren, X, Check, Upload, Bell, Car, Bus, UserMinus, Settings
} from "lucide-react";

export default function DriverPage() {
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState<"Available" | "Standing" | "Full">("Available");
  const [tripId, setTripId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // VEHICLE DETAILS
  const [vehicleType, setVehicleType] = useState<"Van" | "Bus" | "Taxi" | "Tricycle">("Van");
  const [plateNumber, setPlateNumber] = useState("");
  const [isAircon, setIsAircon] = useState(true);
  const [seatsTotal, setSeatsTotal] = useState(14); 
  const [seatsAvailable, setSeatsAvailable] = useState(14);

  // 🚨 EDITABLE FARE
  const [fareInput, setFareInput] = useState<string>("15");
  const fare = Number(fareInput) || 0;

  const [earnings, setEarnings] = useState(0);
  const [isOutOfService, setIsOutOfService] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [isTerminalMode, setIsTerminalMode] = useState(false);
  const [isGcashEnabled, setIsGcashEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // ALERTS
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

  const playSiren = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  };

  const playDing = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  const startAlarm = () => {
    if (alarmIntervalRef.current) return;
    playSiren();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100]);
    alarmIntervalRef.current = setInterval(() => {
      playSiren();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100]);
    }, 1200);
  };

  const stopAlarm = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (navigator.vibrate) navigator.vibrate(0);
  };

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
    const savedFare = localStorage.getItem("biyahe_fare");

    if (savedLive === "true") setIsLive(true);
    if (savedSeats) setSeatsAvailable(parseInt(savedSeats));
    if (savedGcash) setGcashQr(savedGcash);
    if (savedGcashToggle === "true") setIsGcashEnabled(true);
    if (savedVehicle) setVehicleType(savedVehicle);
    if (savedPlate) setPlateNumber(savedPlate);
    if (savedAircon) setIsAircon(savedAircon === "true");
    if (savedSeatsTotal) setSeatsTotal(parseInt(savedSeatsTotal));
    if (savedFare) setFareInput(savedFare);

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
    localStorage.setItem("biyahe_fare", fareInput);
  }, [isLive, seatsAvailable, isGcashEnabled, vehicleType, plateNumber, isAircon, seatsTotal, fareInput]);

  const handleVehicleTypeChange = (type: "Van" | "Bus" | "Taxi" | "Tricycle") => {
    setVehicleType(type);
    let capacity = 14;
    if (type === "Bus") capacity = 60;
    else if (type === "Taxi") capacity = 4;
    else if (type === "Tricycle") capacity = 6;
    setSeatsTotal(capacity);
    setSeatsAvailable(capacity);
  };

  const handleGcashUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setGcashQr(base64String);
      localStorage.setItem("biyahe_gcash_qr", base64String);
    };
    reader.readAsDataURL(file);
  };

  const removeGcashQr = () => {
    setGcashQr(null);
    localStorage.removeItem("biyahe_gcash_qr");
    setIsGcashEnabled(false);
    localStorage.removeItem("biyahe_gcash_enabled");
  };

  const pushLocationToFirebase = async (position: GeolocationPosition, currentStatus: string, currentSeats: number, currentReserved: number) => {
    if (!tripId) return;
    try {
      await ensureAuth();
      const currentCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
      const tripRef = ref(database, `live_trips/${tripId}`);
      await set(tripRef, {
        tripId, status: isOutOfService ? "Full" : currentStatus,
        location: currentCoords, seatsAvailable: currentSeats, 
        reservedSeats: currentReserved, fare, isOutOfService, isEmergency,
        isGcashEnabled, vehicleType, isAircon, plateNumber,
        isTerminalMode, updatedAt: Date.now(),
      });
      setErrorMessage(null);
    } catch (err) { setErrorMessage("Maling koneksyon sa internet."); }
  };

  const handleStartTrip = async () => {
    if (!navigator.geolocation) return setErrorMessage("Walang Geolocation.");
    setIsLive(true); setErrorMessage(null); setEarnings(0);
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
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
    setIsLive(false); setIsReservedActive(false); setIsOutOfService(false); setIsEmergency(false);
    localStorage.removeItem("biyahe_is_live"); localStorage.removeItem("biyahe_seats");
  };

  const updateSeats = async (delta: number) => {
    const newSeats = Math.max(0, Math.min(seatsTotal, seatsAvailable + delta));
    setSeatsAvailable(newSeats);
    if (delta === -1) setEarnings(prev => prev + fare);
    let newStatus: "Available" | "Standing" | "Full" = "Available";
    if (newSeats === 0) newStatus = "Full";
    else if (newSeats <= 3) newStatus = "Standing";
    setStatus(newStatus);
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
      setIsReservedActive(true); setReservedTimer(180);
      timerRef.current = setInterval(() => {
        setReservedTimer(prev => {
          if (prev <= 1) { if (timerRef.current !== null) clearInterval(timerRef.current); setIsReservedActive(false); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const toggleEmergency = async () => {
    const newState = !isEmergency; setIsEmergency(newState);
    if (newState) { try { await set(ref(database, "community_alert"), { id: "alert_" + Date.now(), type: "Emergency", timestamp: Date.now() }); } catch (err) {} }
    else { try { await remove(ref(database, "community_alert")); } catch (err) {} }
  };

  const handleAcknowledge = () => { setIsSosAcknowledged(true); stopAlarm(); };
  const dismissSOS = async () => { try { await remove(ref(database, "sos_alert")); } catch (err) { console.error(err); } };
  const handlePaymentConfirm = async () => { try { await remove(ref(database, "payment_requests")); setPaymentNotif(null); } catch (err) { console.error(err); } };
  const dismissWaiting = async () => { try { await remove(ref(database, "waiting_commuters")); setWaitingAlert(null); } catch (err) { console.error(err); } };
  const dismissStop = async () => { try { await remove(ref(database, "stop_request")); setStopAlert(null); } catch (err) { console.error(err); } };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60); const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center relative p-4 ${isEmergency ? 'bg-rose-950' : ''}`}>
      
      {/* 🚨 ALERTS STACK */}
      <div className="fixed top-0 left-0 w-full z-[100] flex flex-col gap-2 p-2 max-w-md mx-auto">
        {sosAlert && (
          <div className={`p-4 rounded-xl flex flex-col gap-3 shadow-2xl transition-all ${isSosAcknowledged ? 'bg-rose-950 border-b border-rose-600' : 'bg-rose-600 animate-pulse'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white"><Siren className={`w-8 h-8 ${!isSosAcknowledged && 'animate-bounce'}`} /><div><p className="font-black text-lg">SOS ALERT!</p><p className="text-xs font-semibold">Location: {sosAlert.shed}</p></div></div>
              <button onClick={dismissSOS} className="p-2 bg-black/20 rounded-full text-white hover:bg-black/40 transition"><X className="w-6 h-6" /></button>
            </div>
            {!isSosAcknowledged && (<div className="flex gap-2"><button onClick={handleAcknowledge} className="flex-1 py-2 bg-white text-rose-700 font-bold text-sm rounded-lg flex items-center justify-center gap-1"><Check className="w-4 h-4" /> TUGON</button><a href="tel:911" className="flex-1 py-2 bg-slate-950 text-white font-bold text-sm rounded-lg text-center">CALL 911</a></div>)}
          </div>
        )}

        {paymentNotif && (
          <div className="p-3 rounded-xl bg-blue-950/90 border border-blue-500/50 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3"><Wallet className="w-6 h-6 text-blue-400" /><div><p className="font-bold text-white text-sm">May nagbayad via GCash!</p><p className="text-xs text-blue-300">I-verify sa app.</p></div></div>
            <button onClick={handlePaymentConfirm} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold">Confirm</button>
          </div>
        )}

        {waitingAlert && (
          <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3"><Bell className="w-6 h-6 text-emerald-400 animate-bounce" /><div><p className="font-bold text-white text-sm">May naghihintay sa {waitingAlert.shed}!</p><p className="text-xs text-emerald-300">Pumunta na doon.</p></div></div>
            <button onClick={dismissWaiting} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold">Okay</button>
          </div>
        )}

        {stopAlert && (
          <div className="p-3 rounded-xl bg-amber-950/90 border border-amber-500/50 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3"><UserMinus className="w-6 h-6 text-amber-400 animate-pulse" /><div><p className="font-bold text-white text-sm">May pasaherong munaog!</p><p className="text-xs text-amber-300">Sa {stopAlert.shed}.</p></div></div>
            <button onClick={dismissStop} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold">Okay</button>
          </div>
        )}
      </div>

      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2"><Navigation className="w-6 h-6 text-emerald-400" /> BIYAHE LIVE</h1>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 ${isLive ? (isOutOfService ? 'bg-slate-700 text-slate-300' : 'bg-emerald-500 text-slate-950') : 'bg-slate-800 text-slate-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isLive && !isOutOfService ? 'bg-slate-950 animate-ping' : 'bg-slate-500'}`}></span>
          {isLive ? (isOutOfService ? "OUT OF SERVICE" : "LIVE") : "OFFLINE"}
        </div>
      </div>

      <div className="w-full max-w-md bg-slate-800 rounded-2xl p-5 shadow-xl border border-slate-700 space-y-4">
        
        {/* COMPACT VEHICLE DETAILS */}
        <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-700">
          <div className="flex items-center gap-2">
            {(["Van", "Bus", "Taxi", "Tricycle"] as const).map(type => (
              <button key={type} onClick={() => handleVehicleTypeChange(type)} className={`px-2 py-1 rounded text-[10px] font-bold ${vehicleType === type ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{type}</button>
            ))}
          </div>
          <button onClick={() => setIsAircon(!isAircon)} className={`text-[10px] font-bold px-2 py-1 rounded ${isAircon ? 'bg-blue-950 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>{isAircon ? "❄️ Aircon" : "🌬️ Non"}</button>
        </div>

        {/* COMPACT EARNINGS & FARE */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 flex flex-col items-center justify-center">
            <p className="text-[10px] text-slate-400">KITA</p>
            <p className="text-lg font-black text-white">₱{earnings}</p>
          </div>
          
          {/* 🚨 EDITABLE FARE */}
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 flex flex-col items-center justify-center">
            <p className="text-[10px] text-slate-400 mb-1">PAMASAHE</p>
            <div className="flex items-center gap-1">
              <span className="text-lg font-black text-amber-400">₱</span>
              <input 
                type="number" 
                value={fareInput} 
                onChange={(e) => setFareInput(e.target.value)}
                className="w-16 bg-transparent text-lg font-black text-amber-400 text-center focus:outline-none border-b border-amber-400/30"
              />
            </div>
          </div>
        </div>
        
        {/* COMPACT SEAT COUNTER */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
          <p className="text-[10px] text-slate-400 text-center mb-2">AVAILABLE SEATS ({seatsTotal} Total)</p>
          <div className="flex items-center justify-between">
            <button onClick={() => updateSeats(-1)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl active:scale-95"><Minus className="w-6 h-6" /></button>
            <span className={`text-4xl font-black ${seatsAvailable === 0 ? 'text-rose-500' : seatsAvailable <= 3 ? 'text-amber-400' : 'text-emerald-400'}`}>{seatsAvailable}</span>
            <button onClick={() => updateSeats(1)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl active:scale-95"><Plus className="w-6 h-6" /></button>
          </div>
        </div>

        {/* COMPACT RESERVED & SETTINGS ROW */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={toggleReservedSeats} className={`p-2 rounded-xl border flex items-center justify-center gap-1 transition-all ${isReservedActive ? 'bg-amber-950/50 border-amber-500/50 text-amber-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
            <ShieldAlert className="w-4 h-4" /> <span className="text-xs font-bold">Reserved</span> {isReservedActive && <span className="text-[10px]">{formatTime(reservedTimer)}</span>}
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl border bg-slate-900 border-slate-700 text-slate-400 flex items-center justify-center gap-1">
            <Settings className="w-4 h-4" /> <span className="text-xs font-bold">Settings</span>
          </button>
        </div>

        {/* START/END TRIP BUTTON (Nasa loob na ng card) */}
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