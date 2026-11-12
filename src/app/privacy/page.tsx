import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ShieldCheck, Lock, EyeOff, Server, HardDrive, FileCheck } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          FixMate Privacy Manifesto
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
          Your problems, bills, statements, and voice notes stay on your machine. Period.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed font-medium">
        &ldquo;Your files are processed locally on your device. FixMate never requires or calls paid cloud AI APIs like OpenAI, Gemini, or Claude. There are no tracking scripts, no telemetry backdoors, and no cloud loggers.&rdquo;
      </div>

      <div className="space-y-4">
        {/* Core Pillars */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              1. Zero Cloud AI Dependence
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
            <p>
              Unlike conventional AI tools that secretly relay your financial records or screenshots to external corporate servers, FixMate uses local open-source runtimes:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Ollama:</strong> Runs fully on your localhost at <code>127.0.0.1:11434</code>.</li>
              <li><strong>Tesseract.js:</strong> OCR computation is executed directly within your local Node/browser environment.</li>
              <li><strong>Deterministic Fallback:</strong> Even when Ollama is closed, rule-based extraction works 100% offline.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-emerald-600" />
              2. SQLite Local Storage &amp; Total Erasure
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
            <p>
              Your history, extracted checklists, and detected subscriptions reside in a single local database file (<code>dev.db</code>) on your local drive.
            </p>
            <p>
              You maintain total data ownership: export your records to JSON or Markdown at any time, or click <strong>Clear All</strong> to wipe every trace permanently.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-purple-600" />
              3. No Financial Account Credential Access
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
            <p>
              FixMate never connects to bank APIs, asks for bank login credentials, UPI PINs, or card CVVs. The subscription finder works strictly by reading statements or CSV files that you explicitly upload.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-600" />
              4. Sensitive Log Redaction
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            FixMate does not write raw financial statements, voice recordings, or error screenshots into persistent application log streams. Temporary processing buffers are immediately released from memory upon pipeline completion.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

