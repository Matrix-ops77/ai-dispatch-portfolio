/**
 * Data validation utilities
 * Reusable normalization functions for phone, name, and address
 */

/**
 * Normalize phone number to E.164 format (+1XXXXXXXXXX)
 * Handles various input formats: (xxx) xxx-xxxx, xxx-xxx-xxxx, etc.
 */
export const normalizePhone = (phone: string): string => {
  // Extract only digits
  const cleaned = phone.replace(/\D/g, '');
  
  // 10 digits = local number, add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // 11 digits starting with 1 = already in format
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // Already has + prefix
  if (phone.startsWith('+')) {
    const plusCleaned = phone.replace(/[^\d+]/g, '');
    if (plusCleaned.length >= 11) {
      return plusCleaned;
    }
  }
  
  // Return original if no pattern matches
  return phone;
};

/**
 * Convert name to Title Case
 * "john smith" → "John Smith"
 */
const toTitleCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Normalize name to Title Case
 */
export const normalizeName = (name: string): string => {
  return toTitleCase(name.trim());
};

// Street abbreviation mapping
const SUFFIX_MAP: Record<string, string> = {
  'st': 'Street',
  'st.': 'Street',
  'ave': 'Avenue',
  'ave.': 'Avenue',
  'rd': 'Road',
  'rd.': 'Road',
  'ln': 'Lane',
  'ln.': 'Lane',
  'dr': 'Drive',
  'dr.': 'Drive',
  'ct': 'Court',
  'ct.': 'Court',
  'pl': 'Place',
  'pl.': 'Place',
  'blvd': 'Boulevard',
  'blvd.': 'Boulevard',
  'cir': 'Circle',
  'cir.': 'Circle',
};

/**
 * Normalize address with proper capitalization and abbreviation expansion
 * "123 main st" → "123 Main Street"
 */
export const normalizeAddress = (address: string): string => {
  let normalized = address.trim();
  
  // Expand abbreviations (St → Street, etc.)
  for (const [abbr, full] of Object.entries(SUFFIX_MAP)) {
    const regex = new RegExp(`\\b${abbr}(\\.|\\b)`, 'gi');
    normalized = normalized.replace(regex, full);
  }
  
  return toTitleCase(normalized);
};

/**
 * Validate phone number format
 */
export const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'));
};

/**
 * Validate ZIP code format (US 5-digit)
 */
export const isValidZip = (zip: string): boolean => {
  return /^\d{5}$/.test(zip);
};