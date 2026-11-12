import { describe, it, expect } from 'vitest';
import { IntentDetector } from '../lib/analyzers/intentDetector';

describe('IntentDetector', () => {
  it('detects TECHNICAL_ERROR from stack trace snippet', async () => {
    const text = 'Error: listen EADDRINUSE: address already in use :::3000\n at Server.setupListenHandle';
    const res = await IntentDetector.detect(text, 'text');
    expect(res.intent).toBe('TECHNICAL_ERROR');
    expect(res.confidence).toBeGreaterThan(0.7);
  });

  it('detects SCAM_ANALYSIS from phishing SMS text', async () => {
    const text = 'URGENT: Your SBI account is suspended. Update KYC immediately or share OTP at bit.ly/fake-bank';
    const res = await IntentDetector.detect(text, 'text');
    expect(res.intent).toBe('SCAM_ANALYSIS');
    expect(res.confidence).toBeGreaterThan(0.7);
  });

  it('detects BILL_EXPLANATION from electricity statement snippet', async () => {
    const text = 'Electricity Bill Discom. Due Date: 15/11/2026. Net Payable Amount: ₹2,450.00. Meter Reading: 1240 kWh';
    const res = await IntentDetector.detect(text, 'text');
    expect(res.intent).toBe('BILL_EXPLANATION');
    expect(res.confidence).toBeGreaterThan(0.7);
  });

  it('detects SUBSCRIPTION_ANALYSIS from recurring transaction statement', async () => {
    const text = 'Recurring Netflix subscription ₹649 billed monthly. Spotify auto-renewal ₹119.';
    const res = await IntentDetector.detect(text, 'text');
    expect(res.intent).toBe('SUBSCRIPTION_ANALYSIS');
  });

  it('routes audio input directly to VOICE_TASK_EXTRACTION', async () => {
    const res = await IntentDetector.detect('tomorrow at 11 meet Priya', 'audio');
    expect(res.intent).toBe('VOICE_TASK_EXTRACTION');
    expect(res.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it('routes csv input directly to SUBSCRIPTION_ANALYSIS', async () => {
    const res = await IntentDetector.detect('date,desc,amount\n2026-10-01,Netflix,649', 'csv');
    expect(res.intent).toBe('SUBSCRIPTION_ANALYSIS');
  });
});

