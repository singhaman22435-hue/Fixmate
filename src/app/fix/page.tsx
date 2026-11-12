'use client';

import React, { useState } from 'react';
import { UnifiedDropZone } from '@/components/input/UnifiedDropZone';
import { UnifiedResultRenderer } from '@/components/results/UnifiedResultRenderer';
import { PipelineExecutionResult } from '@/lib/analyzers/types';
import { Wrench, Terminal, ShieldAlert } from 'lucide-react';

export default function FixPage() {
  const [result, setResult] = useState<PipelineExecutionResult | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {result ? (
        <UnifiedResultRenderer result={result} onReset={() => setResult(null)} />
      ) : (
        <>
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
              <Wrench className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Screenshot &amp; Technical Error Fixer
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              Upload a screenshot of any terminal error, compiler bug, Windows/Android dialog, or crash log. FixMate extracts the issue, explains why it happened, and provides safe copyable commands.
            </p>
          </div>

          <UnifiedDropZone
            explicitIntent="TECHNICAL_ERROR"
            onAnalysisComplete={(res) => setResult(res)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-500 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-2">
              <Terminal className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                <strong>Zero Command Invention:</strong> FixMate never fabricates risky commands. If the cause is uncertain, safety notes are clearly stated.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Warning Highlighting:</strong> Destructive operations (like resetting caches or port termination) are labeled with precautions.
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

