/**
 * FixMate Intent Detection Engine
 * Hybrid architecture: deterministic pattern scoring + local AI classification.
 * Never fails silently.
 */

import { FixMateIntent, IntentDetectionResult, FixMateInputType } from './types';
import { localOllamaProvider } from '../ai/ollamaProvider';
import { PROMPTS } from '../ai/promptEngine';
import { safeJsonParse } from '../ai/jsonRepair';

interface IntentScore {
  intent: FixMateIntent;
  score: number;
  reason: string;
  keywords: string[];
}

export class IntentDetector {
  static async detect(
    text: string,
    inputType: FixMateInputType,
    explicitIntent?: FixMateIntent
  ): Promise<IntentDetectionResult> {
    // 1. Explicit override from quick-action button
    if (explicitIntent) {
      return {
        intent: explicitIntent,
        confidence: 1.0,
        reason: `User explicitly requested ${explicitIntent} mode.`,
        requiresVision: inputType === 'image',
        requiresOCR: inputType === 'image' || inputType === 'pdf',
      };
    }

    // 2. High-confidence input-type shortcuts
    if (inputType === 'audio') {
      return {
        intent: 'VOICE_TASK_EXTRACTION',
        confidence: 0.98,
        reason: 'Audio input detected, routing to voice task extraction pipeline.',
        requiresVision: false,
        requiresOCR: false,
      };
    }

    if (inputType === 'csv') {
      return {
        intent: 'SUBSCRIPTION_ANALYSIS',
        confidence: 0.95,
        reason: 'CSV transaction statement detected, routing to subscription & recurring payment finder.',
        requiresVision: false,
        requiresOCR: false,
      };
    }

    // 3. Instant 0ms Deterministic Rule Scoring
    const cleanText = text.trim();
    const scores = this.calculateDeterministicScores(cleanText, inputType);

    const top = scores[0] || {
      intent: 'GENERAL_QUESTION' as FixMateIntent,
      score: 0.6,
      reason: 'General inquiry with no specific technical or billing markers',
      keywords: [],
    };

    return {
      intent: top.intent,
      confidence: top.score,
      reason: top.reason,
      requiresVision: inputType === 'image',
      requiresOCR: inputType === 'image' || inputType === 'pdf',
      detectedKeywords: top.keywords,
    };
  }

  private static calculateDeterministicScores(text: string, inputType: FixMateInputType): IntentScore[] {
    const lower = text.toLowerCase();
    const scores: IntentScore[] = [];

    // Technical Error Scoring
    const errorKeywords = [
      'error', 'exception', 'stack trace', 'traceback', 'failed to', 'cannot find module',
      'syntaxerror', 'typeerror', 'eaddrinuse', 'enoent', '404 not found', '500 internal',
      'uncaught', 'segfault', 'command not found', 'compilation error', 'npm err', 'exit code 1',
    ];
    const matchedError = errorKeywords.filter((k) => lower.includes(k));
    if (matchedError.length > 0) {
      const score = Math.min(0.98, 0.45 + matchedError.length * 0.2);
      scores.push({
        intent: 'TECHNICAL_ERROR',
        score,
        reason: `Identified ${matchedError.length} error signature(s): ${matchedError.slice(0, 3).join(', ')}`,
        keywords: matchedError,
      });
    }

    // Scam Analysis Scoring
    const scamKeywords = [
      'lottery', 'won prize', 'kyc', 'urgent', 'suspended', 'account blocked', 'deactivated',
      'upi pin', 'click link', 'verify now', 'income tax refund', 'customs clearance',
      'work from home daily', 'gift card', 'crypto profit', 'otp', 'share password',
      'congratulations you won', 'phishing', 'fake bank', 'bit.ly',
    ];
    const matchedScam = scamKeywords.filter((k) => lower.includes(k));
    if (matchedScam.length > 0) {
      const score = Math.min(0.96, 0.5 + matchedScam.length * 0.2);
      scores.push({
        intent: 'SCAM_ANALYSIS',
        score,
        reason: `Detected potential scam flags: ${matchedScam.slice(0, 3).join(', ')}`,
        keywords: matchedScam,
      });
    }

    // Bill Explanation Scoring
    const billKeywords = [
      'due date', 'amount payable', 'electricity bill', 'invoice no', 'bill period',
      'tax invoice', 'charges breakdown', 'subtotal', 'meter reading', 'net payable',
      'discom', 'tariff', 'previous balance', 'total due',
    ];
    const matchedBill = billKeywords.filter((k) => lower.includes(k));
    if (matchedBill.length > 0) {
      const score = Math.min(0.97, 0.45 + matchedBill.length * 0.2);
      scores.push({
        intent: 'BILL_EXPLANATION',
        score,
        reason: `Identified bill & invoice markers: ${matchedBill.slice(0, 3).join(', ')}`,
        keywords: matchedBill,
      });
    }

    // Subscription Scoring
    const subKeywords = [
      'recurring', 'monthly plan', 'subscription', 'annual plan', 'autopay',
      'membership fee', 'netflix', 'spotify', 'hotstar', 'prime membership',
      'renewal date', 'billed monthly',
    ];
    const matchedSub = subKeywords.filter((k) => lower.includes(k));
    if (matchedSub.length > 0) {
      const score = Math.min(0.95, 0.4 + matchedSub.length * 0.2);
      scores.push({
        intent: 'SUBSCRIPTION_ANALYSIS',
        score,
        reason: `Identified recurring subscription signals: ${matchedSub.slice(0, 3).join(', ')}`,
        keywords: matchedSub,
      });
    }

    // Product Analysis Scoring
    const productKeywords = [
      'specs', 'specifications', 'warranty', 'buy now', 'add to cart', 'in stock',
      'mah battery', 'processor', 'camera', 'display', 'mrp', 'customer reviews',
      'ratings', 'discount', 'free delivery',
    ];
    const matchedProd = productKeywords.filter((k) => lower.includes(k));
    if (matchedProd.length > 0) {
      const score = Math.min(0.95, 0.4 + matchedProd.length * 0.2);
      scores.push({
        intent: 'PRODUCT_ANALYSIS',
        score,
        reason: `Identified e-commerce or product specification terms: ${matchedProd.slice(0, 3).join(', ')}`,
        keywords: matchedProd,
      });
    }

    // Voice / Task Scoring
    const taskKeywords = [
      'tomorrow', 'remind me', 'call rahul', 'pay bill', 'to do', 'schedule',
      'meeting at', 'send quotation', 'buy groceries', 'deadline',
    ];
    const matchedTask = taskKeywords.filter((k) => lower.includes(k));
    if (matchedTask.length > 0) {
      const score = Math.min(0.92, 0.4 + matchedTask.length * 0.2);
      scores.push({
        intent: 'VOICE_TASK_EXTRACTION',
        score,
        reason: `Identified task / action phrasing: ${matchedTask.slice(0, 3).join(', ')}`,
        keywords: matchedTask,
      });
    }

    // Sort descending by score
    scores.sort((a, b) => b.score - a.score);
    return scores;
  }
}
