"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { database, ensureAuth } from "@/lib/firebase";
import { ref, set, remove, update } from "firebase/database";
import { Navigation, Play, Square, CheckCircle2, QrCode, Minus, Plus, Volume2, ShieldAlert, Timer, Globe } from "lucide-react";

// === LANGUAGE DICTIONARY ===
const LANG = {
  fil: {
    startTrip: "START TRIP",
    endTrip: "END TRIP",
    availableSeats: "AVAILABLE SEATS",
    tripStatus: "TRIP STATUS",
    live: "LIVE BROADCASTING",
    offline: "OFFLINE",
    reservedSeats: "Reserved Seats (Walk-ins)",
    reservedDesc: "Para sa mga walang cellphone",
    timer: "Timer",
    voiceOn: "Voice: Filipino | Vibration: ON",
    scanTicket: "Scan Ticket",
    speakStart: "Simula na ang biyahe.",
    speakEnd: "Tapos na ang biyahe.",
    speakFull: "Puno na ang sasakyan.",
    speakStanding: "Tatlo na lang ang bakanteng upuan.",
    speakAvailable: "May bakanteng upuan.",
    speakReservedOn: "Dalawang upuan ang naka-reserve. May tatlong minuto.",
    speakReservedOff: "Tapos na ang reserved seats.",
  },
  en: {
    startTrip: "START TRIP",
    endTrip: "END TRIP",
    availableSeats: "AVAILABLE SEATS",
    tripStatus: "TRIP STATUS",
    live: "LIVE BROADCASTING",
    offline: "OFFLINE",
    reservedSeats: "Reserved Seats (Walk-ins)",
    reservedDesc: "For passengers without phones",
    timer: "Timer",
    voiceOn: "Voice: English | Vibration: ON",
    scanTicket: "Scan Ticket",
    speakStart: "Trip started.",
    speakEnd: "Trip ended.",
    speakFull: "Bus is full.",
    speakStanding: "Only three seats left.",
    speakAvailable: "Seats available.",
    speakReservedOn: "Two reserved seats. Three minutes.",
    speakReservedOff: "Reserved seats expired.",
  }
};

export default function DriverPage() {
  const [language, setLanguage] = useState<"fil" | "en">("fil");
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState<"Available" | "Standing" | "Full">("Available");
  const [tripId, setTripId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [seatsTotal] = useState(14);
  const [seatsAvailable, setSeatsAvailable] = useState(14);

  const [reservedSeats, setReservedSeats] = useState(2);
  const [isReservedActive, setIsReservedActive] = useState(false);
  const [reservedTimer, setReservedTimer] = useState(0);
  
  // Visual Flasher State (Para sa mga bingi)
  const [flashScreen, setFlashScreen] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  const t = LANG[language]; // Helper para sa text

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
    const savedLang = localStorage.getItem("biyahe_lang") as "fil" | "en";
    if (savedLive === "true") setIsLive(true);
    if (savedSeats) setSeatsAvailable(parseInt(savedSeats));
    if (savedLang) setLanguage(savedLang);
  }, []);

  useEffect(() => {
    localStorage.setItem("biyahe_is_live", isLive.toString());
    localStorage.setItem("biyahe_seats", seatsAvailable.toString());
    localStorage.setItem("biyahe_lang", language);
  }, [isLive, seatsAvailable, language]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "fil" ? 'fil-PH' : 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Haptic Patterns & Visual Flasher
  const triggerFeedback = (type: "available" | "standing" | "full") => {
    if (type === "available") {
      if (navigator.vibrate) navigator.vibrate(50);
    } else if (type === "standing") {
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      flashScreenColor("amber");
    } else if (type === "full") {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
      flashScreenColor("rose");
    }
  };

  const flashScreenColor = (color: string) => {
    setFlashScreen(true);
    setTimeout(() => setFlashScreen(false), 500); // Flash for 500ms
  };

  // ... (pushLocationToFirebase, handleStartTrip, handleEndTrip, updateSeats, toggleReservedSeats functions same as before)
  // 👇 (Palitan mo lang yung speak() calls sa loob ng functions na 'yon gamit ang `t` dictionary)

  const pushLocationToFirebase = async (position: GeolocationPosition, currentStatus: string, currentSeats: number, currentReserved: number) => {
    if (!tripId) return;
    try {
      await ensureAuth();
      const currentCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
      const tripRef = ref(database, `live_trips/${tripId}`);
      await set(tripRef, {
        tripId, status: currentStatus, location: currentCoords, 
        seatsAvailable: currentSeats, 
        reservedSeats: currentReserved,
        updatedAt: Date.now(),
      });
      setErrorMessage(null);
    } catch (err) { setErrorMessage("Maling koneksyon sa internet."); }
  };

  const handleStartTrip = async () => {
    if (!navigator.geolocation) return setErrorMessage("Walang Geolocation.");
    setIsLive(true); setErrorMessage(null);
    speak(t.speakStart);
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
    localStorage.removeItem("biyahe_is_live");
    localStorage.removeItem("biyahe_seats");
    speak(t.speakEnd);
  };

  const updateSeats = async (delta: number) => {
    const newSeats = Math.max(0, Math.min(seatsTotal, seatsAvailable + delta));
    setSeatsAvailable(newSeats);
    
    let newStatus: "Available" | "Standing" | "Full" = "Available";
    if (newSeats === 0) newStatus = "Full";
    else if (newSeats <= 3) newStatus = "Standing";
    setStatus(newStatus);

    // Visual & Haptic Feedback
    triggerFeedback(newStatus.toLowerCase() as any);
    
    if (newStatus === "Full") speak(t.speakFull);
    else if (newStatus === "Standing") speak(t.speakStanding);
    else speak(t.speakAvailable);

    if (isLive && tripId) {
      try { await ensureAuth(); await update(ref(database, `live_trips/${tripId}`), { seatsAvailable: newSeats, status: newStatus }); } catch (err) { console.error(err); }
    }
  };

  const toggleReservedSeats = () => {
    if (isReservedActive) {
      setIsReservedActive(false);
      if (timerRef.current !== null) clearInterval(timerRef.current);
      setReservedTimer(0);
      speak(t.speakReservedOff);
    } else {
      setIsReservedActive(true);
      setReservedTimer(180);
      speak(t.speakReservedOn);
      
      timerRef.current = setInterval(() => {
        setReservedTimer(prev => {
          if (prev <= 1) {
            if (timerRef.current !== null) clearInterval(timerRef.current);
            setIsReservedActive(false);
            speak(t.speakReservedOff);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`min-h-screen bg-slate-900 text-white p-4 md:p-8 flex flex-col items-center justify-between relative transition-colors duration-300 ${flashScreen ? 'bg-rose-900/50' : ''}`}>
      
      {isLive && (
        <Link href="/driver/scan" className="fixed bottom-24 right-6 z-50 p-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full shadow-2xl transition-all flex items-center gap-2">
          <QrCode className="w-6 h-6" /><span className="font-bold pr-2">{t.scanTicket}</span>
        </Link>
      )}

      <div className="w-full max-w-md text-center my-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Navigation className="w-8 h-8 text-emerald-400" /> BIYAHE LIVE
        </h1>
        {/* Language Toggle */}
        <button onClick={() => setLanguage(language === "fil" ? "en" : "fil")} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-full text-xs font-bold hover:bg-slate-700 transition-all">
          <Globe className="w-4 h-4" /> {language.toUpperCase()}
        </button>
      </div>

      <div className="w-full max-w-md bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 space-y-6">
        <div className={`p-4 rounded-xl flex items-center justify-between ${isLive ? 'bg-emerald-950/80 border-emerald-500/50' : 'bg-slate-700/50'}`}>
          <div><p className="text-xs text-slate-400 uppercase font-semibold">{t.tripStatus}</p><p className="font-bold text-lg">{isLive ? t.live : t.offline}</p></div>
          {isLive && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
        </div>
        {errorMessage && <div className="p-3 bg-rose-950 text-rose-200 rounded-lg text-sm">{errorMessage}</div>}
        
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 text-center mb-3">{t.availableSeats}</p>
          <div className="flex items-center justify-between">
            <button onClick={() => updateSeats(-1)} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl active:scale-95"><Minus className="w-6 h-6" /></button>
            <span className={`text-4xl font-black ${seatsAvailable === 0 ? 'text-rose-500' : seatsAvailable <= 3 ? 'text-amber-400' : 'text-emerald-400'}`}>{seatsAvailable}</span>
            <button onClick={() => updateSeats(1)} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl active:scale-95"><Plus className="w-6 h-6" /></button>
          </div>
          <p className="text-center text-[10px] text-slate-500 mt-2">{t.voiceOn}</p>
        </div>

        <div className={`p-4 rounded-xl border transition-all ${isReservedActive ? 'bg-amber-950/50 border-amber-500/50' : 'bg-slate-900 border-slate-700'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className={`w-5 h-5 ${isReservedActive ? 'text-amber-400' : 'text-slate-500'}`} />
              <div>
                <p className="text-sm font-bold">{t.reservedSeats}</p>
                <p className="text-[10px] text-slate-500">{t.reservedDesc}</p>
              </div>
            </div>
            <button onClick={toggleReservedSeats} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isReservedActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              {isReservedActive ? "ON" : "OFF"}
            </button>
          </div>
          
          {isReservedActive && (
            <div className="mt-3 pt-3 border-t border-amber-800/30 flex items-center justify-between">
              <span className="text-xs text-amber-300 flex items-center gap-1"><Timer className="w-3 h-3" /> {t.timer}:</span>
              <span className="font-mono text-lg font-bold text-amber-400">{formatTime(reservedTimer)}</span>
            </div>
          )}
        </div>

        {!isLive ? (
          <button onClick={handleStartTrip} className="w-full py-5 bg-emerald-500 text-slate-950 font-black text-xl rounded-2xl">{t.startTrip}</button>
        ) : (
          <button onClick={handleEndTrip} className="w-full py-5 bg-rose-600 text-white font-black text-xl rounded-2xl">{t.endTrip}</button>
        )}
      </div>
    </div>
  );
}