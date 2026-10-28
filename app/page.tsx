"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { database } from "@/lib/firebase";
import { ref, set, push, get } from "firebase/database";
import { 
  Bus, MapPin, Clock, WifiOff, AlertTriangle, Navigation, 
  RefreshCw, Megaphone, X, CheckCircle2, Star, ChevronDown, ShieldCheck,
  Share2, Bell, BellRing, Wallet, Siren, Award, Search, Phone, Flame, HeartPulse, Car, Users, Bed, Settings, Timer, Coffee, MessageSquare, Mic
} from "lucide-react";

import { SHEDS, STORAGE_KEYS, COOLDOWNS, TripData, Shed } from "@/lib/constants";
import { getDistance, computeFare, estimateEtaMinutes, formatEta } from "@/lib/geo";
import { useTrips } from "@/lib/useTrips";
import { useAlerts } from "@/lib/useAlerts";
import { useUserId } from "@/lib/useUserId";
import { useToast } from "@/components/Toast";

export default function HomePage() {
  const userId = useUserId();
  const { toast } = useToast();
  
  const [selectedShed, setSelectedShed] = useState<Shed>(SHEDS[0]);
  const { activeAlert, waitingCount, sendWaitingPing, cancelWaitingPing, requestStop, sendCommunityReport, clearCommunityAlert } = useAlerts(selectedShed.name);
  const { trips, loading, errorMsg } = useTrips();

  const [isOffline, setIsOffline] = useState(false);
  const [now, setNow] = useState<number>(Date.now());
  
  const [isFavorite, setIsFavorite] = useState(false);
  const [showShedDropdown, setShowShedDropdown] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  const [alarms, setAlarms] = useState<{[key: string]: number}>({});
  const [points, setPoints] = useState(0);
  const [showSosModal, setShowSosModal] = useState(false);
  const [showGcashModal, setShowGcashModal] = useState(false);
  
  // 🚨 FEEDBACK STATES
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  
  const [reportedTrips, setReportedTrips] = useState<{[key: string]: boolean}>({});
  const [isWaiting, setIsWaiting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFareMatrix, setShowFareMatrix] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState<"All" | "Van" | "Bus" | "Taxi" | "Tricycle" | "Motor" | "MiniBus">("All");
  const [comfortFilter, setComfortFilter] = useState<"All" | "Aircon" | "Non-Aircon">("All");
  const [emergencyData, setEmergencyData] = useState<any>(null);
  
  const [lastReportTime, setLastReportTime] = useState(0);
  const [dailyPoints, setDailyPoints] = useState(0);
  const [lastMilestone, setLastMilestone] = useState<number>(0);
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardStep, setOnboardStep] = useState(0);
  
  const [isDiscounted, setIsDiscounted] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showSleepAlarm, setShowSleepAlarm] = useState(false);
  const [sleepDestination, setSleepDestination] = useState<string | null>(null);
  const [sleepAlarmActive, setSleepAlarmActive] = useState(false);
  const [sleepAlarmDistance, setSleepAlarmDistance] = useState<number>(1);
  const [commuterLocation, setCommuterLocation] = useState<{lat: number, lng: number} | null>(null);

  // 🚨 POCKET MODE & SHAKE TO SOS STATES
  const [isPocketMode, setIsPocketMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [reportText, setReportText] = useState("");
  const [showStandbyEmergencyModal, setShowStandbyEmergencyModal] = useState(false);
  const [allEmergencyData, setAllEmergencyData] = useState<any>(null);

  useEffect(() => {
    const savedPocketMode = localStorage.getItem("biyahe_pocket_mode");
    if (savedPocketMode === "true") setIsPocketMode(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("biyahe_pocket_mode", isPocketMode.toString());
  }, [isPocketMode]);

  // 🚨 SHAKE TO SOS LOGIC (4 rapid shakes within 2000ms, threshold 30)
  useEffect(() => {
    let shakeTimes: number[] = [];
    const SHAKE_THRESHOLD = 30;

    const triggerSilentSOS = async () => {
      try {
        let hasAudio = false;
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            hasAudio = true;
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();
            setTimeout(() => {
              if (mediaRecorder.state !== "inactive") {
                mediaRecorder.stop();
                stream.getTracks().forEach((track) => track.stop());
              }
            }, 15000);
          } catch (e) {
            console.log("Audio recording permission denied or error:", e);
          }
        }

        const activeTicketId = localStorage.getItem("active_ticket");
        let targetDriverId: string | null = null;

        if (activeTicketId) {
          try {
            const ticketSnapshot = await get(ref(database, `tickets/${activeTicketId}`));
            if (ticketSnapshot.exists()) {
              const ticketData = ticketSnapshot.val();
              if (ticketData.driverId) {
                targetDriverId = ticketData.driverId;
              }
            }
          } catch (err) {
            console.error("Error checking active ticket for driverId:", err);
          }
        }

        const sosPayload: any = {
          id: "sos_" + Date.now(),
          type: "harassment",
          userId: userId || "anonymous",
          lat: commuterLocation?.lat || selectedShed.lat,
          lng: commuterLocation?.lng || selectedShed.lng,
          shed: selectedShed.name,
          hasAudio,
          timestamp: Date.now()
        };

        if (targetDriverId) {
          sosPayload.targetDriverId = targetDriverId;
        }

        await push(ref(database, "sos_alert"), sosPayload);
        toast("Safety ping sent.", "info");
      } catch (err) {
        console.error("Error triggering silent SOS:", err);
      }
    };

    const handleMotion = (event: DeviceMotionEvent) => {
      if (isPocketMode) return;
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;
      const totalAcc = Math.sqrt(x * x + y * y + z * z);

      if (totalAcc > SHAKE_THRESHOLD) {
        const now = Date.now();
        shakeTimes = shakeTimes.filter((t) => now - t <= 2000);
        shakeTimes.push(now);

        if (shakeTimes.length >= 4) {
          shakeTimes = [];
          triggerSilentSOS();
        }
      }
    };

    if (typeof window !== "undefined" && "DeviceMotionEvent" in window) {
      window.addEventListener("devicemotion", handleMotion);
    }
    return () => {
      if (typeof window !== "undefined" && "DeviceMotionEvent" in window) {
        window.removeEventListener("devicemotion", handleMotion);
      }
    };
  }, [isPocketMode, commuterLocation, selectedShed, userId, toast]);

  useEffect(() => {
    const savedPoints = localStorage.getItem(STORAGE_KEYS.points);
    if (savedPoints) setPoints(parseInt(savedPoints));
    const savedDaily = localStorage.getItem(STORAGE_KEYS.dailyPoints);
    if (savedDaily) setDailyPoints(parseInt(savedDaily));
    const savedReportTime = localStorage.getItem(STORAGE_KEYS.lastReportTime);
    if (savedReportTime) setLastReportTime(parseInt(savedReportTime));
    const hasOnboarded = localStorage.getItem(STORAGE_KEYS.onboarded);
    if (!hasOnboarded) setShowOnboarding(true);
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (pos) => setCommuterLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("GPS error:", err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    if (!commuterLocation) return;
    const distanceToShed = getDistance(commuterLocation.lat, commuterLocation.lng, selectedShed.lat, selectedShed.lng);
    const isNearShed = distanceToShed <= 0.05;
    
    if (isNearShed && !isWaiting) { 
      sendWaitingPing(commuterLocation.lat, commuterLocation.lng); 
      setIsWaiting(true); 
    } else if (!isNearShed && isWaiting) {
      cancelWaitingPing();
      setIsWaiting(false);
    }
  }, [commuterLocation, selectedShed, isWaiting, sendWaitingPing, cancelWaitingPing]);

  useEffect(() => {
    const savedShedId = localStorage.getItem(STORAGE_KEYS.favoriteShed);
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
      if (distance > 2.5 && lastMilestone > 0) setLastMilestone(0);
      if (distance <= 0.5 && lastMilestone < 3) { 
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]); 
        toast("🔔 500m away! Hapit na moabot.", "success"); 
        setLastMilestone(3); 
      } else if (distance <= 1 && lastMilestone < 2) { 
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]); 
        toast("⏳ 1km away! Paghanda na.", "info"); 
        setLastMilestone(2); 
      } else if (distance <= 2 && lastMilestone < 1) { 
        if (navigator.vibrate) navigator.vibrate([100]); 
        toast("🚐 2km away! Hapit na.", "info"); 
        setLastMilestone(1); 
      }
    }
  }, [sortedAndFilteredTrips, selectedShed, lastMilestone, toast]);

  useEffect(() => {
    if (!sleepAlarmActive || !sleepDestination || sortedAndFilteredTrips.length === 0) return;
    const nearestTrip = sortedAndFilteredTrips[0];
    const destShed = SHEDS.find(s => s.name === sleepDestination);
    if (!destShed) return;
    const distanceToDest = getDistance(nearestTrip.location.lat, nearestTrip.location.lng, destShed.lat, destShed.lng);
    if (distanceToDest <= sleepAlarmDistance) {
      if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
      toast(`🔔 Gising na! Malapit na ang sasakyan sa ${sleepDestination} (${distanceToDest.toFixed(1)}km away).`, "success");
      setSleepAlarmActive(false);
      setSleepDestination(null);
    }
  }, [sortedAndFilteredTrips, sleepAlarmActive, sleepDestination, sleepAlarmDistance, toast]);

  const getMinutesAgo = (timestamp: number) => Math.max(0, Math.floor((now - timestamp) / 60000));
  
  const handleFavoriteShed = () => { 
    if (isFavorite) { localStorage.removeItem(STORAGE_KEYS.favoriteShed); setIsFavorite(false); } 
    else { localStorage.setItem(STORAGE_KEYS.favoriteShed, selectedShed.id); setIsFavorite(true); } 
  };

  const handleManualWaitingPing = () => {
    if (isWaiting) {
      cancelWaitingPing();
      setIsWaiting(false);
      toast("Kinansela ang paghihintay.", "info");
      return;
    }

    if (!commuterLocation) {
      sendWaitingPing(selectedShed.lat, selectedShed.lng);
      setIsWaiting(true);
      toast("Na-notify na ang mga driver!", "success");
      return;
    }

    const distanceToShed = getDistance(commuterLocation.lat, commuterLocation.lng, selectedShed.lat, selectedShed.lng);
    if (distanceToShed > 0.05) {
      toast(`Masyado kang malayo sa ${selectedShed.name} (${(distanceToShed).toFixed(1)} km away). Lumapit ka muna sa shed.`, "error");
      return;
    }

    sendWaitingPing(commuterLocation.lat, commuterLocation.lng);
    setIsWaiting(true);
    toast("Na-notify na ang mga driver sa area!", "success");
  };

  const handleRequestStop = () => {
    requestStop();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]); 
    toast("🔔 Na-notify na ang driver na bababa ka!", "success");
  };

  const handleReport = async (tripId: string, type: "correct" | "wrong") => {
    if (reportedTrips[tripId]) return toast("Naka-report ka na dito.", "info");
    try {
      const trip = trips.find(t => t.tripId === tripId);
      const currentReports = trip?.reports || { correct: 0, wrong: 0 };
      const updates = { 
        correct: type === "correct" ? (currentReports.correct + 1) : currentReports.correct, 
        wrong: type === "wrong" ? (currentReports.wrong + 1) : currentReports.wrong 
      };
      await set(ref(database, `reports/${tripId}`), updates);
      if (navigator.vibrate) navigator.vibrate(50);
      const newPoints = points + 5; 
      setPoints(newPoints); 
      localStorage.setItem(STORAGE_KEYS.points, newPoints.toString()); 
      setReportedTrips(prev => ({ ...prev, [tripId]: true }));
      toast("Salamat sa report! +5 Points", "success");
    } catch (err) { 
      console.error(err); 
      toast("Error sa pag-report. Subukan muli.", "error");
    }
  };

  const handleCommunityReport = async (type: string) => {
    if (Date.now() - lastReportTime < COOLDOWNS.communityReportMs) return toast("Nag-report ka na kamakailan lang.", "info");
    if (dailyPoints >= COOLDOWNS.dailyPointCap) return toast("Naabot mo na ang max points ngayong araw.", "info");
    try {
      const newPoints = points + 5; 
      const newDailyPoints = dailyPoints + 5;
      const newTime = Date.now();
      setPoints(newPoints); 
      setDailyPoints(newDailyPoints);
      setLastReportTime(newTime);
      localStorage.setItem(STORAGE_KEYS.points, newPoints.toString()); 
      localStorage.setItem(STORAGE_KEYS.dailyPoints, newDailyPoints.toString()); 
      localStorage.setItem(STORAGE_KEYS.lastReportTime, newTime.toString());
      await sendCommunityReport(type);
      setShowReportModal(false); 
      if (navigator.vibrate) navigator.vibrate(50); 
      toast(`Salamat! +5 Points!`, "success");
    } catch (err) { console.error(err); }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return toast("Paki-type ang iyong feedback.", "error");
    try {
      await set(ref(database, `feedbacks/${Date.now()}`), {
        name: feedbackName || "Anonymous",
        feedback: feedbackText,
        timestamp: Date.now(),
        userId: userId || "unknown",
      });
      toast("Salamat! Natanggap na namin ang iyong feedback.", "success");
      setShowFeedbackModal(false);
      setFeedbackName("");
      setFeedbackText("");
    } catch (err) {
      toast("Error sa pag-send. Subukan muli.", "error");
    }
  };

  const handleClearAlert = async () => { 
    try { await clearCommunityAlert(); } catch (err) {} 
  };

  const handleShare = async (trip: TripData) => {
    const text = `Biyahe Live: May ${trip.status === "Available" ? `${trip.seatsAvailable} upuan` : trip.status} sa ${selectedShed.name}! ${window.location.href}`;
    if (navigator.share) { try { await navigator.share({ title: "Biyahe Live", text }); } catch (e) {} }
    else { await navigator.clipboard.writeText(text); toast("Copied sa clipboard!", "success"); }
  };

  const toggleAlarm = (tripId: string) => {
    if (alarms[tripId]) { 
      const newAlarms = { ...alarms }; delete newAlarms[tripId]; setAlarms(newAlarms); 
      toast("Alarm cancelled.", "info");
    } else { 
      setAlarms(prev => ({ ...prev, [tripId]: Date.now() + COOLDOWNS.alarmDefaultMs })); 
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]); 
      toast("Alarm set! (10 mins)", "success"); 
    }
  };

  const handleFinishOnboarding = () => { localStorage.setItem(STORAGE_KEYS.onboarded, "true"); setShowOnboarding(false); };
  const handleNextOnboard = () => { if (onboardStep < 2) setOnboardStep(prev => prev + 1); else handleFinishOnboarding(); };

  const triggerSOS = async () => {
    try {
      await set(ref(database, "sos_alert"), { 
        id: "sos_" + Date.now(), 
        shed: selectedShed.name,
        timestamp: Date.now() 
      });
      setShowSosModal(false);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
      toast("SOS Sent! Na-notify na ang mga driver at authorities.", "success");
    } catch (err) { console.error(err); }
  };

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
      
      {/* 🚨 SOS FLOATING BUTTON */}
      <button
        onClick={() => setShowSosModal(true)}
        className="fixed bottom-24 right-6 z-50 p-4 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-2xl shadow-rose-600/50 transition-all flex items-center justify-center animate-pulse"
      >
        <Siren className="w-8 h-8" />
      </button>

      {activeAlert && (
        <div className={`fixed top-4 z-50 w-full max-w-md px-4 py-3 rounded-xl border shadow-lg flex items-center justify-between animate-in slide-in-from-top-2 ${alertStyles(activeAlert.type)}`}>
          <div className="flex items-center gap-2 font-bold text-sm"><Megaphone className="w-5 h-5" /><span>{activeAlert.type} ({getMinutesAgo(activeAlert.timestamp)}m ago)</span></div>
          <button onClick={handleClearAlert} className="p-1 hover:bg-black/20 rounded-full transition"><X className="w-4 h-4" /></button>
        </div>
      )}

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
        
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleManualWaitingPing} className={`py-4 rounded-xl font-black text-sm flex flex-col items-center justify-center gap-1 transition-all ${
            isWaiting 
              ? 'bg-amber-500/20 text-amber-400 border border-amber-800/50 hover:bg-amber-500/30' 
              : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg'
          }`}>
            <BellRing className={`w-6 h-6 ${isWaiting ? 'animate-pulse' : ''}`} /> 
            {isWaiting ? "Kinansela" : "Naghihintay Ako"}
          </button>
          <button onClick={handleRequestStop} className="py-4 rounded-xl font-black text-sm flex flex-col items-center justify-center gap-1 bg-rose-600 text-white hover:bg-rose-500 shadow-lg">
            <Bell className="w-6 h-6" /> Bababa Ako
          </button>
        </div>

        <button 
          onClick={() => setShowSleepAlarm(true)}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${sleepAlarmActive ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-800 text-indigo-400 border border-indigo-900/50'}`}
        >
          <Bed className="w-5 h-5" /> {sleepAlarmActive ? `Pahinga Mode ON (${sleepDestination})` : "Sleep Alarm / Pahinga Mode"}
        </button>

        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">More Options</span>
          <button onClick={() => setShowMoreOptions(!showMoreOptions)} className="p-1.5 bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {showMoreOptions && (
          <div className="space-y-3 p-4 bg-slate-900/50 border border-slate-800 rounded-2xl animate-in slide-in-from-top-2">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="text" placeholder="Search vehicle or type..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {["All", "Van", "Bus", "Taxi", "Tricycle", "Motor", "MiniBus"].map(v => (
                  <button key={v} onClick={() => setVehicleFilter(v as any)} className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${vehicleFilter === v ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>{v}</button>
                ))}
              </div>
            </div>
            <button onClick={() => setShowReportModal(true)} className="w-full py-2 bg-amber-500/10 border border-amber-500/50 text-amber-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
              <Megaphone className="w-3 h-3" /> Mag-report ng Sitwasyon
            </button>
            <div className="flex items-center justify-between bg-slate-800 p-2 rounded-lg">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-amber-400" />
                <p className="text-[10px] font-bold text-white">Discounted Fare (20%)</p>
              </div>
              <button onClick={() => setIsDiscounted(!isDiscounted)} className={`px-2 py-1 rounded text-[10px] font-bold ${isDiscounted ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-400'}`}>{isDiscounted ? "ON" : "OFF"}</button>
            </div>

            <div className="flex items-center justify-between bg-slate-800 p-2 rounded-lg">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <p className="text-[10px] font-bold text-white">Pocket Mode (Disable Shake SOS)</p>
              </div>
              <button onClick={() => setIsPocketMode(!isPocketMode)} className={`px-2 py-1 rounded text-[10px] font-bold ${isPocketMode ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-400'}`}>{isPocketMode ? "ON" : "OFF"}</button>
            </div>
          </div>
        )}

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
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1"><Users className="w-3 h-3" /> Naghihintay sa Shed:</span>
          <span className={`text-xs font-bold ${waitingCount > 5 ? 'text-rose-400' : waitingCount > 2 ? 'text-amber-400' : 'text-emerald-400'}`}>{waitingCount} {waitingCount === 1 ? 'tao' : 'katao'}</span>
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
              
              const estimatedFare = computeFare(distance, trip.vehicleType || "Van", trip.isAircon || false, isDiscounted);
              const fareDisplay = `₱${estimatedFare.toFixed(0)}`;
              
              const etaMins = estimateEtaMinutes(distance, trip.speed);
              const etaDisplay = formatEta(etaMins);
              
              const isReported = reportedTrips[trip.tripId];
              const VehicleIcon = trip.vehicleType === "Bus" ? Bus : trip.vehicleType === "Taxi" ? Car : trip.vehicleType === "Tricycle" ? Car : trip.vehicleType === "Motor" ? Car : Bus;

              return (
                <div key={trip.tripId} className={`p-5 rounded-2xl border transition-all ${isStale || isLowTrust ? "opacity-40 grayscale" : "bg-slate-900 border-slate-800 shadow-md"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-950/60 rounded-xl border border-emerald-800/40 text-emerald-400"><VehicleIcon className="w-5 h-5" /></div>
                      <div>
                        <h2 className="font-bold text-base flex items-center gap-1.5">{trip.vehicleType || "Van"} {trip.plateNumber ? `#${trip.plateNumber}` : `#${trip.tripId.slice(-4).toUpperCase()}`}{trip.isVerified && <ShieldCheck className="w-4 h-4 text-blue-400" />}</h2>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {distance.toFixed(1)} km away 
                          {trip.speed !== undefined && trip.speed > 0 && ` • ${trip.speed} km/h`}
                          {trip.isAircon && " ❄️"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${trip.status === "Available" ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60" : trip.status === "Standing" ? "bg-amber-950/80 text-amber-300 border-amber-700/60" : "bg-rose-950/80 text-rose-300 border-rose-700/60"}`}>
                        {trip.status === "Available" ? `${trip.seatsAvailable ?? '?'} upuan` : trip.status === "Standing" ? (trip.vehicleType === "Bus" || trip.vehicleType === "MiniBus" ? "Puno (Standing)" : `${trip.seatsAvailable} na lang`) : "Puno Na"}
                      </span>
                      <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5" title="Estimated fare base sa LTFRB Matrix + Distance"><Wallet className="w-3 h-3" /> {fareDisplay}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {minsAgo === 0 ? "Ngayon lang" : `${minsAgo} min`} 
                      <span className="ml-2 px-1.5 py-0.5 bg-slate-800 rounded flex items-center gap-1 text-[10px] text-emerald-400 font-semibold"><Timer className="w-3 h-3" /> ETA: {etaDisplay}</span>
                    </span>
                    <div className="flex items-center gap-3">
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${trip.location.lat},${trip.location.lng}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5" /> Map
                      </a>
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

      <footer className="text-center text-xs text-slate-500 my-8 pb-16 flex flex-col items-center gap-4">
        <div className="flex gap-3">
          <button 
            onClick={() => setShowFeedbackModal(true)}
            className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-slate-300 px-4 py-2 rounded-full font-bold hover:bg-slate-700 transition-all"
          >
            <MessageSquare className="w-4 h-4" /> Send Feedback
          </button>
          
          <button 
            onClick={() => setShowGcashModal(true)}
            className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-full font-bold hover:bg-amber-500/20 transition-all"
          >
            <Coffee className="w-4 h-4" /> Support
          </button>
        </div>
        <p>Biyahe Live © 2026 · Developed by Ray Mar Olandria</p>
        <Link href="/privacy" className="text-slate-400 hover:text-emerald-400 underline transition-colors">Privacy Policy & Terms of Service</Link>
      </footer>

      {/* 💡 SEND FEEDBACK MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-400" /> Send Feedback
              </h2>
              <button onClick={() => setShowFeedbackModal(false)} className="p-1 text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-slate-400 mb-4">May gusto ka bang ipadagdag o i-improve? I-type lang sa ibaba!</p>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">Pangalan / Driver Name (Optional)</label>
                <input 
                  type="text" 
                  value={feedbackName}
                  onChange={(e) => setFeedbackName(e.target.value)}
                  placeholder="e.g. Manong Boy"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">Iyong Suhestiyon *</label>
                <textarea 
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Halimbawa: Pwede po bang lagyan ng QR code ang resibo..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 h-24 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowFeedbackModal(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl text-sm hover:bg-slate-700 transition-all">Cancel</button>
              <button onClick={handleSendFeedback} className="flex-1 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-sm hover:bg-emerald-400 transition-all">Send</button>
            </div>
          </div>
        </div>
      )}

      {/* ☕ GCASH SUPPORT MODAL */}
      {showGcashModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200 text-center">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Coffee className="w-5 h-5 text-amber-400" /> Support Biyahe Live</h2>
              <button onClick={() => setShowGcashModal(false)} className="p-1 text-slate-400 hover:text-white transition"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-400 mb-4">Salamat sa pagsuporta! I-scan ang QR code gamit ang GCash.</p>
            <div className="bg-white p-4 rounded-2xl mb-4 inline-block shadow-lg">
              <img src="/gcash-qr.png" alt="GCash QR Code" className="w-48 h-48 object-contain" />
            </div>
            <p className="text-sm font-bold text-white mb-2">R** M** O.</p>
            <button onClick={() => setShowGcashModal(false)} className="w-full mt-6 py-3 bg-slate-800 text-white font-bold rounded-xl text-sm hover:bg-slate-700 transition-all">Close</button>
          </div>
        </div>
      )}

      {/* 🚨 SLEEP ALARM MODAL */}
      {showSleepAlarm && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Bed className="w-5 h-5 text-indigo-400" /> Pahinga Mode</h2>
              <button onClick={() => setShowSleepAlarm(false)} className="p-1 text-slate-400 hover:text-white transition"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-400 mb-4">Piliin ang iyong babaan. Mag-a-alert ang app kapag malapit na ang sasakyan.</p>
            <div className="flex items-center gap-2 mb-4 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {[2, 1, 0.5].map((dist) => (
                <button key={dist} onClick={() => setSleepAlarmDistance(dist)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${sleepAlarmDistance === dist ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{dist} km</button>
              ))}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {SHEDS.map(shed => (
                <button key={shed.id} onClick={() => { setSleepDestination(shed.name); setSleepAlarmActive(true); setShowSleepAlarm(false); if (navigator.vibrate) navigator.vibrate([100, 50, 100]); }} className={`w-full p-3 rounded-xl border text-left font-semibold text-sm transition-all flex items-center justify-between ${sleepDestination === shed.name ? 'bg-indigo-950/50 border-indigo-500 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
                  {shed.name}
                  {sleepDestination === shed.name && <CheckCircle2 className="w-4 h-4" />}
                </button>
              ))}
            </div>
            {sleepAlarmActive && (<button onClick={() => { setSleepAlarmActive(false); setSleepDestination(null); }} className="w-full mt-4 py-2 bg-rose-600/20 border border-rose-600/50 text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-600/30 transition-all">Cancel Sleep Alarm</button>)}
          </div>
        </div>
      )}

      {/* 🚨 REPORT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Megaphone className="w-5 h-5 text-amber-400" /> Abiso sa Kapwa</h2>
              <button onClick={() => setShowReportModal(false)} className="p-1 text-slate-400 hover:text-white transition"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-400 mb-4">Pumili ng sitwasyon sa waiting shed ngayon.</p>
            <div className="space-y-2">
              {[
                { icon: "🚐", label: "May Dumaan" },
                { icon: "🚦", label: "Traffic" },
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

      {/* 🚨 SOS MODAL (PNP, BFP, RESCUE) */}
      {showSosModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-rose-950 border border-rose-600 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black text-white flex items-center gap-2"><Siren className="w-6 h-6 text-rose-500 animate-pulse" /> Hotlines</h2>
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
                  <div className="flex items-center gap-3"><div className="p-2 bg-emerald-950 text-emerald-400 rounded-lg"><HeartPulse className="w-5 h-5" /></div><div><p className="font-bold text-white text-sm">MDRRMO {selectedShed.name}</p><p className="text-xs text-slate-400">{emergencyData.rescue}</p></div></div>
                  <Phone className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                </a>
              </div>
            ) : (<p className="text-center text-slate-400 py-4">Kinakarga ang contacts...</p>)}
            <div className="mt-4 pt-4 border-t border-rose-800/50">
              <a href="tel:911" className="flex items-center justify-center w-full py-3 bg-rose-600 text-white font-black rounded-xl shadow-lg hover:bg-rose-500 transition-all gap-2"><Siren className="w-5 h-5" /> CALL 911 (National)</a>
            </div>
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
              <p className="text-xs text-amber-300 leading-relaxed">⚠️ Base sa LTFRB Region XI Matrix. Ang aktwal na pamasahe ay depende sa exact distance, dagdag, at driver.</p>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {Object.entries({
                "Bus (Ordinary / Provincial)": "₱12 + ₱2.20/km",
                "Bus (Aircon / City)": "₱18 + ₱2.97/km",
                "UV Express (Van)": "₱2.60/km",
                "Traditional Jeepney": "₱14 + ₱2.00/km",
                "Modern Jeepney": "₱17 + ₱2.40/km",
                "Taxi (Metered)": "₱45-₱50 flagdown",
                "Tricycle": "₱15 + ₱3.00/km",
                "Motor (Habal-habal)": "₱10 + ₱1.50/km"
              }).map(([name, price]) => (
                <div key={name} className="flex items-center justify-between bg-slate-800 p-3 rounded-xl border border-slate-700">
                  <span className="text-sm text-slate-300">{name}</span>
                  <span className="text-sm font-black text-amber-400">{price}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowFareMatrix(false)} className="w-full mt-4 py-3 bg-amber-500 text-slate-950 font-black rounded-xl text-sm hover:bg-amber-400 transition-all">Close</button>
          </div>
        </div>
      )}

      {/* ONBOARDING MODAL */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-300 text-center flex flex-col items-center">
            {onboardStep === 0 && (<><div className="p-4 bg-emerald-950/80 rounded-full mb-6 border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]"><Bus className="w-12 h-12 text-emerald-400" /></div><h2 className="text-2xl font-black text-white mb-2">Welcome sa Biyahe Live!</h2><p className="text-sm text-slate-400 mb-8">Ang iyong kasama sa pag-commute sa Davao del Sur.</p></>)}
            {onboardStep === 1 && (<><div className="p-4 bg-amber-950/80 rounded-full mb-6 border border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.3)]"><Wallet className="w-12 h-12 text-amber-400" /></div><h2 className="text-2xl font-black text-white mb-2">Mabilis at Madali</h2><p className="text-sm text-slate-400 mb-8">Kumuha ng QR Ticket, mag-report ng sitwasyon, at makakuha ng Biyahe Points!</p></>)}
            {onboardStep === 2 && (<><div className="p-4 bg-rose-950/80 rounded-full mb-6 border border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.3)]"><Siren className="w-12 h-12 text-rose-400" /></div><h2 className="text-2xl font-black text-white mb-2">Emergency Ready</h2><p className="text-sm text-slate-400 mb-8">May SOS button para sa emergency. I-tap lang ito para ma-alert ang authorities.</p></>)}
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