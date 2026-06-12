/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { RoastProfile } from "../types";
import { exportRoastToPNG } from "../utils";
import { Download, Link, ArrowLeft, Check, Sparkles } from "lucide-react";
import { useState } from "react";

interface RoastResultViewProps {
  profile: RoastProfile;
  isDark: boolean;
  onBack: () => void;
}

export default function RoastResultView({ profile, isDark, onBack }: RoastResultViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}?user=${profile.username}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    exportRoastToPNG(profile, isDark);
  };

  // --- SVG Radar Chart Math ---
  const size = 220;
  const center = size / 2;
  const radius = 75;
  const metrics = [
    { label: "Quality", key: "codeQuality" },
    { label: "Consistency", key: "consistency" },
    { label: "Docs", key: "documentation" },
    { label: "Originality", key: "originality" },
    { label: "Impact", key: "impact" },
  ] as const;

  const pointsCount = metrics.length;
  // Calculate concentric circles points
  const getPolygonPoints = (scale: number) => {
    const points: string[] = [];
    for (let i = 0; i < pointsCount; i++) {
      const angle = (i * 2 * Math.PI) / pointsCount - Math.PI / 2;
      const x = center + radius * scale * Math.cos(angle);
      const y = center + radius * scale * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    return points.join(" ");
  };

  // Calculate actual user score polygon coordinates
  const getUserPolygonPoints = () => {
    const points: string[] = [];
    for (let i = 0; i < pointsCount; i++) {
      const angle = (i * 2 * Math.PI) / pointsCount - Math.PI / 2;
      const score = profile.scores[metrics[i].key] || 0;
      const scale = score / 100;
      const x = center + radius * scale * Math.cos(angle);
      const y = center + radius * scale * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    return points.join(" ");
  };

  // Axis lines and label placements
  const axisLines = [];
  const labels = [];
  for (let i = 0; i < pointsCount; i++) {
    const angle = (i * 2 * Math.PI) / pointsCount - Math.PI / 2;
    // Outer point
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    axisLines.push({ x1: center, y1: center, x2: x, y2: y });

    // Label coordinates
    const labelDistance = radius + 22;
    const lx = center + labelDistance * Math.cos(angle);
    const ly = center + labelDistance * Math.sin(angle);
    labels.push({ text: metrics[i].label, x: lx, y: ly });
  }

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 w-full space-y-10">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-brand-secondary hover:text-brand-accent transition-all cursor-pointer font-sans text-xs font-semibold uppercase tracking-wider select-none"
        >
          <ArrowLeft size={14} />
          <span>ROAST ANOTHER DEVELOPER</span>
        </button>
      </div>

      {/* Profile Header */}
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center text-center space-y-4"
      >
        <div className="relative">
          <img
            src={profile.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80"}
            alt={profile.name}
            referrerPolicy="no-referrer"
            className="w-24 h-24 rounded-full border border-brand-accent object-cover p-1 bg-brand-surface"
          />
          <div className="absolute bottom-0 right-0 bg-brand-accent text-[#fff] p-1.5 rounded-full border border-brand-surface">
            <Sparkles size={12} className="animate-spin" style={{ animationDuration: '3s' }} />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-4xl md:text-6xl font-sans font-black tracking-tighter text-brand-primary uppercase">
            @{profile.username}
          </h2>
          <p className="text-brand-secondary font-serif italic text-lg md:text-xl max-w-xl mx-auto px-4 leading-relaxed">
            &ldquo;{profile.bio}&rdquo;
          </p>
        </div>

        <div className="font-mono text-[10px] text-brand-tertiary uppercase tracking-[0.2em] pt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
          <span>JOINED {profile.joinedYear}</span>
          <span>·</span>
          <span>{profile.reposCount} REPOS</span>
          <span>·</span>
          <span>{profile.followersCount} FOLLOWERS</span>
        </div>
      </motion.div>

      {/* Grade Card - Massive, inverted */}
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="show"
        className="bg-brand-primary text-brand-base p-8 rounded-none flex flex-col md:flex-row items-center gap-8 border border-brand-border-strong relative overflow-hidden select-none dark:bg-brand-surface dark:text-brand-primary"
      >
        {/* Massive numeric badge background accent */}
        <div className="absolute -right-4 -bottom-10 text-[180px] font-serif font-black italic text-[#fff]/5 pointer-events-none select-none">
          {profile.grade}
        </div>

        {/* Grade Visual Display */}
        <div className="w-28 h-28 bg-brand-accent rounded-none flex items-center justify-center shrink-0 border border-white/10 relative shadow-sm">
          <span className="text-5xl font-serif font-black italic text-[#fff] tracking-widest select-none">
            {profile.grade}
          </span>
        </div>

        {/* Text descriptions */}
        <div className="flex-1 space-y-2 text-center md:text-left">
          <span className="font-mono text-[9px] bg-brand-accent text-white px-2.5 py-0.5 uppercase tracking-widest font-bold">
            Grade Assessment
          </span>
          <h3 className="text-2xl md:text-3xl font-sans font-black tracking-tight text-white uppercase pt-1 dark:text-brand-primary">
            {profile.gradeTitle}
          </h3>
          <p className="text-neutral-300 text-xs md:text-sm font-light leading-relaxed dark:text-brand-secondary">
            {profile.gradeExplanation}
          </p>
        </div>
      </motion.div>

      {/* Roast Highlights logs block */}
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="show"
        className="bg-brand-surface border border-brand-border-strong p-6 md:p-8 rounded-none shadow-xs"
      >
        <div className="border-b border-brand-border pb-4 mb-6">
          <h4 className="font-mono text-[10px] tracking-widest font-bold uppercase text-brand-accent">
            CRITICAL EVALUATION REPORT // LIVE METRIC FEEDBACK
          </h4>
        </div>
        <ul className="space-y-4">
          {profile.roastBullets.map((bullet, idx) => (
            <li key={idx} className="flex items-start gap-4 text-brand-primary">
              <span className="text-brand-accent font-mono font-black text-sm select-none shrink-0 pt-0.5">
                //
              </span>
              <p className="font-sans text-sm md:text-base font-light leading-relaxed select-text">
                {bullet}
              </p>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Score overview & Language Breakdown Side-by-side */}
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
      >
        {/* Score overview - SVG Radar */}
        <div className="bg-brand-surface border border-brand-border rounded-none p-6 flex flex-col justify-between">
          <div>
            <span className="font-mono text-[9px] tracking-wider uppercase text-brand-secondary block mb-6 border-b border-brand-border w-full pb-2">
              01 // Radar Metrics
            </span>

            <div className="relative w-full flex items-center justify-center h-52">
              <svg width={size} height={size} className="overflow-visible select-none">
                {/* Concentric radar grid */}
                <polygon points={getPolygonPoints(1.0)} className="fill-none stroke-brand-border stroke-1" />
                <polygon points={getPolygonPoints(0.75)} className="fill-none stroke-brand-border/60 stroke-1" />
                <polygon points={getPolygonPoints(0.5)} className="fill-none stroke-brand-border/50 stroke-1" />
                <polygon points={getPolygonPoints(0.25)} className="fill-none stroke-brand-border/40 stroke-1 block" />

                {/* Angle axis lines */}
                {axisLines.map((line, idx) => (
                  <line
                    key={idx}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    className="stroke-brand-border stroke-1"
                  />
                ))}

                {/* User stats fill */}
                <polygon
                  points={getUserPolygonPoints()}
                  className="fill-brand-accent/20 stroke-brand-accent stroke-1.5"
                />

                {/* Vertices indicator rings */}
                {getUserPolygonPoints().split(" ").map((pt, idx) => {
                  const [x, y] = pt.split(",");
                  return (
                    <circle
                      key={idx}
                      cx={x}
                      cy={y}
                      r={3}
                      className="fill-brand-accent stroke-brand-surface stroke-1"
                    />
                  );
                })}

                {/* Axis labels with responsive alignments */}
                {labels.map((label, idx) => {
                  let anchor = "middle";
                  if (label.x < center - 15) anchor = "end";
                  if (label.x > center + 15) anchor = "start";
                  return (
                    <text
                      key={idx}
                      x={label.x}
                      y={label.y + 4}
                      textAnchor={anchor}
                      className="font-mono text-[9px] font-medium fill-brand-secondary fill-current uppercase tracking-wider"
                    >
                      {label.text}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          {profile.radarRoast && (
            <div className="mt-6 pt-4 border-t border-brand-border">
              <span className="font-mono text-[8px] font-bold text-brand-accent uppercase block tracking-wider mb-1">
                Radar Diagnostic Roast:
              </span>
              <p className="font-sans text-xs font-light text-brand-primary leading-relaxed italic">
                &ldquo;{profile.radarRoast}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Language Breakdown */}
        <div className="bg-brand-surface border border-brand-border rounded-none p-6 flex flex-col justify-between">
          <div>
            <span className="font-mono text-[9px] tracking-wider uppercase text-brand-secondary block mb-6 border-b border-brand-border pb-2 w-full">
              02 // Language Breakdown
            </span>

            <div className="space-y-4">
              {profile.languages.map((lang) => (
                <div key={lang.name} className="space-y-1.5">
                  <div className="flex justify-between font-mono text-xs">
                    <span className="text-brand-primary font-bold">{lang.name}</span>
                    <span className="text-brand-secondary">{lang.percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-brand-inset rounded-none overflow-hidden border border-brand-border/40">
                    <div
                      style={{ width: `${lang.percentage}%` }}
                      className="h-full bg-brand-accent rounded-none"
                    />
                  </div>
                </div>
              ))}
              {profile.languages.length === 0 && (
                <p className="font-sans text-xs text-brand-tertiary italic">No languages detected.</p>
              )}
            </div>
          </div>

          {profile.segmentRoast && (
            <div className="mt-6 pt-4 border-t border-brand-border">
              <span className="font-mono text-[8px] font-bold text-brand-accent uppercase block tracking-wider mb-1">
                Segment Diagnostic Roast:
              </span>
              <p className="font-sans text-xs font-light text-brand-primary leading-relaxed italic">
                &ldquo;{profile.segmentRoast}&rdquo;
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Global Benchmark Comparison */}
      {(() => {
        const scoreKeys = [
          { key: "codeQuality" as const, label: "Code Quality" },
          { key: "consistency" as const, label: "Consistency" },
          { key: "documentation" as const, label: "Documentation" },
          { key: "originality" as const, label: "Originality" },
          { key: "impact" as const, label: "Impact" }
        ];
        const sortedScores = [...scoreKeys].sort((a, b) => (profile.scores[a.key] || 0) - (profile.scores[b.key] || 0));
        const weakestMetric = sortedScores[0];
        const weakestScore = profile.scores[weakestMetric.key] || 0;
        const userIndex = Math.round(
          ((profile.scores.codeQuality || 0) +
            (profile.scores.consistency || 0) +
            (profile.scores.documentation || 0) +
            (profile.scores.originality || 0) +
            (profile.scores.impact || 0)) /
            5
        );

        return (
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="show"
            className="bg-brand-surface border border-brand-border rounded-none p-6 space-y-5"
          >
            <div>
              <span className="font-mono text-[9px] tracking-wider uppercase text-brand-secondary block mb-4 border-b border-brand-border pb-2">
                03 // Global Benchmark Comparison
              </span>
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-6">
                {/* Quick simple stats indicator widgets nested elegantly */}
                <div className="flex items-center gap-4 shrink-0 font-mono">
                  <div className="text-center p-3 border border-brand-border bg-brand-inset/30 min-w-[110px] flex-1 md:flex-initial">
                    <div className="text-[9px] text-brand-secondary uppercase tracking-tight font-medium">Your Index</div>
                    <div className="text-2xl font-black text-brand-accent">
                      {userIndex}%
                    </div>
                  </div>
                  <div className="text-center p-3 border border-brand-border bg-brand-inset/10 min-w-[110px] flex-1 md:flex-initial">
                    <div className="text-[9px] text-brand-secondary uppercase tracking-tight font-medium">Global Median</div>
                    <div className="text-2xl font-black text-brand-primary/50">68%</div>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-center border-t md:border-t-0 md:border-l border-brand-border pt-4 md:pt-0 md:pl-6">
                  <span className="font-mono text-[8px] font-bold text-brand-accent uppercase tracking-wider block mb-1">
                    Comparative Analysis Roast:
                  </span>
                  <p className="font-sans text-sm font-light text-brand-primary leading-relaxed italic select-all">
                    &ldquo;{profile.comparisonRoast}&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* Diagnostic warning / comparison highlight */}
            <div className="p-4 bg-brand-accent/5 border border-brand-accent/20 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="shrink-0 flex items-center gap-2 text-brand-accent font-mono text-[9px] font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                Critical Deficit Warning // {weakestMetric.label}
              </div>
              <div className="flex-1 font-mono text-xs text-brand-primary leading-relaxed">
                Your absolute weakest score is in <span className="text-brand-accent font-black uppercase">{weakestMetric.label}</span> at a pathetic <span className="text-brand-accent font-black">{weakestScore}%</span>. This lag is single-handedly pulling your overall profile into the bottom tier.
              </div>
            </div>
          </motion.div>
        );
      })()}

      {/* Detailed metrics slider list */}
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="show"
        className="bg-brand-surface border border-brand-border rounded-none p-6"
      >
        <span className="font-mono text-[9px] tracking-wider uppercase text-brand-secondary block mb-6 border-b border-brand-border pb-2">
          04 // Comprehensive Segment Metrics
        </span>

        <div className="space-y-4 font-mono text-xs">
          {metrics.map((metric) => {
            const score = profile.scores[metric.key] || 0;
            return (
              <div key={metric.key} className="flex items-center justify-between gap-4">
                <span className="text-brand-secondary w-28 uppercase tracking-wider text-[11px]">
                  {metric.label === "Docs" ? "Documentation" : metric.label}
                </span>
                <div className="flex-1 h-1.5 bg-brand-inset rounded-none overflow-hidden border border-brand-border/20">
                  <div
                    style={{ width: `${score}%` }}
                    className="h-full bg-brand-accent/80 rounded-none"
                  />
                </div>
                <span className="text-brand-primary font-bold w-6 text-right select-all">
                  {score}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Share Block Section */}
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="show"
        className="bg-brand-surface border border-brand-border p-8 rounded-none flex flex-col items-center text-center space-y-6"
      >
        <div className="space-y-2">
          <h4 className="text-xl font-sans font-black uppercase tracking-tighter text-brand-primary">
            SHARE YOUR <span className="font-serif italic text-brand-accent capitalize">Roast</span>
          </h4>
          <p className="text-xs text-brand-secondary max-w-sm font-light">
            Own the diagnostic. Download a curated report card PNG to share on social channels, or copy a direct link.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center max-w-md">
          <button
            onClick={handleDownload}
            className="w-full sm:w-auto bg-brand-accent hover:opacity-95 text-white font-mono text-[10px] uppercase font-bold tracking-[0.2em] px-8 py-3.5 rounded-none flex items-center justify-center gap-2 select-none cursor-pointer"
          >
            <Download size={12} />
            <span>DOWNLOAD FILE</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="w-full sm:w-auto border border-brand-border-strong hover:bg-brand-base text-brand-primary font-mono text-[10px] uppercase font-bold tracking-[0.2em] px-8 py-3 rounded-none flex items-center justify-center gap-2 select-none cursor-pointer duration-200"
          >
            {copied ? (
              <>
                <Check size={12} className="text-green-600 font-bold" />
                <span className="text-green-600">COPIED LINK</span>
              </>
            ) : (
              <>
                <Link size={12} />
                <span>COPY URL</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
