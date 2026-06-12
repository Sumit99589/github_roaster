/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { Terminal, Users, Sparkles } from "lucide-react";

interface SearchHeroProps {
  onSearch: (username: string) => void;
  isLoading: boolean;
  roastedCount: number;
}

export default function SearchHero({ onSearch, isLoading, roastedCount }: SearchHeroProps) {
  const [usernameInput, setUsernameInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim()) {
      onSearch(usernameInput.trim());
    }
  };

  const quickPills = ["torvalds", "gaearon", "sindresorhus", "tj", "dhh"];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 max-w-4xl mx-auto w-full text-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-6 w-full"
      >
        {/* Title Block */}
        <div className="relative inline-block select-none py-4">
          <h1 className="text-7xl md:text-9xl tracking-tighter text-brand-primary uppercase font-black font-sans leading-none">
            GITHUB
            <span className="block font-serif italic text-brand-accent font-extrabold tracking-normal text-6xl md:text-8xl normal-case mt-1 ml-4 sm:ml-8 md:ml-12">
              Roaster
            </span>
          </h1>
          <p className="max-w-md mx-auto mt-6 text-xs sm:text-sm leading-relaxed text-brand-secondary font-light tracking-wide uppercase">
            A curated synthesis of brutalist developer metrics and heavy thermal evaluation feedback.
          </p>
        </div>

        {/* Counter Widget */}
        <div className="flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider text-brand-secondary">
          <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-ping" />
          <span>Roasted:</span>
          <span className="font-bold text-brand-primary bg-brand-surface glass-card px-3 py-1 rounded-sm border border-brand-border font-mono text-xs">
            {roastedCount.toLocaleString()}
          </span>
          <span>accounts live</span>
        </div>

        {/* Console Search Bar */}
        <form
          onSubmit={handleSubmit}
          className="bg-brand-surface border border-brand-border-strong rounded-full p-1.5 max-w-xl mx-auto flex items-center gap-1.5 focus-within:ring-1 focus-within:ring-brand-accent focus-within:border-brand-accent transition-all duration-300 shadow-xs"
        >
          <span className="font-mono text-brand-tertiary select-none pl-5 text-sm hidden sm:inline">
            github.com/
          </span>
          <input
            type="text"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            placeholder="username"
            disabled={isLoading}
            className="flex-1 bg-transparent py-2 px-3 md:px-0 text-brand-primary outline-hidden font-mono text-sm md:text-base border-none focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={isLoading || !usernameInput.trim()}
            className="bg-brand-accent hover:opacity-90 active:scale-95 text-white font-sans font-bold text-xs uppercase tracking-widest px-6 md:px-8 py-3 rounded-full flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:scale-100 shrink-0"
          >
            <Sparkles size={14} />
            <span>EXAMINE</span>
          </button>
        </form>

        {/* Quick-try indicators */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-8 max-w-lg mx-auto">
          <span className="font-sans font-bold text-[10px] tracking-widest uppercase text-brand-tertiary">
            ARCHIVE / 2026:
          </span>
          {quickPills.map((p) => (
            <button
              key={p}
              onClick={() => {
                setUsernameInput(p);
                onSearch(p);
              }}
              disabled={isLoading}
              className="font-mono text-xs text-brand-secondary bg-brand-surface border border-brand-border hover:border-brand-accent hover:bg-brand-accent hover:text-white px-4 py-1.5 rounded-full transition-all cursor-pointer"
            >
              @{p}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
