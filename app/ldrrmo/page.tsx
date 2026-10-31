"use client";

import { useState, useEffect, useRef } from "react";
import { database, auth } from "@/lib/firebase";
import { ref, onValue, update } from "firebase/database";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { ShieldCheck, Flame, HeartPulse, Siren, LogOut, MapPin, CheckCircle2, XCircle, Lock } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function LDRRMOPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"PNP" | "BFP" | "LDRRMO">("LDRRMO");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<"All" | "PNP" | "BFP" | "LDRRMO">("All");
  
  const prevIncidentCount = useRef(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const incidentsRef = ref(database, "emergency_incidents");
    const unsub = onValue(incidentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = Object.values(snapshot.val()).reverse();
        setIncidents(data as any[]);
        
        if (data.length > prevIncidentCount.current && prevIncidentCount.current !== 0) {
          const newIncident = data[0] as any;
          try { new Audio('/siren.mp3').play().catch(()=>{}); } catch(e) {}
          
          if ('speechSynthesis' in window) {
            const msg = new SpeechSynthesisUtterance(`Attention: New ${newIncident.type} reported at ${newIncident.area}`);
            window.speechSynthesis.speak(msg);
          }
        }
        prevIncidentCount.current = data.length;
      } else {
        setIncidents([]);
      }
    });
    return () => unsub();
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast("Login successful!", "success");
    } catch (error: any) {
      toast("Invalid credentials. Please check your email/password.", "error");
    }
  };

  const handleVerify = async (id: string, status: "verified" | "dismissed") => {
    try {
      await update(ref(database, `emergency_incidents/${id}`), {
        status,
        verifiedAt: Date.now(),
        verifiedBy: email
      });
      toast(`Incident marked as ${status}.`, "success");
    } catch (error) {
      toast("Error updating incident.", "error");
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
    if (filterType === "PNP") return ["Holdap", "Crime"].includes(inc.type);
    if (filterType === "BFP") return ["Sunog"].includes(inc.type);
    if (filterType === "LDRRMO") return ["Aksidente", "Medical", "Baha", "Lindol", "Iba pa"].includes(inc.type);
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2"><Siren className="w-6 h-6 text-rose-500" /> Unified Command Center</h1>
            <p className="text-xs text-slate-400">Logged in as: {email}</p>
          </div>
          <button onClick={() => signOut(auth)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition"><LogOut className="w-5 h-5" /></button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {["All", "PNP", "BFP", "LDRRMO"].map((tab) => (
            <button key={tab} onClick={() => setFilterType(tab as any)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filterType === tab ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>{tab}</button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No incidents reported yet.</div>
          ) : (
            filteredIncidents.map((inc) => (
              <div key={inc.id} className={`p-4 rounded-2xl border ${inc.status === 'verified' ? 'bg-emerald-950/30 border-emerald-800' : inc.status === 'dismissed' ? 'bg-slate-900 border-slate-800 opacity-50' : 'bg-rose-950/30 border-rose-800 animate-pulse'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-black text-lg text-white flex items-center gap-2">
                      {inc.type === "Sunog" ? <Flame className="w-5 h-5 text-rose-500" /> : <ShieldCheck className="w-5 h-5 text-blue-400" />}
                      {inc.type}
                    </h3>
                    <p className="text-xs text-slate-400">{new Date(inc.timestamp).toLocaleString()}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${inc.status === 'pending' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{inc.status.toUpperCase()}</span>
                </div>
                
                {inc.photo && <img src={inc.photo} alt="Incident" className="w-full h-48 object-cover rounded-xl mb-3 border border-slate-700" />}
                
                <div className="flex items-center gap-2 mb-3">
                  <a href={`https://www.google.com/maps?q=${inc.lat},${inc.lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"><MapPin className="w-3 h-3" /> View on Map</a>
                  <span className="text-xs text-slate-500">| Area: {inc.area}</span>
                </div>

                {inc.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleVerify(inc.id, "verified")} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4" /> Verify</button>
                    <button onClick={() => handleVerify(inc.id, "dismissed")} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1"><XCircle className="w-4 h-4" /> Dismiss</button>
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