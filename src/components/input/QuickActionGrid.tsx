'use client';

import React from 'react';
import {
  Wrench,
  Receipt,
  ShieldAlert,
  ShoppingCart,
  Repeat,
  Mic,
} from 'lucide-react';
import { FixMateIntent } from '@/lib/analyzers/types';

export interface QuickActionItem {
  id: FixMateIntent;
  title: string;
  description: string;
  icon: React.ElementType;
}

export const QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: 'TECHNICAL_ERROR',
    title: 'Fix an error',
    description: 'Terminal bugs, code exceptions & crash dialogs',
    icon: Wrench,
  },
  {
    id: 'SCAM_ANALYSIS',
    title: 'Check a message',
    description: 'Suspicious SMS, WhatsApp forwards & phishing links',
    icon: ShieldAlert,
  },
  {
    id: 'BILL_EXPLANATION',
    title: 'Explain a bill',
    description: 'Electricity, phone, Wi-Fi bills & hidden fees',
    icon: Receipt,
  },
  {
    id: 'PRODUCT_ANALYSIS',
    title: 'Analyze a product',
    description: 'Specs, pros & cons, and purchase checklist',
    icon: ShoppingCart,
  },
  {
    id: 'SUBSCRIPTION_ANALYSIS',
    title: 'Find subscriptions',
    description: 'Detect recurring transactions from statements or CSVs',
    icon: Repeat,
  },
  {
    id: 'VOICE_TASK_EXTRACTION',
    title: 'Tasks from voice',
    description: 'Transcribe spoken notes into action checklists',
    icon: Mic,
  },
];

export interface QuickActionGridProps {
  activeIntent?: FixMateIntent;
  onSelectIntent: (intent: FixMateIntent) => void;
}

export function QuickActionGrid({ activeIntent, onSelectIntent }: QuickActionGridProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Quick help
        </h3>
        {activeIntent && (
          <button
            onClick={() => onSelectIntent(undefined as unknown as FixMateIntent)}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          const isSelected = activeIntent === action.id;

          return (
            <button
              key={action.id}
              onClick={() => onSelectIntent(action.id)}
              className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-medium text-xs text-slate-900 dark:text-slate-100 block">
                  {action.title}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {action.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
