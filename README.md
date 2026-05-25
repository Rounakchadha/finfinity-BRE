# Finfinity BRE — Financial Intelligence Platform

> Smart loan recommendations, strategy optimization, and AI-driven financial advisory for Finfinity's digital credit marketplace.

## What This Is

A modular, embeddable Business Rules Engine (BRE) that powers:
- **Bureau-driven loan strategy recommendations** (sorted by rate, with BT/consolidation/top-up logic)
- **Financial Dashboard** — net worth, EMI health, AI opportunity cards
- **Personal Loan Journey** — eligibility engine + lender comparison (partner integration ready)
- **AI Financial Advisor Chatbot** — RAG over financial knowledge base
- **No-CIBIL user flow** — for first-time borrowers

## Quick Start

```bash
# Install all dependencies
npm install

# Start dev servers (frontend + backend + postgres + redis)
cd docker && docker-compose up -d postgres redis
npm run dev

# Frontend runs on: http://localhost:3000
# API runs on: http://localhost:3001
# API Docs: http://localhost:3001/api/docs
```

## Demo Credentials
- PAN: Any 10-char PAN (e.g. `ABCDE1234F`)
- OTP: `1234`

## Monorepo Structure

```
apps/web      — Next.js 14 frontend
apps/api      — NestJS backend
packages/bre-engine  — Core BRE TypeScript package (shared)
packages/ui          — Design system components
packages/shared-types — Shared DTO interfaces
```

## Partner Integration (PL Module)

The Personal Loan journey at `apps/api/src/products/personal-loan/` is the integration point.
When the partner's PL module is ready, replace this module and align on the input/output contracts in `docs/IMPLEMENTATION_PLAN.md`.

## Lenders Configured

Poonawalla Fincorp · Fullerton · Hero Fincorp · Bajaj Finserv · Tata Capital · Aditya Birla Finance · Axis Bank · HDFC · Kotak · IDFC First · Cholamandalam · IndusInd · Piramal

## Docs

- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [What's Done](docs/WHATS_DONE.md)

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind, Zustand, Framer Motion |
| Backend | NestJS, TypeScript, Prisma, JWT |
| Database | PostgreSQL + pgvector |
| Cache | Redis |
| AI | FinGPT (HuggingFace) + Claude API fallback |
| Infra | Docker, GitHub Actions |
