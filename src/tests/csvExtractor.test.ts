import { describe, it, expect } from 'vitest';
import { CSVExtractor } from '../lib/files/csvExtractor';

describe('CSVExtractor', () => {
  it('parses transaction CSV and creates clean structured items', () => {
    const csvContent = `Date,Description,Amount\n2026-10-01,Netflix Monthly,649.00\n2026-10-05,Amazon Prime,299.00\n2026-10-10,Grocery Store,1250.00`;
    const res = CSVExtractor.extract(csvContent);

    expect(res.rowCount).toBe(3);
    expect(res.transactions.length).toBe(3);
    expect(res.transactions[0].description).toBe('Netflix Monthly');
    expect(res.transactions[0].amount).toBe(649);
    expect(res.textRepresentation).toContain('Netflix Monthly: 649');
  });
});

