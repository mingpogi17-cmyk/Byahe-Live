"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, Mail, MapPin, Database, Lock, Phone } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 pb-20">
      <div className="max-w-md mx-auto space-y-6">
        
        <header className="flex items-center gap-4 mb-8">
          <Link href="/" className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" /> Privacy & Terms
          </h1>
        </header>

        <main className="space-y-6 text-sm text-slate-300 leading-relaxed">
          
          {/* Section 1 */}
          <section className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" /> 1. Ano ang Kinokolekta Namin?
            </h2>
            <p>
              Para gumana ang <strong>Biyahe Live</strong>, kinokolekta namin ang mga sumusunod:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li><strong>Lokasyon (GPS):</strong> Para makita ng mga commuter kung nasaan na ang sasakyan, at para malaman ng driver kung saan may naghihintay.</li>
              <li><strong>Anonymous User ID:</strong> Para hindi magulo ang system at para hindi maka-spam ang isang user. Walang pangalan, walang cellphone number.</li>
              <li><strong>Feedback:</strong> Mga suhestiyon na ibinibigay ninyo para mapabuti ang app.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" /> 2. Paano Ginagamit ang Data?
            </h2>
            <p>
              Ang lokasyon ay <strong>pansamantalang naka-save sa aming secure na database (Firebase)</strong> habang may aktibong "Biyahe" o "Paghihintay". 
            </p>
            <p>
              <strong>Hindi namin ibinebenta</strong> ang inyong data sa mga third-party na kumpanya. Ang data ay ginagamit lamang para sa real-time monitoring at pag-compute ng ETA at Pamasahe.
            </p>
          </section>

          {/* Section 3 */}
          <section className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" /> 3. Safety at Security
            </h2>
            <p>
              Ang app ay gumagamit ng Anonymous Authentication para hindi mo kailangang mag-register ng email o password. Ikaw ay anonymous sa system, pero ang iyong lokasyon ay nakikita lamang ng mga drivers at commuters sa parehong ruta.
            </p>
          </section>

          {/* Section 4 */}
          <section className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400" /> 4. Makipag-ugnayan
            </h2>
            <p>Kung may tanong, reklamo, o nais ipa-delete ang inyong data, maaari kaming kontakin sa:</p>
            
            <div className="space-y-2 mt-3">
              {/* 🚨 PALITAN MO ITO NG TOTOONG EMAIL MO */}
              <a href="mailto:raymar.olandria@gmail.com" className="flex items-center gap-3 bg-slate-800 p-3 rounded-xl hover:bg-slate-700 transition">
                <Mail className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="font-bold text-white text-sm">Email Support</p>
                  <p className="text-xs text-slate-400">raymar.olandria@gmail.com</p>
                </div>
              </a>

              {/* 🚨 PALITAN MO ITO NG TOTOONG FB PAGE LINK MO */}
              <a href="https://facebook.com/biyahelive" target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-slate-800 p-3 rounded-xl hover:bg-slate-700 transition">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="font-bold text-white text-sm">Facebook Page</p>
                  <p className="text-xs text-slate-400">fb.com/biyahelive</p>
                </div>
              </a>
            </div>
          </section>

          {/* Developer Info */}
          <div className="text-center pt-6">
            <p className="text-xs text-slate-500">
              Biyahe Live is developed by Ray Mar Olandria.<br/>
              Last updated: October 2026.
            </p>
          </div>

        </main>
      </div>
    </div>
  );
}