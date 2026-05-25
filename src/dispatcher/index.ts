/**
 * AI Dispatcher - TypeScript Google Cloud Function
 * Generic version for portfolio showcase
 * 
 * Handles text-based intake conversations with AI assistance,
 * extracts structured data, and routes qualified leads.
 */

import 'dotenv/config';
import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as functions from '@google-cloud/functions-framework';
import { Firestore, FieldValue, Timestamp } from '@google-cloud/firestore';
import { randomUUID } from 'crypto';
import { normalizePhone, normalizeName, normalizeAddress } from './validation';
import { env } from './env';
import { buildSystemPrompt, DISPATCH_PHONE, PROMPT_VERSION } from './prompt';
import type { DispatchIntent, LeadRecord } from './shared-types';
import { intakeIntentSchema, normalizeIntent, getIntentFlags, type IntakeIntent } from './intake-schema';

// Configuration
const GEMINI_KEY = env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.0-flash';
const MODEL_TIMEOUT_MS = 12_000;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

// Model caching for efficiency
let cachedModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

const getModel = () => {
  if (!cachedModel && GEMINI_KEY) {
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    cachedModel = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.4,
        topP: 0.8,
        topK: 40,
      }
    });
  }
  return cachedModel;
};

// Firestore setup
const firestore = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  ignoreUndefinedProperties: true,
});

const sessionsCollection = firestore.collection('sessions');
const leadsCollection = firestore.collection('leads');

// Issue type detection keywords
const ISSUE_KEYWORDS: Record<string, string> = {
  sewage: 'Sewage Backup',
  sewer: 'Sewage Backup',
  mold: 'Mold Remediation',
  slab: 'Slab Leak',
  leak: 'Leak',
  pipe: 'Burst Pipe',
  burst: 'Burst Pipe',
  flooded: 'Flooded Basement',
  flood: 'Flooded Basement',
  basement: 'Basement Flooding',
  sump: 'Sump Pump Failure',
  pump: 'Sump Pump Failure',
  fire: 'Fire & Smoke',
  smoke: 'Fire & Smoke',
  storm: 'Storm Damage',
};

interface HistoryTurn {
  role: 'user' | 'model';
  text: string;
}

/**
 * Main dispatcher HTTP handler
 */
functions.http('dispatcher', async (req: Request, res: Response) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, x-request-id');

  const requestId = req.get('x-request-id') || randomUUID();
  res.set('x-request-id', requestId);

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const startTime = Date.now();

  try {
    const { history, sessionId: incomingSessionId } = req.body;
    if (!history || !Array.isArray(history)) {
      res.status(400).json({ error: 'History array required', requestId });
      return;
    }

    const sessionId = incomingSessionId || randomUUID();
    const validHistory: HistoryTurn[] = history.filter(isValidTurn);

    // Get model and prepare chat
    const model = getModel();
    if (!model) {
      throw new Error('AI model not initialized');
    }

    const systemPrompt = buildSystemPrompt(env.SERVICE_AREA);
    const contents = validHistory.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text.slice(0, 3000) }],
    }));

    // Ensure first message is from user (Gemini requirement)
    while (contents.length > 0 && contents[0].role !== 'user') {
      contents.shift();
    }

    if (contents.length === 0) {
      const fallbackIntent: DispatchIntent = { label: 'inquiry', severity: 'normal', reason: 'No user input' };
      res.json({
        sessionId,
        message: 'Please tell me more about your situation.',
        intent: fallbackIntent,
        requestId,
        model: MODEL_NAME,
        promptVersion: PROMPT_VERSION,
      });
      return;
    }

    // Start chat with history
    const chat = model.startChat({
      history: contents.slice(0, -1),
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
    });

    const lastMessage = contents[contents.length - 1].parts[0].text;

    // Send message with timeout
    const result = await Promise.race([
      chat.sendMessage(lastMessage) as Promise<any>,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), MODEL_TIMEOUT_MS))
    ]);

    const response = await (result as any).response;
    const replyText = response.text();

    // Extract intent from AI response
    let intent = extractIntentFromResponse(replyText);
    
    // Fallback to heuristic extraction if AI parsing failed
    if (!intent) {
      intent = extractIntakeFromHistory(validHistory);
    }

    // Normalize and validate intent
    const normalizedIntent = normalizeIntent(intent as IntakeIntent);
    const { isSpam, isQualified, isUrgent } = getIntentFlags(normalizedIntent as IntakeIntent);

    // Prepare response
    let cleanReplyText = extractCleanText(replyText);
    const closingLine = `Please call our dispatch line at ${DISPATCH_PHONE} to confirm service.`;
    if (!cleanReplyText.includes(DISPATCH_PHONE)) {
      cleanReplyText = `${cleanReplyText}\n\n${closingLine}`.trim();
    }

    // Async operations: save session and forward lead
    (async () => {
      try {
        // Save conversation history
        const trimmedHistory = [...validHistory.slice(-9), { role: 'model', text: cleanReplyText }];
        await sessionsCollection.doc(sessionId).set({
          history: trimmedHistory,
          updatedAt: FieldValue.serverTimestamp(),
          expiresAt: Timestamp.fromMillis(Date.now() + SESSION_TTL_MS),
          lastIntent: normalizedIntent,
          requestId,
        }, { merge: true });

        // Route qualified leads
        if (isQualified || isUrgent) {
          const leadData: LeadRecord = {
            sessionId,
            requestId,
            timestamp: FieldValue.serverTimestamp(),
            urgency: isUrgent ? 'Emergency' : 'High',
            damage_description: normalizedIntent?.reason || '',
            name: normalizedIntent?.contactName || 'Unknown',
            phone: normalizedIntent?.contactPhone || 'Unknown',
            address: normalizedIntent?.address || 'Unknown',
            issueType: normalizedIntent?.issueType || 'Service Request',
            zip_code: extractZipCode(normalizedIntent?.address || ''),
            status: 'New',
            source: 'AI Dispatcher',
            qualityScore: normalizedIntent?.qualityScore || (isQualified ? 8 : 4),
          };

          await leadsCollection.add(leadData);
          
          // Webhook forwarding (customize for your CRM)
          await forwardLead(env, { intent: normalizedIntent, leadData });
        }
      } catch (error) {
        console.error('Background error:', error);
      }
    })();

    // Send response
    res.json({
      sessionId,
      message: cleanReplyText,
      intent: normalizedIntent,
      requestId,
      model: MODEL_NAME,
      promptVersion: PROMPT_VERSION,
    });

  } catch (error: unknown) {
    console.error('Dispatcher error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Service temporarily unavailable',
      details: message,
      requestId
    });
  }
});

/**
 * Type guard for valid conversation turns
 */
function isValidTurn(turn: any): turn is HistoryTurn {
  return Boolean(
    turn &&
    (turn.role === 'user' || turn.role === 'model') &&
    typeof turn.text === 'string' &&
    turn.text.trim()
  );
}

/**
 * Extract structured intent from AI response
 */
function extractIntentFromResponse(text: string): DispatchIntent | null {
  // Try markdown JSON block
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1]);
      if (parsed.intent) return parsed.intent;
    } catch {}
  }

  // Try raw JSON object
  const openBrace = text.lastIndexOf('{');
  const closeBrace = text.lastIndexOf('}');
  if (openBrace !== -1 && closeBrace > openBrace) {
    try {
      const parsed = JSON.parse(text.substring(openBrace, closeBrace + 1));
      if (parsed.intent) return parsed.intent;
    } catch {}
  }

  return null;
}

/**
 * Remove JSON artifacts from AI response text
 */
function extractCleanText(text: string): string {
  return text
    .replace(/```json\s*[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\{[\s\S]*?\}/g, '')
    .trim();
}

/**
 * Heuristic extraction from conversation history
 */
function extractIntakeFromHistory(history: HistoryTurn[]): Partial<DispatchIntent> {
  const joined = history.map((turn) => turn.text).join('\n');

  const phoneMatch = joined.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  const nameMatch = joined.match(/(?:my name is|i am|i'm|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i);
  const addressMatch = joined.match(/(\d{1,6}\s+[A-Za-z0-9\s,.-]+?(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Drive|Dr\.?)(?:[\s,]+[A-Za-z\s]+){0,2}(?:\s*,?\s*PA)?(?:\s*\d{5})?)/i);

  return {
    contactPhone: phoneMatch ? normalizePhone(phoneMatch[0]) : undefined,
    contactName: nameMatch ? normalizeName(nameMatch[1]) : undefined,
    address: addressMatch ? normalizeAddress(addressMatch[1]) : undefined,
    issueType: detectIssueType(joined),
  };
}

/**
 * Detect issue type from keywords
 */
function detectIssueType(text: string): string | undefined {
  const normalized = text.toLowerCase();
  for (const [keyword, label] of Object.entries(ISSUE_KEYWORDS)) {
    if (normalized.includes(keyword)) return label;
  }
  return undefined;
}

/**
 * Extract ZIP code from address string
 */
function extractZipCode(address: string): string {
  const match = address.match(/\b\d{5}\b/);
  return match ? match[0] : '00000';
}

/**
 * Forward lead to external systems (CRM, webhooks, etc.)
 */
async function forwardLead(env: any, payload: { intent: any; leadData: LeadRecord }): Promise<void> {
  const { leadData } = payload;
  
  if (env.LEAD_WEBHOOK_URL) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-request-id': leadData.requestId || leadData.sessionId,
      };
      if (env.LEAD_WEBHOOK_SECRET) {
        headers['Authorization'] = `Bearer ${env.LEAD_WEBHOOK_SECRET}`;
      }

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);

      await fetch(env.LEAD_WEBHOOK_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(leadData),
        signal: controller.signal,
      });
    } catch (error) {
      console.error('Webhook error:', error);
    }
  }
}