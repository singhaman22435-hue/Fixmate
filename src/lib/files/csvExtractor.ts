/**
 * FixMate CSV Transaction & Statement Extractor
 * Parses financial CSVs, expense exports, and statements using PapaParse.
 */

import Papa from 'papaparse';

export interface ParsedTransaction {
  date?: string;
  description: string;
  amount: number;
  category?: string;
  type?: 'debit' | 'credit';
  rawRow: Record<string, string>;
}

export interface CSVExtractionResult {
  textRepresentation: string;
  transactions: ParsedTransaction[];
  rowCount: number;
}

export class CSVExtractor {
  static extract(csvContent: string): CSVExtractionResult {
    const parsed = Papa.parse<Record<string, string>>(csvContent.trim(), {
      header: true,
      skipEmptyLines: true,
    });

    const rows = parsed.data;
    const transactions: ParsedTransaction[] = [];

    // Helper to find column matching any alias
    const findCol = (row: Record<string, string>, aliases: string[]): string | undefined => {
      const keys = Object.keys(row);
      for (const alias of aliases) {
        const found = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === alias);
        if (found && row[found]) return row[found].trim();
      }
      return undefined;
    };

    for (const row of rows) {
      const desc =
        findCol(row, ['description', 'narration', 'merchant', 'details', 'particulars', 'payee', 'title', 'item']) ||
        'Unknown Transaction';

      const rawAmount =
        findCol(row, ['amount', 'debit', 'withdrawal', 'price', 'cost', 'total', 'spent']) || '0';

      const date =
        findCol(row, ['date', 'transactiondate', 'txndate', 'valueDate', 'posteddate', 'time']) || undefined;

      const numAmount = Math.abs(parseFloat(rawAmount.replace(/[^0-9.-]/g, '')) || 0);

      if (numAmount > 0 || desc !== 'Unknown Transaction') {
        transactions.push({
          date,
          description: desc,
          amount: numAmount,
          rawRow: row,
        });
      }
    }

    // Format into clean human-readable text representation for the analyzer / AI
    const lines = transactions.map((t) => {
      const d = t.date ? `[${t.date}] ` : '';
      return `${d}${t.description}: ${t.amount}`;
    });

    return {
      textRepresentation: lines.join('\n'),
      transactions,
      rowCount: rows.length,
    };
  }
}

