"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DriverScanPage() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    // I-initialize ang scanner gamit ang REAR CAMERA (environment)
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        // 🚨 ITO ANG NAG-FORCE SA REAR CAMERA
        videoConstraints: {
          facingMode: "environment" 
        }
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        // Kapag may na-scan
        scanner.clear();
        setScanResult(decodedText);
        
        // Basic validation: dapat nagsisimula sa "TKT-"
        if (decodedText.startsWith("TKT-")) {
          setIsValid(true);
        } else {
          setIsValid(false);
        }
      },
      (error) => {
        // Huwag pansinin ang mga error sa pag-scan
      }
    );

    return () => {
      scanner.clear().catch((e) => console.error("Failed to clear scanner", e));
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <header className="w-full max-w-md flex items-center gap-4 mb-8">
        <Link href="/driver" className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Scan Commuter Ticket</h1>
      </header>

      <main className="w-full max-w-md flex flex-col items-center">
        {!scanResult ? (
          <div className="w-full bg-white rounded-2xl overflow-hidden p-2">
            <div id="reader" className="w-full"></div>
          </div>
        ) : (
          <div className={`w-full p-8 rounded-3xl flex flex-col items-center text-center space-y-4 ${isValid ? 'bg-emerald-950 border border-emerald-500/50' : 'bg-rose-950 border border-rose-500/50'}`}>
            {isValid ? (
              <>
                <CheckCircle2 className="w-16 h-16 text-emerald-400" />
                <h2 className="text-2xl font-bold text-emerald-400">Valid Ticket!</h2>
                <p className="text-slate-300 font-mono text-lg">{scanResult}</p>
                <p className="text-sm text-slate-400">Bigyan ng priority seat ang pasahero.</p>
              </>
            ) : (
              <>
                <XCircle className="w-16 h-16 text-rose-400" />
                <h2 className="text-2xl font-bold text-rose-400">Invalid Ticket</h2>
                <p className="text-sm text-slate-400">Hindi ito galing sa Biyahe Live app.</p>
              </>
            )}
            
            <button 
              onClick={() => {
                setScanResult(null);
                setIsValid(null);
                window.location.reload();
              }}
              className="mt-4 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold transition"
            >
              Scan Another Ticket
            </button>
          </div>
        )}
      </main>
    </div>
  );
}