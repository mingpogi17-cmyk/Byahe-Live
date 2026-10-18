"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Ticket, MapPin, Clock } from "lucide-react";

export default function CommuterTicketPage() {
  const [showQR, setShowQR] = useState(false);
  const [ticketId] = useState(() => "TKT-" + Math.random().toString(36).substring(2, 8).toUpperCase());
  const [countdown, setCountdown] = useState(180); // 3 minutes in seconds

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showQR && countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [showQR, countdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <header className="w-full max-w-md flex items-center gap-4 mb-8">
        <Link href="/commuter" className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Ticket className="w-5 h-5 text-emerald-400" /> Priority Ticket
        </h1>
      </header>

      <main className="w-full max-w-md flex flex-col items-center justify-center flex-1">
        {!showQR ? (
          <div className="text-center space-y-6">
            <div className="p-6 bg-slate-900 rounded-full inline-block border border-slate-800">
              <Ticket className="w-16 h-16 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Virtual Pila</h2>
              <p className="text-slate-400 text-sm">Pindutin ang button para makakuha ng QR Code. Ipakita ito sa konduktor para mabigyan ng priority seat.</p>
            </div>
            <button 
              onClick={() => setShowQR(true)}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-lg rounded-2xl shadow-lg shadow-emerald-500/20 transition-all"
            >
              Kumuha ng Ticket
            </button>
          </div>
        ) : (
          <div className="w-full space-y-4">
            {/* Timer Banner */}
            <div className="bg-amber-950/50 border border-amber-500/30 text-amber-200 px-4 py-3 rounded-xl flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4" /> Oras na natitira:</span>
              <span className="font-mono text-xl font-bold">{formatTime(countdown)}</span>
            </div>

            {/* QR Code Card */}
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="bg-emerald-100 p-4 rounded-2xl">
                <QRCodeSVG value={ticketId} size={200} />
              </div>
              <div className="text-center">
                <p className="text-slate-900 font-black text-2xl tracking-widest">{ticketId}</p>
                <p className="text-slate-500 text-xs mt-1 flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3" /> Digos - Sta. Cruz Route
                </p>
              </div>
            </div>

            <p className="text-center text-xs text-slate-500">
              Kapag na-scan ito ng konduktor, may 3 minuto kang pagkakataon na makasakay. Kapag lumipas ang oras, mawawalan ng bisa ang ticket.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}