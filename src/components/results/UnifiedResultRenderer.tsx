'use client';

import React, { useState } from 'react';
import { PipelineExecutionResult } from '@/lib/analyzers/types';
import { ScreenshotResultView } from './ScreenshotResultView';
import { BillResultView } from './BillResultView';
import { SubscriptionResultView } from './SubscriptionResultView';
import { BuyAdvisorResultView } from './BuyAdvisorResultView';
import { ScamCheckResultView } from './ScamCheckResultView';
import { VoiceTaskResultView } from './VoiceTaskResultView';
import { GeneralHelpResultView } from './GeneralHelpResultView';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import {
  RotateCcw,
  Share2,
  Check,
  Cpu,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export interface UnifiedResultRendererProps {
  result: PipelineExecutionResult;
  onReset: () => void;
}

export function UnifiedResultRenderer({ result, onReset }: UnifiedResultRendererProps) {
  const [copiedSummary, setCopiedSummary] = useState(false);

  const copySummary = () => {
    const textToCopy = `FixMate Solution: ${result.title}\n${result.summary}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const renderResultBody = () => {
    switch (result.result.type) {
      case 'TECHNICAL_ERROR':
        return <ScreenshotResultView data={result.result.data} />;
      case 'BILL_EXPLANATION':
        return <BillResultView data={result.result.data} />;
      case 'SUBSCRIPTION_ANALYSIS':
        return <SubscriptionResultView data={result.result.data} />;
      case 'PRODUCT_ANALYSIS':
        return <BuyAdvisorResultView data={result.result.data} />;
      case 'SCAM_ANALYSIS':
        return <ScamCheckResultView data={result.result.data} />;
      case 'VOICE_TASK_EXTRACTION':
        return <VoiceTaskResultView data={result.result.data} analysisId={result.analysisId} />;
      case 'GENERAL_QUESTION':
      case 'DOCUMENT_EXPLANATION':
      default:
        return <GeneralHelpResultView data={result.result.data} />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center flex-wrap gap-2">
          <Badge variant="info" size="md">
            {result.intent.replace(/_/g, ' ')}
          </Badge>

          <span className="text-xs text-slate-500 font-medium">
            Input: <span className="uppercase font-semibold">{result.inputType}</span>
          </span>

          <span className="text-slate-300 dark:text-slate-700">•</span>

          <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
            <Cpu className="w-3.5 h-3.5" />
            <span>{result.aiModelUsed}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={copySummary} className="h-8 text-xs">
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedSummary ? 'Copied' : 'Share'}</span>
          </Button>

          <Button size="sm" variant="secondary" onClick={onReset} className="h-8 text-xs">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Problem</span>
          </Button>
        </div>
      </div>

      {/* Fallback Banner if Ollama was offline (Section 32) */}
      {result.fallbackUsed && (
        <Alert variant="warning" title="Offline Mode Notice">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Local Ollama AI was unreachable or offline. High-accuracy deterministic extraction and regex heuristics were used. To enable full local AI reasoning, visit{' '}
            <a href="/setup" className="font-semibold underline">
              FixMate Setup
            </a>
            .
          </p>
        </Alert>
      )}

      {/* Specialized Content */}
      {renderResultBody()}

      {/* Bottom Sticky Reset Bar */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Saved to your local SQLite history.</span>
        </div>

        <Button variant="primary" size="md" onClick={onReset}>
          <RotateCcw className="w-4 h-4" />
          <span>Solve Another Problem</span>
        </Button>
      </div>
    </div>
  );
}

