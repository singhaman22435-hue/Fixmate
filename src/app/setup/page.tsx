'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Terminal,
  Cpu,
  Database,
  ScanLine,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';

interface SystemDiagnostics {
  status: string;
  database: { isAvailable: boolean; latencyMs?: number; error?: string };
  localAI: {
    isAvailable: boolean;
    baseUrl: string;
    hasRequiredModel: boolean;
    hasVisionModel: boolean;
    selectedModel: string;
    selectedVisionModel: string;
    models: Array<{ name: string; size?: number }>;
    error?: string;
  };
  ocr: { isAvailable: boolean; engine: string };
  privacy: { mode: string; cloudApisUsed: string };
}

export default function SetupPage() {
  const [data, setData] = useState<SystemDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/status');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Diagnostics failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const aiOnline = data?.localAI?.isAvailable;
  const hasTextModel = data?.localAI?.hasRequiredModel;
  const hasVisionModel = data?.localAI?.hasVisionModel;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          FixMate Local Diagnostic &amp; Setup
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          FixMate requires zero cloud API keys. Check the health of your local offline stack, database, OCR, and Ollama AI runtime.
        </p>
      </div>

      {/* Live Service Diagnostic Matrix */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">System Component Status</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchDiagnostics}
            disabled={loading}
            className="h-8 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-check</span>
          </Button>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 dark:divide-slate-800">
          {/* 1. App Engine */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block">
                  Next.js App Core
                </span>
                <span className="text-xs text-slate-500">React 19 App Router &amp; Server Pipeline</span>
              </div>
            </div>
            <Badge variant="success">Operational</Badge>
          </div>

          {/* 2. SQLite Database */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block">
                  SQLite Database (Prisma)
                </span>
                <span className="text-xs text-slate-500">
                  {data?.database.isAvailable
                    ? `dev.db active (${data.database.latencyMs}ms)`
                    : 'Database offline'}
                </span>
              </div>
            </div>
            <Badge variant={data?.database.isAvailable ? 'success' : 'destructive'}>
              {data?.database.isAvailable ? 'Active' : 'Error'}
            </Badge>
          </div>

          {/* 3. OCR Engine */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ScanLine className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block">
                  OCR Engine (Tesseract.js)
                </span>
                <span className="text-xs text-slate-500">Local text extraction for screenshots &amp; bills</span>
              </div>
            </div>
            <Badge variant="success">Ready</Badge>
          </div>

          {/* 4. Ollama Runtime */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cpu className={`w-5 h-5 shrink-0 ${aiOnline ? 'text-emerald-600' : 'text-amber-500'}`} />
              <div>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block">
                  Local Ollama LLM Runtime
                </span>
                <span className="text-xs text-slate-500">
                  {aiOnline
                    ? `Online at ${data?.localAI.baseUrl} (${data?.localAI.models.length} model(s) installed)`
                    : 'Not reachable on port 11434 (Deterministic mode active)'}
                </span>
              </div>
            </div>
            <Badge variant={aiOnline ? 'success' : 'warning'}>
              {aiOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>

          {/* 5. Recommended Text Model */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {hasTextModel ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              )}
              <div>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block">
                  Text Model (llama3.2 / mistral)
                </span>
                <span className="text-xs text-slate-500">
                  {hasTextModel
                    ? 'Compatible local language model installed'
                    : 'Pull model: ollama run llama3.2'}
                </span>
              </div>
            </div>
            <Badge variant={hasTextModel ? 'success' : 'default'}>
              {hasTextModel ? 'Installed' : 'Missing'}
            </Badge>
          </div>

          {/* 6. Vision Model */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {hasVisionModel ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              )}
              <div>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block">
                  Vision Model (llama3.2-vision / llava)
                </span>
                <span className="text-xs text-slate-500">
                  {hasVisionModel
                    ? 'Vision-capable model ready for multimodal parsing'
                    : 'Optional: OCR acts as automatic fallback'}
                </span>
              </div>
            </div>
            <Badge variant={hasVisionModel ? 'success' : 'default'}>
              {hasVisionModel ? 'Ready' : 'Optional (OCR Fallback)'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Offline Fallback Assurance Alert (Section 32) */}
      {!aiOnline && (
        <Alert variant="warning" title="FixMate Works Without Ollama Running">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            FixMate has a built-in <strong>Deterministic Fallback Engine</strong>. Even with Ollama offline, you can still extract text from screenshots via Tesseract OCR, analyze bills, detect recurring subscriptions, check scam flags, and manage tasks!
          </p>
        </Alert>
      )}

      {/* Step-by-Step Local AI Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-600" />
            How to Set Up Ollama for Local AI Reasoning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <li className="space-y-1.5">
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 block">
                1. Download &amp; Install Ollama
              </span>
              <p>
                Visit{' '}
                <a
                  href="https://ollama.com/download"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 underline font-medium"
                >
                  https://ollama.com/download
                </a>{' '}
                and run the installer for Windows, macOS, or Linux.
              </p>
            </li>

            <li className="space-y-1.5">
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 block">
                2. Pull the Recommended Lightweight Model
              </span>
              <p>Open PowerShell or Command Prompt and run:</p>
              <div className="p-3 rounded-lg bg-slate-950 text-emerald-400 font-mono text-xs flex items-center justify-between">
                <span>ollama run llama3.2</span>
                <button
                  onClick={() => copyCommand('ollama run llama3.2')}
                  className="text-slate-400 hover:text-white"
                  aria-label="Copy command"
                >
                  {copiedCmd === 'ollama run llama3.2' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </li>

            <li className="space-y-1.5">
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 block">
                3. (Optional) Pull the Vision Model
              </span>
              <p>For enhanced screenshot and image comprehension:</p>
              <div className="p-3 rounded-lg bg-slate-950 text-emerald-400 font-mono text-xs flex items-center justify-between">
                <span>ollama run llama3.2-vision</span>
                <button
                  onClick={() => copyCommand('ollama run llama3.2-vision')}
                  className="text-slate-400 hover:text-white"
                  aria-label="Copy command"
                >
                  {copiedCmd === 'ollama run llama3.2-vision' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </li>

            <li className="space-y-1.5">
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 block">
                4. Verify &amp; Reload FixMate
              </span>
              <p>
                Once the model finishes downloading in your terminal, click the &ldquo;Re-check&rdquo; button above. FixMate will instantly detect the model and switch from deterministic fallback to local AI mode!
              </p>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

