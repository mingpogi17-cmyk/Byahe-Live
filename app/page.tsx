"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { database } from "@/lib/firebase";
import { ref, onValue, set, remove } from "firebase/database";
import { 
  Bus, MapPin, Clock, WifiOff, AlertTriangle, Ticket, Navigation, 
  RefreshCw, Megaphone, X, CheckCircle2, Star, ChevronDown, ShieldCheck,
  Share2, CloudRain, Bell, BellRing, Wallet, Siren, Award
} from "lucide-react";

interface TripData {
  tripId: string;
  status: "Available" | "Standing" | "Full";
  location: { lat: number; lng: number };
  seatsAvailable?: number;
  fare?: number;
  isOutOfService?: boolean;
  isEmergency?: boolean;
  updatedAt: number;
  reports?: { correct: number; wrong: number };
  isVerified?: boolean;
}

interface CommunityAlert {
  id: string;
  type: string;
  timestamp: number;
}

interface Shed {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

const SHEDS: Shed[] = [
  { id: "sta_cruz", name: "Sta. Cruz", lat: 6.8342, lng: 125.4149 },
  { id: "digos", name: "Digos City", lat: 6.7497, lng: 125.3572 },
  { id: "panabo", name: "Panabo City", lat: 7.3079, lng: 125.6841 },
  { id: "tagum", name: "Tagum City", lat: 7.4478, lng: 125.8072 },
  { id: "carmen", name: "Carmen", lat: 7.2095, lng: 125.7055 },
  { id: "babak", name: "Babak", lat: 7.1347, lng: 125.6837 },
  { id: "samal", name: "Island Garden City of Samal", lat: 7.0733, lng: 125.7083 },
  { id: "mintal", name: "Mintal", lat: 7.0997, lng: 125.5885 },
  { id: "toril", name: "Toril", lat: 7.0153, lng: 125.4922 },
  { id: "calinan", name: "Calinan", lat: 7.1861, lng: 125.4552 },
];

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

export default function HomePage() {
  const [trips, setTrips] = useState<TripData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  
  const [selectedShed, setSelectedShed] = useState<Shed>(SHEDS[0]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showShedDropdown, setShowShedDropdown] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [activeAlert, setActiveAlert] = useState<CommunityAlert | null>(null);
  const [alarms, setAlarms] = useState<{[key: string]: number}>({});

  const [points, setPoints] = useState(0);
  const [showSosModal, setShowSosModal] = useState(false);
  const [reportedTrips, setReportedTrips] = useState<{[key: string]: boolean}>({});

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardStep, setOnboardStep] = useState(0);

  useEffect(() => {
    const savedPoints = localStorage.getItem("biyahe_points");
    if (savedPoints) setPoints(parseInt(savedPoints));

    const hasOnboarded = localStorage.getItem("biyahe_onboarded");
    if (!hasOnboarded) setShowOnboarding(true);

    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedShedId = localStorage.getItem("favorite_shed");
    if (savedShedId) {
      const shed = SHEDS.find(s => s.id === savedShedId);
      if (shed) { setSelectedShed(shed); setIsFavorite(true); }
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    const tripsRef = ref(database, "live_trips");
    const reportsRef = ref(database, "reports");
    const alertRef = ref(database, "community_alert");

    const unsubTrips = onValue(tripsRef, (snapshot) => {
      setLoading(false);
      setErrorMsg(null);
      setLastRefresh(Date.now());
      if (snapshot.exists()) setTrips(Object.values(snapshot.val()));
      else setTrips([]);
    }, () => {
      setLoading(false);
      setErrorMsg("Hindi makakonekta sa server.");
    });

    const unsubReports = onValue(reportsRef, (snapshot) => {
      if (snapshot.exists()) {
        const reportsData = snapshot.val();
        setTrips(prev => prev.map(trip => ({
          ...trip,
          reports: reportsData[trip.tripId] || { correct: 0, wrong: 0 }
        })));
      }
    });

    const unsubAlert = onValue(alertRef, (snapshot) => {
      if (snapshot.exists()) setActiveAlert(snapshot.val());
      else setActiveAlert(null);
    });

    return () => { unsubTrips(); unsubReports(); unsubAlert(); };
  }, []);

  const sortedAndFilteredTrips = useMemo(() => {
    const nearbyTrips = trips.filter(trip => {
      if (trip.isOutOfService || !trip.location || !trip.location.lat) return false; 
      const distance = getDistance(selectedShed.lat, selectedShed.lng, trip.location.lat, trip.location.lng);
      return distance <= 15;
    });

    return nearbyTrips.sort((a, b) => {
      if (a.status === "Available" && b.status !== "Available") return -1;
      if (a.status !== "Available" && b.status === "Available") return 1;
      const distA = getDistance(selectedShed.lat, selectedShed.lng, a.location.lat, a.location.lng);
      const distB = getDistance(selectedShed.lat, selectedShed.lng, b.location.lat, b.location.lng);
      return distA - distB;
    });
  }, [trips, selectedShed]);

  const getMinutesAgo = (timestamp: number) => Math.max(0, Math.floor((now - timestamp) / 60000));

  const handleFavoriteShed = () => {
    if (isFavorite) { localStorage.removeItem("favorite_shed"); setIsFavorite(false); }
    else { localStorage.setItem("favorite_shed", selectedShed.id); setIsFavorite(true); }
  };

  const handleManualRefresh = () => {
    setLoading(true);
    setLastRefresh(Date.now());
    setTimeout(() => setLoading(false), 500);
  };

  const handleReport = async (tripId: string, type: "correct" | "wrong") => {
    if (reportedTrips[tripId]) {
      alert("Naka-report ka na para sa sasakyang ito.");
      return;
    }

    try {
      const trip = trips.find(t => t.tripId === tripId);
      const currentReports = trip?.reports || { correct: 0, wrong: 0 };
      const updates = {
        correct: type === "correct" ? (currentReports.correct + 1) : currentReports.correct,
        wrong: type === "wrong" ? (currentReports.wrong + 1) : currentReports.wrong,
      };
      await set(ref(database, `reports/${tripId}`), updates);
      if (navigator.vibrate) navigator.vibrate(50);

      const newPoints = points + 5;
      setPoints(newPoints);
      localStorage.setItem("biyahe_points", newPoints.toString());
      setReportedTrips(prev => ({ ...prev, [tripId]: true }));
    } catch (err) { console.error(err); }
  };

  const handleCommunityReport = async (type: string) => {
    try {
      await set(ref(database, "community_alert"), { id: "alert_" + Date.now(), type, timestamp: Date.now() });
      setShowReportModal(false);
    } catch (err) { console.error(err); }
  };

  const handleClearAlert = async () => {
    try { await remove(ref(database, "community_alert")); } catch (err) { console.error(err); }
  };

  const handleShare = async (trip: TripData) => {
    const text = `Biyahe Live Update: May ${trip.status === "Available" ? `${trip.seatsAvailable} upuan` : trip.status} na paparating sa ${selectedShed.name}! Check mo: ${window.location.href}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Biyahe Live", text, url: window.location.href }); } catch (e) {}
    } else {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard! I-paste sa GC/Messenger.");
    }
  };

  const toggleAlarm = (tripId: string) => {
    if (alarms[tripId]) {
      const newAlarms = { ...alarms };
      delete newAlarms[tripId];
      setAlarms(newAlarms);
    } else {
      setAlarms(prev => ({ ...prev, [tripId]: Date.now() + 10 * 60 * 1000 }));
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      alert("Alarm set! Mag-a-alert ang phone mo kapag malapit na ang sasakyan (Mock: 10 mins).");
    }
  };

  const triggerSOS = async () => {
    try {
      await set(ref(database, "sos_alert"), { 
        id: "sos_" + Date.now(), 
        shed: selectedShed.name,
        timestamp: Date.now() 
      });
      setShowSosModal(false);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
      alert("SOS Sent! Na-notify na ang mga driver at authorities sa area.");
    } catch (err) { console.error(err); }
  };

  const handleFinishOnboarding = () => {
    localStorage.setItem("biyahe_onboarded", "true");
    setShowOnboarding(false);
  };

  const handleNextOnboard = () => {
    if (onboardStep < 2) setOnboardStep(prev => prev + 1);
    else handleFinishOnboarding();
  };

  const alertStyles = (type: string) => {
    switch(type) {
      case "May Dumaan": return "bg-emerald-950/80 border-emerald-500/50 text-emerald-300";
      case "Traffic": return "bg-amber-950/80 border-amber-500/50 text-amber-300";
      case "Puno Na": return "bg-rose-950/80 border-rose-500/50 text-rose-300";
      default: return "bg-slate-800 border-slate-600 text-slate-300";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center relative">
      
      {activeAlert && (
        <div className={`fixed top-4 z-50 w-full max-w-md px-4 py-3 rounded-xl border shadow-lg flex items-center justify-between animate-in slide-in-from-top-2 ${alertStyles(activeAlert.type)}`}>
          <div className="flex items-center gap-2 font-bold text-sm">
            <Megaphone className="w-5 h-5" />
            <span>{activeAlert.type} ({getMinutesAgo(activeAlert.timestamp)}m ago)</span>
          </div>
          <button onClick={handleClearAlert} className="p-1 hover:bg-black/20 rounded-full transition"><X className="w-4 h-4" /></button>
        </div>
      )}

      <button onClick={() => setShowSosModal(true)} className="fixed bottom-6 right-6 z-50 p-4 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-2xl shadow-rose-600/50 transition-all flex items-center justify-center animate-pulse">
        <Siren className="w-8 h-8" />
      </button>

      <header className="w-full max-w-md my-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bus className="w-7 h-7 text-emerald-400" />
          <h1 className="text-xl font-bold tracking-wide">BIYAHE LIVE</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-1 rounded-full text-xs font-bold">
            <Award className="w-3.5 h-3.5" /> {points} pts
          </div>
          <Link href="/driver" className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-slate-700 transition-all">
            <Navigation className="w-3.5 h-3.5" /> Driver
          </Link>
        </div>
      </header>

      <main className="w-full max-w-md space-y-4 pt-12">
        
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
            <div className="relative">
              <button onClick={() => setShowShedDropdown(!showShedDropdown)} className="flex items-center gap-2 text-sm font-bold text-slate-200 hover:text-white transition-colors">
                <MapPin className="w-4 h-4 text-emerald-400" />
                {selectedShed.name}
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>
              {showShedDropdown && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
                  {SHEDS.map(shed => (
                    <button key={shed.id} onClick={() => { setSelectedShed(shed); setShowShedDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-700 transition-colors ${selectedShed.id === shed.id ? 'text-emerald-400 font-bold bg-slate-700/50' : 'text-slate-300'}`}>
                      {shed.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-950/30 px-2 py-1 rounded-md border border-blue-900/50">
                <CloudRain className="w-3 h-3" /> 28°C
              </div>
              <button onClick={handleFavoriteShed} className={`p-1.5 rounded-lg transition-colors ${isFavorite ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}>
                <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {getMinutesAgo(lastRefresh) === 0 ? "Ngayon lang" : `${getMinutesAgo(lastRefresh)} min`}
            </span>
            <div className="flex items-center gap-2">
              <Link href="/commuter/ticket" className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1">
                <Ticket className="w-3 h-3" /> Ticket
              </Link>
              <button onClick={() => setShowReportModal(true)} className="px-3 py-1 bg-amber-500/10 border border-amber-500/50 text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-500 hover:text-white transition-all flex items-center gap-1">
                <Megaphone className="w-3 h-3" /> Report
              </button>
              <button onClick={handleManualRefresh} className={`p-1.5 rounded-lg hover:bg-slate-800 transition-all ${loading ? 'animate-spin text-emerald-400' : 'text-slate-400'}`}>
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {isOffline && (
          <div className="p-4 bg-amber-950/90 border border-amber-600/50 rounded-xl flex items-center gap-3 text-amber-200">
            <WifiOff className="w-6 h-6 shrink-0 text-amber-400" />
            <div><p className="font-bold text-sm">Walang Koneksyon</p><p className="text-xs text-amber-300/80">Nasa offline mode ka.</p></div>
          </div>
        )}

        {errorMsg && !isOffline && (
          <div className="p-4 bg-rose-950/90 border border-rose-600/50 rounded-xl flex items-center gap-3 text-rose-200">
            <AlertTriangle className="w-6 h-6 shrink-0 text-rose-400" />
            <div><p className="font-bold text-sm">Problema</p><p className="text-xs text-rose-300/80">{errorMsg}</p></div>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 animate-pulse"></div>
                  <div className="space-y-2 flex-1"><div className="h-4 w-1/2 bg-slate-800 rounded animate-pulse"></div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && sortedAndFilteredTrips.length === 0 && !errorMsg && (
          <div className="py-12 px-6 bg-slate-900 rounded-2xl border border-slate-800 text-center space-y-3">
            <Bus className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="font-bold text-slate-300">Walang biyahe sa malapit</p>
            <p className="text-xs text-slate-500">Mag-refresh mamaya o mag-report kung may dumaan.</p>
          </div>
        )}

        {!loading && sortedAndFilteredTrips.length > 0 && (
          <div className="space-y-3 pb-20">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              PAPARATING SA {selectedShed.name.toUpperCase()} ({sortedAndFilteredTrips.length})
            </p>

            {sortedAndFilteredTrips.map((trip) => {
              const minsAgo = getMinutesAgo(trip.updatedAt);
              const isStale = minsAgo >= 30;
              const distance = getDistance(selectedShed.lat, selectedShed.lng, trip.location.lat, trip.location.lng);
              const trustScore = trip.reports ? trip.reports.correct - trip.reports.wrong : 0;
              const isLowTrust = trustScore < -2;
              const hasAlarm = alarms[trip.tripId];
              const fareDisplay = trip.fare ? `₱${trip.fare}` : "₱15";
              const isReported = reportedTrips[trip.tripId];

              return (
                <div key={trip.tripId} className={`p-5 rounded-2xl border transition-all ${isStale || isLowTrust ? "opacity-40 grayscale" : "bg-slate-900 border-slate-800 shadow-md"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-950/60 rounded-xl border border-emerald-800/40 text-emerald-400"><Bus className="w-5 h-5" /></div>
                      <div>
                        <h2 className="font-bold text-base flex items-center gap-1.5">
                          PUJ / PUV #{trip.tripId.slice(-4).toUpperCase()}
                          {trip.isVerified && <ShieldCheck className="w-4 h-4 text-blue-400" />}
                        </h2>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {distance.toFixed(1)} km away</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${trip.status === "Available" ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60" : trip.status === "Standing" ? "bg-amber-950/80 text-amber-300 border-amber-700/60" : "bg-rose-950/80 text-rose-300 border-rose-700/60"}`}>
                        {trip.status === "Available" ? `${trip.seatsAvailable ?? '?'} upuan` : trip.status === "Standing" ? "Tayo Lang" : "Puno Na"}
                      </span>
                      <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                        <Wallet className="w-3 h-3" /> {fareDisplay}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {minsAgo === 0 ? "Ngayon lang" : `${minsAgo} min`}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleAlarm(trip.tripId)} className={`flex items-center gap-1 transition-colors ${hasAlarm ? 'text-amber-400 font-bold' : 'text-slate-500 hover:text-slate-300'}`}>
                        {hasAlarm ? <BellRing className="w-3.5 h-3.5 animate-pulse" /> : <Bell className="w-3.5 h-3.5" />}
                        {hasAlarm ? "Alarm On" : "Set Alarm"}
                      </button>
                      <button onClick={() => handleShare(trip)} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                        <Share2 className="w-3.5 h-3.5" /> Share
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500">Tama ba ito?</span>
                    <button disabled={isReported} onClick={() => handleReport(trip.tripId, "correct")} className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${isReported ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-950/50 border border-emerald-800/50 text-emerald-400 hover:bg-emerald-500 hover:text-white'}`}>
                      👍 Tama ({trip.reports?.correct ?? 0})
                    </button>
                    <button disabled={isReported} onClick={() => handleReport(trip.tripId, "wrong")} className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${isReported ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-rose-950/50 border border-rose-800/50 text-rose-400 hover:bg-rose-500 hover:text-white'}`}>
                      👎 Mali ({trip.reports?.wrong ?? 0})
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-slate-500 my-8 pb-16 flex flex-col items-center gap-2">
        <p>Biyahe Live © 2026 · Developed by Ray Mar Olandria</p>
        <Link href="/privacy" className="text-slate-400 hover:text-emerald-400 underline transition-colors">
          Privacy Policy & Terms of Service
        </Link>
      </footer>

      {showReportModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Megaphone className="w-5 h-5 text-amber-400" /> Report Situation</h2>
              <button onClick={() => setShowReportModal(false)} className="p-1 text-slate-400 hover:text-white transition"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-400 mb-4">Pumili ng sitwasyon sa waiting shed ngayon.</p>
            <div className="space-y-2">
              {["May Dumaan", "Traffic", "Puno Na", "Walang Dumadaan"].map((situation) => (
                <button key={situation} onClick={() => handleCommunityReport(situation)} className="w-full p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left font-semibold text-sm transition-all flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-slate-500" /> {situation}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSosModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-rose-950 border border-rose-600 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200 text-center">
            <Siren className="w-16 h-16 text-rose-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-black text-white mb-2">Kumpirmahin ang SOS</h2>
            <p className="text-sm text-rose-200 mb-6">I-tap ang "Send SOS" kung may emergency.</p>
            <div className="space-y-3">
              <button onClick={triggerSOS} className="w-full py-4 bg-rose-600 text-white font-black text-lg rounded-xl shadow-lg hover:bg-rose-500 transition-all">
                SEND SOS NOW
              </button>
              <button onClick={() => setShowSosModal(false)} className="w-full py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ONBOARDING MODAL - FIXED */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-300 text-center flex flex-col items-center">
            
            {onboardStep === 0 && (
              <>
                <div className="p-4 bg-emerald-950/80 rounded-full mb-6 border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <Bus className="w-12 h-12 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Welcome sa Biyahe Live!</h2>
                <p className="text-sm text-slate-400 mb-8">Ang iyong kasama sa pag-commute sa Davao. Alam mo na bago ka pa umabang.</p>
              </>
            )}

            {onboardStep === 1 && (
              <>
                <div className="p-4 bg-amber-950/80 rounded-full mb-6 border border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                  <Wallet className="w-12 h-12 text-amber-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Mabilis at Madali</h2>
                <p className="text-sm text-slate-400 mb-8">Kumuha ng QR Ticket para sa priority seat, mag-report ng sitwasyon, at makakuha ng Biyahe Points para sa rewards!</p>
              </>
            )}

            {onboardStep === 2 && (
              <>
                <div className="p-4 bg-rose-950/80 rounded-full mb-6 border border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                  <Siren className="w-12 h-12 text-rose-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Ligtas Ka, Alam Namin</h2>
                <p className="text-sm text-slate-400 mb-8">May SOS button para sa emergency. I-tap lang ito para ma-alert ang mga driver at authorities sa area.</p>
              </>
            )}

            <div className="flex gap-2 w-full mt-4">
              <button onClick={handleFinishOnboarding} className="flex-1 py-3 bg-slate-800 text-slate-400 font-bold rounded-xl text-sm hover:bg-slate-700 transition-all">
                Skip
              </button>
              <button onClick={handleNextOnboard} className="flex-1 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-sm hover:bg-emerald-400 transition-all">
                {onboardStep === 2 ? "Get Started" : "Next"}
              </button>
            </div>
            
            <div className="flex gap-2 mt-6">
              {[0, 1, 2].map(i => (
                <div key={i} className={`w-2 h-2 rounded-full transition-all ${onboardStep === i ? 'bg-emerald-400 w-6' : 'bg-slate-700'}`}></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}