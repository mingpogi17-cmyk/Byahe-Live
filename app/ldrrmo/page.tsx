"use client";

import { useState, useEffect, useRef } from "react";
import { database, auth } from "@/lib/firebase";
import { ref, onValue, update } from "firebase/database";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { ShieldCheck, Flame, Siren, LogOut, MapPin, CheckCircle2, XCircle, Lock, Volume2, Clock, Activity, MessageSquare } from "lucide-react";
import { useToast } from "@/components/Toast";

// LIVE TIMER COMPONENT
function TimeAgo({ timestamp }: { timestamp: number }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const diff = Math.floor((Date.now() - timestamp) / 1000);
      if (diff < 60) setElapsed(`${diff}s ago`);
      else if (diff < 3600) setElapsed(`${Math.floor(diff / 60)}m ago`);
      else setElapsed(`${Math.floor(diff / 3600)}h ago`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 10000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <span className="text-xs font-bold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded ml-2 flex items-center gap-1">
      <Clock className="w-3 h-3" /> {elapsed}
    </span>
  );
}

export default function LDRRMOPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"PNP" | "BFP" | "LDRRMO">("LDRRMO");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<"All" | "PNP" | "BFP" | "LDRRMO">("All");
  
  const prevIncidentCount = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPrimed, setAudioPrimed] = useState(false);

  // State para sa Dispatch Notes
  const [noteInput, setNoteInput] = useState<{ [key: string]: string }>({});

  // SMART ROUTING LOGIC
  const getResponders = (type: string) => {
    if (["Holdap", "Crime"].includes(type)) return ["PNP"];
    if (type === "Sunog") return ["BFP", "LDRRMO"]; 
    if (["Aksidente", "Medical"].includes(type)) return ["LDRRMO", "BFP"]; 
    return ["LDRRMO"];
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setIsAuthenticated(true);
      else setIsAuthenticated(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    audioRef.current = new Audio('/beep.mp3'); 
    audioRef.current.loop = true;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  const primeAudio = async () => {
    try {
      const silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
      await silentAudio.play();
      if (audioRef.current) {
        audioRef.current.volume = 0.5; 
        await audioRef.current.play();
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.volume = 1; 
          }
        }, 2000);
      }
      setAudioPrimed(true);
      toast("Audio alert ready ✅", "success");
    } catch (e: any) {
      console.error("AUDIO PRIME ERROR:", e); 
    }
  };

  useEffect(() => {
    const unlockAudio = () => { if (!audioPrimed) primeAudio(); };
    window.addEventListener('click', unlockAudio, { once: true });
    return () => window.removeEventListener('click', unlockAudio);
  }, [audioPrimed]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const incidentsRef = ref(database, "emergency_incidents");
    const unsub = onValue(incidentsRef, (snapshot) => {
      if (snapshot.exists()) {
        let rawData = Object.values(snapshot.val()) as any[];
        
        // Voice alert logic (Bago i-sort para makuha yung pinakabago)
        if (rawData.length > prevIncidentCount.current && prevIncidentCount.current !== 0) {
          rawData.sort((a, b) => b.timestamp - a.timestamp); // Sort newest first for alert
          const newIncident = rawData[0];
          if ('speechSynthesis' in window) {
            const msg = new SpeechSynthesisUtterance(`Attention: New ${newIncident.type} reported at ${newIncident.area || newIncident.landmark}`);
            window.speechSynthesis.speak(msg);
          }
        }
        prevIncidentCount.current = rawData.length;

        // SMART SORTING: Pending at Responding muna (Oldest to Newest), tapos Resolved/Dismissed
        rawData.sort((a, b) => {
          const aActive = ['pending', 'responding'].includes(a.status);
          const bActive = ['pending', 'responding'].includes(b.status);
          
          if (aActive && !bActive) return -1;
          if (!aActive && bActive) return 1;
          if (aActive && bActive) return a.timestamp - b.timestamp; // Oldest first pag active
          return b.timestamp - a.timestamp; // Newest first pag tapos na
        });

        setIncidents(rawData);
      } else {
        setIncidents([]);
        prevIncidentCount.current = 0;
      }
    });
    return () => unsub();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!audioRef.current || !audioPrimed) return;
    const pendingRelevantCount = incidents.filter((inc: any) => {
      if (inc.status !== 'pending') return false;
      if (filterType === "All") return true;
      return getResponders(inc.type).includes(filterType);
    }).length;

    if (pendingRelevantCount > 0) {
      audioRef.current.loop = true;
      if (audioRef.current.paused) audioRef.current.play().catch((err) => console.warn('Audio blocked:', err));
    } else {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [incidents, audioPrimed, filterType]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast("Login successful!", "success");
    } catch (error: any) {
      toast("Invalid credentials.", "error");
    }
  };

  const handleStatusChange = async (id: string, newStatus: "verified" | "dismissed" | "responding") => {
    try {
      await update(ref(database, `emergency_incidents/${id}`), {
        status: newStatus,
        updatedAt: Date.now(),
        updatedBy: email
      });
      toast(`Incident marked as ${newStatus.toUpperCase()}.`, "success");
    } catch (error) {
      toast("Error updating incident.", "error");
    }
  };

  // Save Dispatch Note
  const handleSaveNote = async (id: string) => {
    const noteText = noteInput[id];
    if (!noteText) return;
    try {
      await update(ref(database, `emergency_incidents/${id}`), {
        dispatchNote: noteText,
        noteUpdatedAt: Date.now(),
        noteUpdatedBy: email
      });
      setNoteInput({ ...noteInput, [id]: "" }); // Clear input
      toast("Note saved to dispatch log.", "success");
    } catch (error) {
      toast("Error saving note.", "error");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-sm text-center space-y-4">
          <Lock className="w-12 h-12 text-rose-500 mx-auto" />
          <h1 className="text-xl font-bold text-white">Responder Portal</h1>
          <p className="text-xs text-slate-400">Authorized Personnel Only</p>
          <form onSubmit={handleLogin} className="space-y-3">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500" required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500" required />
            <select value={role} onChange={(e) => setRole(e.target.value as any)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500">
              <option value="LDRRMO">LDRRMO</option>
              <option value="PNP">PNP</option>
              <option value="BFP">BFP</option>
            </select>
            <button type="submit" className="w-full bg-rose-600 text-white font-bold py-3 rounded-xl hover:bg-rose-500 transition">Login</button>
          </form>
        </div>
      </div>
    );
  }

  const filteredIncidents = incidents.filter((inc) => {
    if (filterType === "All") return true;
    return getResponders(inc.type).includes(filterType);
  });

  // LIVE STATS
  const stats = {
    pending: filteredIncidents.filter(i => i.status === 'pending').length,
    responding: filteredIncidents.filter(i => i.status === 'responding').length,
    resolved: filteredIncidents.filter(i => i.status === 'verified' || i.status === 'dismissed').length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER & AUDIO */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2"><Siren className="w-6 h-6 text-rose-500" /> Unified Command Center</h1>
            <p className="text-xs text-slate-400">Logged in as: {email}</p>
          </div>
          <div className="flex items-center gap-2">
            {!audioPrimed && (
              <button onClick={primeAudio} className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 animate-pulse">
                <Volume2 className="w-4 h-4" /> Enable Audio
              </button>
            )}
            <button onClick={() => signOut(auth)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>

        {/* LIVE STATS BAR */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-900 border border-rose-900/50 p-3 rounded-xl text-center">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Pending</p>
            <p className="text-2xl font-black text-rose-500">{stats.pending}</p>
          </div>
          <div className="bg-slate-900 border border-blue-900/50 p-3 rounded-xl text-center">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Responding</p>
            <p className="text-2xl font-black text-blue-500">{stats.responding}</p>
          </div>
          <div className="bg-slate-900 border border-emerald-900/50 p-3 rounded-xl text-center">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Resolved</p>
            <p className="text-2xl font-black text-emerald-500">{stats.resolved}</p>
          </div>
        </div>

        {/* FILTER TABS */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {["All", "PNP", "BFP", "LDRRMO"].map((tab) => (
            <button key={tab} onClick={() => setFilterType(tab as any)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filterType === tab ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>{tab}</button>
          ))}
        </div>

        {/* INCIDENT CARDS */}
        <div className="space-y-4">
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No incidents reported for this agency.</div>
          ) : (
            filteredIncidents.map((inc) => (
              <div key={inc.id} className={`p-4 rounded-2xl border transition-all ${
                inc.status === 'verified' ? 'bg-emerald-950/30 border-emerald-800' : 
                inc.status === 'dismissed' ? 'bg-slate-900 border-slate-800 opacity-50' : 
                inc.status === 'responding' ? 'bg-blue-950/40 border-blue-800 shadow-[0_0_15px_rgba(30,64,175,0.3)]' : 
                'bg-rose-950/30 border-rose-800 shadow-[0_0_15px_rgba(225,29,72,0.2)]'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-black text-lg text-white flex items-center gap-2">
                      {inc.type === "Sunog" ? <Flame className="w-5 h-5 text-rose-500" /> : 
                       inc.type === "Holdap" || inc.type === "Crime" ? <ShieldCheck className="w-5 h-5 text-blue-400" /> : 
                       <Activity className="w-5 h-5 text-amber-500" />}
                      {inc.type}
                    </h3>
                    <div className="flex items-center mt-1">
                      <p className="text-xs text-slate-400">{new Date(inc.timestamp).toLocaleString()}</p>
                      {inc.status === 'pending' && <TimeAgo timestamp={inc.timestamp} />}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    inc.status === 'pending' ? 'bg-rose-600 text-white' : 
                    inc.status === 'responding' ? 'bg-blue-600 text-white animate-pulse' : 
                    'bg-slate-800 text-slate-400'
                  }`}>{inc.status.toUpperCase()}</span>
                </div>
                
                {inc.photo && <img src={inc.photo} alt="Incident" className="w-full h-48 object-cover rounded-xl mb-3 border border-slate-700" />}
                
                <div className="flex items-center gap-2 mb-4">
                  <a href={`https://www.google.com/maps?q=${inc.lat},${inc.lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"><MapPin className="w-3 h-3" /> View on Map</a>
                  <span className="text-xs text-slate-500">| Area: {inc.area || inc.landmark}</span>
                </div>

                {/* DISPATCH NOTE VIEWER */}
                {inc.dispatchNote && (
                  <div className="bg-slate-900/80 border border-slate-700 p-3 rounded-xl mb-3 flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-200">{inc.dispatchNote}</p>
                      <p className="text-[10px] text-slate-500 mt-1">— {inc.noteUpdatedBy} at {new Date(inc.noteUpdatedAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                )}

                {/* ACTION BUTTONS */}
                {inc.status === "pending" && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleStatusChange(inc.id, "responding")} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 shadow-lg shadow-blue-900/50">
                        <Siren className="w-4 h-4" /> Responding
                      </button>
                      <button onClick={() => handleStatusChange(inc.id, "verified")} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Verify
                      </button>
                      <button onClick={() => handleStatusChange(inc.id, "dismissed")} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1">
                        <XCircle className="w-4 h-4" /> Dismiss
                      </button>
                    </div>
                    {/* DISPATCH NOTE INPUT */}
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Add dispatch note (e.g., Truck 1 dispatched)..." 
                        value={noteInput[inc.id] || ''} 
                        onChange={(e) => setNoteInput({ ...noteInput, [inc.id]: e.target.value })}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                      />
                      <button onClick={() => handleSaveNote(inc.id)} className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition">Save Note</button>
                    </div>
                  </div>
                )}

                {inc.status === "responding" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleStatusChange(inc.id, "verified")} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Mark as Resolved
                    </button>
                    <button onClick={() => handleStatusChange(inc.id, "dismissed")} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1">
                      <XCircle className="w-4 h-4" /> Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}