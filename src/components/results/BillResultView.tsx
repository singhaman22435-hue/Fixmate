'use client';

import React, { useState } from 'react';
import { BillAnalysisResult } from '@/lib/analyzers/types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import {
  Receipt,
  Calendar,
  AlertTriangle,
  CheckSquare,
  Building,
  HelpCircle,
  Copy,
  Check,
  PlusCircle,
  MessageSquare,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';

export function BillResultView({ data }: { data: BillAnalysisResult }) {
  const currency = data.currency || '₹';
  const [copied, setCopied] = useState(false);
  const [taskAdded, setTaskAdded] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);

  const copyBillSummary = () => {
    const lines = [
      `BILL SUMMARY: ${data.billerName || 'Utility / Service Provider'}`,
      `TOTAL PAYABLE: ${data.totalAmount !== null ? formatCurrency(data.totalAmount, currency) : 'N/A'}`,
      data.dueDate ? `DUE DATE: ${data.dueDate}` : '',
      data.billingPeriod ? `PERIOD: ${data.billingPeriod}` : '',
      '',
      `EXPLANATION: ${data.whyYouArePayingThis}`,
      '',
    ];

    if (data.unusualCharges && data.unusualCharges.length > 0) {
      lines.push('FLAGGED UNUSUAL CHARGES:');
      data.unusualCharges.forEach((u) => lines.push(`- ${u}`));
      lines.push('');
    }

    if (data.changesFromPreviousBill) {
      lines.push(`CHANGES FROM PREVIOUS: ${data.changesFromPreviousBill}`);
      lines.push('');
    }

    navigator.clipboard.writeText(lines.filter(Boolean).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddBillTask = async () => {
    if (!data.totalAmount) return;
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Pay ${data.billerName || 'Bill'} (${formatCurrency(data.totalAmount, currency)})`,
          dueDate: data.dueDate || 'Today',
          priority: 'HIGH',
          notes: `Biller: ${data.billerName || 'Unknown'}, Period: ${data.billingPeriod || 'N/A'}`,
        }),
      });
      setTaskAdded(true);
      setTimeout(() => setTaskAdded(false), 3000);
    } catch (e) {
      console.error('Failed to create bill task:', e);
    }
  };

  const disputeTemplate = `Hello ${data.billerName || 'Customer Support'},\n\nI am writing to dispute charges on my recent bill${data.billingPeriod ? ` for the period ${data.billingPeriod}` : ''}.\n\nSpecifically, I noticed the following unexpected charge(s):\n${(data.unusualCharges && data.unusualCharges.length > 0 ? data.unusualCharges : ['- Unexpected excess charges']).map((c) => `- ${c}`).join('\n')}\n\nPlease review these line items and issue a revised invoice or credit.\n\nThank you,\nAccount Holder`;

  return (
    <div className="space-y-6">
      {/* Top Banner: Total & Due Date */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Amount Card */}
        <Card className="md:col-span-2 border-l-4 border-l-emerald-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Payable
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyBillSummary}
                  className="min-h-[32px] text-xs flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddBillTask}
                  className="min-h-[32px] text-xs flex items-center gap-1"
                >
                  {taskAdded ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <PlusCircle className="w-3.5 h-3.5" />}
                  <span>{taskAdded ? 'Added to Tasks' : 'Add to Tasks'}</span>
                </Button>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                {data.totalAmount !== null
                  ? formatCurrency(data.totalAmount, currency)
                  : 'Amount Not Detected'}
              </span>
              {data.billingPeriod && (
                <span className="text-xs text-slate-500">for {data.billingPeriod}</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              {data.billerName && (
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>Biller: {data.billerName}</span>
                </span>
              )}
              {data.dueDate && (
                <span className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Due by: {data.dueDate}</span>
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Confidence & Quick Status */}
        <Card className="flex flex-col justify-center p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 mb-2">Extraction Status</span>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span>Confidence:</span>
              <Badge variant={data.confidence === 'HIGH' ? 'success' : 'warning'}>
                {data.confidence}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Unusual Items:</span>
              <Badge variant={data.unusualCharges.length > 0 ? 'destructive' : 'default'}>
                {data.unusualCharges.length > 0 ? `${data.unusualCharges.length} detected` : 'None'}
              </Badge>
            </div>
            {data.unusualCharges.length > 0 && (
              <button
                onClick={() => setIsDisputeModalOpen(true)}
                className="mt-2 w-full py-1.5 px-2 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-semibold text-xs text-center border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition-colors"
              >
                Draft dispute message
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* Why you are paying this */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            Why you are paying this
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {data.whyYouArePayingThis || 'Could not determine from the document.'}
          </p>
        </CardContent>
      </Card>

      {/* Why did my bill increase? (Section 7 Requirement) */}
      {data.changesFromPreviousBill && (
        <Card className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              Why did my bill increase?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-950 dark:text-amber-100 leading-relaxed">
              {data.changesFromPreviousBill}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Charge Breakdown Table */}
      {data.chargeBreakdown && data.chargeBreakdown.length > 0 && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
              <Receipt className="w-5 h-5 text-emerald-600" />
              Charge breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Item / Service</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.chargeBreakdown.map((row, idx) => (
                    <tr
                      key={idx}
                      className={row.isUnusual ? 'bg-amber-50/60 dark:bg-amber-950/30' : ''}
                    >
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {row.item}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        {formatCurrency(row.amount, currency)}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-500 dark:text-slate-400">
                        {row.isUnusual ? (
                          <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {row.note || 'Unusual charge flag'}
                          </span>
                        ) : (
                          row.note || '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unusual Charges Alert */}
      {data.unusualCharges && data.unusualCharges.length > 0 && (
        <Alert variant="warning" title="Unusual charges & hidden fees detected">
          <ul className="list-disc list-inside space-y-1 text-xs">
            {data.unusualCharges.map((uc, i) => (
              <li key={i}>{uc}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Things to Check (Action vs Safe to Ignore) */}
      {data.thingsToCheck && data.thingsToCheck.length > 0 && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
              <CheckSquare className="w-5 h-5 text-indigo-600" />
              Action items vs safe to ignore
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {data.thingsToCheck.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Dispute Modal */}
      <Modal
        isOpen={isDisputeModalOpen}
        onClose={() => setIsDisputeModalOpen(false)}
        title="Draft Dispute Message"
        description="Copy and paste this message to customer care to dispute flagged charges."
      >
        <div className="space-y-4">
          <textarea
            readOnly
            rows={8}
            value={disputeTemplate}
            className="w-full p-3 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 select-all"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDisputeModalOpen(false)}
              className="min-h-[44px]"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(disputeTemplate);
                setIsDisputeModalOpen(false);
              }}
              className="min-h-[44px]"
            >
              Copy Template
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
