'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UnifiedDropZone } from '@/components/input/UnifiedDropZone';
import { QuickActionGrid } from '@/components/input/QuickActionGrid';
import { UnifiedResultRenderer } from '@/components/results/UnifiedResultRenderer';
import { FixMateIntent, PipelineExecutionResult } from '@/lib/analyzers/types';
import { formatDate } from '@/lib/utils/formatters';

interface RecentAnalysisSummary {
  id: string;
  title: string;
  intent: string;
  createdAt: string;
  summary: string;
}

export default function HomePage() {
  const [selectedIntent, setSelectedIntent] = useState<FixMateIntent | undefined>(undefined);
  const [activeResult, setActiveResult] = useState<PipelineExecutionResult | null>(null);
  const [recentItems, setRecentItems] = useState<RecentAnalysisSummary[]>([]);

  const fetchRecent = async () => {
    try {
      const res = await fetch('/api/history?limit=4');
      if (res.ok) {
        const data = await res.json();
        setRecentItems(data.items || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchRecent();
  }, []);

  const handleAnalysisComplete = (result: PipelineExecutionResult) => {
    setActiveResult(result);
    fetchRecent();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setActiveResult(null);
    setSelectedIntent(undefined);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {activeResult ? (
        <UnifiedResultRenderer result={activeResult} onReset={handleReset} />
      ) : (
        <>
          {/* Natural Header */}
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              What can I help you with?
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Paste an error, upload a screenshot or bill, record a note, or ask a question.
            </p>
          </div>

          {/* Primary Input Area */}
          <UnifiedDropZone
            explicitIntent={selectedIntent}
            onAnalysisComplete={handleAnalysisComplete}
            onClearIntent={() => setSelectedIntent(undefined)}
          />

          {/* Quick Help Categories */}
          <QuickActionGrid
            activeIntent={selectedIntent}
            onSelectIntent={(intent) => setSelectedIntent(intent)}
          />

          {/* Recent Solves from SQLite */}
          {recentItems.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Recent activity
                </h3>
                <Link
                  href="/history"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View all
                </Link>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                {recentItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/history/${item.id}`}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.intent.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.title}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
