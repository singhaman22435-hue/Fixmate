'use client';

import React, { useState } from 'react';
import { UnifiedDropZone } from '@/components/input/UnifiedDropZone';
import { UnifiedResultRenderer } from '@/components/results/UnifiedResultRenderer';
import { PipelineExecutionResult } from '@/lib/analyzers/types';
import { ShoppingCart, Check, AlertCircle } from 'lucide-react';

export default function BuyPage() {
  const [result, setResult] = useState<PipelineExecutionResult | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {result ? (
        <UnifiedResultRenderer result={result} onReset={() => setResult(null)} />
      ) : (
        <>
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 mx-auto flex items-center justify-center">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              What Should I Buy? Scanner
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              Upload product listings, e-commerce screenshots, or spec sheets. FixMate cuts through marketing hype with honest pros, cons, and buying verdicts.
            </p>
          </div>

          <UnifiedDropZone
            explicitIntent="PRODUCT_ANALYSIS"
            onAnalysisComplete={(res) => setResult(res)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-500 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
              <span>
                <strong>Objective Assessment:</strong> Evaluates who the product is ideal for and who should skip it based on real specifications.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Zero Spec Hallucination:</strong> Unstated features or battery limits are explicitly flagged rather than guessed.
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

