'use client';

import React, { useState } from 'react';
import { UnifiedDropZone } from '@/components/input/UnifiedDropZone';
import { UnifiedResultRenderer } from '@/components/results/UnifiedResultRenderer';
import { PipelineExecutionResult } from '@/lib/analyzers/types';
import { ShieldAlert, Lock, AlertTriangle } from 'lucide-react';

export default function ScamPage() {
  const [result, setResult] = useState<PipelineExecutionResult | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {result ? (
        <UnifiedResultRenderer result={result} onReset={() => setResult(null)} />
      ) : (
        <>
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Scam &amp; Phishing Check
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              Received a suspicious WhatsApp forward, urgent bank SMS, fake job offer, or unverified payment link? FixMate analyzes social engineering signals and provides safe next steps.
            </p>
          </div>

          <UnifiedDropZone
            explicitIntent="SCAM_ANALYSIS"
            onAnalysisComplete={(res) => setResult(res)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-500 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Zero Secret Collection:</strong> FixMate will never ask for your passwords, OTPs, UPI PINs, or private keys.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Objective Risk Signal:</strong> Phishing detection is labeled as risk indicators and social engineering tactics to help you make informed decisions.
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

