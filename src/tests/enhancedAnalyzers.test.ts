import { describe, it, expect } from 'vitest';
import { DeterministicFallbackEngine } from '../lib/ai/deterministicFallback';
import { PDFExtractor } from '../lib/files/pdfExtractor';
import { OCRService } from '../lib/ocr/ocrService';
import { SpeechService } from '../lib/speech/speechService';

describe('Enhanced Deterministic Analyzers & Offline Stack', () => {
  describe('Bill Explainer - Why the bill changed', () => {
    it('detects late payment penalties and explains cost increases', () => {
      const bill = `
        BESCOM Electricity
        Billing Period: 01/10/2026 to 31/10/2026
        Due Date: 15/11/2026
        Energy Consumption: 240 units
        Base Tariff: 1200.00
        Late Payment Surcharge: 150.00
        Fuel Adjustment Surcharge: 75.00
        Total Amount: ₹1,425.00
      `;

      const result = DeterministicFallbackEngine.analyzeBill(bill);
      expect(result.totalAmount).toBe(1425);
      expect(result.dueDate).toBe('15/11/2026');
      expect(result.billerName).toContain('BESCOM');
      expect(result.unusualCharges.length).toBeGreaterThan(0);
      expect(result.changesFromPreviousBill).toContain('late payment');
      expect(result.changesFromPreviousBill).toContain('240 units');
    });

    it('returns null without inventing amounts when total is missing', () => {
      const incomplete = 'Notice of service inspection. Please check meter wiring.';
      const result = DeterministicFallbackEngine.analyzeBill(incomplete);
      expect(result.totalAmount).toBeNull();
      expect(result.chargeBreakdown).toHaveLength(0);
    });
  });

  describe('Scam Check - Evidence-based indicators', () => {
    it('accurately identifies suspicious link shortener and OTP requests', () => {
      const phishing = 'URGENT: Your SBI YONO account will be blocked within 24 hours. Verify your account at bit.ly/sbi-verify and share the received OTP to avoid disconnection.';
      const result = DeterministicFallbackEngine.analyzeScam(phishing);

      expect(result.riskLevel).toBe('HIGH');
      expect(result.riskScore).toBeGreaterThanOrEqual(60);
      expect(result.suspiciousElements.some((e) => e.type === 'otp')).toBe(true);
      expect(result.suspiciousElements.some((e) => e.type === 'url')).toBe(true);
      expect(result.suspiciousElements.some((e) => e.type === 'urgency')).toBe(true);
      expect(result.whatNotToDo).toContain('Do NOT disclose OTPs, UPI PINs, passwords, or bank account details to anyone.');
    });

    it('identifies realistic LOW risk for harmless messages', () => {
      const harmless = 'Hi John, meeting scheduled for tomorrow at 3pm in room 402.';
      const result = DeterministicFallbackEngine.analyzeScam(harmless);
      expect(result.riskLevel).toBe('LOW');
      expect(result.riskScore).toBeLessThan(35);
    });
  });

  describe('Subscription Finder - Real Math & Zero Hallucination', () => {
    it('calculates frequency math correctly without fake default prices', () => {
      const statement = `
        01-Nov-2026 Netflix Monthly 649.00
        05-Nov-2026 Spotify Monthly 119.00
        12-Nov-2026 GitHub Copilot Monthly 850.00
      `;

      const result = DeterministicFallbackEngine.analyzeSubscriptions(statement);
      expect(result.detectedCount).toBe(3);
      expect(result.totalMonthlySpend).toBe(649 + 119 + 850);
      expect(result.totalYearlySpend).toBe((649 + 119 + 850) * 12);
      expect(result.detectedSubscriptions[0].frequency).toBe('monthly');
    });

    it('does not invent subscriptions when none exist', () => {
      const groceryReceipt = 'Milk 50.00, Bread 40.00, Eggs 90.00, Total: 180.00';
      const result = DeterministicFallbackEngine.analyzeSubscriptions(groceryReceipt);
      expect(result.detectedCount).toBe(0);
      expect(result.totalMonthlySpend).toBe(0);
      expect(result.totalYearlySpend).toBe(0);
      expect(result.potentialSavings).toBe(0);
    });
  });

  describe('Purchase / Buy Advisor - Real Specs Only', () => {
    it('extracts real specifications from listing text without hallucinating', () => {
      const listing = `
        Samsung Galaxy M34 5G
        Price: ₹16,999.00
        RAM: 8GB
        Storage: 128GB
        Battery: 6000mAh
        Display: 6.5 inch FHD+ 120Hz
      `;

      const result = DeterministicFallbackEngine.analyzeProduct(listing);
      expect(result.productName).toContain('Samsung Galaxy M34');
      expect(result.price).toContain('16,999');
      expect(result.importantSpecifications.some((s) => s.label.toLowerCase() === 'ram')).toBe(true);
      expect(result.importantSpecifications.some((s) => s.label.toLowerCase() === 'battery')).toBe(true);
    });
  });

  describe('OCR & Speech Offline Service Health Checks', () => {
    it('reports real OCR offline status using bundled traineddata', () => {
      const status = OCRService.checkStatus();
      expect(status.isAvailable).toBe(true);
      expect(status.trainedDataFound).toBe(true);
      expect(status.trainedDataSizeBytes).toBeGreaterThan(1000000);
    });

    it('reports honest speech service status', () => {
      const speechStatus = SpeechService.checkStatus();
      expect(speechStatus.mode).toBeDefined();
      expect(typeof speechStatus.whisperConfigured).toBe('boolean');
    });
  });
});

