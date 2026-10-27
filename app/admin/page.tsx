"use client";

import { useState, useEffect } from "react";
import { database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { Bus, Users, MessageSquare, BarChart, Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  
  const [activeTrips, setActiveTrips] = useState(0);
  const [waitingCommuters, setWaitingCommuters] = useState(0);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [surveyCount, setSurveyCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubTrips = onValue(ref(database, "live_trips"), (snap) => {
      setActiveTrips(snap.exists() ? Object.keys(snap.val()).length : 0);
    });

    const unsubWaiting = onValue(ref(database, "waiting_commuters"), (snap) => {
      setWaitingCommuters(snap.exists() ? Object.keys(snap.val()).length : 0);
    });

    const unsubFeedback = onValue(ref(database, "feedbacks"), (snap) => {
      if (snap.exists()) {
        const data = Object.values(snap.val()).reverse().slice(0, 5);
        setFeedbacks(data);
      }
    });

    const unsubSurvey = onValue(ref(database, "survey_responses"), (snap) => {
      setSurveyCount(snap.exists() ? Object.keys(snap.val()).length : 0);
    });

    return () => {
      unsubTrips(); unsubWaiting(); unsubFeedback(); unsubSurvey();
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-sm text-center space-y-4">
          <Lock className="w-12 h-12 text-emerald-400 mx-auto" />
          <h1 className="text-xl font-bold text-white">Admin Access</h1>
          <input 
            type="password" 
            placeholder="Enter password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-center outline-none focus:border-emerald-500"
          />
          <button 
            onClick={() => {
              if (password === "biyahelive2026") setIsAuthenticated(true);
              else alert("Mali ang password!");
            }}
            className="w-full bg-emerald-500 text-slate-950 font-bold py-3 rounded-xl hover:bg-emerald-400 transition"
          >
            Login
          </button>
          <Link href="/" className="block text-xs text-slate-500 hover:text-white mt-4">Back to App</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-black">Biyahe Live: LGU Dashboard</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center">
            <Bus className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-3xl font-black">{activeTrips}</p>
            <p className="text-xs text-slate-400">Active Drivers</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center">
            <Users className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <p className="text-3xl font-black">{waitingCommuters}</p>
            <p className="text-xs text-slate-400">Waiting Commuters</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center">
            <BarChart className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <p className="text-3xl font-black">{surveyCount}</p>
            <p className="text-xs text-slate-400">Survey Responses</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center">
            <MessageSquare className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <p className="text-3xl font-black">{feedbacks.length}</p>
            <p className="text-xs text-slate-400">Recent Feedbacks</p>
          </div>
        </div>

        {/* Recent Feedbacks */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-purple-400" /> Recent Feedback</h2>
          <div className="space-y-3">
            {feedbacks.length === 0 ? <p className="text-slate-500 text-sm">Wala pang feedback.</p> : null}
            {feedbacks.map((fb: any, i) => (
              <div key={i} className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <p className="text-xs font-bold text-emerald-400 mb-1">{fb.name || "Anonymous"}</p>
                <p className="text-sm text-slate-300">{fb.feedback}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}