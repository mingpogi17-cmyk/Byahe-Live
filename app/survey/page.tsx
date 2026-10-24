"use client";

import { useState } from "react";
import { database } from "@/lib/firebase";
import { ref, push } from "firebase/database";
import { CheckCircle2, Bus, Users, Star, Send } from "lucide-react";
import Link from "next/link";

export default function SurveyPage() {
  const [role, setRole] = useState<"driver" | "commuter" | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!role || rating === 0) return alert("Paki-pili ang role at magbigay ng rating.");
    setIsSubmitting(true);

    try {
      // I-save sa Firebase sa ilalim ng "survey_responses"
      await push(ref(database, "survey_responses"), {
        role,
        rating,
        feedback,
        timestamp: Date.now(),
      });
      setIsSubmitted(true);
    } catch (error) {
      console.error(error);
      alert("Error sa pag-send. Subukan muli.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle2 className="w-24 h-24 text-emerald-400 mb-6 animate-in zoom-in" />
        <h1 className="text-3xl font-black mb-2">Salamat, Boss!</h1>
        <p className="text-slate-400 mb-8 max-w-sm">Malaking tulong ang feedback mo para mapabuti pa ang Biyahe Live.</p>
        <Link href="/" className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition">
          Bumalik sa App
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black mb-2 text-emerald-400">Biyahe Live Survey</h1>
          <p className="text-xs text-slate-400">Maikling survey para sa pagpapabuti ng serbisyo. (30 seconds lang po ito).</p>
        </div>

        {/* QUESTION 1: ROLE */}
        <div className="mb-6">
          <p className="text-sm font-bold mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Sino ka?</p>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setRole("driver")}
              className={`py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 border transition-all ${role === "driver" ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
            >
              <Bus className="w-6 h-6" /> Driver
            </button>
            <button 
              onClick={() => setRole("commuter")}
              className={`py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 border transition-all ${role === "commuter" ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
            >
              <Users className="w-6 h-6" /> Commuter
            </button>
          </div>
        </div>

        {/* QUESTION 2: RATING */}
        <div className="mb-6">
          <p className="text-sm font-bold mb-3 flex items-center gap-2"><Star className="w-4 h-4" /> Gaano ka-kapaki-pakinabang ang app?</p>
          <div className="flex gap-2 justify-between">
            {[1, 2, 3, 4, 5].map((star) => (
              <button 
                key={star} 
                onClick={() => setRating(star)}
                className={`flex-1 py-3 rounded-xl font-black text-xl transition-all ${rating >= star ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-600 hover:bg-slate-700'}`}
              >
                {star}
              </button>
            ))}
          </div>
        </div>

        {/* QUESTION 3: FEEDBACK */}
        <div className="mb-6">
          <p className="text-sm font-bold mb-3">Anong pwede naming i-improve? (Optional)</p>
          <textarea 
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Halimbawa: Malabo yung tunog, o kulang ang ruta..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 h-24 resize-none"
          />
        </div>

        <button 
          onClick={handleSubmit}
          disabled={isSubmitting || !role || rating === 0}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" /> {isSubmitting ? "Sending..." : "I-submit ang Feedback"}
        </button>

      </div>
    </div>
  );
}