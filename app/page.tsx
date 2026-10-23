"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { database } from "@/lib/firebase";
import { ref, onValue, set, remove } from "firebase/database";
import { 
  Bus, MapPin, Clock, WifiOff, AlertTriangle, Ticket, Navigation, 
  RefreshCw, Megaphone, X, CheckCircle2, Star, ChevronDown, ShieldCheck,
  Share2, Bell, BellRing, Wallet, Siren, Award, Search, Phone, Flame, HeartPulse, Car, Users
} from "lucide-react";

// 🚨 LTFRB REGION XI FARE RATES
const FARE_RATES = {
  jeepney: { base: 14, baseKm: 4, perKm: 2.00, name: "Traditional Jeepney" },
  modernJeep: { base: 17, baseKm: 4, perKm: 2.40, name: "Modern Jeepney" },
  provincialBus: { base: 12, baseKm: 5, perKm: 2.20, name: "Provincial Bus" },
  cityBusOrdinary: { base: 15, baseKm: 5, perKm: 2.49, name: "City Bus (Ordinary)" },
  cityBusAircon: { base: 18, baseKm: 5, perKm: 2.97, name: "City Bus (Aircon)" },
  uvExpress: { base: 0, baseKm: 0, perKm: 2.60, name: "UV Express" },
};

interface TripData {
  tripId: string; status: "Available" | "Standing" | "Full";
  location: { lat: number; lng: number }; seatsAvailable?: number; fare?: number;
  isOutOfService?: boolean; isEmergency?: boolean; isGcashEnabled?: boolean;
  vehicleType?: "Van" | "Bus" | "Taxi" | "Tricycle"; isAircon?: boolean; plateNumber?: string;
  updatedAt: number; reports?: { correct: number; wrong: number }; isVerified?: boolean;
}
interface CommunityAlert { id: string; type: string; timestamp: number; }
interface Shed { id: string; name: string; lat: number; lng: number; }

// 🚨 DAVAO DEL SUR SHEDS ONLY
const SHEDS: Shed[] = [
  { id: "digos", name: "Digos", lat: 6.7497, lng: 125.3572 },
  { id: "sta_cruz", name: "Sta. Cruz", lat: 6.8342, lng: 125.4149 },
  { id: "bansalan", name: "Bansalan", lat: 6.78611, lng: 125.21333 },
  { id: "hagonoy", name: "Hagonoy", lat: 6.6892, lng: 125.3256 },
  { id: "magsaysay", name: "Magsaysay", lat: 6.7667, lng: 125.1833 },
  { id: "matanao", name: "Matanao", lat: 6.7092, lng: 125.2178 },
  { id: "padada", name: "Padada", lat: 6.6413, lng: 125.3451 },
  { id: "sulop", name: "Sulop", lat: 6.6000, lng: 125.3500 },
  { id: "malalag", name: "Malalag", lat: 6.6000, lng: 125.4000 },
  { id: "kiblawan", name: "Kiblawan", lat: 6.61417, lng: 125.23667 },
];

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// 🚨 FARE COMPUTATION FUNCTION (With Discount)
const computeFare = (distanceKm: number, vehicleType: string, isAircon: boolean, discounted: boolean = false) => {
  let rate = FARE_RATES.uvExpress; // Default sa Van
  if (vehicleType === "Bus") rate = isAircon ? FARE_RATES.cityBusAircon : FARE_RATES.provincialBus;
  else if (vehicleType === "Tricycle") rate = FARE_RATES.jeepney;
  else if (vehicleType === "Taxi") rate = FARE_RATES.cityBusOrdinary;
  else if (vehicleType === "Van") rate = FARE_RATES.uvExpress;

  let baseFare = rate.base;
  let perKm = rate.perKm;

  // 🚨 20% DISCOUNT (Student, Senior, PWD, Pregnant)
  if (discounted) {
    baseFare = baseFare * 0.8;
    perKm = perKm * 0.8;
  }

  if (distanceKm <= rate.baseKm) return baseFare;
  return baseFare + ((distanceKm - rate.baseKm) * perKm);
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
  const [isWaiting, setIsWaiting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFareMatrix, setShowFareMatrix] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState<"All" | "Van" | "Bus" | "Taxi" | "Tricycle">("All");
  const [comfortFilter, setComfortFilter] = useState<"All" | "Aircon" | "Non-Aircon">("All");
  const [emergencyData, setEmergencyData] = useState<any>(null);
  const [lastReportTime, setLastReportTime] = useState(0);
  const [dailyPoints, setDailyPoints] = useState(0);
  const [lastMilestone, setLastMilestone] = useState<number>(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardStep, setOnboardStep] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  
  // 🚨 DISCOUNT STATE
  const [isDiscounted, setIsDiscounted] = useState(false);

  useEffect(() => {
    const savedPoints = localStorage.getItem("biyahe_points");
    if (savedPoints) setPoints(parseInt(savedPoints));
    const savedDaily = localStorage.getItem("biyahe_daily_points");
    if (savedDaily) setDailyPoints(parseInt(savedDaily));
    const hasOnboarded = localStorage.getItem("biyahe_onboarded");
    if (!hasOnboarded) setShowOnboarding(true);
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const waitingRef = ref(database, "waiting_commuters");
    const unsub = onValue(waitingRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        let count = 0;
        Object.values(data).forEach((val: any) => {
          if (val.shed === selectedShed.name && (!val.expiresAt || Date.now() < val.expiresAt)) count++;
        });
        setWaitingCount(count);
      } else setWaitingCount(0);
    });
    return () => unsub();
  }, [selectedShed]);

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
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, []);

  useEffect(() => {
    fetch("/emergency-directory.json").then(res => res.json()).then(data => {
      const shedKey = Object.keys(data).find(key => selectedShed.name.includes(key));
      setEmergencyData(data[shedKey || "Default"]);
    }).catch(err => console.error("Emergency fetch error:", err));
  }, [selectedShed]);

  useEffect(() => {
    setLoading(true);
    const tripsRef = ref(database, "live_trips");
    const reportsRef = ref(database, "reports");
    const alertRef = ref(database, "community_alert");

    const unsubTrips = onValue(tripsRef, (snapshot) => {
      setLoading(false); setErrorMsg(null); setLastRefresh(Date.now());
      if (snapshot.exists()) setTrips(Object.values(snapshot.val())); else setTrips([]);
    }, () => { setLoading(false); setErrorMsg("Hindi makakonekta sa server."); });

    const unsubReports = onValue(reportsRef, (snapshot) => {
      if (snapshot.exists()) {
        const reportsData = snapshot.val();
        setTrips(prev => prev.map(trip => ({ ...trip, reports: reportsData[trip.tripId] || { correct: 0, wrong: 0 } })));
      }
    });

    const unsubAlert = onValue(alertRef, (snapshot) => {
      if (snapshot.exists()) {
        const alertData = snapshot.val();
        if (alertData.expiresAt && Date.now() > alertData.expiresAt) { remove(alertRef); setActiveAlert(null); }
        else setActiveAlert(alertData);
      } else setActiveAlert(null);
    });

    return () => { unsubTrips(); unsubReports(); unsubAlert(); };
  }, []);

  const sortedAndFilteredTrips = useMemo(() => {
    let filtered = trips.filter(trip => {
      if (trip.isOutOfService || !trip.location || !trip.location.lat) return false; 
      const distance = getDistance(selectedShed.lat, selectedShed.lng, trip.location.lat, trip.location.lng);
      if (distance > 15) return false;
      if (vehicleFilter !== "All" && trip.vehicleType !== vehicleFilter) return false;
      if (comfortFilter === "Aircon" && !trip.isAircon) return false;
      if (comfortFilter === "Non-Aircon" && trip.isAircon) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      if (a.status === "Available" && b.status !== "Available") return -1;
      if (a.status !== "Available" && b.status === "Available") return 1;
      const distA = getDistance(selectedShed.lat, selectedShed.lng, a.location.lat, a.location.lng);
      const distB = getDistance(selectedShed.lat, selectedShed.lng, b.location.lat, b.location.lng);
      return distA - distB;
    });
  }, [trips, selectedShed, vehicleFilter, comfortFilter]);

  useEffect(() => {
    if (sortedAndFilteredTrips.length > 0) {
      const nearestTrip = sortedAndFilteredTrips[0];
      const distance = getDistance(selectedShed.lat, selectedShed.lng, nearestTrip.location.lat, nearestTrip.location.lng);
      if (distance <= 0.5 && lastMilestone < 3) { if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]); alert("🔔 500m away! Hapit na moabot."); setLastMilestone(3); }
      else if (distance <= 1 && lastMilestone < 2) { if (navigator.vibrate) navigator.vibrate([100, 50, 100]); alert("⏳ 1km away! Paghanda na."); setLastMilestone(2); }
      else if (distance <= 2 && lastMilestone < 1) { if (navigator.vibrate) navigator.vibrate([100]); alert("🚐 2km away! Hapit na."); setLastMilestone(1); }
    }
  }, [sortedAndFilteredTrips, selectedShed, lastMilestone]);

  const getMinutesAgo = (timestamp: number) => Math.max(0, Math.floor((now - timestamp) / 60000));
  const handleFavoriteShed = () => { if (isFavorite) { localStorage.removeItem("favorite_shed"); setIsFavorite(false); } else { localStorage.setItem("favorite_shed", selectedShed.id); setIsFavorite(true); } };
  const handleManualRefresh = () => { setLoading(true); setLastRefresh(Date.now()); setTimeout(() => setLoading(false), 500); };

  const handleWaitingPing = async () => {
    try {
      await set(ref(database, "waiting_commuters"), { id: Date.now(), shed: selectedShed.name, timestamp: Date.now(), expiresAt: Date.now() + (5 * 60 * 1000) });
      setIsWaiting(true); alert("Na-notify na ang mga driver sa area!");
    } catch (err) { console.error(err); }
  };

  const handleRequestStop = async () => {
    try {
      await set(ref(database, "stop_request"), { id: Date.now(), shed: selectedShed.name, timestamp: Date.now() });
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]); alert("🔔 Na-notify na ang driver!");
    } catch (err) { console.error(err); }
  };

  const handleReport = async (tripId: string, type: "correct" | "wrong") => {
    if (reportedTrips[tripId]) return alert("Naka-report ka na.");
    try {
      const trip = trips.find(t => t.tripId === tripId);
      const currentReports = trip?.reports || { correct: 0, wrong: 0 };
      const updates = { correct: type === "correct" ? (currentReports.correct + 1) : currentReports.correct, wrong: type === "wrong" ? (currentReports.wrong + 1) : currentReports.wrong };
      await set(ref(database, `reports/${tripId}`), updates);
      if (navigator.vibrate) navigator.vibrate(50);
      const newPoints = points + 5; setPoints(newPoints); localStorage.setItem("biyahe_points", newPoints.toString()); setReportedTrips(prev => ({ ...prev, [tripId]: true }));
    } catch (err) { console.error(err); }
  };

  const handleCommunityReport = async (type: string) => {
    if (Date.now() - lastReportTime < 10 * 60 * 1000) return alert("Nag-report ka na kamakailan lang.");
    if (dailyPoints >= 50) return alert("Naabot mo na ang max points ngayong araw.");
    try {
      const newPoints = points + 5; const newDailyPoints = dailyPoints + 5;
      setPoints(newPoints); setDailyPoints(newDailyPoints);
      localStorage.setItem("biyahe_points", newPoints.toString()); localStorage.setItem("biyahe_daily_points", newDailyPoints.toString()); setLastReportTime(Date.now());
      await set(ref(database, "community_alert"), { id: "alert_" + Date.now(), type, timestamp: Date.now(), expiresAt: Date.now() + (5 * 60 * 1000) });
      setShowReportModal(false); if (navigator.vibrate) navigator.vibrate(50); alert(`Salamat! +5 Points!`);
    } catch (err) { console.error(err); }
  };

  const handleClearAlert = async () => { try { await remove(ref(database, "community_alert")); } catch (err) {} };
  const handleShare = async (trip: TripData) => {
    const text = `Biyahe Live: May ${trip.status === "Available" ? `${trip.seatsAvailable} upuan` : trip.status} sa ${selectedShed.name}! ${window.location.href}`;
    if (navigator.share) { try { await navigator.share({ title: "Biyahe Live", text }); } catch (e) {} }
    else { await navigator.clipboard.writeText(text); alert("Copied!"); }
  };

  const toggleAlarm = (tripId: string) => {
    if (alarms[tripId]) { const newAlarms = { ...alarms }; delete newAlarms[tripId]; setAlarms(newAlarms); }
    else { setAlarms(prev => ({ ...prev, [tripId]: Date.now() + 10 * 60 * 1000 })); if (navigator.vibrate) navigator.vibrate([100, 50, 100]); alert("Alarm set!"); }
  };

  const triggerSOS = async () => {
    try {
      await set(ref(database, "sos_alert"), { id: "sos_" + Date.now(), shed: selectedShed.name, timestamp: Date.now() });
      setShowSosModal(false); if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]); alert("SOS Sent!");
    } catch (err) { console.error(err); }
  };

  const handleFinishOnboarding = () => { localStorage.setItem("biyahe_onboarded", "true"); setShowOnboarding(false); };
  const handleNextOnboard = () => { if (onboardStep < 2) setOnboardStep(prev => prev + 1); else handleFinishOnboarding(); };

  const searchedTrips = useMemo(() => {
    if (!searchQuery) return sortedAndFilteredTrips;
    const query = searchQuery.toLowerCase();
    return sortedAndFilteredTrips.filter(trip => {
      return trip.tripId.toLowerCase().includes(query) || trip.vehicleType?.toLowerCase().includes(query);
    });
  }, [sortedAndFilteredTrips, searchQuery]);

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
          <div className="flex items-center gap-2 font-bold text-sm"><Megaphone className="w-5 h-5" /><span>{activeAlert.type} ({getMinutesAgo(activeAlert.timestamp)}m ago)</span></div>
          <button onClick={handleClearAlert} className="p-1 hover:bg-black/20 rounded-full transition"><X className="w-4 h-4" /></button>
        </div>
      )}

      <button onClick={() => setShowSosModal(true)} className="fixed bottom-24 right-6 z-50 p-4 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-2xl shadow-rose-600/50 transition-all flex items-center justify-center animate-pulse"><Siren className="w-8 h-8" /></button>

      <header className="w-full max-w-md my-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bus className="w-7 h-7 text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold tracking-wide">BIYAHE LIVE</h1>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase">Davao del Sur</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-1 rounded-full text-xs font-bold"><Award className="w-3.5 h-3.5" /> {points} pts</div>
          <Link href="/driver" className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-slate-700 transition-all"><Navigation className="w-3.5 h-3.5" /> Driver</Link>
        </div>
      </header>

      <main className="w-full max-w-md space-y-4 pt-4">
        
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Search vehicle or type..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all" />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {["All", "Van", "Bus", "Taxi", "Tricycle"].map(v => (
              <button key={v} onClick={() => setVehicleFilter(v as any)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${vehicleFilter === v ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>{v}</button>
            ))}
            <button onClick={() => setComfortFilter(comfortFilter === "Aircon" ? "All" : "Aircon")} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${comfortFilter === "Aircon" ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300'}`}>❄️ Aircon</button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
            <div className="relative">
              <button onClick={() => setShowShedDropdown(!showShedDropdown)} className="flex items-center gap-2 text-sm font-bold text-slate-200 hover:text-white transition-colors">
                <MapPin className="w-4 h-4 text-emerald-400" /> {selectedShed.name} <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>
              {showShedDropdown && (
                <div className="absolute top-full left-0 mt-2 w-56 max-h-64 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-1">
                  {SHEDS.map(shed => (
                    <button key={shed.id} onClick={() => { setSelectedShed(shed); setShowShedDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-700 transition-colors ${selectedShed.id === shed.id ? 'text-emerald-400 font-bold bg-slate-700/50' : 'text-slate-300'}`}>{shed.name}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowFareMatrix(true)} className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/30 px-2 py-1 rounded-md border border-amber-900/50"><Wallet className="w-3 h-3" /> Fare Guide</button>
              <button onClick={handleFavoriteShed} className={`p-1.5 rounded-lg transition-colors ${isFavorite ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}><Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} /></button>
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
            <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {getMinutesAgo(lastRefresh) === 0 ? "Ngayon lang" : `${getMinutesAgo(lastRefresh)} min`}</span>
            <div className="flex items-center gap-2">
              <Link href="/commuter/ticket" className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1"><Ticket className="w-3 h-3" /> Ticket</Link>
              <button onClick={() => setShowReportModal(true)} className="px-3 py-1 bg-amber-500/10 border border-amber-500/50 text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-500 hover:text-white transition-all flex items-center gap-1"><Megaphone className="w-3 h-3" /> Report</button>
              <button onClick={handleManualRefresh} className={`p-1.5 rounded-lg hover:bg-slate-800 transition-all ${loading ? 'animate-spin text-emerald-400' : 'text-slate-400'}`}><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleWaitingPing} disabled={isWaiting} className={`py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all ${isWaiting ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/50 cursor-not-allowed' : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg'}`}><BellRing className="w-3 h-3" /> {isWaiting ? "Waiting..." : "Naghihintay Ako"}</button>
            <button onClick={handleRequestStop} className="py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 bg-rose-600 text-white hover:bg-rose-500 shadow-lg"><Bell className="w-3 h-3" /> Munaog Ko</button>
          </div>

          {/* 🚨 DISCOUNT TOGGLE */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 mt-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-sm font-bold text-white">Discounted Fare (20%)</p>
                <p className="text-[10px] text-slate-400">Student, Senior, PWD, Pregnant</p>
              </div>
            </div>
            <button 
              onClick={() => setIsDiscounted(!isDiscounted)} 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isDiscounted ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}
            >
              {isDiscounted ? "ON" : "OFF"}
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1"><Users className="w-3 h-3" /> Naghihintay sa Shed:</span>
            <span className={`text-xs font-bold ${waitingCount > 5 ? 'text-rose-400' : waitingCount > 2 ? 'text-amber-400' : 'text-emerald-400'}`}>{waitingCount} {waitingCount === 1 ? 'tao' : 'katao'}</span>
          </div>
        </div>

        {isOffline && (<div className="p-4 bg-amber-950/90 border border-amber-600/50 rounded-xl flex items-center gap-3 text-amber-200"><WifiOff className="w-6 h-6 shrink-0 text-amber-400" /><div><p className="font-bold text-sm">Walang Koneksyon</p></div></div>)}
        {errorMsg && !isOffline && (<div className="p-4 bg-rose-950/90 border border-rose-600/50 rounded-xl flex items-center gap-3 text-rose-200"><AlertTriangle className="w-6 h-6 shrink-0 text-rose-400" /><div><p className="font-bold text-sm">Problema</p></div></div>)}

        {loading && (<div className="space-y-3">{[1, 2, 3].map((i) => (<div key={i} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-800 animate-pulse"></div><div className="space-y-2 flex-1"><div className="h-4 w-1/2 bg-slate-800 rounded animate-pulse"></div></div></div></div>))}</div>)}

        {!loading && searchedTrips.length === 0 && !errorMsg && (<div className="py-12 px-6 bg-slate-900 rounded-2xl border border-slate-800 text-center space-y-3"><Bus className="w-12 h-12 text-slate-600 mx-auto" /><p className="font-bold text-slate-300">Walang biyahe sa malapit</p></div>)}

        {!loading && searchedTrips.length > 0 && (
          <div className="space-y-3 pb-20">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">PAPARATING SA {selectedShed.name.toUpperCase()} ({searchedTrips.length})</p>
            {searchedTrips.map((trip) => {
              const minsAgo = getMinutesAgo(trip.updatedAt); const isStale = minsAgo >= 30;
              const distance = getDistance(selectedShed.lat, selectedShed.lng, trip.location.lat, trip.location.lng);
              const trustScore = trip.reports ? trip.reports.correct - trip.reports.wrong : 0; const isLowTrust = trustScore < -2;
              const hasAlarm = alarms[trip.tripId];
              
              // 🚨 COMPUTE FARE BASE SA DISTANCE + DISCOUNT
              const estimatedFare = computeFare(distance, trip.vehicleType || "Van", trip.isAircon || false, isDiscounted);
              const fareDisplay = `₱${estimatedFare.toFixed(0)}`;
              
              const isReported = reportedTrips[trip.tripId];
              const VehicleIcon = trip.vehicleType === "Bus" ? Bus : trip.vehicleType === "Taxi" ? Car : trip.vehicleType === "Tricycle" ? Car : Bus;

              return (
                <div key={trip.tripId} className={`p-5 rounded-2xl border transition-all ${isStale || isLowTrust ? "opacity-40 grayscale" : "bg-slate-900 border-slate-800 shadow-md"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-950/60 rounded-xl border border-emerald-800/40 text-emerald-400"><VehicleIcon className="w-5 h-5" /></div>
                      <div>
                        <h2 className="font-bold text-base flex items-center gap-1.5">{trip.vehicleType || "Van"} {trip.plateNumber ? `#${trip.plateNumber}` : `#${trip.tripId.slice(-4).toUpperCase()}`}{trip.isVerified && <ShieldCheck className="w-4 h-4 text-blue-400" />}</h2>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {distance.toFixed(1)} km away {trip.isAircon && "❄️"}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${trip.status === "Available" ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60" : trip.status === "Standing" ? "bg-amber-950/80 text-amber-300 border-amber-700/60" : "bg-rose-950/80 text-rose-300 border-rose-700/60"}`}>
                        {trip.status === "Available" ? `${trip.seatsAvailable ?? '?'} upuan` : trip.status === "Standing" ? "Tayo Lang" : "Puno Na"}
                      </span>
                      <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5" title="Estimated fare base sa LTFRB Matrix + Distance"><Wallet className="w-3 h-3" /> {fareDisplay}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {minsAgo === 0 ? "Ngayon lang" : `${minsAgo} min`}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleAlarm(trip.tripId)} className={`flex items-center gap-1 transition-colors ${hasAlarm ? 'text-amber-400 font-bold' : 'text-slate-500 hover:text-slate-300'}`}>
                        {hasAlarm ? <BellRing className="w-3.5 h-3.5 animate-pulse" /> : <Bell className="w-3.5 h-3.5" />} {hasAlarm ? "Alarm On" : "Set Alarm"}
                      </button>
                      <button onClick={() => handleShare(trip)} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                        <Share2 className="w-3.5 h-3.5" /> Share
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500">Tama ba ito?</span>
                    <button disabled={isReported} onClick={() => handleReport(trip.tripId, "correct")} className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${isReported ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-950/50 border border-emerald-800/50 text-emerald-400 hover:bg-emerald-500 hover:text-white'}`}>👍 Tama ({trip.reports?.correct ?? 0})</button>
                    <button disabled={isReported} onClick={() => handleReport(trip.tripId, "wrong")} className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${isReported ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-rose-950/50 border border-rose-800/50 text-rose-400 hover:bg-rose-500 hover:text-white'}`}>👎 Mali ({trip.reports?.wrong ?? 0})</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-slate-500 my-8 pb-16 flex flex-col items-center gap-2">
        <p>Biyahe Live © 2026 · Developed by Ray Mar Olandria</p>
        <Link href="/privacy" className="text-slate-400 hover:text-emerald-400 underline transition-colors">Privacy Policy & Terms of Service</Link>
      </footer>

      {showReportModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Megaphone className="w-5 h-5 text-amber-400" /> Abiso sa Kapwa Commuter</h2>
              <button onClick={() => setShowReportModal(false)} className="p-1 text-slate-400 hover:text-white transition"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-400 mb-4">Pumili ng sitwasyon sa waiting shed ngayon.</p>
            <div className="space-y-2">
              {[
                { icon: "🚐", label: "May Dumaan na Van/Bus" },
                { icon: "🚦", label: "Traffic / Mabagal ang Daloy" },
                { icon: "🚔", label: "May Checkpoint / Enforcer" },
                { icon: "⏳", label: "Matagal nang Walang Dumadaan" },
              ].map((item) => (
                <button key={item.label} onClick={() => handleCommunityReport(item.label)} className="w-full p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left font-semibold text-sm transition-all flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span> {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSosModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-rose-950 border border-rose-600 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black text-white flex items-center gap-2"><Siren className="w-6 h-6 text-rose-500 animate-pulse" /> Emergency Hotlines</h2>
              <button onClick={() => setShowSosModal(false)} className="p-1 text-slate-400 hover:text-white transition"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-rose-200 mb-4">Location: <span className="font-bold text-white">{selectedShed.name}</span></p>
            {emergencyData ? (
              <div className="space-y-3">
                <a href={`tel:${emergencyData.pnp}`} className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-700 hover:bg-slate-800 transition-all group">
                  <div className="flex items-center gap-3"><div className="p-2 bg-blue-950 text-blue-400 rounded-lg"><ShieldCheck className="w-5 h-5" /></div><div><p className="font-bold text-white text-sm">PNP {selectedShed.name}</p><p className="text-xs text-slate-400">{emergencyData.pnp}</p></div></div>
                  <Phone className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                </a>
                <a href={`tel:${emergencyData.bfp}`} className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-700 hover:bg-slate-800 transition-all group">
                  <div className="flex items-center gap-3"><div className="p-2 bg-rose-950 text-rose-400 rounded-lg"><Flame className="w-5 h-5" /></div><div><p className="font-bold text-white text-sm">BFP {selectedShed.name}</p><p className="text-xs text-slate-400">{emergencyData.bfp}</p></div></div>
                  <Phone className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                </a>
                <a href={`tel:${emergencyData.rescue}`} className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-700 hover:bg-slate-800 transition-all group">
                  <div className="flex items-center gap-3"><div className="p-2 bg-emerald-950 text-emerald-400 rounded-lg"><HeartPulse className="w-5 h-5" /></div><div><p className="font-bold text-white text-sm">Rescue / MDRRMO {selectedShed.name}</p><p className="text-xs text-slate-400">{emergencyData.rescue}</p></div></div>
                  <Phone className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                </a>
              </div>
            ) : (<p className="text-center text-slate-400 py-4">Kinakarga ang emergency contacts...</p>)}
            <div className="mt-4 pt-4 border-t border-rose-800/50">
              <a href="tel:911" className="flex items-center justify-center w-full py-3 bg-rose-600 text-white font-black rounded-xl shadow-lg hover:bg-rose-500 transition-all gap-2"><Siren className="w-5 h-5" /> CALL 911 (National)</a>
            </div>
            <p className="text-center text-[10px] text-rose-300/80 mt-3">Kung wala ka sa {selectedShed.name}, i-dial ang 911.</p>
          </div>
        </div>
      )}

      {/* 🚨 FARE MATRIX MODAL */}
      {showFareMatrix && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Wallet className="w-5 h-5 text-amber-400" /> Fare Guide</h2>
              <button onClick={() => setShowFareMatrix(false)} className="p-1 text-slate-400 hover:text-white transition"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-4 mb-4">
              <p className="text-xs text-amber-300 leading-relaxed">
                ⚠️ Base sa LTFRB Region XI Matrix. Ang aktwal na pamasahe ay depende sa exact distance, dagdag (aircon, bagahe), at driver. Paki-kumpirma sa konduktor.
              </p>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              <div className="flex items-center justify-between bg-slate-800 p-3 rounded-xl border border-slate-700">
                <span className="text-sm text-slate-300">Provincial Bus (Ordinary)</span>
                <span className="text-sm font-black text-amber-400">₱12 + ₱2.20/km</span>
              </div>
              <div className="flex items-center justify-between bg-slate-800 p-3 rounded-xl border border-slate-700">
                <span className="text-sm text-slate-300">City Bus (Aircon)</span>
                <span className="text-sm font-black text-amber-400">₱18 + ₱2.97/km</span>
              </div>
              <div className="flex items-center justify-between bg-slate-800 p-3 rounded-xl border border-slate-700">
                <span className="text-sm text-slate-300">UV Express (Van)</span>
                <span className="text-sm font-black text-amber-400">₱2.60/km</span>
              </div>
              <div className="flex items-center justify-between bg-slate-800 p-3 rounded-xl border border-slate-700">
                <span className="text-sm text-slate-300">Traditional Jeepney</span>
                <span className="text-sm font-black text-amber-400">₱14 + ₱2.00/km</span>
              </div>
              <div className="flex items-center justify-between bg-slate-800 p-3 rounded-xl border border-slate-700">
                <span className="text-sm text-slate-300">Modern Jeepney</span>
                <span className="text-sm font-black text-amber-400">₱17 + ₱2.40/km</span>
              </div>
              <div className="flex items-center justify-between bg-slate-800 p-3 rounded-xl border border-slate-700">
                <span className="text-sm text-slate-300">Taxi (Metered)</span>
                <span className="text-sm font-black text-amber-400">₱45-₱50 flagdown</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                💡 20% discount para sa Student, Senior, PWD, at Pregnant. I-on ang toggle sa Commuter View.
              </p>
            </div>
            <button onClick={() => setShowFareMatrix(false)} className="w-full mt-4 py-3 bg-amber-500 text-slate-950 font-black rounded-xl text-sm hover:bg-amber-400 transition-all">Close</button>
          </div>
        </div>
      )}

      {showOnboarding && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-300 text-center flex flex-col items-center">
            {onboardStep === 0 && (<><div className="p-4 bg-emerald-950/80 rounded-full mb-6 border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]"><Bus className="w-12 h-12 text-emerald-400" /></div><h2 className="text-2xl font-black text-white mb-2">Welcome sa Biyahe Live!</h2><p className="text-sm text-slate-400 mb-8">Ang iyong kasama sa pag-commute sa Davao del Sur.</p></>)}
            {onboardStep === 1 && (<><div className="p-4 bg-amber-950/80 rounded-full mb-6 border border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.3)]"><Wallet className="w-12 h-12 text-amber-400" /></div><h2 className="text-2xl font-black text-white mb-2">Mabilis at Madali</h2><p className="text-sm text-slate-400 mb-8">Kumuha ng QR Ticket para sa priority seat, mag-report ng sitwasyon, at makakuha ng Biyahe Points!</p></>)}
            {onboardStep === 2 && (<><div className="p-4 bg-rose-950/80 rounded-full mb-6 border border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.3)]"><Siren className="w-12 h-12 text-rose-400" /></div><h2 className="text-2xl font-black text-white mb-2">Ligtas Ka, Alam Namin</h2><p className="text-sm text-slate-400 mb-8">May SOS button para sa emergency. I-tap lang ito para ma-alert ang mga driver at authorities sa area.</p></>)}
            <div className="flex gap-2 w-full mt-4">
              <button onClick={handleFinishOnboarding} className="flex-1 py-3 bg-slate-800 text-slate-400 font-bold rounded-xl text-sm hover:bg-slate-700 transition-all">Skip</button>
              <button onClick={handleNextOnboard} className="flex-1 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-sm hover:bg-emerald-400 transition-all">{onboardStep === 2 ? "Get Started" : "Next"}</button>
            </div>
            <div className="flex gap-2 mt-6">{[0, 1, 2].map(i => (<div key={i} className={`w-2 h-2 rounded-full transition-all ${onboardStep === i ? 'bg-emerald-400 w-6' : 'bg-slate-700'}`}></div>))}</div>
          </div>
        </div>
      )}
    </div>
  );
}