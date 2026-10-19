"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navigation, Bus, ArrowRight, Download, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

export default function HomePage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    } else {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstall(false);
    setDeferredPrompt(null);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300 } }
  };

  return (
    <div className={`relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden ${isDark ? 'text-white' : 'text-slate-900'}`}>
      
      {/* Premium Mesh Background - Only visible in Dark Mode */}
      <div className="mesh-bg"></div>

      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 flex justify-between items-center px-6 py-4 transition-all ${isDark ? 'glass-panel' : 'bg-white border-b border-slate-200 shadow-sm'}`}>
        <div className="flex items-center gap-2">
          <Bus className={`w-6 h-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <span className={`font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Biyahe Live</span>
        </div>
        <div className="flex items-center gap-3">
          {showInstall && (
            <button onClick={handleInstallClick} className="hidden md:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-2 rounded-full font-semibold text-sm hover:bg-emerald-500 hover:text-white transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Download className="w-4 h-4" /> Install
            </button>
          )}
          <button onClick={toggleTheme} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}>
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="z-10 w-full max-w-md mt-16"
      >
        <motion.div variants={itemVariants} className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className={`p-4 rounded-3xl shadow-2xl ${isDark ? 'bg-emerald-950/80 border border-emerald-800/50 text-emerald-400 shadow-emerald-500/20' : 'bg-white border border-slate-200 text-emerald-600 shadow-md'}`}>
              <Bus className="w-12 h-12" />
            </div>
          </div>
          
          {/* Title - Fixed for Light Mode */}
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3 text-slate-900 dark:text-white">
            Biyahe Live
          </h1>
          <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Davao Region Commuter Telemetry
          </p>
        </motion.div>

        {/* Role Cards */}
        <div className="space-y-4">
          <motion.div variants={itemVariants}>
            <Link href="/driver" className={`group block p-6 rounded-2xl transition-all duration-300 relative overflow-hidden ${isDark ? 'bg-[#111827] border-slate-800 hover:border-emerald-500/50' : 'bg-white border-slate-200 hover:border-emerald-500/50 hover:shadow-lg'}`}>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 to-emerald-500/10 group-hover:to-emerald-500/20 transition-all"></div>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl shadow-inner ${isDark ? 'bg-emerald-950/80 border-emerald-800/50 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                    <Navigation className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white group-hover:text-emerald-400' : 'text-slate-900 group-hover:text-emerald-600'}`}>Driver / Conductor</h2>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Start a trip and broadcast location</p>
                  </div>
                </div>
                <ArrowRight className={`w-6 h-6 transition-all group-hover:translate-x-1 ${isDark ? 'text-slate-600 group-hover:text-emerald-400' : 'text-slate-400 group-hover:text-emerald-600'}`} />
              </div>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Link href="/commuter" className={`group block p-6 rounded-2xl transition-all duration-300 relative overflow-hidden ${isDark ? 'bg-[#111827] border-slate-800 hover:border-blue-500/50' : 'bg-white border-slate-200 hover:border-blue-500/50 hover:shadow-lg'}`}>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-blue-500/10 group-hover:to-blue-500/20 transition-all"></div>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl shadow-inner ${isDark ? 'bg-blue-950/80 border-blue-800/50 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                    <Bus className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-600'}`}>Commuter</h2>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>See approaching vehicles at your shed</p>
                  </div>
                </div>
                <ArrowRight className={`w-6 h-6 transition-all group-hover:translate-x-1 ${isDark ? 'text-slate-600 group-hover:text-blue-400' : 'text-slate-400 group-hover:text-blue-600'}`} />
              </div>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      <footer className={`fixed bottom-6 text-center text-xs transition-colors ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
        <p>Developed by Ray Mar Olandria</p>
        <p className="mt-1">Biyahe Live © 2026</p>
      </footer>
    </div>
  );
}