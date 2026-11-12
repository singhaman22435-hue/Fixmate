import { describe, it, expect } from 'vitest';
import { DeterministicFallbackEngine } from '../lib/ai/deterministicFallback';

describe('DeterministicFallbackEngine', () => {
  describe('analyzeError', () => {
    it('generates exact fix commands for EADDRINUSE port binding error', () => {
      const errorText = 'Error: listen EADDRINUSE: address already in use :::3000';
      const result = DeterministicFallbackEngine.analyzeError(errorText);

      expect(result.problemDetected).toContain('Port 3000');
      expect(result.commands.length).toBeGreaterThan(0);
      expect(result.confidence).toBe('HIGH');
    });

    it('generates npm install command for missing module', () => {
      const errorText = 'Error: Cannot find module "express"';
      const result = DeterministicFallbackEngine.analyzeError(errorText);

      expect(result.problemDetected).toContain('express');
      expect(result.commands[0].command).toContain('npm install express');
    });
  });

  describe('analyzeScam', () => {
    it('scores high risk for urgent OTP request with link', () => {
      const scamMsg = 'URGENT: Your account suspended within 24 hours. Submit your OTP at http://secure-update.xyz to claim prize!';
      const result = DeterministicFallbackEngine.analyzeScam(scamMsg);

      expect(result.riskLevel).toBe('HIGH');
      expect(result.riskScore).toBeGreaterThanOrEqual(60);
      expect(result.whatNotToDo.length).toBeGreaterThan(0);
    });

    it('scores low risk for standard greeting message', () => {
      const normalMsg = 'Hey, hope you are having a nice day. Let me know when you are free to chat.';
      const result = DeterministicFallbackEngine.analyzeScam(normalMsg);

      expect(result.riskLevel).toBe('LOW');
      expect(result.riskScore).toBeLessThan(35);
    });
  });

  describe('analyzeBill', () => {
    it('extracts total amount and due date correctly', () => {
      const billText = `
        TNEB Power Distribution
        Due Date: 25/11/2026
        Energy Charges  1800.00
        Total Amount: ₹2,450.00
      `;
      const result = DeterministicFallbackEngine.analyzeBill(billText);

      expect(result.totalAmount).toBe(2450);
      expect(result.dueDate).toBe('25/11/2026');
      expect(result.currency).toBe('₹');
    });
  });

  describe('analyzeSubscriptions', () => {
    it('identifies Netflix and Spotify from statement text', () => {
      const statement = `
        01-Oct Netflix Subscription 649.00
        05-Oct Spotify Premium 119.00
        12-Oct Grocery Store 450.00
      `;
      const result = DeterministicFallbackEngine.analyzeSubscriptions(statement);

      expect(result.detectedCount).toBe(2);
      expect(result.detectedSubscriptions.some((s) => s.merchant === 'Netflix')).toBe(true);
      expect(result.totalMonthlySpend).toBe(768);
      expect(result.totalYearlySpend).toBe(768 * 12);
    });
  });

  describe('analyzeVoiceTasks', () => {
    it('extracts tasks, dates, and people from dictation', () => {
      const dictation = 'Tomorrow at 11 call Rahul and send quotation, also pay electricity bill';
      const result = DeterministicFallbackEngine.analyzeVoiceTasks(dictation);

      expect(result.tasks.length).toBeGreaterThanOrEqual(2);
      expect(result.detectedPeople).toContain('Rahul');
      expect(result.detectedDates).toContain('tomorrow');
    });
  });
});

