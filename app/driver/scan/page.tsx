"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, QrCode, CheckCircle2, XCircle, Loader2 } from "lucide-react";
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
    if (scanResult !== null) return;

    let html5QrcodeScanner: any;

    const initScanner = async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      html5QrcodeScanner = new Html5Qrcode("reader");

      const onScanSuccess = async (decodedText: string) => {
        setScanResult(decodedText);
        try {
          if (html5QrcodeScanner.isScanning) {
            await html5QrcodeScanner.stop();
          }
        } catch (e) {
          console.error("Failed to stop scanner", e);
        }
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        // Extract ticketId
        let ticketId = decodedText;
        try {
          const parsed = JSON.parse(decodedText);
          if (parsed.id) ticketId = parsed.id;
          else if (parsed.ticketId) ticketId = parsed.ticketId;
        } catch (e) {
          ticketId = decodedText;
        }

        try {
          const ticketRef = ref(database, `tickets/${ticketId}`);
          const snapshot = await get(ticketRef);

          if (!snapshot.exists()) {
            setIsValid(false);
            setErrorMessage("Hindi mahanap ang ticket sa database.");
            toast("Invalid Ticket: Ticket not found", "error");
            return;
          }

          const ticketData = snapshot.val();

          if (ticketData.status === "used") {
            setIsValid(false);
            setErrorMessage("Nagamit na ang ticket na ito.");
            toast("Invalid Ticket: Already used", "error");
            return;
          }

          if (ticketData.status === "expired") {
            setIsValid(false);
            setErrorMessage("Expired na ang ticket na ito.");
            toast("Invalid Ticket: Expired", "error");
            return;
          }

          // Mark as used in Firebase
          await update(ticketRef, { status: "used", usedAt: Date.now() });

          // ONLY AFTER successful Firebase update:
          const passengerCount = ticketData.passengers || 1;
          const currentFare = parseFloat(localStorage.getItem("biyahe_current_fare") || "15");
          const earnedAmount = currentFare * passengerCount;

          const prevEarnings = parseFloat(localStorage.getItem("biyahe_daily_earnings") || "0");
          const prevPassengers = parseInt(localStorage.getItem("biyahe_daily_passengers") || "0");
          localStorage.setItem("biyahe_daily_earnings", (prevEarnings + earnedAmount).toString());
          localStorage.setItem("biyahe_daily_passengers", (prevPassengers + passengerCount).toString());

          setIsValid(true);
          setTicketDetails({ passengers: passengerCount, earnings: earnedAmount });
          toast(`Ticket valid for ${passengerCount} passengers. +₱${earnedAmount} earnings!`, "success");

        } catch (err) {
          console.error("Firebase error during scan:", err);
          setIsValid(false);
          setErrorMessage("Nagkaroon ng error sa pag-validate ng ticket.");
          toast("Error validating ticket", "error");
        }
      };

      const onScanError = (errorMessage: any) => {
        // Ignore frame scan errors
      };

      try {
        await html5QrcodeScanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          onScanSuccess,
          onScanError
        );
      } catch (err) {
        console.error("Unable to start scanner", err);
      }
    };

    initScanner();

    return () => {
      if (html5QrcodeScanner) {
        try {
          if (html5QrcodeScanner.isScanning) {
            html5QrcodeScanner.stop().catch((err: any) => console.error("Failed to stop scanner", err));
          }
        } catch (e) {
          console.error("Error stopping scanner in cleanup", e);
        }
      }
    };
  }, [scanResult, toast]);

  const handleReset = () => {
    setScanResult(null);
    setIsValid(null);
    setErrorMessage("");
    setTicketDetails(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col items-center justify-center relative">
      <div className="w-full max-w-md space-y-6">
        
        <div className="flex justify-start">
          <Link href="/driver" className="p-2 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700 transition">
            <ArrowLeft className="w-6 h-6" />
          </Link>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 text-center">
          <QrCode className="w-12 h-12 text-emerald-400 mx-auto" />
          <h1 className="text-2xl font-black">I-scan ang Ticket</h1>
          <p className="text-slate-400 text-sm">
            I-align ang QR code ng pasahero sa loob ng box.
          </p>

          {/* 🚨 DITO LALABAS ANG CAMERA O RESULT */}
          {!scanResult ? (
            <div id="reader" className="w-full rounded-xl overflow-hidden border border-slate-700 bg-black min-h-[250px]"></div>
          ) : isValid === null ? (
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl space-y-3 animate-pulse">
              <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto" />
              <p className="font-bold text-slate-300">Sine-check ang ticket sa Firebase...</p>
            </div>
          ) : isValid ? (
            <div className="bg-emerald-950/50 border border-emerald-500/50 p-6 rounded-xl space-y-3 animate-in zoom-in">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
              <p className="font-bold text-lg text-white">Valid Ticket!</p>
              {ticketDetails && (
                <p className="text-sm font-semibold text-emerald-300">
                  {ticketDetails.passengers} Passenger(s) • +₱{ticketDetails.earnings}
                </p>
              )}
              <p className="text-xs text-emerald-300 break-all bg-black/30 p-2 rounded-lg">
                {scanResult}
              </p>
              <button 
                onClick={handleReset} // Reset para maka-scan ulit
                className="w-full mt-4 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-sm hover:bg-emerald-400 transition-all"
              >
                Scan Another Ticket
              </button>
            </div>
          ) : (
            <div className="bg-rose-950/50 border border-rose-500/50 p-6 rounded-xl space-y-3 animate-in zoom-in">
              <XCircle className="w-16 h-16 text-rose-500 mx-auto" />
              <p className="font-bold text-lg text-white">Invalid Ticket!</p>
              <p className="text-xs text-rose-300">{errorMessage}</p>
              <p className="text-xs text-rose-400/80 break-all bg-black/30 p-2 rounded-lg">
                {scanResult}
              </p>
              <button
                onClick={handleReset} // Reset para maka-scan ulit
                className="w-full mt-4 py-3 bg-rose-600 text-white font-black rounded-xl text-sm hover:bg-rose-500 transition-all"
              >
                Scan Another Ticket
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}