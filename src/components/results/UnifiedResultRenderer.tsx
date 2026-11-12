'use client';

import React, { useState } from 'react';
import { PipelineExecutionResult } from '@/lib/analyzers/types';
import { ScreenshotResultView } from './ScreenshotResultView';
import { BillResultView } from './BillResultView';
import { SubscriptionResultView } from './SubscriptionResultView';
import { BuyAdvisorResultView } from './BuyAdvisorResultView';
import { ScamCheckResultView } from './ScamCheckResultView';
import { VoiceTaskResultView } from './VoiceTaskResultView';
import { GeneralHelpResultView } from './GeneralHelpResultView';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import {
  RotateCcw,
  Share2,
  Check,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
  Send,
  Loader2,
} from 'lucide-react';

export interface UnifiedResultRendererProps {
  result: PipelineExecutionResult;
  onReset: () => void;
}

export function UnifiedResultRenderer({ result, onReset }: UnifiedResultRendererProps) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [followUpText, setFollowUpText] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string }>>([]);
  const [sendingChat, setSendingChat] = useState(false);
  const [suggestedChips, setSuggestedChips] = useState<string[]>(() => {
    switch (result.intent) {
      case 'SCAM_ANALYSIS':
        return [
          'What if I already clicked the link?',
          'How can I block and report this sender?',
          'Can you draft a complaint report for me?',
        ];
      case 'BILL_EXPLANATION':
        return [
          'How do I dispute this charge with the provider?',
          'How to reduce next month bill?',
          'Is there any late penalty or surcharge?',
        ];
      case 'SUBSCRIPTION_ANALYSIS':
        return [
          'How do I cancel this subscription?',
          'How to revoke autopay mandate?',
          'Can I get a refund for this month?',
        ];
      case 'TECHNICAL_ERROR':
        return [
          'What if the command fails with EPERM?',
          'How do I check if the port is busy?',
          'Explain why this error occurred',
        ];
      case 'PRODUCT_ANALYSIS':
        return [
          'Is there a better alternative at this price?',
          'What are the main drawbacks?',
          'Should I wait for a price drop?',
        ];
      default:
        return [
          'What is the very next action I should take?',
          'Explain this in simpler terms',
          'Add a task reminder for this to My Tasks',
        ];
    }
  });

  const handleSendChat = async (customText?: string) => {
    const textToSend = (customText || followUpText).trim();
    if (!textToSend || sendingChat) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user' as const,
      content: textToSend,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setFollowUpText('');
    setSendingChat(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: result.analysisId,
          message: textToSend,
          history: [...chatMessages, userMsg],
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to send follow-up query');
      }

      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        {
          id: data.messageId || `msg_${Date.now()}`,
          role: 'assistant',
          content: data.content,
        },
      ]);

      if (data.suggestedFollowUps && data.suggestedFollowUps.length > 0) {
        setSuggestedChips(data.suggestedFollowUps);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: 'Unable to reach local AI. Please verify your connection or visit Setup.',
        },
      ]);
    } finally {
      setSendingChat(false);
    }
  };

  const copySummary = () => {
    const textToCopy = `FixMate Solution: ${result.title}\n${result.summary}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const renderResultBody = () => {
    switch (result.result.type) {
      case 'TECHNICAL_ERROR':
        return <ScreenshotResultView data={result.result.data} />;
      case 'BILL_EXPLANATION':
        return <BillResultView data={result.result.data} />;
      case 'SUBSCRIPTION_ANALYSIS':
        return <SubscriptionResultView data={result.result.data} />;
      case 'PRODUCT_ANALYSIS':
        return <BuyAdvisorResultView data={result.result.data} />;
      case 'SCAM_ANALYSIS':
        return <ScamCheckResultView data={result.result.data} />;
      case 'VOICE_TASK_EXTRACTION':
        return <VoiceTaskResultView data={result.result.data} analysisId={result.analysisId} />;
      case 'GENERAL_QUESTION':
      case 'DOCUMENT_EXPLANATION':
      default:
        return <GeneralHelpResultView data={result.result.data} />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center flex-wrap gap-2">
          <Badge variant="info" size="md">
            {result.intent.replace(/_/g, ' ')}
          </Badge>

          <span className="text-xs text-slate-500 font-medium">
            Input: <span className="uppercase font-semibold">{result.inputType}</span>
          </span>

          <span className="text-slate-300 dark:text-slate-700">•</span>

          <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
            <Cpu className="w-3.5 h-3.5" />
            <span>{result.aiModelUsed}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={copySummary} className="h-8 text-xs">
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedSummary ? 'Copied' : 'Share'}</span>
          </Button>

          <Button size="sm" variant="secondary" onClick={onReset} className="h-8 text-xs">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Problem</span>
          </Button>
        </div>
      </div>

      {/* Fallback Banner if Ollama was offline (Section 32) */}
      {result.fallbackUsed && (
        <Alert variant="warning" title="Offline Mode Notice">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Local Ollama AI was unreachable or offline. High-accuracy deterministic extraction and regex heuristics were used. To enable full local AI reasoning, visit{' '}
            <a href="/setup" className="font-semibold underline">
              FixMate Setup
            </a>
            .
          </p>
        </Alert>
      )}

      {/* Specialized Content */}
      {renderResultBody()}

      {/* ────────────────────────────────────────────────────────── */}
      {/* Follow-Up / Continue Conversation Section                  */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Continue This Conversation
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ask follow-up questions, request draft replies, or clarify any step.
            </p>
          </div>
        </div>

        {/* Suggested Follow-Up Chips */}
        {suggestedChips.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestedChips.map((chip, idx) => (
              <button
                key={`chip_${idx}`}
                type="button"
                onClick={() => handleSendChat(chip)}
                disabled={sendingChat}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-left disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Chat Thread */}
        {chatMessages.length > 0 && (
          <div className="space-y-3 pt-2">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-xs space-y-2'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Thinking Loader */}
        {sendingChat && (
          <div className="flex items-center gap-2 text-xs text-slate-500 italic py-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            <span>FixMate is analyzing your follow-up...</span>
          </div>
        )}

        {/* Follow-Up Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendChat();
          }}
          className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"
        >
          <input
            type="text"
            value={followUpText}
            onChange={(e) => setFollowUpText(e.target.value)}
            placeholder="Ask a follow-up about this problem..."
            disabled={sendingChat}
            className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!followUpText.trim() || sendingChat}
            className="h-8.5 px-3"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </Button>
        </form>
      </div>

      {/* Bottom Sticky Reset Bar */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Saved to your local SQLite history.</span>
        </div>

        <Button variant="primary" size="md" onClick={onReset}>
          <RotateCcw className="w-4 h-4" />
          <span>Solve Another Problem</span>
        </Button>
      </div>
    </div>
  );
}

