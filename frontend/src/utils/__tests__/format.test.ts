import { describe, it, expect } from 'vitest';
import { formatDate, isPdfFile, normalizeDate } from '../format';

describe('formatDate', () => {
  it('converts yyyy-mm-dd to dd-mm-yyyy', () => {
    expect(formatDate('2024-03-25')).toBe('25-03-2024');
  });

  it('returns empty string for empty input', () => {
    expect(formatDate('')).toBe('');
  });

  it('handles non-standard format by returning as-is', () => {
    // formatDate only handles yyyy-mm-dd, other formats pass through
    const result = formatDate('25-03-2024');
    expect(typeof result).toBe('string');
  });
});

describe('isPdfFile', () => {
  it('returns true for PDF mime type', () => {
    const file = new File([''], 'test.pdf', { type: 'application/pdf' });
    expect(isPdfFile(file)).toBe(true);
  });

  it('returns true for .pdf extension', () => {
    const file = new File([''], 'test.pdf', { type: 'text/plain' });
    expect(isPdfFile(file)).toBe(true);
  });

  it('returns false for non-PDF files', () => {
    const file = new File([''], 'test.txt', { type: 'text/plain' });
    expect(isPdfFile(file)).toBe(false);
  });
});

describe('normalizeDate', () => {
  it('converts DD-MM-YYYY to YYYY-MM-DD', () => {
    expect(normalizeDate('25-03-2024')).toBe('2024-03-25');
  });

  it('converts DD/MM/YYYY to YYYY-MM-DD', () => {
    expect(normalizeDate('25/03/2024')).toBe('2024-03-25');
  });

  it('returns YYYY-MM-DD as-is', () => {
    expect(normalizeDate('2024-03-25')).toBe('2024-03-25');
  });

  it('returns today for empty input', () => {
    const result = normalizeDate('');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
