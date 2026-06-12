/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Terminal, Code, BookOpen, AlertCircle, Copy, Check } from "lucide-react";
import { useState } from "react";

export default function DocsView() {
  const [copied, setCopied] = useState(false);

  const curlCode = `curl -X POST https://github-roaster.example.com/api/roast \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "dev_dude",
    "brutalityLevel": 100,
    "consentToEmotionalDamage": true
  }'`;

  const handleCopy = () => {
    navigator.clipboard.writeText(curlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 w-full">
      {/* Header */}
      <div className="border-b border-brand-border pb-6 mb-10">
        <div className="flex items-center gap-2.5 text-brand-accent mb-2">
          <BookOpen size={16} />
          <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold text-brand-secondary">
            N_04 // SPECIFICATIONS
          </span>
        </div>
        <h2 className="text-4xl md:text-5xl font-sans font-black text-brand-primary uppercase tracking-tighter">
          API <span className="font-serif italic text-brand-accent capitalize font-extrabold">Documentation</span>
        </h2>
        <p className="font-mono text-[10px] text-brand-tertiary mt-2 uppercase tracking-widest leading-relaxed">
          INTEGRATE EMOTIONAL DAMAGE INTO YOUR DEPLOYMENT PIPELINE
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Core parameters column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Intro Section */}
          <section className="space-y-3 font-sans">
            <h3 className="text-xs font-mono font-bold text-brand-tertiary uppercase tracking-widest">
              01 // OVERVIEW
            </h3>
            <p className="text-brand-secondary text-sm leading-relaxed font-light">
              We understand you want to automate reviewing your teammates&apos; subpar commits. 
              The GITHUB_ROASTER API lets you trigger instantaneous, high-fidelity psychological evaluations 
              directly from your Github actions or git pre-commit hooks.
            </p>
          </section>

          {/* Endpoint Details */}
          <section className="space-y-4">
            <h3 className="text-xs font-mono font-bold text-brand-tertiary uppercase tracking-widest">
              02 // ENDPOINT DETAILS
            </h3>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="bg-brand-accent text-white px-3 py-1 font-bold text-[10px] tracking-wider rounded-xs">POST</span>
              <span className="text-brand-primary bg-brand-surface border border-brand-border px-3 py-1 rounded-xs">
                /api/roast
              </span>
            </div>

            <div className="bg-brand-surface border border-brand-border rounded-none overflow-hidden">
              <div className="border-b border-brand-border bg-brand-base px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code size={14} className="text-brand-secondary" />
                  <span className="font-mono text-[10px] tracking-wider font-bold text-brand-secondary">
                    Example Request (cURL)
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="font-mono text-[10px] tracking-wider text-brand-secondary hover:text-brand-accent flex items-center gap-1 cursor-pointer transition-all"
                >
                  {copied ? (
                    <>
                      <Check size={12} className="text-green-600" />
                      <span className="text-green-600 font-bold">COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>COPY</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-[13px] font-mono text-brand-primary leading-relaxed bg-brand-surface">
                <code>{curlCode}</code>
              </pre>
            </div>
          </section>

          {/* Request Fields */}
          <section className="space-y-4">
            <h3 className="text-xs font-mono font-bold text-brand-tertiary uppercase tracking-widest">
              03 // BODY PARAMETERS
            </h3>

            <div className="space-y-4 border border-brand-border rounded-none p-4 bg-brand-surface">
              {/* param 1 */}
              <div className="border-b border-brand-border pb-3">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-mono text-sm font-bold text-brand-primary">username</span>
                  <span className="font-mono text-[10px] text-brand-accent font-bold tracking-wider">STRING</span>
                  <span className="font-mono text-[9px] text-red-500 font-bold ml-auto tracking-wider">REQUIRED</span>
                </div>
                <p className="text-brand-secondary text-xs font-light">
                  The clean GitHub logon/handle to be roasted. Case insensitive. Leading `@` symbols are automatically stripped.
                </p>
              </div>

              {/* param 2 */}
              <div className="border-b border-brand-border pb-3">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-mono text-sm font-bold text-brand-primary">brutalityLevel</span>
                  <span className="font-mono text-[10px] text-brand-secondary font-bold tracking-wider">INTEGER</span>
                  <span className="font-mono text-[9px] text-brand-tertiary font-bold ml-auto tracking-wider">OPTIONAL (DEFAULT: 100)</span>
                </div>
                <p className="text-brand-secondary text-xs font-light">
                  Values ranges from <code className="font-mono text-[11px] bg-brand-inset px-1">0</code> (Soft, standard corporate performance review) to <code className="font-mono text-[11px] bg-brand-inset px-1">100</code> (Full terminal breakdown, emotional repair costs of approx $400/hr).
                </p>
              </div>

              {/* param 3 */}
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-mono text-sm font-bold text-brand-primary">consentToEmotionalDamage</span>
                  <span className="font-mono text-[10px] text-brand-secondary font-bold tracking-wider">BOOLEAN</span>
                  <span className="font-mono text-[9px] text-red-500 font-bold ml-auto tracking-wider">REQUIRED (MUST BE TRUE)</span>
                </div>
                <p className="text-brand-secondary text-xs font-light">
                  A checkbox safety mechanism. If sent as <code className="font-mono text-[11px] bg-brand-inset px-1">false</code>, the response will immediately exit with Status Code <code className="font-mono text-[11px] bg-brand-inset px-1">451 (Unavailable For Legal Reasons)</code>.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar warning column */}
        <div className="space-y-6">
          <div className="border border-brand-accent bg-brand-accent-subtle p-6 rounded-none space-y-4">
            <div className="flex items-center gap-2 text-brand-accent">
              <AlertCircle size={16} />
              <h4 className="font-mono font-bold text-xs tracking-wider uppercase">
                DISCLAIMER & LAWSUITS
              </h4>
            </div>
            <p className="font-sans text-xs text-brand-primary font-light leading-relaxed">
              GITHUB_ROASTER takes no legal or moral responsibility for the termination of professional friendships, rage-quitting, or immediate switches of career to sheep-farming. 
            </p>
            <p className="font-sans text-xs text-brand-secondary font-light leading-relaxed">
              Our evaluation models utilize raw data points combined with advanced conversational algorithms to generate heavy humor. Read at your own risk.
            </p>
          </div>

          <div className="border border-brand-border-strong p-6 rounded-none space-y-4 bg-brand-surface select-none">
            <div className="flex items-center gap-2 text-brand-primary">
              <Terminal size={14} />
              <h4 className="font-mono font-bold text-xs uppercase tracking-wider">
                RESPONSE CODES
              </h4>
            </div>
            <div className="font-mono text-[11px] text-brand-secondary space-y-2">
              <div className="flex justify-between">
                <span>200 OK</span>
                <span className="text-green-600 font-bold uppercase tracking-wider">Success</span>
              </div>
              <div className="flex justify-between">
                <span>400 BAD_REQUEST</span>
                <span className="text-red-500 uppercase tracking-wider">Fail</span>
              </div>
              <div className="flex justify-between">
                <span>404 NOT_FOUND</span>
                <span className="text-red-500 uppercase tracking-wider">Invalid</span>
              </div>
              <div className="flex justify-between">
                <span>429 RATE_LIMIT</span>
                <span className="text-brand-accent uppercase tracking-wider">Exhausted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
