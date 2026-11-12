import { describe, it, expect } from 'vitest';
import { UnifiedPipeline } from '../lib/pipeline/unifiedPipeline';

describe('Unified Pipeline Integration Tests', () => {
  it('Workflow 1: Technical Error screenshot text -> OCR/text -> Intent -> Analyzer -> Result', async () => {
    const errorLog = `
      UnhandledPromiseRejectionWarning: Error: listen EADDRINUSE: address already in use :::3000
      at Server.setupListenHandle [as _listen2] (net.js:1318:16)
      at listenInCluster (net.js:1366:12)
    `;

    const result = await UnifiedPipeline.execute({
      text: errorLog,
      saveToHistory: false, // Don't write to DB during pure unit integration test
    });

    expect(result.intent).toBe('TECHNICAL_ERROR');
    expect(result.result.type).toBe('TECHNICAL_ERROR');
    if (result.result.type === 'TECHNICAL_ERROR') {
      expect(result.result.data.problemDetected).toContain('Port 3000');
      expect(result.result.data.commands.length).toBeGreaterThan(0);
      expect(result.result.data.whatToDo.length).toBeGreaterThan(0);
      expect(result.result.data.confidence).toBe('HIGH');
    }
  });

  it('Workflow 2: Voice -> transcription -> task extraction -> tasks', async () => {
    const voiceTranscript = 'Tomorrow at 11 call Rahul and send quotation, also pay electricity bill';

    const result = await UnifiedPipeline.execute({
      text: voiceTranscript,
      mimeType: 'audio/webm',
      saveToHistory: false,
    });

    expect(result.intent).toBe('VOICE_TASK_EXTRACTION');
    expect(result.result.type).toBe('VOICE_TASK_EXTRACTION');
    if (result.result.type === 'VOICE_TASK_EXTRACTION') {
      expect(result.result.data.tasks.length).toBeGreaterThanOrEqual(2);
      expect(result.result.data.detectedPeople).toContain('Rahul');
      expect(result.result.data.detectedDates).toContain('tomorrow');
    }
  });

  it('Workflow 3: Bill -> extraction -> parsing -> explanation', async () => {
    const billContent = `
      BESCOM Electricity Supply
      Billing Period: 01 Oct 2026 - 31 Oct 2026
      Due Date: 18/11/2026
      Energy Charges: 1950.00
      Fuel Surcharge: 150.00
      Total Amount: ₹2,100.00
    `;

    const result = await UnifiedPipeline.execute({
      text: billContent,
      mimeType: 'text/plain',
      saveToHistory: false,
    });

    expect(result.intent).toBe('BILL_EXPLANATION');
    expect(result.result.type).toBe('BILL_EXPLANATION');
    if (result.result.type === 'BILL_EXPLANATION') {
      expect(result.result.data.totalAmount).toBe(2100);
      expect(result.result.data.dueDate).toBe('18/11/2026');
      expect(result.result.data.chargeBreakdown.length).toBeGreaterThan(0);
    }
  });

  it('Workflow 4: Subscription detection from statement', async () => {
    const statementText = `
      2026-10-01 NETFLIX.COM 649.00
      2026-10-03 SPOTIFY INDIA 119.00
      2026-10-15 CAFE COFFEE DAY 240.00
    `;

    const result = await UnifiedPipeline.execute({
      text: statementText,
      saveToHistory: false,
    });

    expect(result.intent).toBe('SUBSCRIPTION_ANALYSIS');
    expect(result.result.type).toBe('SUBSCRIPTION_ANALYSIS');
    if (result.result.type === 'SUBSCRIPTION_ANALYSIS') {
      expect(result.result.data.detectedCount).toBe(2);
      expect(result.result.data.totalMonthlySpend).toBe(768);
    }
  });

  it('Workflow 5: Scam Check detection on urgent lottery message', async () => {
    const scamText = 'CONGRATULATIONS! You have won prize of 25 Lakhs. Urgent KYC update required within 24 hours. Submit OTP at bit.ly/claim-prize-now';

    const result = await UnifiedPipeline.execute({
      text: scamText,
      saveToHistory: false,
    });

    expect(result.intent).toBe('SCAM_ANALYSIS');
    expect(result.result.type).toBe('SCAM_ANALYSIS');
    if (result.result.type === 'SCAM_ANALYSIS') {
      expect(result.result.data.riskLevel).toBe('HIGH');
      expect(result.result.data.whatNotToDo.length).toBeGreaterThan(0);
      expect(result.result.data.whatYouShouldDo.length).toBeGreaterThan(0);
    }
  });
});

