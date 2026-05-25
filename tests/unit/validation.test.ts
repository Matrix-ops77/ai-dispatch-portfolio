/**
 * Unit tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  normalizePhone,
  normalizeName,
  normalizeAddress,
  isValidPhone,
  isValidZip
} from '../../src/dispatcher/validation';

describe('normalizePhone', () => {
  it('formats 10-digit numbers with +1', () => {
    expect(normalizePhone('267-345-8447')).toBe('+12673458447');
    expect(normalizePhone('2673458447')).toBe('+12673458447');
    expect(normalizePhone('(267) 345-8447')).toBe('+12673458447');
  });

  it('keeps existing +1 format', () => {
    expect(normalizePhone('+12673458447')).toBe('+12673458447');
  });

  it('handles international numbers', () => {
    expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958');
  });
});

describe('normalizeName', () => {
  it('converts to title case', () => {
    expect(normalizeName('john smith')).toBe('John Smith');
    expect(normalizeName('MARY JONES')).toBe('Mary Jones');
    expect(normalizeName('  bob  ')).toBe('Bob');
  });
});

describe('normalizeAddress', () => {
  it('expands street abbreviations', () => {
    expect(normalizeAddress('123 main st')).toBe('123 Main Street');
    expect(normalizeAddress('456 oak ave')).toBe('456 Oak Avenue');
    expect(normalizeAddress('789 park rd')).toBe('789 Park Road');
  });

  it('handles addresses with state and zip', () => {
    expect(normalizeAddress('123 main st, pa 18964')).toBe('123 Main Street, Pa 18964');
  });
});

describe('isValidPhone', () => {
  it('validates 10-digit numbers', () => {
    expect(isValidPhone('2673458447')).toBe(true);
    expect(isValidPhone('+12673458447')).toBe(true);
    expect(isValidPhone('12345')).toBe(false);
  });
});

describe('isValidZip', () => {
  it('validates 5-digit US ZIP codes', () => {
    expect(isValidZip('18964')).toBe(true);
    expect(isValidZip('1234')).toBe(false);
    expect(isValidZip('ABCDE')).toBe(false);
  });
});