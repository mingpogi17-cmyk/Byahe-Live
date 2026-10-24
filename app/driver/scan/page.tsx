"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, QrCode, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function ScanPage() {
  const { toast } = useToast();
  const [scanResult, setScanResult] = useState<string | null>(null);

  useEffect(() => {
    // I-load ang scanner library dynamically (client-side only)
    let scanner: any;

    const initScanner = async () => {
      const { Html5QrcodeScanner } = await import("html5-qrcode");
      
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText: string) => {
          // 🚨 PAGKA-SCAN, I-STOP ANG CAMERA AT IPAKITA ANG RESULT
          setScanResult(decodedText);
          scanner.clear();
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          toast("Ticket Scanned Successfully!", "success");
        },
        (error: any) => {
          // Huwag pansinin ang bawat failed scan (normal lang yun habang naghahanap)
        }
      );
    };

    initScanner();

    return () => {
      if (scanner) {
        scanner.clear().catch((err: any) => console.error("Failed to clear scanner", err));
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
          <p className="text-slate-400 text-sm">
            I-align ang QR code ng pasahero sa loob ng box.
          </p>

          {/* 🚨 DITO LALABAS ANG CAMERA */}
          {!scanResult ? (
            <div id="reader" className="w-full rounded-xl overflow-hidden border border-slate-700 bg-black min-h-[250px]"></div>
          ) : (
            <div className="bg-emerald-950/50 border border-emerald-500/50 p-6 rounded-xl space-y-3 animate-in zoom-in">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
              <p className="font-bold text-lg text-white">Valid Ticket!</p>
              <p className="text-xs text-emerald-300 break-all bg-black/30 p-2 rounded-lg">
                {scanResult}
              </p>
              <button 
                onClick={() => setScanResult(null)} // Reset para maka-scan ulit
                className="w-full mt-4 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-sm hover:bg-emerald-400 transition-all"
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