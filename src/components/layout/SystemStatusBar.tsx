'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface SystemStatusData {
  database: { isAvailable: boolean };
  localAI: {
    isAvailable: boolean;
    hasRequiredModel: boolean;
    models: Array<{ name: string }>;
  };
  ocr: { isAvailable: boolean };
}

export function SystemStatusBar() {
  const [status, setStatus] = useState<SystemStatusData | null>(null);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/system/status');
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch {
        // quiet fallback
      }
    }
    checkStatus();
  }, []);

  const aiAvailable = status?.localAI?.isAvailable;
  const hasModels = status?.localAI?.hasRequiredModel;

  return (
    <div className="bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/60 text-xs py-1.5 px-4 text-slate-600 dark:text-slate-300">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                status?.database?.isAvailable ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
            <span className="font-medium text-slate-700 dark:text-slate-200">Local Database</span>
          </span>

          <span className="text-slate-300 dark:text-slate-600">•</span>

          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                status?.ocr?.isAvailable ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
            <span className="font-medium text-slate-700 dark:text-slate-200">OCR</span>
          </span>

          <span className="text-slate-300 dark:text-slate-600">•</span>

          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                aiAvailable ? (hasModels ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-slate-400'
              }`}
            />
            <span>
              {aiAvailable
                ? hasModels
                  ? 'Local AI Ready'
                  : 'AI Online (Model Missing)'
                : 'Offline Mode (Deterministic)'}
            </span>
          </span>
        </div>

        <div>
          <Link
            href="/setup"
            className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Diagnostics
          </Link>
        </div>
      </div>
    </div>
  );
}
