"use client";

import Link from "next/link";
import { Navigation, Bus, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      {/* Logo and Title */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Bus className="w-12 h-12 text-emerald-400" />
          <h1 className="text-4xl md:text-5xl font-black tracking-wide">BIYAHE LIVE</h1>
        </div>
        <p className="text-slate-400 text-lg">Davao Region Commuter Telemetry System</p>
      </div>

      {/* Role Selection Cards */}
      <div className="w-full max-w-md space-y-4">
        {/* Driver Card */}
        <Link 
          href="/driver" 
          className="block p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-emerald-500/50 hover:bg-slate-800 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-950/80 rounded-xl border border-emerald-800/50 text-emerald-400">
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

        {/* Commuter Card */}
        <Link 
          href="/commuter" 
          className="block p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-blue-500/50 hover:bg-slate-800 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-950/80 rounded-xl border border-blue-800/50 text-blue-400">
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