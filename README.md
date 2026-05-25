# AI Dispatch Engine

<!-- Logo and Hero -->
<p align="center">
  <img src="docs/logo.svg" width="120" alt="AI Dispatch Logo">
</p>

<h1 align="center">
  AI Voice & Text Dispatcher
</h1>

<p align="center">
  Production-grade AI system that handles emergency service calls via voice and text — with intelligent routing, intake automation, and CRM integration.
</p>

<p align="center">
  <!-- CI Badge -->
  <img src="https://github.com/Matrix-ops77/ai-dispatch-portfolio/actions/workflows/ci.yml/badge.svg" alt="CI">

  <!-- License Badge -->
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License">

  <!-- TypeScript Badge -->
  <img src="https://img.shields.io/badge/TypeScript-5.5-blue" alt="TypeScript">

  <!-- Node Badge -->
  <img src="https://img.shields.io/badge/Node-22.x-green" alt="Node">

  <!-- Google Cloud Badge -->
  <img src="https://img.shields.io/badge/Google%20Cloud-Firebase-orange" alt="Google Cloud">

  <!-- Twilio Badge -->
  <img src="https://img.shields.io/badge/Twilio-Voice%20%2F%20SMS-purple" alt="Twilio">
</p>

---

## 🎯 What It Does

An AI agent that answers emergency calls **24/7**, captures caller information (name, phone, address, issue type), qualifies urgency in real-time, and routes qualified leads to dispatch — **without human intervention**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AI DISPATCH ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────────────┘

                          ┌──────────────────┐
                          │   EMERGENCY      │
                          │   CALL / SMS     │
                          └────────┬─────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
           ┌─────────────────┐           ┌─────────────────┐
           │  VOICE AGENT    │           │   TEXT CHAT     │
           │  (Twilio Live)  │           │   (Web / API)   │
           └────────┬────────┘           └────────┬────────┘
                    │                               │
                    │    Real-time Audio Stream     │
                    │    + Speech Recognition        │
                    ▼                               ▼
           ┌─────────────────────────────────────────────────┐
           │                  AI DISPATCHER                   │
           │  ┌─────────────┐  ┌──────────────┐  ┌─────────┐ │
           │  │ Gemini LLM  │  │ Zod Schemas  │  │  State  │ │
           │  │ + Prompt    │  │ Validation   │  │ Machine │ │
           │  └─────────────┘  └──────────────┘  └─────────┘ │
           └─────────────────────────────────────────────────┘
                    │                               │
                    ▼                               ▼
    ┌────────────────────────────────────────────────────────┐
    │                    ROUTING LOGIC                       │
    │  ┌──────────┐    ┌───────────┐    ┌────────────────┐  │
    │  │ URGENT   │    │  QUALIFIED │    │  SPAM / LOW    │  │
    │  │ (High)   │    │   LEAD    │    │   QUALITY      │  │
    │  └────┬─────┘    └─────┬─────┘    └───────┬────────┘  │
    │       │                │                 │            │
    │       ▼                ▼                 ▼            │
    │  ┌─────────┐     ┌──────────┐      ┌────────────┐    │
    │  │IMMEDIATE│     │ FIRESTORE │      │   FILTERED  │    │
    │  │TRANSFER │     │   + CRM   │      │   (No Log)  │    │
    │  └─────────┘     └──────────┘      └────────────┘    │
    └────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 🔊 Voice Intelligence
- **Real-time speech-to-text** via Twilio Media Streams
- **Natural conversation** with AI using Gemini Live API
- **Silence detection** with automatic nudge prompts
- **PCM audio processing** with RMS statistics
- **Configurable input gain** and silence thresholds

### 💬 Text Intake
- **Natural language chat** interface
- **Structured JSON parsing** from AI responses
- **Fallback extraction** using heuristic patterns
- **Conversation history** with session management

### 🎯 Intelligent Routing
- **Urgency classification** — Emergency / High / Normal
- **Spam detection** with quality scoring
- **Lead qualification** — Name, Phone, Address, Issue Type
- **Automatic CRM sync** via HubSpot API

### 🛡️ Data Validation
- **Zod schema validation** for structured output
- **Phone normalization** → +1XXXXXXXXXX format
- **Name capitalization** → Title Case
- **Address standardization** → Street abbreviation expansion

### 📊 Operations
- **Structured JSON logging** with request tracking
- **Async processing** for non-blocking responses
- **Firestore session management** with TTL
- **Webhook integration** for third-party systems

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Voice Bridge** | Fastify + Twilio SDK | Real-time audio streaming |
| **AI Engine** | Gemini 2.0 Flash | LLM-powered conversation |
| **Text Dispatcher** | Google Cloud Functions | Serverless API handler |
| **Database** | Firebase / Firestore | Session & lead storage |
| **Validation** | Zod | Schema validation |
| **Frontend** | Next.js 16 + React 19 | Dashboard UI |
| **Testing** | Vitest + Playwright | Unit & E2E tests |
| **CI/CD** | GitHub Actions | Automated verification |

---

## 🚀 Quick Start

### Prerequisites

```bash
# Node.js 22.x required
node --version  # Should be >= 22.0.0

# Google Cloud account for deployment
# Twilio account for voice integration
# Gemini API key from Google AI Studio
```

### Installation

```bash
# Clone the repository
git clone https://github.com/Matrix-ops77/ai-dispatch-portfolio.git
cd ai-dispatch-portfolio

# Install dependencies
npm install

# Copy environment template
cp src/dispatcher/.env.example src/dispatcher/.env.local
```

### Configuration

Edit `.env.local` with your credentials:

```bash
# Google Cloud / Gemini
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLOUD_PROJECT=your_project_id

# Optional: HubSpot CRM Integration
HUBSPOT_ACCESS_TOKEN=your_hubspot_token

# Optional: Webhook for lead forwarding
LEAD_WEBHOOK_URL=https://your-webhook.com/leads
LEAD_WEBHOOK_SECRET=your_secret
```

### Run Voice Server

```bash
cd src/voice-server
npm install
npm run dev
```

### Run Dispatcher (Local Testing)

```bash
cd src/dispatcher
npm run build
npm start
```

---

## 📁 Project Structure

```
ai-dispatch-portfolio/
├── src/
│   ├── dispatcher/                 # AI text dispatcher
│   │   ├── index.ts                # Main Cloud Function handler
│   │   ├── intake-schema.ts        # Zod validation schemas
│   │   ├── validation.ts           # Phone/name/address utils
│   │   ├── prompt.ts               # AI system prompt
│   │   └── env.ts                  # Environment config
│   │
│   ├── voice-server/               # Voice AI bridge
│   │   ├── voice-server.js         # Fastify + Twilio WebSocket
│   │   ├── extraction.js           # Incremental data extraction
│   │   ├── transfer.js             # Call transfer logic
│   │   └── validation.js           # Ported validation utils
│   │
│   └── shared/                     # Shared code
│       └── types.ts                # TypeScript interfaces
│
├── tests/
│   └── unit/
│       └── validation.test.ts      # Vitest unit tests
│
├── docs/
│   └── logo.svg                    # Project logo
│
├── .github/
│   └── workflows/
│       └── ci.yml                  # GitHub Actions CI
│
├── eslint.config.js                # ESLint configuration
├── tsconfig.json                  # TypeScript config
├── package.json                   # Dependencies
└── README.md                      # This file
```

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Full verification (lint + tests)
npm run verify
```

---

## 📈 Real-World Results

This system was built for a **live emergency dispatch operation** handling **50+ calls per week**:

| Metric | Before | After |
|--------|--------|-------|
| **Speed-to-lead** | Hours (manual follow-up) | **Seconds** (instant routing) |
| **Contact capture rate** | ~60% (manual entry) | **85%+** (AI automated) |
| **Urgency classification** | Manual triage | **Real-time AI scoring** |
| **After-hours coverage** | Voicemail | **24/7 AI answering** |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

[![GitHub Stars](https://img.shields.io/github/stars/Matrix-ops77/ai-dispatch-portfolio?style=social)](https://github.com/Matrix-ops77/ai-dispatch-portfolio)
[![Twitter Follow](https://img.shields.io/twitter/follow/your_handle?style=social)](https://twitter.com/your_handle)

- **Repository**: https://github.com/Matrix-ops77/ai-dispatch-portfolio
- **Issues**: https://github.com/Matrix-ops77/ai-dispatch-portfolio/issues

---

<p align="center">
  Built with ❤️ for AI-powered dispatch systems
</p>