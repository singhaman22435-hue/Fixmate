'use client';

import React from 'react';
import { GeneralHelpResult } from '@/lib/analyzers/types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Lightbulb, ArrowRight, CheckCircle2, Compass } from 'lucide-react';

export function GeneralHelpResultView({ data }: { data: GeneralHelpResult }) {
  return (
    <div className="space-y-6">
      {/* Executive Summary Card */}
      <Card className="border-l-4 border-l-indigo-600">
        <CardHeader className="pb-2">
          <Badge variant="info" className="mb-2 w-fit">
            Everyday Problem Solver
          </Badge>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            {data.summary}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {data.explanation}
          </p>

          {data.suggestedNextStep && (
            <div className="mt-4 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 flex items-start gap-2.5">
              <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 block">
                  Recommended Immediate Action:
                </span>
                <span className="text-xs text-indigo-800 dark:text-indigo-300">
                  {data.suggestedNextStep}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Takeaways */}
      {data.keyTakeaways && data.keyTakeaways.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Key takeaways</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {data.keyTakeaways.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommended Actions */}
      {data.recommendedActions && data.recommendedActions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recommended steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {data.recommendedActions.map((act, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <ArrowRight className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                  <span>{act}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

