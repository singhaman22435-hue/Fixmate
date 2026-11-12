'use client';

import React, { useState } from 'react';
import { ScreenshotFixResult } from '@/lib/analyzers/types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import {
  Wrench,
  Check,
  Copy,
  AlertTriangle,
  Terminal,
  ArrowRightCircle,
  RefreshCw,
  XCircle,
} from 'lucide-react';

export function ScreenshotResultView({ data }: { data: ScreenshotFixResult }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [solutionCopied, setSolutionCopied] = useState(false);
  const [showAlternative, setShowAlternative] = useState(false);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyFullSolution = () => {
    const lines = [
      `PROBLEM: ${data.problemDetected}`,
      `EXPLANATION: ${data.shortExplanation}`,
      '',
      'WHAT TO DO:',
      ...data.whatToDo.map((step, i) => `${i + 1}. ${step}`),
      '',
    ];

    if (data.commands && data.commands.length > 0) {
      lines.push('COMMANDS:');
      data.commands.forEach((c) => {
        lines.push(`$ ${c.command}  # ${c.description || ''}`);
      });
      lines.push('');
    }

    if (data.thingsToAvoid && data.thingsToAvoid.length > 0) {
      lines.push('WHAT NOT TO DO:');
      data.thingsToAvoid.forEach((a) => lines.push(`- ${a}`));
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setSolutionCopied(true);
    setTimeout(() => setSolutionCopied(false), 2500);
  };

  const confidenceVariant =
    data.confidence === 'HIGH' ? 'success' : data.confidence === 'MEDIUM' ? 'warning' : 'default';

  return (
    <div className="space-y-6">
      {/* Problem Header Card */}
      <Card className="border-l-4 border-l-indigo-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="info">{data.errorType || 'Technical Error'}</Badge>
              <Badge variant={confidenceVariant}>Confidence: {data.confidence}</Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={copyFullSolution}
                className="min-h-[36px] text-xs flex items-center gap-1.5"
              >
                {solutionCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied Solution</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Solution</span>
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAlternative(!showAlternative)}
                className="min-h-[36px] text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{showAlternative ? 'Hide Alternative' : 'Try Another Solution'}</span>
              </Button>
            </div>
          </div>
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Wrench className="w-5 h-5 text-indigo-600" />
            {data.problemDetected}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {data.shortExplanation}
          </p>

          {data.whyThisHappened && (
            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Why this happened
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {data.whyThisHappened}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alternative Solution Card (Section 6 Requirement) */}
      {showAlternative && (
        <Card className="p-4 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 shadow-sm animate-in fade-in duration-200">
          <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 mb-2">
            <RefreshCw className="w-4 h-4 text-amber-600" />
            Alternative troubleshooting route
          </h4>
          <div className="space-y-2 text-xs text-amber-900/90 dark:text-amber-300">
            <p>If the standard resolution does not clear the error state:</p>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>Inspect process lock files (e.g. locks in package managers, temp directories, or stale background tasks).</li>
              <li>Reboot the daemon or container to reset socket bindings and dangling file descriptors.</li>
              <li>Validate network DNS resolution and sandbox firewall rules if dependencies fail to resolve.</li>
            </ol>
            <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
              Tip: You can also refine your problem prompt in the solve box above with the full terminal stack trace.
            </p>
          </div>
        </Card>
      )}

      {/* What to Do: Numbered Step List */}
      {data.whatToDo && data.whatToDo.length > 0 && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
              <ArrowRightCircle className="w-5 h-5 text-emerald-600" />
              What to do
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {data.whatToDo.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Commands with Copy Button */}
      {data.commands && data.commands.length > 0 && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
              <Terminal className="w-5 h-5 text-indigo-600" />
              Commands to run
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.commands.map((cmdObj, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 p-3.5 font-mono text-xs overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-slate-800">
                  <span className="text-[11px] font-sans text-slate-400">
                    {cmdObj.description || `Command ${idx + 1}`}
                  </span>
                  <button
                    onClick={() => copyToClipboard(cmdObj.command, idx)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors min-h-[30px]"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-sans">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="font-sans">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="overflow-x-auto py-1 text-emerald-400 select-all font-mono">
                  $ {cmdObj.command}
                </div>
                {cmdObj.safetyNote && (
                  <div className="mt-2 text-[11px] font-sans text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span>{cmdObj.safetyNote}</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Things to Avoid (What NOT to do) */}
      {data.thingsToAvoid && data.thingsToAvoid.length > 0 && (
        <Alert variant="warning" title="What NOT to do">
          <ul className="list-disc list-inside space-y-1 text-xs">
            {data.thingsToAvoid.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </Alert>
      )}
    </div>
  );
}
