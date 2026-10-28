"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { database } from "@/lib/firebase";
import { ref, get, update } from "firebase/database";

export default function ScanPage() {
  const { toast } = useToast();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [ticketDetails, setTicketDetails] = useState<{ passengers: number; earnings: number } | null>(null);

  useEffect(() => {
    let html5Qrcode: any;
    let isMounted = true;

    const initScanner = async () => {
      if (scanResult) return;
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!isMounted) return;
      const readerDiv = document.getElementById("reader");
      if (readerDiv) readerDiv.innerHTML = "";
      html5Qrcode = new Html5Qrcode("reader");

      const onScanSuccess = async (decodedText: string) => {
        setScanResult(decodedText);
        try {
          if (html5Qrcode.isScanning) await html5Qrcode.stop();
        } catch (e) {}

        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        let ticketId = decodedText;
        try {
          const parsed = JSON.parse(decodedText);
          if (parsed.id) ticketId = parsed.id;
          else if (parsed.ticketId) ticketId = parsed.ticketId;
        } catch (e) { ticketId = decodedText; }

        try {
          const ticketRef = ref(database, `tickets/${ticketId}`);
          const snapshot = await get(ticketRef);

          if (!snapshot.exists()) {
            setIsValid(false); setErrorMessage("Hindi mahanap ang ticket sa database."); toast("Invalid Ticket", "error"); return;
          }
          const ticketData = snapshot.val();
          if (ticketData.status === "used") {
            setIsValid(false); setErrorMessage("Nagamit na ang ticket."); toast("Invalid: Already used", "error"); return;
          }
          if (ticketData.status === "expired") {
            setIsValid(false); setErrorMessage("Expired na ang ticket."); toast("Invalid: Expired", "error"); return;
          }

          await update(ticketRef, { status: "used", usedAt: Date.now() });

          const passengerCount = ticketData.passengers || 1;
          const currentFare = parseFloat(localStorage.getItem("biyahe_current_fare") || "15");
          const earnedAmount = currentFare * passengerCount;
          const prevEarnings = parseFloat(localStorage.getItem("biyahe_daily_earnings") || "0");
          const prevPassengers = parseInt(localStorage.getItem("biyahe_daily_passengers") || "0");

          localStorage.setItem("biyahe_daily_earnings", (prevEarnings + earnedAmount).toString());
          localStorage.setItem("biyahe_daily_passengers", (prevPassengers + passengerCount).toString());

          setIsValid(true);
          setTicketDetails({ passengers: passengerCount, earnings: earnedAmount });
          toast(`Ticket valid for ${passengerCount} passengers.`, "success");
        } catch (err) {
          setIsValid(false); setErrorMessage("Error validating ticket."); toast("Error", "error");
        }
      };

      try {
        await html5Qrcode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          onScanSuccess,
          () => {}
        );
      } catch (err) { console.error("Unable to start scanner", err); }
    };

    initScanner();

    return () => {
      isMounted = false;
      if (html5Qrcode && html5Qrcode.isScanning) html5Qrcode.stop().catch((err: any) => console.error(err));
    };
  }, [scanResult, toast]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative">
      <div className="absolute top-0 left-0 right-0 z-50 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <Link href="/driver" className="p-2 bg-slate-800/80 rounded-full hover:bg-slate-700 transition"><ArrowLeft className="w-5 h-5 text-white" /></Link>
        <p className="text-sm font-bold text-white/80">Scan Ticket</p>
        <div className="w-9"></div>
      </div>

      {!scanResult && <div id="reader" className="w-full h-screen object-cover"></div>}

      {scanResult && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm space-y-4 text-center">
            {isValid === null ? (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-4 animate-pulse">
                <Loader2 className="w-16 h-16 text-emerald-400 animate-spin mx-auto" />
                <p className="font-bold text-slate-300">Checking Database...</p>
              </div>
            ) : isValid ? (
              <div className="bg-emerald-950/80 border border-emerald-500/50 p-8 rounded-3xl space-y-3 animate-in zoom-in">
                <CheckCircle2 className="w-20 h-20 text-emerald-400 mx-auto" />
                <p className="font-black text-2xl text-white">VALID</p>
                {ticketDetails && <p className="text-sm font-semibold text-emerald-300">{ticketDetails.passengers} Pass • +₱{ticketDetails.earnings}</p>}
                <button onClick={() => { setScanResult(null); setIsValid(null); }} className="w-full mt-4 py-4 bg-emerald-500 text-slate-950 font-black rounded-xl text-lg hover:bg-emerald-400 transition-all">Scan Next</button>
              </div>
            ) : (
              <div className="bg-rose-950/80 border border-rose-500/50 p-8 rounded-3xl space-y-3 animate-in zoom-in">
                <XCircle className="w-20 h-20 text-rose-500 mx-auto" />
                <p className="font-black text-2xl text-white">INVALID</p>
                <p className="text-sm font-bold text-rose-300">{errorMessage}</p>
                <button onClick={() => { setScanResult(null); setIsValid(null); }} className="w-full mt-4 py-4 bg-rose-600 text-white font-black rounded-xl text-lg hover:bg-rose-500 transition-all">Try Again</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}