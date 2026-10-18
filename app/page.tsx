"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navigation, Bus, ArrowRight, Download } from "lucide-react";

export default function HomePage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstall(false);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white flex flex-col items-center justify-center p-6 relative">
      
      {/* Install Button - Premium Style */}
      {showInstall && (
        <button 
          onClick={handleInstallClick} 
          className="absolute top-6 right-6 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-emerald-500 hover:text-white transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
        >
          <Download className="w-4 h-4" /> Install App
        </button>
      )}

      {/* Logo and Title */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Bus className="w-12 h-12 text-emerald-400" />
          <h1 className="text-4xl md:text-5xl font-black tracking-wide bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">BIYAHE LIVE</h1>
        </div>
        <p className="text-slate-400 text-lg">Davao Region Commuter Telemetry System</p>
      </div>

      {/* Role Selection Cards */}
      <div className="w-full max-w-md space-y-4">
        <Link 
          href="/driver" 
          className="block p-6 bg-[#111827] border border-slate-800 rounded-2xl hover:border-emerald-500/50 hover:bg-[#1f2937] transition-all group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 to-emerald-500/5 group-hover:to-emerald-500/10 transition-all"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-950/80 rounded-xl border border-emerald-800/50 text-emerald-400 shadow-inner">
                <Navigation className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">Driver / Conductor</h2>
                <p className="text-sm text-slate-400">Start a trip and broadcast your location</p>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link 
          href="/commuter" 
          className="block p-6 bg-[#111827] border border-slate-800 rounded-2xl hover:border-blue-500/50 hover:bg-[#1f2937] transition-all group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-blue-500/5 group-hover:to-blue-500/10 transition-all"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-950/80 rounded-xl border border-blue-800/50 text-blue-400 shadow-inner">
                <Bus className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">Commuter</h2>
                <p className="text-sm text-slate-400">See approaching vehicles at your shed</p>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-xs text-slate-600">
        <p>Developed by Ray Mar Olandria</p>
        <p className="mt-1">Biyahe Live © 2026</p>
      </footer>
    </div>
  );
}