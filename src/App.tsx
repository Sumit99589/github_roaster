import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ListCollapse, BarChart3, Terminal as TerminalIcon, Sun, Moon, Flame, ShieldAlert, Cpu } from "lucide-react";
import { RoastProfile, LeaderboardItem } from "./types";
import SearchHero from "./components/SearchHero";
import LeaderboardView from "./components/LeaderboardView";
import RoastResultView from "./components/RoastResultView";
import DocsView from "./components/DocsView";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "leaderboard" | "docs">("dashboard");
  const [currentProfile, setCurrentProfile] = useState<RoastProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roastedCount, setRoastedCount] = useState(1247);

  // --- Toggle HTML class for brand colors ---
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  // --- Fetch Leaderboard list initially ---
  const refreshLeaderboard = () => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setLeaderboard(data.leaderboard);
        }
      })
      .catch((err) => console.error("Leaderboard load failed:", err));
  };

  useEffect(() => {
    refreshLeaderboard();
  }, []);

  // --- Handle Shared Deep-Linking on mount ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedUser = params.get("user");
    if (sharedUser) {
      handleRoastSearch(sharedUser);
    }
  }, []);

  // --- Sequenced loading animation + real fetch ---
  const handleRoastSearch = async (username: string) => {
    if (!username.trim()) return;
    setIsLoading(true);
    setError(null);
    setLoadingLogs([]);

    const logsArray = [
      "[system] INIT: Connecting to secure GitHub API endpoint...",
      "[system] FETCH: Downloading profile information and followers metadata...",
      "[system] FETCH: Successfully retrieved 30 latest updated public repositories.",
      "[analysis] SENTIMENT: Scanning biography lines... Sentiment: questionable.",
      "[analysis] STATS: Counting forks, stars, and language percentages...",
      "[analysis] WARNING: Excessive repositories named 'test' or 'wip' detected.",
      "[ai_agent] AI_BOOT: Launching gemini-3.5-flash context window task...",
      "[ai_agent] EVAL: Formulating critical commentary & custom grade letters...",
      "[compile] ASSIGN: Rendering high-contrast polar radar vertices...",
      "[system] SUCCESS: Compiling emotional destruction card..."
    ];

    // Tick forward logs every 350ms
    let currentLogIdx = 0;
    const logInterval = setInterval(() => {
      if (currentLogIdx < logsArray.length) {
        setLoadingLogs((prev) => [...prev, logsArray[currentLogIdx]]);
        currentLogIdx++;
      } else {
        clearInterval(logInterval);
      }
    }, 320);

    try {
      const response = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();
      
      // We want to wait for BOTH the fetch and at least half the log ticks to finish for visual comfort
      setTimeout(() => {
        clearInterval(logInterval);
        setIsLoading(false);

        if (response.ok && data.success) {
          setCurrentProfile(data.profile);
          // Set active tab to dashboard to display results
          setActiveTab("dashboard");
          // Increment locally
          setRoastedCount((prev) => prev + 1);
          // Refresh leaderboard listing
          refreshLeaderboard();
          // Update URL params without reloading page
          const newUrl = `${window.location.origin}${window.location.pathname}?user=${data.profile.username}`;
          window.history.pushState({ path: newUrl }, "", newUrl);
        } else {
          setError(data.error || "Failed to generate roast. Try again later.");
        }
      }, Math.max(2500, currentLogIdx * 250)); // let the sequence play out nicely (min 2.5s)

    } catch (err: any) {
      clearInterval(logInterval);
      setIsLoading(false);
      setError("Server connection timed out. Please check your credentials config.");
    }
  };

  const handleBackToSearch = () => {
    setCurrentProfile(null);
    setError(null);
    // Suppress search params
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.pushState({ path: cleanUrl }, "", cleanUrl);
  };

  return (
    <div className="flex flex-col min-h-screen bg-brand-base text-brand-primary transition-colors duration-300 relative bg-grid-dots">
      {/* Decorative vertical guideline matching Artistic Flair */}
      <div className="absolute top-0 right-[38%] w-[1px] h-full bg-brand-border/45 pointer-events-none z-0 hidden md:block" />
      <div className="absolute top-0 left-[20%] w-[1px] h-full bg-brand-border/30 pointer-events-none z-0 hidden lg:block" />

      {/* Universal Ribbon Header */}
      <header className="border-b border-brand-border bg-brand-surface sticky top-0 z-40 select-none">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-18 flex items-center justify-between relative">
          
          {/* Logo / Home trigger */}
          <button
            onClick={handleBackToSearch}
            className="flex items-center gap-2 group cursor-pointer"
          >
            <Flame size={18} className="text-brand-accent group-hover:scale-110 transition-transform duration-300" />
            <span className="font-sans font-black text-lg tracking-tighter text-brand-primary uppercase">
              GITHUB_<span className="font-serif italic text-brand-accent capitalize font-extrabold text-xl">Roaster</span>
            </span>
          </button>

          {/* Navigation links */}
          <nav className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-all cursor-pointer relative ${
                activeTab === "dashboard"
                  ? "text-brand-accent font-bold"
                  : "text-brand-secondary hover:text-brand-primary"
              }`}
            >
              ROASTER
              {activeTab === "dashboard" && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-brand-accent" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-all cursor-pointer relative ${
                activeTab === "leaderboard"
                  ? "text-brand-accent font-bold"
                  : "text-brand-secondary hover:text-brand-primary"
              }`}
            >
              LEADERBOARD
              {activeTab === "leaderboard" && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-brand-accent" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("docs")}
              className={`px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-all cursor-pointer relative ${
                activeTab === "docs"
                  ? "text-brand-accent font-bold"
                  : "text-brand-secondary hover:text-brand-primary"
              }`}
            >
              API
              {activeTab === "docs" && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-brand-accent" />
              )}
            </button>

            {/* Inline divider line */}
            <span className="w-px h-4 bg-brand-border mx-2 hidden sm:inline" />

            {/* Dark mode switcher */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-1.5 rounded-none hover:bg-brand-inset text-brand-secondary hover:text-brand-primary border border-brand-border transition-all cursor-pointer bg-brand-surface"
              title={isDark ? "Light theme" : "Dark theme"}
            >
              {isDark ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </nav>

        </div>
      </header>

      {/* Main Container Stage */}
      <main className="flex-1 pb-16 z-10 relative">
        <AnimatePresence mode="wait">
          {isLoading ? (
            /* --- Beautiful Console loading layout --- */
            <motion.div
              key="loading-terminal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto py-20 px-4 w-full select-none"
            >
              <div className="bg-brand-surface border border-brand-border-strong rounded-none overflow-hidden shadow-xs">
                {/* Simulated window frame */}
                <div className="border-b border-brand-border bg-brand-base px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-none bg-brand-accent" />
                    <span className="w-2.5 h-2.5 rounded-none bg-brand-border-strong" />
                    <span className="w-2.5 h-2.5 rounded-none bg-brand-border" />
                  </div>
                  <span className="font-mono text-[9px] tracking-wider text-brand-secondary font-bold flex items-center gap-1.5">
                    <Cpu size={12} className="animate-pulse text-brand-accent" />
                    DEEP_DIAG_PROCESS // v2.3
                  </span>
                </div>

                {/* Log list frame */}
                <div className="p-6 bg-brand-surface font-mono text-[11px] text-brand-primary min-h-64 flex flex-col justify-between">
                  <div className="space-y-1.5 max-h-56 overflow-hidden">
                    {loadingLogs.map((log, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15 }}
                        className="leading-relaxed select-none"
                      >
                        <span className="text-brand-tertiary font-bold">&gt;&gt;</span>{" "}
                        <span className={(log || "").includes("WARNING") ? "text-brand-accent font-black" : (log || "").includes("SUCCESS") ? "text-green-600 font-bold" : "font-light"}>
                          {log}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Infinite pulsing line */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 border-t border-brand-border mt-4">
                    <div className="flex items-center gap-2 text-brand-accent">
                      <TerminalIcon size={12} className="animate-bounce" />
                      <span className="animate-pulse tracking-wide font-bold text-[10px] uppercase">EXAMINING TARGET GITHUB HANDLE ...</span>
                    </div>
                    <span className="font-mono text-[9px] text-brand-tertiary select-none uppercase tracking-wider text-left sm:text-right">
                      [system] TIME: It can take up to 1 min to generate your results.......
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* --- standard Router views --- */
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {activeTab === "dashboard" && (
                currentProfile ? (
                  <div className="max-w-4xl mx-auto px-4 pt-8">
                    {/* <button
                      onClick={handleBackToSearch}
                      className="flex items-center gap-2 text-brand-secondary hover:text-brand-primary transition-all cursor-pointer font-mono text-[10px] uppercase tracking-widest select-none pb-4"
                    >
                      &larr; BACK TO SEARCH
                    </button> */}
                    <RoastResultView
                      profile={currentProfile}
                      isDark={isDark}
                      onBack={handleBackToSearch}
                    />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {error && (
                      <div className="max-w-xl mx-auto mt-8 px-4">
                        <div className="bg-brand-surface border border-brand-accent p-5 rounded-none flex gap-3 text-brand-accent">
                          <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                          <div className="text-xs font-mono uppercase tracking-wider">
                            {error}
                          </div>
                        </div>
                      </div>
                    )}
                    <SearchHero
                      onSearch={handleRoastSearch}
                      isLoading={isLoading}
                      roastedCount={roastedCount}
                    />
                    <div className="max-w-md mx-auto text-center px-4 -mt-4 opacity-75">
                      <p className="font-mono text-[10px] text-brand-tertiary select-none uppercase tracking-widest leading-relaxed">
                        [system] TIME: It can take up to 1 min to generate your results.......
                      </p>
                    </div>
                  </div>
                )
              )}

              {activeTab === "leaderboard" && (
                <LeaderboardView
                  items={leaderboard}
                  onSelectUser={(username) => {
                    handleRoastSearch(username);
                  }}
                />
              )}

              {activeTab === "docs" && <DocsView />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Small Legal/Credits Footer block */}
      <footer className="border-t border-brand-border bg-brand-surface py-6 text-center select-none z-10 relative">
        <p className="font-mono text-[9px] text-brand-tertiary uppercase tracking-[0.25em]">
          © {new Date().getFullYear()} GITHUB_ROASTER // DATA RETRIEVAL SYNCHRONIZATION // INTELLECTUAL CODES.
        </p>
      </footer>
    </div>
  );
}

