"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Ticket, MapPin, Clock, Users, CheckCircle2 } from "lucide-react";
import { database } from "@/lib/firebase";
import { ref, set, get, remove, onValue } from "firebase/database";
import { useUserId } from "@/lib/useUserId";
import { useToast } from "@/components/Toast";
import { SHEDS, Shed } from "@/lib/constants";
import { getDistance } from "@/lib/geo";

export default function CommuterTicketPage() {
  const userId = useUserId();
  const { toast } = useToast();
  
  const [showQR, setShowQR] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [queueNumber, setQueueNumber] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(300); // 5 Minutes
  
  const [isNearTerminal, setIsNearTerminal] = useState(false);
  const [nearestShed, setNearestShed] = useState<Shed>(SHEDS[0]);
  const [commuterLocation, setCommuterLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isArriving, setIsArriving] = useState(false);

  // 1. KUNIN ANG GPS LOCATION AT CHECK KUNG 100M RADIUS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCommuterLocation(loc);
          
          let minDist = Infinity;
          let nearest = SHEDS[0];
          SHEDS.forEach(shed => {
            const d = getDistance(loc.lat, loc.lng, shed.lat, shed.lng);
            if (d < minDist) { minDist = d; nearest = shed; }
          });
          setNearestShed(nearest);
          
          if (minDist <= 0.1) { // 0.1 km = 100 meters
            setIsNearTerminal(true);
          } else {
            setIsNearTerminal(false);
          }
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // 2. CHECK KUNG NANDIYAN NA ANG DRIVER (200m Radius Alert)
  useEffect(() => {
    if (!showQR || !nearestShed) return;
    const tripsRef = ref(database, "live_trips");
    const unsub = onValue(tripsRef, (snapshot) => {
      if (snapshot.exists()) {
        const trips = Object.values(snapshot.val());
        const isDriverNear = trips.some((trip: any) => {
          if (!trip.location) return false;
          const dist = getDistance(trip.location.lat, trip.location.lng, nearestShed.lat, nearestShed.lng);
          return dist <= 0.2; // 200 meters
        });
        setIsArriving(isDriverNear);
      }
    });
    return () => unsub();
  }, [showQR, nearestShed]);

  // 3. TIMER LOGIC
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showQR && countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    } else if (countdown === 0 && showQR) {
      toast("Timeout! Nawala ka sa pila.", "error");
      handleCancelQueue();
    }
    return () => clearInterval(timer);
  }, [showQR, countdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleJoinQueue = async () => {
    if (!isNearTerminal) {
      return toast("Kailangan mo pong nasa loob ng 100m radius ng terminal.", "error");
    }

    try {
      const queueRef = ref(database, `queue/${nearestShed.id}`);
      const snapshot = await get(queueRef);
      let currentQueue = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
      
      const newTicketId = "TKT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const myQueueNumber = currentQueue + 1;

      await set(ref(database, `queue/${nearestShed.id}/${newTicketId}`), {
        id: newTicketId,
        userId: userId || "anonymous",
        queueNumber: myQueueNumber,
        timestamp: Date.now(),
        status: "waiting"
      });

      await set(ref(database, `tickets/${newTicketId}`), {
        id: newTicketId,
        userId: userId || "anonymous",
        status: "active",
        queueNumber: myQueueNumber,
        timestamp: Date.now(),
      });

      localStorage.setItem("active_ticket", newTicketId);
      
      setTicketId(newTicketId);
      setQueueNumber(myQueueNumber);
      setShowQR(true);
      toast(`Nakapila ka na! You are #${myQueueNumber} in line.`, "success");
    } catch (err) {
      toast("Error generating ticket.", "error");
    }
  };

  const handleCancelQueue = async () => {
    if (!ticketId || !nearestShed.id) return;
    try {
      await remove(ref(database, `queue/${nearestShed.id}/${ticketId}`));
      await remove(ref(database, `tickets/${ticketId}`));
      localStorage.removeItem("active_ticket");
      setShowQR(false);
      setTicketId(null);
      setQueueNumber(null);
      toast("Kinansela ang pila.", "info");
    } catch (err) {
      toast("Error cancelling queue.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <header className="w-full max-w-md flex items-center gap-4 mb-8">
        <Link href="/" className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Ticket className="w-5 h-5 text-emerald-400" /> Pumila (Virtual Queue)
        </h1>
      </header>

      <main className="w-full max-w-md flex flex-col items-center justify-center flex-1">
        {!showQR ? (
          <div className="text-center space-y-6">
            <div className="p-6 bg-slate-900 rounded-full inline-block border border-slate-800">
              <Users className="w-16 h-16 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Pumila para Maka-sakay</h2>
              <p className="text-slate-400 text-sm mb-4">
                {isNearTerminal 
                  ? `Malapit ka sa ${nearestShed.name}. Pwede ka nang pumila.` 
                  : "Kailangan mo pong nasa loob ng 100 meters ng terminal para makapila."}
              </p>
              
              {!isNearTerminal && commuterLocation && (
                <div className="bg-rose-950/50 border border-rose-500/50 p-3 rounded-xl text-rose-300 text-xs mb-4">
                  <MapPin className="w-4 h-4 inline mr-1" /> 
                  Lumapit po sa pinakamalapit na terminal para makapila.
                </div>
              )}
            </div>

            <button 
              onClick={handleJoinQueue}
              disabled={!isNearTerminal}
              className={`w-full py-4 font-black text-lg rounded-2xl shadow-lg transition-all ${
                isNearTerminal 
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isNearTerminal ? "Pumila Ngayon" : "Hindi Pa Pwede (Malayo)"}
            </button>
          </div>
        ) : (
          <div className="w-full space-y-4">
            {/* ALERT KUNG PAPARATING NA ANG DRIVER */}
            {isArriving && (
              <div className="bg-blue-600 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 animate-pulse shadow-lg shadow-blue-900/50">
                <CheckCircle2 className="w-5 h-5" /> 
                <span className="font-bold">Sasakyan is Arriving! Prepare to scan.</span>
              </div>
            )}

            <div className="bg-emerald-950/50 border border-emerald-500/50 text-emerald-200 px-4 py-4 rounded-xl text-center">
              <p className="text-sm font-semibold mb-1">IKAW ANG NUMERO</p>
              <p className="text-5xl font-black text-emerald-400">#{queueNumber}</p>
              <p className="text-xs mt-1">sa pila ng {nearestShed.name}</p>
            </div>

            <div className={`px-4 py-3 rounded-xl flex items-center justify-between border ${countdown < 60 ? 'bg-rose-950/50 border-rose-500/30 text-rose-200' : 'bg-amber-950/50 border-amber-500/30 text-amber-200'}`}>
              <span className="text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4" /> Oras na natitira:</span>
              <span className="font-mono text-xl font-bold">{formatTime(countdown)}</span>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="bg-emerald-100 p-4 rounded-2xl">
                {ticketId && <QRCodeSVG value={ticketId} size={200} />}
              </div>
              <div className="text-center">
                <p className="text-slate-900 font-black text-2xl tracking-widest">{ticketId}</p>
                <p className="text-slate-500 text-xs mt-1 flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3" /> {nearestShed.name}
                </p>
              </div>
            </div>

            <button onClick={handleCancelQueue} className="w-full py-3 bg-rose-600/20 border border-rose-600/50 text-rose-400 font-bold rounded-xl text-sm hover:bg-rose-600/30 transition-all">
              Cancel Pila
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
