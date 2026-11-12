'use client';

import React, { useState } from 'react';
import { UnifiedDropZone } from '@/components/input/UnifiedDropZone';
import { UnifiedResultRenderer } from '@/components/results/UnifiedResultRenderer';
import { PipelineExecutionResult } from '@/lib/analyzers/types';
import { Receipt, FileText, CheckCircle2 } from 'lucide-react';

export default function BillPage() {
  const [result, setResult] = useState<PipelineExecutionResult | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {result ? (
        <UnifiedResultRenderer result={result} onReset={() => setResult(null)} />
      ) : (
        <>
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Explain This Bill
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              Upload utility bills, electricity invoices, phone statements, or college fee receipts. FixMate extracts line items, flags unusual surcharges, and explains your total in plain language.
            </p>
          </div>

          <UnifiedDropZone
            explicitIntent="BILL_EXPLANATION"
            onAnalysisComplete={(res) => setResult(res)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-500 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>No Guessing:</strong> Unclear numbers or unstated dates are explicitly labeled as &ldquo;Could not determine from document&rdquo;.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                <strong>Hidden Surcharges:</strong> Late payment penalties, meter adjustment fees, and peak tariff hikes are isolated for your review.
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

