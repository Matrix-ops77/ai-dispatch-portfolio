/**
 * Voice Server Validation - Ported from shared utilities
 */

export const normalizePhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
  if (phone.startsWith('+')) {
    const plusCleaned = phone.replace(/[^\d+]/g, '');
    if (plusCleaned.length >= 11) return plusCleaned;
  }
  return phone;
};

const toTitleCase = (str) => {
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export const normalizeName = (name) => {
  return toTitleCase(name.trim());
};

const suffixMap = {
  'st': 'Street',
  'ave': 'Avenue',
  'rd': 'Road',
  'ln': 'Lane',
  'dr': 'Drive',
  'ct': 'Court',
  'pl': 'Place',
};

export const normalizeAddress = (address) => {
  let normalized = address.trim();
  for (const [abbr, full] of Object.entries(suffixMap)) {
    const regex = new RegExp(`\\b${abbr}(\\.|\\b)`, 'gi');
    normalized = normalized.replace(regex, full);
  }
  return toTitleCase(normalized);
};