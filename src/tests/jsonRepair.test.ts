import { describe, it, expect } from 'vitest';
import { extractJsonFromText, repairJsonString, safeJsonParse } from '../lib/ai/jsonRepair';

describe('JSON Repair Utility', () => {
  it('extracts JSON from markdown code fences', () => {
    const raw = `Here is the solution:\n\`\`\`json\n{"problemDetected": "Port 3000 in use", "confidence": "HIGH"}\n\`\`\`\nHope this helps!`;
    const extracted = extractJsonFromText(raw);
    expect(extracted).toBe('{"problemDetected": "Port 3000 in use", "confidence": "HIGH"}');
  });

  it('removes trailing commas before closing braces', () => {
    const broken = '{"items": ["step 1", "step 2",], "status": "ok",}';
    const repaired = repairJsonString(broken);
    expect(repaired).toBe('{"items": ["step 1", "step 2"], "status": "ok"}');
  });

  it('safely parses imperfect JSON with fallback', () => {
    const fallback = { problemDetected: 'Default' };
    const raw = '```json\n{"problemDetected": "Syntax Error", "confidence": "HIGH",}\n```';
    const res = safeJsonParse(raw, fallback);
    expect(res.success).toBe(true);
    expect(res.data.problemDetected).toBe('Syntax Error');
  });
});

