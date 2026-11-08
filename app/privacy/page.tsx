"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, FileText, Info, Code, AlertTriangle, Mail, Facebook } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="p-2 bg-slate-900 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white">Privacy Policy & Terms</h1>
            <p className="text-xs text-slate-400">Last updated: November 2026</p>
          </div>
        </div>

        {/* INDEPENDENCE NOTICE (CRITICAL FOR BFP) */}
        <div className="bg-rose-950/30 border border-rose-900/50 p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-rose-400 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5" /> Independence Notice
          </h2>
          <p className="text-sm leading-relaxed text-rose-200/80">
            <strong>Biyahe Live is a private, independent initiative.</strong> While the developer is an active member of the emergency response community, this application is <strong>NOT</strong> an official platform of the Bureau of Fire Protection (BFP), Philippine National Police (PNP), or any Local Government Unit (LGU). It is not funded, endorsed, or operated by the government. All emergency hotline numbers provided are for public utility and informational purposes only.
          </p>
        </div>

        {/* PRIVACY POLICY */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" /> 1. Privacy Policy (Data We Collect)
          </h2>
          <div className="text-sm space-y-3 leading-relaxed">
            <p>Para gumana ang Biyahe Live, nangongolekta kami ng ilang mahahalagang impormasyon:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li><strong>Location Data (GPS):</strong> Ginagamit namin ang iyong lokasyon para malaman ang pinakamalapit na sasakyan at para makapagpadala ng emergency report. Hindi ito ibinabahagi sa mga third-party advertisers.</li>
              <li><strong>Emergency Photos & Reports:</strong> Ang mga litrato at landmark na isinusumite mo sa "Report Emergency" ay direktang mapupunta sa secure na database ng LDRRMO/PNP/BFP dashboard.</li>
              <li><strong>Device Info & Anonymous IDs:</strong> Gumagamit kami ng Firebase Anonymous Authentication para sa security at upang maiwasan ang spam at fake reports.</li>
            </ul>
          </div>
        </section>

        {/* DATA SOURCES */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <FileText className="w-5 h-5 text-blue-400" /> 2. Data Sources & Accuracy
          </h2>
          <div className="text-sm space-y-3 leading-relaxed">
            <p>Ang impormasyon sa app na ito ay galing sa mga sumusunod:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li><strong>Fare Matrix:</strong> Base sa LTFRB Region XI matrix. Ang aktwal na pamasahe ay maaaring magbago depende sa usapan ng driver at pasahero.</li>
              <li><strong>Emergency Hotlines:</strong> Mula sa localized directory ng Davao del Sur. Bagama't sinisikap nating maging updated, maaaring magbago ang mga numero nang walang abiso.</li>
              <li><strong>Live Tracking:</strong> Nakadepende sa GPS signal ng driver. Ang ETA (Estimated Time of Arrival) ay isang estimate lamang at hindi garantisadong eksakto.</li>
            </ul>
          </div>
        </section>

        {/* TERMS OF SERVICE */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Info className="w-5 h-5 text-amber-400" /> 3. Terms of Service (Rules)
          </h2>
          <div className="text-sm space-y-3 leading-relaxed">
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li><strong>Walang Fake Reports:</strong> Mahigpit na ipinagbabawal ang pagpapadala ng pekeng emergency reports. Ito ay may kaakibat na pananagutan sa batas at maaaring magresulta sa pag-ban ng iyong device.</li>
              <li><strong>Emergency Life-Line:</strong> Ang Biyahe Live ay isang *supplementary tool*. Sa mga kritikal na emergency, ang pagtawag sa <strong>911</strong> o sa lokal na hotline ay dapat pa ring unahin.</li>
              <li><strong>Liability:</strong> Ang developer ay hindi mananagot sa anumang pinsala, pagkaantala ng dispatch, o maling impormasyon na dulot ng paggamit ng app.</li>
            </ul>
          </div>
        </section>

        {/* MAKIPAG-UGNAYAN */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Mail className="w-5 h-5 text-emerald-400" /> 4. Makipag-ugnayan
          </h2>
          <div className="text-sm space-y-3 leading-relaxed">
            <p>Kung may tanong, reklamo, o nais ipa-delete ang inyong data, maaari kaming kontakin sa:</p>
            <div className="space-y-3 mt-2">
              <a href="mailto:biyahelive@gmail.com" className="flex items-center gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800 hover:bg-slate-800 transition-colors">
                <Mail className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-sm font-bold text-white">Email Support</p>
                  <p className="text-xs text-slate-400">biyahelive@gmail.com</p>
                </div>
              </a>
              <a href="https://facebook.com/BiyaheLiveApp" target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800 hover:bg-slate-800 transition-colors">
                <Facebook className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm font-bold text-white">Facebook Page</p>
                  <p className="text-xs text-slate-400">facebook.com/BiyaheLiveApp</p>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* DEVELOPER PROFILE */}
        <section className="space-y-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl mt-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Code className="w-5 h-5 text-emerald-400" /> About the Developer
          </h2>
                   <div className="text-sm space-y-2">
            <p><strong>Biyahe Live</strong></p>
            <p className="text-slate-400 italic">Solo Developer & Founder</p>
            <p className="text-slate-400">Davao del Sur, Philippines</p>
            <p className="mt-4 text-xs text-slate-500 leading-relaxed">
              "Biyahe Live is a passion project built by a solo developer from Davao del Sur. This app bridges the gap between commuters, drivers, and emergency responders through technology. It is an independent, community-driven initiative, not affiliated with any government agency."
            </p>
          </div>
        </section>

        {/* FOOTER */}
        <div className="text-center pt-8 border-t border-slate-800">
          <p className="text-xs text-slate-500">© 2026 Biyahe Live. All rights reserved.</p>
          <Link href="/" className="text-emerald-400 hover:underline text-sm mt-2 inline-block">
            Bumalik sa Home
          </Link>
        </div>

      </div>
    </div>
  );
}
