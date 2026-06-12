/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion } from "motion/react";
import { LeaderboardItem } from "../types";
import { Trophy, HelpCircle, ShieldAlert } from "lucide-react";

interface LeaderboardViewProps {
  items: LeaderboardItem[];
  onSelectUser: (username: string) => void;
}

export default function LeaderboardView({ items, onSelectUser }: LeaderboardViewProps) {
  const [visibleCount, setVisibleCount] = useState(5);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -15 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100 } },
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 5);
  };

  const loadMoreAvailable = items.length > visibleCount;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 w-full">
      {/* Header and Subheading */}
      <div className="border-b border-brand-border pb-6 mb-10">
        <div className="flex items-center gap-2.5 text-brand-accent mb-2">
          <Trophy size={16} />
          <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold text-brand-secondary">
            N_04 // STATISTICAL ARCHIVE
          </span>
        </div>
        <h2 className="text-4xl md:text-5xl font-sans font-black text-brand-primary uppercase tracking-tighter">
          THE PUBLIC <span className="font-serif italic text-brand-accent capitalize font-extrabold">Registry</span>
        </h2>
        <p className="font-mono text-[10px] text-brand-tertiary mt-2 uppercase tracking-widest leading-relaxed">
          The most examined code repos of the season · Updated instantly
        </p>
      </div>

      {/* Leaderboard rows */}
      {items.length === 0 ? (
        <div className="text-center py-12 bg-brand-surface rounded-none border border-brand-border">
          <ShieldAlert size={32} className="mx-auto text-brand-tertiary mb-3 animate-spin" />
          <p className="font-mono text-xs uppercase tracking-wider text-brand-secondary">Zero profiles evaluated today.</p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {items.slice(0, visibleCount).map((item, index) => {
            const rankStr = String(index + 1).padStart(2, "0");
            
            // Give specific border colors based on grades
            const isF = (item.grade || "").includes("F") || (item.grade || "").includes("D");
            const gradeColor = isF
              ? "border-red-500/30 text-red-500 bg-red-500/5"
              : "border-brand-accent/20 text-brand-accent bg-brand-accent-subtle";

            return (
              <motion.div
                key={item.username}
                variants={itemVariants}
                onClick={() => onSelectUser(item.username)}
                className="flex items-center justify-between p-4 bg-brand-surface border border-brand-border rounded-none hover:border-brand-accent transition-all duration-300 cursor-pointer shadow-xs group relative overflow-hidden"
              >
                {/* Thin vertical side bar indicator for hover style */}
                <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand-accent translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <span className="font-mono text-xs text-brand-tertiary select-none w-6">
                    {rankStr}
                  </span>

                  {/* Avatar */}
                  <div className="relative">
                    <img
                      src={item.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80"}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-brand-border group-hover:border-brand-accent transition-all duration-300"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-brand-primary text-[8px] text-white px-1 font-mono rounded-xs border border-brand-border-strong">
                      #{index + 1}
                    </div>
                  </div>

                  {/* Username/Info */}
                  <div className="flex flex-col">
                    <span className="font-mono text-sm font-bold text-brand-primary group-hover:text-brand-accent transition-all duration-200">
                      @{item.username}
                    </span>
                    <span className="font-sans text-[11px] text-brand-secondary font-light">
                      {item.name || item.username}
                    </span>
                  </div>
                </div>

                {/* Grade label */}
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[9px] tracking-widest text-brand-tertiary hidden sm:inline select-none">
                    REVIEW ACCOUNT
                  </span>
                  <div
                    className={`w-12 h-10 border rounded-sm flex items-center justify-center font-serif italic font-black text-sm transition-all ${gradeColor}`}
                  >
                    {item.grade}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Load more button */}
      {loadMoreAvailable && (
        <div className="flex justify-center mt-12">
          <button
            onClick={handleLoadMore}
            className="border border-brand-border-strong text-brand-primary hover:bg-brand-primary hover:text-white font-mono text-[10px] uppercase font-bold tracking-[0.2em] px-8 py-3 rounded-none active:scale-95 transition-all cursor-pointer"
          >
            LOAD EXTRA RECORDS
          </button>
        </div>
      )}
    </div>
  );
}
