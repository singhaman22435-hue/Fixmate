'use client';

import React, { useState } from 'react';
import { UnifiedDropZone } from '@/components/input/UnifiedDropZone';
import { UnifiedResultRenderer } from '@/components/results/UnifiedResultRenderer';
import { PipelineExecutionResult } from '@/lib/analyzers/types';
import { Mic, CheckSquare, Calendar } from 'lucide-react';

export default function VoicePage() {
  const [result, setResult] = useState<PipelineExecutionResult | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {result ? (
        <UnifiedResultRenderer result={result} onReset={() => setResult(null)} />
      ) : (
        <>
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
              <Mic className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Voice Note → To-Do List
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              Speak or upload a messy audio note. FixMate transcribes your thoughts, extracts dates and deadlines, identifies mentioned contacts, and generates an organized to-do checklist.
            </p>
          </div>

          <UnifiedDropZone
            explicitIntent="VOICE_TASK_EXTRACTION"
            onAnalysisComplete={(res) => setResult(res)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-500 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                <strong>No Invented Dates:</strong> Ambiguous statements preserve their original context without fabricating deadlines.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Interactive Checklist:</strong> Toggle items directly or export to standard iCalendar (.ics) format.
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

