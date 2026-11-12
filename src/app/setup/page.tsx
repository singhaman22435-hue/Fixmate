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
  Server,
  Mic,
} from 'lucide-react';

interface SystemDiagnostics {
  status: string;
  server?: {
    isAvailable: boolean;
    nodeVersion: string;
    platform: string;
    uptimeSeconds: number;
  };
  database: {
    isAvailable: boolean;
    type: string;
    filePath?: string;
    fileExists?: boolean;
    latencyMs?: number;
    error?: string;
  };
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
  ocr: {
    isAvailable: boolean;
    engine: string;
    trainedDataFound: boolean;
    trainedDataPath?: string;
    trainedDataSizeBytes?: number;
    mode: string;
    error?: string;
  };
  speech: {
    isAvailable: boolean;
    mode: string;
    whisperBinary: string | null;
    whisperConfigured: boolean;
    notes: string;
  };
  privacy: { mode: string; cloudApisUsed: string; apiKeyRequired: boolean };
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
  const hasConfiguredModel = data?.localAI?.hasRequiredModel;
  const ocrReady = data?.ocr?.isAvailable;
  const dbReady = data?.database?.isAvailable;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          System Setup &amp; Service Diagnostics
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          FixMate runs locally on your computer with zero external cloud API keys. Verify service availability below.
        </p>
      </div>

      {/* Live Service Diagnostic Matrix */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold">Service Health Matrix</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchDiagnostics}
            disabled={loading}
            className="h-7 text-xs"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {/* 1. App Engine */}
          <div className="py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-medium text-slate-800 dark:text-slate-200 block">
                  Next.js Web &amp; API Server
                </span>
                <span className="text-slate-500">
                  Node {data?.server?.nodeVersion || process.version} ({data?.server?.platform || 'windows'})
                </span>
              </div>
            </div>
            <Badge variant="success">Operational</Badge>
          </div>

          {/* 2. SQLite Database */}
          <div className="py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Database className={`w-4 h-4 shrink-0 ${dbReady ? 'text-emerald-600' : 'text-rose-600'}`} />
              <div>
                <span className="font-medium text-slate-800 dark:text-slate-200 block">
                  Local Database (SQLite / Prisma)
                </span>
                <span className="text-slate-500">
                  {dbReady
                    ? `dev.db connected (${data?.database.latencyMs}ms)`
                    : `Database offline: ${data?.database.error || 'Check permissions'}`}
                </span>
              </div>
            </div>
            <Badge variant={dbReady ? 'success' : 'destructive'}>
              {dbReady ? 'Ready' : 'Offline'}
            </Badge>
          </div>

          {/* 3. OCR Engine */}
          <div className="py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ScanLine className={`w-4 h-4 shrink-0 ${ocrReady ? 'text-emerald-600' : 'text-amber-500'}`} />
              <div>
                <span className="font-medium text-slate-800 dark:text-slate-200 block">
                  Offline OCR Engine (Tesseract.js)
                </span>
                <span className="text-slate-500">
                  {ocrReady
                    ? `Local traineddata bundled (${((data?.ocr.trainedDataSizeBytes || 0) / (1024 * 1024)).toFixed(1)}MB, 100% offline)`
                    : 'eng.traineddata missing from root'}
                </span>
              </div>
            </div>
            <Badge variant={ocrReady ? 'success' : 'warning'}>
              {ocrReady ? 'Offline Ready' : 'Missing Data'}
            </Badge>
          </div>

          {/* 4. Local Ollama LLM */}
          <div className="py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cpu className={`w-4 h-4 shrink-0 ${aiOnline ? 'text-emerald-600' : 'text-amber-500'}`} />
              <div>
                <span className="font-medium text-slate-800 dark:text-slate-200 block">
                  Ollama AI Daemon
                </span>
                <span className="text-slate-500">
                  {aiOnline
                    ? `Online at ${data?.localAI.baseUrl} (${data?.localAI.models.length || 0} models available)`
                    : 'Ollama daemon not reachable on 127.0.0.1:11434'}
                </span>
              </div>
            </div>
            <Badge variant={aiOnline ? 'success' : 'warning'}>
              {aiOnline ? 'Online' : 'Offline (Fallback Active)'}
            </Badge>
          </div>

          {/* 5. Configured Model Check */}
          <div className="py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {hasConfiguredModel ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              )}
              <div>
                <span className="font-medium text-slate-800 dark:text-slate-200 block">
                  Configured Model: {data?.localAI.selectedModel || 'qwen3.5:4b'}
                </span>
                <span className="text-slate-500">
                  {hasConfiguredModel
                    ? 'Model is loaded and verified in Ollama'
                    : 'Model missing. Run: ollama pull qwen3.5:4b'}
                </span>
              </div>
            </div>
            <Badge variant={hasConfiguredModel ? 'success' : 'default'}>
              {hasConfiguredModel ? 'Loaded' : 'Not Found'}
            </Badge>
          </div>

          {/* 6. Speech Transcription */}
          <div className="py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Mic className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="font-medium text-slate-800 dark:text-slate-200 block">
                  Speech-to-Text Pipeline
                </span>
                <span className="text-slate-500">
                  {data?.speech.whisperConfigured
                    ? `Local Whisper executable: ${data.speech.whisperBinary}`
                    : 'Client-side dictation enabled (or configure WHISPER_PATH for local whisper.cpp)'}
                </span>
              </div>
            </div>
            <Badge variant={data?.speech.whisperConfigured ? 'success' : 'default'}>
              {data?.speech.whisperConfigured ? 'Whisper Active' : 'Client Mode'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Fallback Engine Notice */}
      {!aiOnline && (
        <Alert variant="warning" title="Deterministic Fallback Mode Is Active">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            FixMate does not fail when Ollama is offline. The built-in deterministic engine analyzes bills, checks scam indicators, parses CSVs and statements, and organizes task lists offline using structured logic.
          </p>
        </Alert>
      )}

      {/* Configuration Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            Ollama Setup Commands
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <p className="text-slate-600 dark:text-slate-400">
            To enable local neural reasoning on your computer:
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded bg-slate-900 text-slate-100 font-mono text-xs">
              <span>ollama pull qwen3.5:4b</span>
              <button
                onClick={() => copyCommand('ollama pull qwen3.5:4b')}
                className="text-slate-400 hover:text-white"
                title="Copy command"
              >
                {copiedCmd === 'ollama pull qwen3.5:4b' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-slate-900 text-slate-100 font-mono text-xs">
              <span>ollama run qwen3.5:4b</span>
              <button
                onClick={() => copyCommand('ollama run qwen3.5:4b')}
                className="text-slate-400 hover:text-white"
                title="Copy command"
              >
                {copiedCmd === 'ollama run qwen3.5:4b' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
