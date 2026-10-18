# Biyahe Live — Passenger Home Screen (MVP boilerplate)

Next.js (App Router) + Tailwind CSS v4 + lucide-react.

## Setup

If you already ran `npx create-next-app@latest biyahe-live --typescript --tailwind --app`,
you have a project folder with its own `tailwind.config`-free, Tailwind v4
setup already in place. Don't copy this repo's config files over it —
just copy these four items into the matching spots, overwriting when asked:

- `app/layout.tsx`
- `app/globals.css`
- `app/page.tsx`
- the whole `components/` folder

Then:

```bash
npm install lucide-react
npm run dev
```

No `tailwind.config.ts` or `postcss.config.js` here — Tailwind v4 reads
its theme straight from the `@theme` block inside `app/globals.css`,
and `create-next-app` already generated the correct `postcss.config.mjs`
for you.

## What's included

- `app/page.tsx` — the passenger home screen: search, destination filter
  chips (Digos / Tagum / Mati / Malita / Nabunturan), the live trip list,
  an offline banner, and the "I'm the first passenger" broadcast trigger.
- `components/LiveTripCard.tsx` — one broadcasted trip, styled after a
  physical van destination board (route code, seats, ETA, last-seen shed,
  passenger confirmation count).
- `components/useConnectionStatus.ts` — tracks `navigator.onLine` so the
  UI can flip into SMS-fallback mode the moment signal drops.
- `components/ConnectionBanner.tsx` — the SMS-fallback CTA. It opens the
  native SMS app via an `sms:` link with a pre-filled, parseable body
  (`LIVE <origin> <destination> <seats>`) so a gateway number can turn
  offline reports back into live-trip updates once received.
- `tailwind.config.ts` — the route-board color tokens (`route`, `signal`,
  `alert`, `ink`, `paper`, `line`).

## Wiring this to a real backend (next steps, not included here)

1. **Realtime data**: replace `MOCK_TRIPS` with a subscription (Supabase
   Realtime, Firebase RTDB, or a WebSocket) keyed by route, so new
   driver/passenger reports push into the list without a refresh.
2. **Live Trip broadcast**: the "I'm the first passenger" button should
   open a short flow — pick origin/destination, confirm seat count —
   then start a `setInterval` posting a lightweight ping (shed name from
   geolocation reverse-lookup, or a manual "I'm now at ___" picker for
   low-end phones without GPS) every 1–2 minutes. Keep payloads tiny;
   this is the "minimal data consumption" requirement.
2. **SMS gateway**: the `SMS_GATEWAY_NUMBER` placeholder needs a real
   inbound number wired to a parser (Twilio, Semaphore, or a PH telco
   SMS API) that turns `LIVE <origin> <destination> <seats>` texts back
   into a live-trip record, for the mountainous no-signal stretches.
3. **Map view**: this screen is the list view; a companion `/map` route
   can reuse `LiveTrip` and plot `currentShed` coordinates with a
   lightweight library (MapLibre GL) rather than a heavier Google Maps
   bundle, again for data-consumption reasons.
4. **Driver dashboard**: a separate `/driver` route reusing the same
   design tokens — a big status field ("Tagum Terminal → Davao City, 3
   seats left, leaving in 5 mins") and a one-tap "Update now" action.
5. **PWA service worker**: add `next-pwa` (or a hand-rolled service
   worker) for offline shell caching and installability; `manifest.json`
   is already in `public/`.
