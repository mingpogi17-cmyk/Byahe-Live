"use client";

import { useState, useEffect } from "react";
import { database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { Bus, Users, MessageSquare, BarChart, Lock, ShieldCheck, Star } from "lucide-react";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // REALTIME STATS
  const [activeDrivers, setActiveDrivers] = useState(0);
  const [waitingCommuters, setWaitingCommuters] = useState(0);
  const [totalFeedbacks, setTotalFeedbacks] = useState(0);
  const [totalSurveys, setTotalSurveys] = useState(0);

  // LISTS
  const [recentFeedbacks, setRecentFeedbacks] = useState<any[]>([]);
  const [surveyResponses, setSurveyResponses] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // 1. Live Trips (Active Drivers)
    const tripsRef = ref(database, "live_trips");
    const unsubTrips = onValue(tripsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setActiveDrivers(Object.keys(data).length);
      } else {
        setActiveDrivers(0);
      }
    });

    // 2. Waiting Commuters
    const waitingRef = ref(database, "waiting_commuters");
    const unsubWaiting = onValue(waitingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const activeWaiting = Object.values(data).filter(
          (val: any) => !val.expiresAt || Date.now() < val.expiresAt
        );
        setWaitingCommuters(activeWaiting.length);
      } else {
        setWaitingCommuters(0);
      }
    });

    // 3. Feedbacks
    const feedbackRef = ref(database, "feedbacks");
    const unsubFeedbacks = onValue(feedbackRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const feedbackList = Object.values(data).map((item: any) => ({
          ...item,
          name: item.name || "Anonymous",
          feedback: item.feedback || "",
          timestamp: item.timestamp || Date.now(),
        }));
        setTotalFeedbacks(feedbackList.length);
        // Sort most recent first & get top 5
        const sorted = feedbackList.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
        setRecentFeedbacks(sorted);
      } else {
        setTotalFeedbacks(0);
        setRecentFeedbacks([]);
      }
    });

    // 4. Survey Responses
    const surveyRef = ref(database, "survey_responses");
    const unsubSurveys = onValue(surveyRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const surveyList = Object.values(data);
        setTotalSurveys(surveyList.length);
        setSurveyResponses(surveyList);
      } else {
        setTotalSurveys(0);
        setSurveyResponses([]);
      }
    });

    return () => {
      unsubTrips();
      unsubWaiting();
      unsubFeedbacks();
      unsubSurveys();
    };
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "biyahelive2026") {
      setIsAuthenticated(true);
      setErrorMsg("");
    } else {
      setErrorMsg("Maling password. Pakisubukan muli.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-4">
          <div className="p-4 bg-emerald-950/80 rounded-full inline-block border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <Lock className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-xl font-black tracking-wider">Biyahe Live Admin</h1>
          <p className="text-xs text-slate-400">Ipasok ang password upang ma-access ang LGU analytics dashboard.</p>

          <form onSubmit={handleLogin} className="space-y-3 pt-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-center font-mono"
            />
            {errorMsg && <p className="text-xs font-bold text-rose-500">{errorMsg}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm transition-all"
            >
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-6">

        {/* HEADER */}
        <header className="flex items-center justify-between bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <div>
              <h1 className="text-xl font-black tracking-wide">LGU Admin Analytics</h1>
              <p className="text-xs text-slate-400">Biyahe Live Real-time Monitoring</p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
          >
            Logout
          </button>
        </header>

        {/* STATS CARDS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex flex-col items-center justify-center text-center space-y-2 shadow-lg">
            <div className="p-3 bg-emerald-950/60 rounded-2xl text-emerald-400 border border-emerald-800/40">
              <Bus className="w-6 h-6" />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Drivers</p>
            <p className="text-3xl font-black text-white">{activeDrivers}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex flex-col items-center justify-center text-center space-y-2 shadow-lg">
            <div className="p-3 bg-amber-950/60 rounded-2xl text-amber-400 border border-amber-800/40">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Commuters Waiting</p>
            <p className="text-3xl font-black text-amber-400">{waitingCommuters}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex flex-col items-center justify-center text-center space-y-2 shadow-lg">
            <div className="p-3 bg-blue-950/60 rounded-2xl text-blue-400 border border-blue-800/40">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Feedbacks</p>
            <p className="text-3xl font-black text-blue-400">{totalFeedbacks}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex flex-col items-center justify-center text-center space-y-2 shadow-lg">
            <div className="p-3 bg-indigo-950/60 rounded-2xl text-indigo-400 border border-indigo-800/40">
              <BarChart className="w-6 h-6" />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Survey Responses</p>
            <p className="text-3xl font-black text-indigo-400">{totalSurveys}</p>
          </div>
        </div>

        {/* 5 RECENT FEEDBACKS */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" /> Recent Feedbacks (Top 5)
          </h2>
          {recentFeedbacks.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">Walang kamakailang feedback.</p>
          ) : (
            <div className="space-y-3">
              {recentFeedbacks.map((fb, idx) => (
                <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <p className="text-xs font-bold text-emerald-400">{fb.name}</p>
                  <p className="text-xs text-slate-300">{fb.feedback}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SURVEY RESPONSES SUMMARY */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <BarChart className="w-4 h-4 text-amber-400" /> Survey Responses Summary
          </h2>
          {surveyResponses.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">Walang survey responses sa kasalukuyan.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
              {surveyResponses.map((item, idx) => {
                const roleCapital = item.role ? item.role.charAt(0).toUpperCase() + item.role.slice(1) : "Unknown";
                const typeCapital = item.surveyType ? item.surveyType.charAt(0).toUpperCase() + item.surveyType.slice(1) : "Pre";
                return (
                  <div key={idx} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">
                      {roleCapital} - {typeCapital}: <span className="text-amber-400 font-black">{item.rating || 0} Stars</span>
                    </span>
                    <div className="flex text-amber-400">
                      <Star className="w-4 h-4 fill-current" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}