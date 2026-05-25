# AI Voice & Text Dispatcher

[![CI](https://github.com/Matrix-ops77/ai-dispatch-portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/Matrix-ops77/ai-dispatch-portfolio/actions)

A production-grade AI dispatch system that handles emergency service calls via voice and text — with intelligent routing, intake automation, and CRM integration.

## What It Does

An AI agent that answers emergency calls 24/7, captures caller info (name, phone, address, issue type), qualifies urgency, and routes qualified leads to dispatch — without human intervention.

## Architecture

```
[Emergency Call] → [Twilio Voice/SMS] → [AI Dispatcher]
                                              ↓
                   [Data: Phone, Name, Address, Issue]  →  [Firestore]
                                              ↓
                   [Qualification Logic]         →  [HubSpot CRM]
                                              ↓
                   [Webhook → Partner Systems]
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Voice Bridge | Fastify + Twilio Media Streams + Gemini Live API |
| Text Dispatcher | TypeScript + Google Cloud Functions + Gemini |
| Database | Firebase / Firestore |
| Integrations | HubSpot CRM, webhook endpoints |
| Frontend | Next.js 16 + React 19 + TypeScript |
| Testing | Vitest + Playwright |

## Key Features

- **Voice AI**: Real-time speech-to-text, AI conversation, text-to-speech via Twilio Media Streams
- **Text Intake**: Natural language chat interface with structured JSON parsing
- **Urgency Detection**: Heuristic + AI-powered severity classification
- **Data Validation**: Phone/name/address normalization with Zod schema validation
- **CRM Sync**: Automatic contact + deal creation in HubSpot
- **Fallback Routing**: Webhook integration for third-party dispatch systems
- **Logging & Metrics**: Structured JSON logs with request tracking

## Code Highlights

### Voice Server (Twilio ↔ Gemini Live)

Direct WebSocket bridge handling real-time audio streaming with:
- PCM audio processing and stats
- Silence detection and nudge prompts
- Incremental transcript extraction
- Configurable input gain and silence thresholds

### AI Dispatcher (Gemini Cloud Function)

TypeScript Google Cloud Function with:
- Gemini chat API with history management
- JSON intent extraction with markdown and raw JSON fallback
- Zod schema validation for structured output
- Async Firestore session management
- HubSpot API integration with error handling

### Validation Utilities

Reusable normalization functions:
- `normalizePhone()`: Standardize to +1XXXXXXXXXX format
- `normalizeName()`: Title case conversion
- `normalizeAddress()`: Street abbreviation expansion (St → Street, etc.)

## Project Structure

```
ai-dispatch-portfolio/
├── src/
│   ├── dispatcher/           # AI text dispatcher (Google Cloud Function)
│   │   ├── index.ts          # Main handler with Gemini integration
│   │   ├── intake-schema.ts  # Zod validation schemas
│   │   └── validation.ts     # Phone/name/address normalization
│   ├── voice-server/         # Voice AI bridge (Fastify + Twilio)
│   │   ├── voice-server.js   # Main WebSocket + Twilio handler
│   │   ├── extraction.js     # Incremental data extraction
│   │   └── validation.js     # Ported validation utilities
│   └── shared/
│       └── types.ts          # Shared TypeScript interfaces
├── tests/
│   ├── unit/                 # Vitest unit tests
│   └── e2e/                  # Playwright end-to-end tests
├── docs/
│   └── architecture.md       # System design documentation
└── README.md
```

## Running Locally

### Prerequisites

- Node.js 22.x
- Google Cloud account (for deployment)
- Twilio account (for voice integration)
- Gemini API key

### Voice Server

```bash
cd src/voice-server
npm install
cp .env.example .env.local  # Add your keys
npm run dev
```

### Dispatcher Function

```bash
cd src/dispatcher
npm install
npm run build
npm start
```

## Testing

```bash
# Unit tests
npm run test

# End-to-end tests
npm run test:e2e

# Full verification
npm run verify
```

## Real-World Context

Built for a live emergency dispatch operation handling 50+ calls/week. The AI dispatcher:
- Reduces speed-to-lead from hours to seconds
- Captures 85%+ of callers' contact information automatically
- Routes urgent calls (burst pipe, flooding) with highest priority
- Integrates with existing contractor dispatch workflow

## License

MIT