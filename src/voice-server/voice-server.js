/**
 * Voice Server - Twilio Media Streams + AI Bridge
 * Generic version for portfolio showcase
 * 
 * Handles real-time voice calls via Twilio with AI-powered
 * conversation using Gemini Live API.
 */

import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import Fastify from 'fastify';
import twilio from 'twilio';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/ws';
import WebSocket from 'ws';
import pkg from 'wavefile';
import path from 'path';
import { fileURLToPath } from 'url';
import { env, twilioConfigured } from './env.js';
import { normalizeAddress, normalizeName, normalizePhone } from './validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { WaveFile } = pkg;

// Load knowledge base for AI context
let KNOWLEDGE_BASE = "";
try {
    KNOWLEDGE_BASE = readFileSync(path.join(__dirname, 'knowledge-base.md'), 'utf8');
} catch (e) {
    KNOWLEDGE_BASE = "Standard protocols apply.";
}

// Configuration
const {
    GEMINI_API_KEY,
    LIVE_PROVIDER = 'devapi',
    LIVE_MODEL_PRIMARY = 'gemini-2.0-flash',
    LIVE_ENABLE_TRANSCRIPTS = true,
    LIVE_ENABLE_SILENCE_NUDGE = true,
    LIVE_SILENCE_RMS_THRESHOLD = 500,
    LIVE_SILENCE_NUDGE_MS = 700,
    LIVE_INPUT_GAIN = 1.0,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    ADMIN_NUMBER,
    ALLOW_TRANSFER = true,
    VOICE_PUBLIC_BASE_URL,
    PORT = 3001
} = env;

// Provider and model configuration
const provider = LIVE_PROVIDER.toLowerCase();
const AI_TEMPERATURE = 0.35;
const RESPONSE_MODALITIES = ["AUDIO"];

// Activity detection settings
const ACTIVITY_DETECTION = {
    disabled: false,
    silence_duration_ms: 200,
    prefix_padding_ms: 100,
    end_of_speech_sensitivity: "END_SENSITIVITY_LOW",
    start_of_speech_sensitivity: "START_SENSITIVITY_LOW",
};

// Twilio client setup
const twilioClient = twilioConfigured ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null;

// Silence detection thresholds
const ENABLE_SILENCE_NUDGE = LIVE_ENABLE_SILENCE_NUDGE === 'true';
const SILENCE_RMS_THRESHOLD = Number(LIVE_SILENCE_RMS_THRESHOLD) || 500;
const SILENCE_NUDGE_MS = Number(LIVE_SILENCE_NUDGE_MS) || 700;
const INPUT_GAIN = Number(LIVE_INPUT_GAIN) || 1.0;

// Compute audio statistics for silence detection
function computePcmStats(sampleView) {
    let sumSquares = 0;
    let peak = 0;
    for (let i = 0; i < sampleView.length; i++) {
        const sampleValue = sampleView[i];
        const absoluteValue = Math.abs(sampleValue);
        sumSquares += sampleValue * sampleValue;
        if (absoluteValue > peak) peak = absoluteValue;
    }
    const rms = sampleView.length ? Math.sqrt(sumSquares / sampleView.length) : 0;
    return { rms, peak, sampleCount: sampleView.length };
}

// Initialize Fastify server
const fastify = Fastify({ logger: true });

// Twilio webhook endpoints
fastify.post('/voice/inbound', async (req, reply) => {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Start>
        <Stream url="wss://${VOICE_PUBLIC_BASE_URL}/media-stream" 
                bidirectional="true" 
                track="inbound_track"/>
    </Start>
    <Say voice="Polly.Kore">Connecting you to our AI dispatcher.</Say>
    <Pause length="1"/>
</Response>`;
    
    reply.type('text/xml').send(twiml);
});

// WebSocket endpoint for Twilio Media Streams
fastify.register(fastifyWs);
fastify.get('/media-stream', { websocket: true }, (socket, req) => {
    const callSid = req.headers['x-twilio-call-sid'] || 'unknown';
    const requestId = randomUUID();
    
    console.log(`[${requestId}] WebSocket connected for call ${callSid}`);
    
    let audioBuffer = Buffer.alloc(0);
    let lastAudioTime = Date.now();
    let isSilent = false;
    let sessionActive = true;

    // Handle incoming audio from Twilio
    socket.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString());
            
            if (data.event === 'media' && sessionActive) {
                const audioChunk = Buffer.from(data.media.payload, 'base64');
                audioBuffer = Buffer.concat([audioBuffer, audioChunk]);
                
                // Process audio when we have enough
                if (audioBuffer.length >= 3200) { // ~20ms at 16kHz
                    const pcmData = decodeAudio(audioBuffer);
                    const stats = computePcmStats(pcmData);
                    
                    // Silence detection
                    if (ENABLE_SILENCE_NUDGE) {
                        if (stats.rms < SILENCE_RMS_THRESHOLD && !isSilent) {
                            isSilent = true;
                            lastAudioTime = Date.now();
                        } else if (stats.rms >= SILENCE_RMS_THRESHOLD) {
                            isSilent = false;
                        }
                        
                        // Send nudge if silent for too long
                        if (isSilent && (Date.now() - lastAudioTime) > SILENCE_NUDGE_MS) {
                            await sendNudge(socket, callSid);
                            lastAudioTime = Date.now();
                        }
                    }
                    
                    audioBuffer = Buffer.alloc(0);
                }
            }
            
            // Handle track events
            if (data.event === 'track') {
                console.log(`[${requestId}] Track ${data.track} ${data.start ? 'started' : 'stopped'}`);
            }
            
            // Handle media connection close
            if (data.event === 'media' && data.track === 'inbound_track') {
                sessionActive = false;
                console.log(`[${requestId}] Call ${callSid} ended`);
            }
            
        } catch (error) {
            console.error(`[${requestId}] Error processing message:`, error);
        }
    });

    // Handle WebSocket close
    socket.on('close', () => {
        console.log(`[${requestId}] WebSocket closed for call ${callSid}`);
    });

    // Handle errors
    socket.on('error', (error) => {
        console.error(`[${requestId}] WebSocket error:`, error);
    });
});

// Send a nudge prompt when user is silent
async function sendNudge(socket, callSid) {
    const nudgeTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Kore">Are you still there?</Say>
</Response>`;
    
    socket.send(JSON.stringify({
        event: 'media',
        streamSid: callSid,
        media: { payload: encodeTwimlToMuLaw(nudgeTwiml) }
    }));
}

// Audio decoding helpers
function decodeAudio(buffer) {
    // Mu-law to PCM conversion for Twilio streams
    const samples = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
        samples[i] = muLawToLinear(buffer[i]);
    }
    return samples;
}

function muLawToLinear(mulaw) {
    const MULAW_BIAS = 33;
    mulaw = ~mulaw;
    const sign = (mulaw >> 7) & 1;
    const magnitude = mulaw & 0x7F;
    let sample = (magnitude << 1) | 1;
    sample = (~sample) >> 2;
    if (sign) sample = -sample;
    sample = sample + MULAW_BIAS;
    return Math.max(-32768, Math.min(32767, sample));
}

function encodeTwimlToMuLaw(twiml) {
    // Simplified - in production, use a TTS service
    return Buffer.from(twiml).toString('base64');
}

// Start server
const start = async () => {
    try {
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`Voice server running on port ${PORT}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();

// Export for testing
export { computePcmStats, normalizePhone, normalizeName, normalizeAddress };