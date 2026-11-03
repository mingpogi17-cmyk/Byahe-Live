
 BIYAHE LIVE: MASTER CONTEXT & SUMMARY (Para sa New Chat)
👤 USER CONTEXT
Founder: Ray Mar Olandria (Active BFP Firefighter, Sta. Cruz, Davao del Sur).

App: Biyahe Live (PWA para sa Commuters at Drivers).

Timeline: Soft Launch (Nov 6), Grand Launch (Dec 1). Aalis papuntang Manila sa Nov 6.

Strategy: "Fame muna bago Pera." Libre sa users, kumita via B2B (Fleet Operators) at LGU partnerships in the future.

Legal/Compliance: Bawal ang uniporme sa profile. May "Independence Notice" para iwas Conflict of Interest (BFP).

🛠️ TECH STACK
Framework: Next.js 15 (App Router), React, Tailwind CSS.

Backend: Firebase Realtime Database, Firebase Auth (Anonymous & Email/Password).

Hosting: Vercel.

PWA: @ducanh2912/next-pwa (Naka-configure na, disable sa dev mode).

Repo: https://github.com/mingopi17-cmyk/Biyahe-Live (Tandaan: walang "ma", "cmyk" ang dulo).

Live URL: https://biyahe-live.vercel.app

✅ FINALIZED FEATURES (ALL WORKING)
1. Commuter App (app/page.tsx)
Auto-Select Nearest Shed: Kusang nagbabago ang dropdown base sa GPS location (e.g., Sta. Cruz or Digos).

Photo Compression: Bago i-save, kino-compress ang image sa 800px width (60% quality) para mabilis mag-upload.

Camera & Gallery Options: May dalawang button na para sa "Take Photo" at "Gallery".

GPS Fallback & Landmark: Kung walang GPS, gagamitin ang Shed location. Mandatory ang "Landmark" input.

Silent SOS (Shake to SOS): 4 shakes sa loob ng 2 seconds, magpapadala ng harassment alert.

Smart Hotlines: Base sa GPS, ipinapakita ang localized PNP, BFP, at Rescue numbers.

3-Strikes Ban: Naka-check sa Firebase kung banned ang user ID (Hindi na makakapag-report).

2. Driver App (app/driver/page.tsx)
Start/End Trip: Nagsisimula ang broadcast kapag pinindot ito.

Destination Dropdown: Pinipili kung saan papunta (Sta. Cruz, Digos, etc.).

Reserved Seats: May toggle para mag-reserve ng upuan para sa mga walk-in passengers (walang cellphone).

Waiting Ping Filter: "Any" o specific vehicle. Kung "Motor" lang, motor drivers lang ang makaka-receive ng alert.

3. LDRRMO Unified Command Center (app/ldrrmo/page.tsx)
Smart Audio:

Sta. Cruz + Sunog: Looping Siren (siren.mp3).

Sta. Cruz + Iba pa: Looping Beep (beep.mp3).

Labas ng Sta. Cruz: Isang beses lang tutunog ang beep (walang loop).

Live Timer: Nakikita kung ilang minuto na pending ang report.

Location Details: May indicator kung ✅ GPS Exact Location o ⚠️ Shed Reference Only (No GPS) at ang Landmark.

Mini-Map Preview: May maliit na Google Map embed para agad makita kung scam o totoo ang report.

Clear Resolved Button: Binubura ang mga verified at dismissed reports para malinis ang UI.

Dispatch Notes: Pwedeng mag-iwan ng mensahe sa ibang responders.

3-Strikes Ban System: Kapag ni-dismiss ang report, nagkaka-strike ang user. Pag umabot ng 3, banned na.

4. Security & Database
Vercel Headers: X-Frame-Options: DENY, X-Content-Type-Options: nosniff (Naka-set sa next.config.ts).

Middleware: Naka-lock ang /ldrrmo at /admin routes.

Firebase Rules: Nakalock via auth != null at may user_strikes at banned_users nodes.

📝 CRITICAL REMINDERS PARA SA SUSUNOD NA CHAT
Line Number Editing: Kung maliit lang ang edit, HUWAG MAG-PASTE NG BUONG FILE. Gamitin ang First Line / Last Line method o magbigay ng specific line numbers.

Environment Variables: Kapag nag-clone ng repo sa bagong laptop, gumawa ng .env.local at ilagay: NEXT_PUBLIC_ADMIN_PASSWORD=biyahelive2026.

Nawalang Landmark: Sa huling edit (Camera/Gallery), siguraduhing hindi nakalimutan ang <input> para sa Landmark sa Emergency Modal.

Shed Name: Pinalitan ang "Sta. Cruz" ng "Santa Cruz" sa lib/constants.ts.

Push Strategy: Dahil mahirap i-setup ang Git sa bagong laptop, ginagamit namin ang GitHub Web Editor (Pindutin ang tuldok . sa repo) para mag-edit at mag-commit nang direkta sa browser.

🗺️ ROADMAP (Phase 2 & 3)
Phase 2: Passenger-Scan QR (sticker sa van), Driver Verification, Trust Score System, Web Push Notifications (FCM para tumunog kahit naka-lock ang phone), Localized Municipality Filters.

Phase 3: Operator Dashboard (B2B), Fleet QR Stickers, Subscriptions (₱5k-₱20k/month), In-App Wallet.

🎯 IMMEDIATE TODO (Before Nov 6 Soft Launch)
I-check ang Landmark Input sa Emergency Modal (app/page.tsx) kung nawala.

I-commit/push ang mga huling pagbabago sa GitHub.

Ground Game: Pitch sa LDRRMO, PNP, BFP (Naka-smart casual, walang uniporme). I-setup ang LDRRMO account.

Driver Onboarding: Pumunta sa terminal, mag-install sa 5 drivers, bigyan ng QR stickers.

FB Teaser: Mag-post ng screenshots ng app sa Facebook Page (facebook.com/BiyaheLiveApp).
