"use client";

import Link from "next/link";
import { ArrowLeft, QrCode } from "lucide-react";

export default function ScanPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-start">
          <Link href="/driver/scan"> className="p-2 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700">
            <ArrowLeft className="w-6 h-6" />
          </Link>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-4">
          <QrCode className="w-24 h-24 text-emerald-400 mx-auto" />
          <h1 className="text-2xl font-black">Scanner Ready</h1>
          <p className="text-slate-400 text-sm">
            Dito na ilalagay yung camera scanner para sa QR tickets ng mga pasahero.
          </p>
        </div>
      </div>
    </div>
  );
}