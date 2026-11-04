"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, QrCode, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/components/Toast";
import { database } from "@/lib/firebase";
import { ref, get, update } from "firebase/database";
import { useUserId } from "@/lib/useUserId";

export default function ScanPage() {
  const { toast } = useToast();
  const userId = useUserId(); // Kunin ang driverId
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<"success" | "error" | null>(null);
  const [scanner, setScanner] = useState<any>(null);

  const verifyTicket = async (decodedText: string) => {
    try {
      const ticketRef = ref(database, `tickets/${decodedText}`);
      const snapshot = await get(ticketRef);

      if (snapshot.exists()) {
        const ticketData = snapshot.val();
        
        if (ticketData.status === "active") {
          // 🔥 I-LINK ANG DRIVER SA TICKET
          await update(ticketRef, {
            status: "used",
            driverId: userId,
            usedAt: Date.now()
          });

          // I-save sa localStorage para alam ng "Bababa Ako" kung kanino ipapadala
          localStorage.setItem("driver_scanned_ticket", decodedText);

          setScanResult(decodedText);
          setScanStatus("success");
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          toast("Valid Ticket! Linked to you.", "success");
        } else {
          setScanResult(decodedText);
          setScanStatus("error");
          toast("Ticket already used or expired.", "error");
        }
      } else {
        setScanResult(decodedText);
        setScanStatus("error");
        toast("Invalid Ticket. Not found in database.", "error");
      }
    } catch (err) {
      toast("Error verifying ticket.", "error");
    }
  };

  useEffect(() => {
    let html5QrCode: any;

    const initScanner = async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      html5QrCode = new Html5Qrcode("reader");
      setScanner(html5QrCode);

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText: string) => {
            html5QrCode.pause(); // Pause muna
            verifyTicket(decodedText); // I-verify sa database
          },
          (errorMessage: any) => {}
        );
      } catch (err) {
        console.error("Camera start error:", err);
        toast("Camera access denied.", "error");
      }
    };

    initScanner();

    return () => {
      if (html5QrCode) {
        html5QrCode.stop().then(() => html5QrCode.clear()).catch((err: any) => console.log(err));
      }
    };
  }, [toast]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        
        <div className="flex justify-start">
          <Link href="/driver" className="p-2 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700 transition">
            <ArrowLeft className="w-6 h-6" />
          </Link>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 text-center">
          <QrCode className="w-12 h-12 text-emerald-400 mx-auto" />
          <h1 className="text-2xl font-black">I-scan ang Ticket</h1>
          
          {!scanResult ? (
            <div id="reader" className="w-full rounded-xl overflow-hidden border-2 border-emerald-500/50 bg-black min-h-[300px]"></div>
          ) : (
            <div className={`border p-6 rounded-xl space-y-3 animate-in zoom-in ${scanStatus === 'success' ? 'bg-emerald-950/50 border-emerald-500/50' : 'bg-rose-950/50 border-rose-500/50'}`}>
              {scanStatus === 'success' ? <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" /> : <XCircle className="w-16 h-16 text-rose-400 mx-auto" />}
              <p className="font-bold text-lg text-white">{scanStatus === 'success' ? "Valid Ticket!" : "Invalid Ticket!"}</p>
              <p className={`text-xs break-all bg-black/30 p-2 rounded-lg ${scanStatus === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>
                {scanResult}
              </p>
              <button 
                onClick={() => {
                  setScanResult(null);
                  setScanStatus(null);
                  if (scanner) scanner.resume();
                }}
                className="w-full mt-4 py-3 bg-slate-800 text-white font-black rounded-xl text-sm hover:bg-slate-700 transition-all"
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
