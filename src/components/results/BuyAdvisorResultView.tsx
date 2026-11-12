'use client';

import React from 'react';
import { ProductAnalysisResult } from '@/lib/analyzers/types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  HelpCircle,
  Tag,
  ThumbsUp,
  ThumbsDown,
  Layers,
} from 'lucide-react';

export function BuyAdvisorResultView({ data }: { data: ProductAnalysisResult }) {
  return (
    <div className="space-y-6">
      {/* Product Hero & Quick Verdict */}
      <Card className="border-l-4 border-l-purple-600">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <Badge variant="info">Purchase Scanner</Badge>
            {data.price && (
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 flex items-center gap-1">
                <Tag className="w-4 h-4 text-purple-600" />
                {data.price}
              </span>
            )}
          </div>
          <CardTitle className="text-xl font-bold">{data.productName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-800 dark:text-purple-300 block mb-1">
              Quick Verdict
            </span>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
              {data.quickVerdict}
            </p>
          </div>
          {data.valueAssessment && (
            <p className="text-xs text-slate-500 mt-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Value Assessment: </span>
              {data.valueAssessment}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Target Audience: Good For vs Not Ideal For */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Good For */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <ThumbsUp className="w-5 h-5" />
              Good for
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {data.goodFor?.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Not Ideal For */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <ThumbsDown className="w-5 h-5" />
              Not ideal for
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {data.notIdealFor?.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Pros & Cons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pros */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pros</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {data.pros?.map((pro, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Cons */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cons</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {data.cons?.map((con, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Important Specifications */}
      {data.importantSpecifications && data.importantSpecifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Important specifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {data.importantSpecifications.map((spec, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex justify-between gap-2 border border-slate-200/60 dark:border-slate-800"
                >
                  <span className="font-medium text-slate-500 dark:text-slate-400">{spec.label}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-right">
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Potential Concerns & Questions Before Buying */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.potentialConcerns && data.potentialConcerns.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Potential concerns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {data.potentialConcerns.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {data.questionsToAskBeforeBuying && data.questionsToAskBeforeBuying.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                Questions to ask before buying
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {data.questionsToAskBeforeBuying.map((q, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

