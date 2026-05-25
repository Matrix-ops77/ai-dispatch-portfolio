/**
 * Intake schema - Zod validation for structured intent data
 */

import { z } from 'zod';
import { normalizeAddress, normalizeName, normalizePhone } from './validation';

// Schema definitions
export const intentLabelSchema = z.enum(['emergency', 'inquiry', 'spam']);
export const intentSeveritySchema = z.enum(['urgent', 'high', 'normal']);

export const diagnosticsSchema = z.object({
  isWaterShutOff: z.boolean().nullable().optional(),
  hasElectricalHazard: z.boolean().nullable().optional(),
}).optional();

/**
 * Main intake intent schema
 * Used for validating AI-extracted structured data
 */
export const intakeIntentSchema = z.object({
  label: intentLabelSchema.optional(),
  severity: intentSeveritySchema.optional(),
  reason: z.string().optional(),
  contactName: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  issueType: z.string().nullable().optional(),
  issueDetails: z.string().nullable().optional(),
  qualityScore: z.number().min(1).max(10).optional(),
  qualityReason: z.string().optional(),
  diagnostics: diagnosticsSchema,
});

export type IntakeIntent = z.infer<typeof intakeIntentSchema>;

/**
 * Normalize intent data with validated formatting
 */
export function normalizeIntent(intent: IntakeIntent): IntakeIntent {
  return {
    ...intent,
    contactName: intent.contactName ? normalizeName(intent.contactName) : undefined,
    contactPhone: intent.contactPhone ? normalizePhone(intent.contactPhone) : undefined,
    address: intent.address ? normalizeAddress(intent.address) : undefined,
  };
}

/**
 * Get flags from intent for routing decisions
 */
export function getIntentFlags(intent: IntakeIntent) {
  const label = intent.label ?? 'inquiry';
  
  const isSpam = label === 'spam';
  
  // Qualified = has name, phone, address, and issue type
  const isQualified = Boolean(
    intent.contactName && 
    intent.contactPhone && 
    intent.address && 
    intent.issueType
  );
  
  const isUrgent = intent.severity === 'urgent';
  
  return {
    label,
    isSpam,
    isQualified,
    isUrgent
  };
}