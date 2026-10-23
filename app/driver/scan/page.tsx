"use client";

import { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { CheckCircle2, XCircle, ArrowLeft, Camera, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function DriverScanPage() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // 🚨 REQUEST CAMERA PERMISSION MUNA
    const requestCamera = async () => {
      try {
        // Hihingi ito ng permission sa browser
        await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setErrorMsg(null);
        startScanner();
      } catch (err: any) {
        console.error("Camera permission denied:", err);
        setErrorMsg("Kailangan ng Camera Permission para mag-scan. Paki-allow sa browser settings.");
      }
    };

    const startScanner = () => {
      // 🚨 I-INITIALIZE ANG SCANNER
      const scanner = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          videoConstraints: { facingMode: "environment" }
        },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          // Kapag may na-scan
          scanner.clear();
          setScanResult(decodedText);
          
          // 🚨 I-PARSE ANG QR DATA (TKT-XXXX|GCASH o TKT-XXXX|CASH)
          const parts = decodedText.split("|");
          const ticketId = parts[0];
          const type = parts[1];

          if (ticketId.startsWith("TKT-")) {
            setIsValid(true);
            setPaymentType(type || "CASH");
          } else {
            setIsValid(false);
            setPaymentType(null);
          }
        },
        (error) => {
          // Huwag pansinin ang bawat error sa pag-scan (normal lang habang naghahanap)
        }
      );
      scannerRef.current = scanner;
    };

    requestCamera();

    return () => {
      // 🚨 CLEANUP
      if (scannerRef.current) {
        scannerRef.current.clear().catch((e) => console.error("Failed to clear scanner", e));
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <header className="w-full max-w-md flex items-center gap-4 mb-8">
        <Link href="/driver" className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Camera className="w-5 h-5 text-emerald-400" /> Scan Commuter Ticket
        </h1>
      </header>

      <main className="w-full max-w-md flex flex-col items-center">
        
        {/* 🚨 ERROR STATE (Camera Permission Denied) */}
        {errorMsg && (
          <div className="w-full p-4 bg-rose-950/80 border border-rose-500/50 rounded-xl mb-4 flex items-start gap-3 text-rose-200">
            <AlertTriangle className="w-6 h-6 shrink-0 text-rose-400" />
            <div>
              <p className="font-bold text-sm">Camera Error</p>
              <p className="text-xs text-rose-300/80">{errorMsg}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold"
              >
                I-refresh ang Page
              </button>
            </div>
          </div>
        )}

        {/* 🚨 SCANNER AREA */}
        {!scanResult && !errorMsg && (
          <div className="w-full bg-white rounded-2xl overflow-hidden p-2">
            <div id="reader" className="w-full"></div>
          </div>
        )}

        {/* 🚨 SCAN RESULT */}
        {scanResult && isValid !== null && (
          <div className={`w-full p-8 rounded-3xl flex flex-col items-center text-center space-y-4 ${isValid ? 'bg-emerald-950 border border-emerald-500/50' : 'bg-rose-950 border border-rose-500/50'}`}>
            {isValid ? (
              <>
                <CheckCircle2 className="w-16 h-16 text-emerald-400" />
                <h2 className="text-2xl font-bold text-emerald-400">Valid Ticket!</h2>
                <p className="text-slate-300 font-mono text-lg">{scanResult.split("|")[0]}</p>
                
                {/* 🚨 PAYMENT INDICATOR */}
                <div className={`mt-3 p-4 rounded-xl border-2 w-full flex flex-col items-center gap-1 ${paymentType === "GCASH" ? 'bg-blue-950/50 border-blue-500' : 'bg-emerald-950/50 border-emerald-500'}`}>
                  {paymentType === "GCASH" ? (
                    <>
                      <WalletIcon className="w-8 h-8 text-blue-400" />
                      <p className="font-bold text-blue-400">GCash Payment</p>
                      <p className="text-[10px] text-slate-400">I-verify sa GCash app kung pumasok ang bayad.</p>
                    </>
                  ) : (
                    <>
                      <CashIcon className="w-8 h-8 text-emerald-400" />
                      <p className="font-bold text-emerald-400">Cash Payment</p>
                      <p className="text-[10px] text-slate-400">Kolektahin ang bayad sa pasahero.</p>
                    </>
                  )}
                </div>
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
                setPaymentType(null);
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

// 🚨 SIMPLE ICONS PARA HINDI NA KAILANGANG MAG-IMPORT NG MARAMI
function WalletIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function CashIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}