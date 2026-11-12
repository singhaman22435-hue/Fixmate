/**
 * FixMate Robust JSON Extractor and Repair Utility
 * Handles markdown wrapping, conversational prefixes, unescaped characters,
 * trailing commas, and incomplete JSON objects returned by local LLMs.
 */

export function extractJsonFromText(rawText: string): string {
  if (!rawText) return '{}';

  let cleaned = rawText.trim();

  // 1. Remove markdown code fences if present (e.g. ```json ... ```)
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const fenceMatch = cleaned.match(fenceRegex);
  if (fenceMatch && fenceMatch[1]) {
    cleaned = fenceMatch[1].trim();
  }

  // 2. If it's already an object or array, extract the boundary
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let startIndex = -1;
  let isArray = false;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
    isArray = false;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
    isArray = true;
  }

  if (startIndex !== -1) {
    const endChar = isArray ? ']' : '}';
    const lastIndex = cleaned.lastIndexOf(endChar);
    if (lastIndex !== -1 && lastIndex > startIndex) {
      cleaned = cleaned.substring(startIndex, lastIndex + 1);
    }
  }

  return cleaned;
}

export function repairJsonString(jsonStr: string): string {
  let repaired = jsonStr.trim();

  // Remove trailing commas before closing braces/brackets
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');

  // Fix unquoted keys (e.g. { key: "value" } -> { "key": "value" })
  repaired = repaired.replace(/([{,]\s*)([a-zA-Z0-9_]+?)\s*:/g, '$1"$2":');

  // Fix single quotes for strings: replace 'string' with "string"
  // Careful with internal quotes: basic replacement for keys and values
  repaired = repaired.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');

  // Balance and close any unclosed strings, brackets or braces
  let inString = false;
  let escape = false;
  const stack: string[] = [];

  for (let i = 0; i < repaired.length; i++) {
    const ch = repaired[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '{') stack.push('}');
      else if (ch === '[') stack.push(']');
      else if (ch === '}' || ch === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === ch) {
          stack.pop();
        }
      }
    }
  }

  // If ended inside a string, close quote
  if (inString) repaired += '"';
  // Remove any dangling trailing commas before closing
  repaired = repaired.replace(/,\s*$/, '');
  // Close all remaining brackets and braces in reverse order
  while (stack.length > 0) {
    repaired += stack.pop();
  }

  return repaired;
}

export function safeJsonParse<T>(rawText: string, fallback: T): { data: T; success: boolean; raw?: string } {
  try {
    const extracted = extractJsonFromText(rawText);
    const parsed = JSON.parse(extracted);
    return { data: parsed as T, success: true };
  } catch {
    // Attempt secondary repair
    try {
      const extracted = extractJsonFromText(rawText);
      const repaired = repairJsonString(extracted);
      const parsed = JSON.parse(repaired);
      return { data: parsed as T, success: true };
    } catch {
      return { data: fallback, success: false, raw: rawText };
    }
  }
}

