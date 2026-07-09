import { describe, expect, it } from 'vitest';
import {
  isBlank,
  looksBoolean,
  looksDate,
  looksNumeric,
  rowFingerprint,
  toNumber,
} from './value-helpers.js';

describe('isBlank', () => {
  it('treats null, undefined, and whitespace-only strings as blank', () => {
    expect(isBlank(null)).toBe(true);
    expect(isBlank(undefined)).toBe(true);
    expect(isBlank('   ')).toBe(true);
    expect(isBlank('')).toBe(true);
  });

  it('does not treat zero or false as blank', () => {
    expect(isBlank(0)).toBe(false);
    expect(isBlank(false)).toBe(false);
    expect(isBlank('0')).toBe(false);
  });
});

describe('looksNumeric', () => {
  it('accepts integers, decimals, and negatives as strings or numbers', () => {
    expect(looksNumeric('42')).toBe(true);
    expect(looksNumeric('-3.14')).toBe(true);
    expect(looksNumeric(7)).toBe(true);
  });

  it('rejects non-numeric strings and NaN', () => {
    expect(looksNumeric('abc')).toBe(false);
    expect(looksNumeric('12abc')).toBe(false);
    expect(looksNumeric(Number.NaN)).toBe(false);
  });
});

describe('toNumber', () => {
  it('parses numeric strings and passes through finite numbers', () => {
    expect(toNumber('3.5')).toBe(3.5);
    expect(toNumber(10)).toBe(10);
  });

  it('returns null for non-numeric input', () => {
    expect(toNumber('n/a')).toBeNull();
    expect(toNumber(null)).toBeNull();
  });
});

describe('looksBoolean', () => {
  it('accepts true/false booleans and case-insensitive strings', () => {
    expect(looksBoolean(true)).toBe(true);
    expect(looksBoolean('FALSE')).toBe(true);
    expect(looksBoolean('yes')).toBe(false);
  });
});

describe('looksDate', () => {
  it('accepts ISO and slash-formatted dates', () => {
    expect(looksDate('2024-01-15')).toBe(true);
    expect(looksDate('1/15/2024')).toBe(true);
  });

  it('rejects garbage strings', () => {
    expect(looksDate('not a date')).toBe(false);
    expect(looksDate('2024-13-99')).toBe(false);
  });
});

describe('rowFingerprint', () => {
  it('is stable regardless of key order', () => {
    const a = rowFingerprint({ a: 1, b: 2 });
    const b = rowFingerprint({ b: 2, a: 1 });
    expect(a).toBe(b);
  });

  it('differs when values differ', () => {
    expect(rowFingerprint({ a: 1 })).not.toBe(rowFingerprint({ a: 2 }));
  });
});
