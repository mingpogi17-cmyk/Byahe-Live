"use client";

import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back to App
        </Link>
        
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-10 h-10 text-emerald-400" />
          <h1 className="text-3xl font-black">Data Privacy & Terms</h1>
        </div>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-2">1. Ano ang Biyahe Live?</h2>
            <p>Ang Biyahe Live ay isang community-based transport tracking app. Ito ay isang independent project at hindi affiliated sa LTFRB, LGU, o kahit anong transport agency.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">2. Anong Data ang Kinokolekta Namin?</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Anonymous ID:</strong> Gumagamit kami ng Firebase Anonymous Auth. Hindi namin kinokolekta ang iyong pangalan, email, o numero.</li>
              <li><strong>Location (GPS):</strong> Kinokolekta namin ang lokasyon ng Driver habang naka-ON ang "Start Trip" para makita ng mga commuter. Ang lokasyon ng Commuter ay hindi ini-save.</li>
              <li><strong>Reports:</strong> Ang iyong mga report (Tama/Mali/SOS) ay naka-save para mapabuti ang serbisyo.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">3. Paano Namin Ginagamit ang Data?</h2>
            <p>Ang location data ay ginagamit lamang para sa real-time tracking. Hindi namin ibinebenta o ibinabahagi ang iyong data sa third-party advertisers.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">4. Emergency Disclaimer (SOS)</h2>
            <p>Ang SOS button ay nagbibigay ng alerto sa mga driver na gumagamit ng app, ngunit <strong>hindi ito kapalit ng 911</strong>. Sa oras ng emergency, mangyaring tumawag agad sa local authorities.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">5. Limitation of Liability</h2>
            <p>Ang Biyahe Live ay hindi mananagot sa anumang aksidente, delay, o pagkawala ng gamit habang gumagamit ng pampublikong sasakyan. Ito ay isang tool para sa impormasyon lamang.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">6. Contact</h2>
            <p>Para sa mga katanungan, mag-email sa: <strong>support@biyahelive.app</strong> (placeholder).</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
          Last updated: October 2026
        </div>
      </div>
    </div>
  );
}