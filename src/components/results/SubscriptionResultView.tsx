'use client';

import React from 'react';
import { SubscriptionAnalysisResult } from '@/lib/analyzers/types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Repeat, DollarSign, PiggyBank, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';

export function SubscriptionResultView({ data }: { data: SubscriptionAnalysisResult }) {
  return (
    <div className="space-y-6">
      {/* Spend Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Monthly Burn */}
        <Card className="border-l-4 border-l-indigo-600">
          <CardHeader className="pb-1">
            <span className="text-xs font-semibold uppercase text-slate-500">Monthly Burn</span>
            <div className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">
              {formatCurrency(data.totalMonthlySpend, '₹')}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">across detected recurring services</p>
          </CardContent>
        </Card>

        {/* Yearly Cost */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-1">
            <span className="text-xs font-semibold uppercase text-slate-500">Yearly Total</span>
            <div className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">
              {formatCurrency(data.totalYearlySpend, '₹')}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">annual recurring commitment</p>
          </CardContent>
        </Card>

        {/* Potential Savings */}
        <Card className="border-l-4 border-l-emerald-600">
          <CardHeader className="pb-1">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Potential Savings
            </span>
            <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              {formatCurrency(data.potentialSavings, '₹')}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">by pruning inactive services</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Note */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">Local Privacy Verified</p>
          <p className="mt-0.5">
            Analyzed locally from your uploaded statement. No bank credentials, third-party aggregators, or cloud APIs were used.
          </p>
        </div>
      </div>

      {/* Detected Subscriptions List */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Detected Recurring Subscriptions ({data.detectedSubscriptions?.length || 0})
        </h4>

        {data.detectedSubscriptions && data.detectedSubscriptions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.detectedSubscriptions.map((sub, idx) => (
              <Card key={idx} hoverable>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold">{sub.merchant}</CardTitle>
                      {sub.category && (
                        <span className="text-xs text-slate-500">{sub.category}</span>
                      )}
                    </div>
                    <Badge variant={sub.confidence === 'HIGH' ? 'success' : 'default'}>
                      {sub.confidence} confidence
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {formatCurrency(sub.amount, sub.currency || '₹')}
                      </span>
                      <span className="text-xs text-slate-500">/{sub.frequency}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Est. yearly cost:</span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">
                        {formatCurrency(sub.estimatedYearlyCost, sub.currency || '₹')}
                      </span>
                    </div>
                  </div>

                  {sub.actionRecommendation && (
                    <div className="p-2 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 text-xs">
                      <span className="font-semibold">Action: </span>
                      {sub.actionRecommendation}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center text-slate-500">
            <Repeat className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm">No clear recurring subscription payments found in this statement.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

