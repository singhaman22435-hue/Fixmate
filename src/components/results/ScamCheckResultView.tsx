'use client';

import React from 'react';
import { ScamCheckResult } from '@/lib/analyzers/types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  XOctagon,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';

export function ScamCheckResultView({ data }: { data: ScamCheckResult }) {
  const isHighRisk = data.riskLevel === 'HIGH';
  const isMediumRisk = data.riskLevel === 'MEDIUM';

  const riskColor = isHighRisk
    ? 'border-l-rose-600 bg-rose-50/30 dark:bg-rose-950/20'
    : isMediumRisk
    ? 'border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/20'
    : 'border-l-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20';

  const riskBadgeVariant = isHighRisk
    ? 'destructive'
    : isMediumRisk
    ? 'warning'
    : 'success';

  return (
    <div className="space-y-6">
      {/* Risk Level Banner */}
      <Card className={`border-l-4 ${riskColor}`}>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Risk Evaluation
            </span>
            <Badge variant={riskBadgeVariant} size="md">
              {data.riskLevel} RISK LEVEL
            </Badge>
          </div>
          <CardTitle className="text-2xl font-extrabold flex items-center gap-2.5">
            {isHighRisk ? (
              <ShieldAlert className="w-7 h-7 text-rose-600 shrink-0" />
            ) : isMediumRisk ? (
              <AlertTriangle className="w-7 h-7 text-amber-500 shrink-0" />
            ) : (
              <ShieldCheck className="w-7 h-7 text-emerald-600 shrink-0" />
            )}
            <span>
              {isHighRisk
                ? 'High Risk: Multiple Scam Indicators Detected'
                : isMediumRisk
                ? 'Caution Advised: Unverified Signals Found'
                : 'Low Risk: No Common Phishing Patterns Detected'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            {data.whyThisIsSuspicious}
          </p>

          <div className="mt-3 text-xs text-slate-500 italic">
            * Note: This is an evidence-based risk analysis, not a guaranteed fraud detector. Always verify through official channels.
          </div>
        </CardContent>
      </Card>

      {/* Risk Indicators List */}
      {data.riskIndicators && data.riskIndicators.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Risk indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {data.riskIndicators.map((ind, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0" />
                  <span>{ind}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Suspicious Elements if isolated */}
      {data.suspiciousElements && data.suspiciousElements.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Suspicious elements flagged</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.suspiciousElements.map((el, i) => (
              <div
                key={i}
                className="p-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 text-xs"
              >
                <div className="flex items-center gap-2 font-semibold text-rose-800 dark:text-rose-300 mb-1">
                  <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900">
                    {el.type}
                  </span>
                  <span className="font-mono truncate">{el.text}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">{el.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Critical Actions: What NOT to do vs What you SHOULD do */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* What NOT to do */}
        <Card className="border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <XOctagon className="w-5 h-5 text-rose-600" />
              What NOT to do
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {data.whatNotToDo?.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold shrink-0">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* What you SHOULD do */}
        <Card className="border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              What you SHOULD do
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {data.whatYouShouldDo?.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Safe Next Steps */}
      {data.safeNextSteps && data.safeNextSteps.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              Safe next steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {data.safeNextSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <ArrowRight className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

