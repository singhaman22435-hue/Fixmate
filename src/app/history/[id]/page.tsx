'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { UnifiedResultRenderer } from '@/components/results/UnifiedResultRenderer';
import { PipelineExecutionResult, UnifiedAnalysisResultPayload } from '@/lib/analyzers/types';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export default function HistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineExecutionResult | null>(null);

  useEffect(() => {
    async function loadItem() {
      try {
        const res = await fetch(`/api/history/${id}`);
        if (!res.ok) {
          throw new Error('Analysis record not found');
        }
        const record = await res.json();
        let payload: UnifiedAnalysisResultPayload;
        try {
          payload = JSON.parse(record.resultJson);
        } catch {
          payload = {
            type: 'GENERAL_QUESTION',
            data: {
              summary: record.summary,
              explanation: record.processedText || record.summary,
              keyTakeaways: [],
              recommendedActions: [],
              suggestedNextStep: '',
              confidence: 'MEDIUM',
            },
          };
        }

        setResult({
          analysisId: record.id,
          intent: record.intent,
          inputType: record.inputType,
          title: record.title,
          summary: record.summary,
          confidence: record.confidence,
          riskLevel: record.riskLevel || undefined,
          extractedText: record.processedText || '',
          result: payload,
          aiModelUsed: record.aiModelUsed || 'local',
          fallbackUsed: record.aiModelUsed === 'deterministic_fallback',
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load analysis';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadItem();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
        <p className="text-sm text-slate-500">Loading analysis record...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold">Analysis Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'This record does not exist in local SQLite.'}</p>
        <Button variant="primary" onClick={() => router.push('/history')}>
          Back to History
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to History</span>
        </Link>
      </div>

      <UnifiedResultRenderer
        result={result}
        onReset={() => router.push('/')}
      />
    </div>
  );
}

