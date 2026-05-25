# Finfinity BRE — Implementation Plan
> Last Updated: 2026-05-25 | Status: 🟡 In Progress

## Overview

Finfinity BRE (Business Rules Engine) is a **Financial Intelligence Platform** that powers smart loan recommendations, strategy optimization, and AI-driven financial advisory — designed to be embedded into any Finfinity product (web app, mobile app, WebView, partner portals).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FRONTEND  (Next.js 14)                         │
│   Auth → Bureau → Dashboard → Product Selector → Journey → Results  │
│   + Floating AI Chatbot Widget (embeddable anywhere)                │
└────────────────────────────┬────────────────────────────────────────┘
                             │ REST + WebSocket
┌────────────────────────────▼────────────────────────────────────────┐
│                        API GATEWAY (NestJS)                         │
├──────────────┬─────────────┬──────────────┬─────────────────────────┤
│ Auth Service │ Bureau Svc  │  BRE Service │     AI Engine           │
│ (OTP + JWT)  │ (CIBIL/mock)│  (Strategies)│  (RAG + LLM + Chatbot)  │
├──────────────┴─────────────┴──────────────┴─────────────────────────┤
│                          DATA LAYER                                  │
│  PostgreSQL (users, loans, apps)  │  Redis (cache, sessions)        │
│  Pinecone / pgvector (AI embeds)  │                                 │
└─────────────────────────────────────────────────────────────────────┘

                    SHARED PACKAGES (monorepo)
    bre-engine (TS)  │  ui (design system)  │  shared-types (DTOs)
```

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript | SSR, embeddable |
| Styling | Tailwind CSS + custom design tokens | Dark theme (mint/teal) |
| State | Zustand | Global BRE state |
| Data Fetching | TanStack Query | Caching, loading states |
| Animations | Framer Motion | Premium transitions |
| Charts | Recharts | Financial visualisations |
| Backend | NestJS + TypeScript | Modular, enterprise |
| ORM | Prisma + PostgreSQL | Structured financial data |
| Cache | Redis | Sessions, bureau TTL |
| Auth | JWT + OTP (demo → Finfinity auth later) | |
| AI/LLM | FinGPT (HuggingFace) + Claude API fallback | RAG system |
| Vector DB | pgvector (PostgreSQL extension) | Embeddings for RAG |
| Chatbot | Socket.io WebSocket gateway | Real-time |
| Monorepo | Turborepo | Shared packages |
| Containers | Docker + docker-compose | Self-hosted server |
| CI | GitHub Actions | Build + type-check |

---

## Monorepo Structure

```
finfinity-BRE/
├── apps/
│   ├── web/                        # Next.js 14 frontend
│   │   ├── src/
│   │   │   ├── app/                # App router pages
│   │   │   │   ├── (auth)/
│   │   │   │   ├── (app)/
│   │   │   │   │   ├── bureau/
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── products/
│   │   │   │   │   │   ├── personal-loan/   ← partner integration point
│   │   │   │   │   │   ├── home-loan/
│   │   │   │   │   │   └── business-loan/
│   │   │   │   │   ├── strategies/
│   │   │   │   │   └── chat/
│   │   │   ├── components/
│   │   │   │   ├── ui/             # Primitives (Button, Card, Input, Badge)
│   │   │   │   ├── layout/         # Header, Stepper, Nav
│   │   │   │   ├── bureau/         # BureauLoanCard, ScoreRing
│   │   │   │   ├── dashboard/      # FinancialDashboard, NetWorthCard
│   │   │   │   ├── strategy/       # StrategyCard, SavingsBar
│   │   │   │   ├── charts/         # WealthTimeline, EMIChart
│   │   │   │   └── chatbot/        # ChatWidget, ChatBubble
│   │   │   ├── features/           # Feature-level logic
│   │   │   ├── hooks/              # usebureau, useBRE, useChat
│   │   │   ├── store/              # Zustand stores
│   │   │   └── lib/                # API client, helpers
│   │   └── package.json
│   │
│   └── api/                        # NestJS backend
│       ├── src/
│       │   ├── auth/               # OTP, JWT, guards
│       │   ├── bureau/             # Bureau fetch + parse
│       │   ├── bre/                # BRE engine modules
│       │   │   ├── strategies/
│       │   │   ├── calculators/
│       │   │   └── rules/
│       │   ├── products/
│       │   │   ├── personal-loan/  ← partner integration point
│       │   │   ├── home-loan/
│       │   │   └── business-loan/
│       │   ├── ai/
│       │   │   ├── rag/
│       │   │   ├── embeddings/
│       │   │   └── chatbot/        # WebSocket gateway
│       │   ├── users/
│       │   └── common/
│       └── package.json
│
├── packages/
│   ├── bre-engine/                 # Core BRE logic in pure TypeScript
│   │   ├── src/
│   │   │   ├── calculators.ts      # EMI, totalInt, intSaved, sipFV, lumpFV
│   │   │   ├── topup.ts            # topupEligibility logic
│   │   │   ├── lap.ts              # lapEligibility logic
│   │   │   ├── fees.ts             # getDefaultFees (lender-based)
│   │   │   └── strategies.ts       # buildStrategies — ALL logic from HTML
│   │   └── package.json
│   │
│   ├── ui/                         # Shared component library
│   └── shared-types/               # DTOs, enums, interfaces
│
├── docs/
│   ├── IMPLEMENTATION_PLAN.md      ← this file
│   ├── WHATS_DONE.md
│   └── ARCHITECTURE.md
│
├── docker/
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
│
├── turbo.json
└── package.json
```

---

## User Flow (All Screens)

```
1. LANDING / AUTH
   └── PAN input → OTP → Verify → [First time? quick profile] → Dashboard

2. BUREAU SCREEN
   └── Fetching animation → Loan cards (editable) → Property questions → Confirm

3. FINANCIAL DASHBOARD  ← NEW KEY SCREEN
   ├── CIBIL Score ring + trend
   ├── Net Debt vs Income summary
   ├── EMI:Income health bar
   ├── Loan portfolio (sorted by rate)
   ├── AI Opportunity cards ("Save ₹X by doing Y")
   └── Quick action buttons → Product journeys

4. PRODUCT SELECTOR
   ├── Personal Loan         (partner module)
   ├── Home Loan             (placeholder → future)
   ├── Balance Transfer      (BRE-driven)
   ├── Top-up                (BRE-driven)
   └── Loan Against Property (BRE-driven)

5. PERSONAL LOAN JOURNEY   ← partner builds, we integrate
   └── [Integration point — see PARTNER_INTEGRATION.md]

6. STRATEGY OPTIMIZER      ← From HTML file, now React
   ├── Strategy cards (conflict groups, mutual exclusion)
   ├── Live tally (EMI freed, interest saved)
   └── Select → See Results

7. RESULTS + WEALTH PLAN
   ├── Big savings numbers
   ├── Wealth projection chart (15yr)
   ├── Investment options
   ├── Loan closure priority
   └── Action checklist

8. AI CHATBOT (floating widget on all screens)
   ├── Financial Q&A (RAG over knowledge base)
   ├── Product recommendations
   ├── "Explain my strategy" 
   └── "Compare my options"
```

---

## Lender Configuration (Pre-loaded)

```typescript
LENDERS = [
  { id: 'poonawalla', name: 'Poonawalla Fincorp', plRate: [10.99, 24], pfPct: 0.02 },
  { id: 'fullerton',  name: 'Fullerton India',   plRate: [11.99, 36], pfPct: 0.02 },
  { id: 'hero',       name: 'Hero Fincorp',       plRate: [14.00, 28], pfPct: 0.025 },
  { id: 'bajaj',      name: 'Bajaj Finserv',      plRate: [10.99, 35], pfPct: 0.02 },
  { id: 'tata',       name: 'Tata Capital',        plRate: [10.99, 35], pfPct: 0.015 },
  { id: 'abfl',       name: 'Aditya Birla Finance',plRate: [10.50, 30], pfPct: 0.02 },
  { id: 'axis',       name: 'Axis Bank',           plRate: [10.49, 22], pfPct: 0.015 },
  { id: 'hdfc',       name: 'HDFC Bank',           plRate: [10.50, 24], pfPct: 0.01 },
  { id: 'kotak',      name: 'Kotak Mahindra',      plRate: [10.99, 24], pfPct: 0.015 },
  { id: 'idfc',       name: 'IDFC First Bank',     plRate: [10.49, 36], pfPct: 0.02 },
  { id: 'chola',      name: 'Cholamandalam',       plRate: [14.00, 30], pfPct: 0.025 },
  { id: 'indusind',   name: 'IndusInd Bank',       plRate: [10.49, 26], pfPct: 0.02 },
  { id: 'piramal',    name: 'Piramal Finance',     plRate: [12.99, 28], pfPct: 0.02 },
]
```

---

## AI Strategy (RAG System)

### Knowledge Base (Financial Training Data)
- RBI guidelines on lending, KYC, FEMA
- Finfinity product PDFs (rate sheets, eligibility criteria)
- Indian financial regulations (CIBIL scoring, NPA norms)
- Tax benefit rules (80C, 24(b), 80CCD)
- Lender-specific policies (the 13 lenders above)

### LLM Choice
- **Primary**: FinGPT (HuggingFace — finance-specialized open source)
- **Fallback/Premium**: Claude claude-sonnet-4-6 via Anthropic API
- **Embedding**: `sentence-transformers/all-MiniLM-L6-v2` for vector search
- **Vector store**: pgvector (PostgreSQL extension — no extra infra)

### RAG Flow
```
User question → embed query → pgvector similarity search → top-K chunks
    → inject into LLM prompt with user's financial context → response
```

### Chatbot Capabilities
1. Answer financial questions ("What is LTV?")
2. Explain user's specific strategies ("Why is BT better for me?")
3. Compare lender offers
4. Predict outcomes ("If I close this loan, what happens to my score?")
5. Proactive nudges ("Your EMI ratio is 68% — here's how to fix it")

---

## Partner Integration Points

### Personal Loan (Partner Module)
The PL journey is built separately by the partner team. Integration contract:

**Entry point**: `/products/personal-loan`
**Input expected** (passed via URL params or global store):
```typescript
{
  userId: string,
  pan: string,
  bureau: BureauData,         // from our bureau service
  profile: UserProfile,       // income, employment, etc.
  breRecommendation: Strategy // from our BRE engine
}
```
**Output expected**:
```typescript
{
  applicationId: string,
  lender: string,
  amount: number,
  rate: number,
  tenure: number,
  status: 'applied' | 'approved' | 'rejected'
}
```

---

## API Contracts

### Auth
```
POST /auth/send-otp    { pan, mobile }
POST /auth/verify-otp  { mobile, otp } → { accessToken, refreshToken }
GET  /auth/me          → UserProfile
```

### Bureau
```
POST /bureau/fetch     { pan } → BureauData (mock now, real API later)
GET  /bureau/:userId   → CachedBureauData
```

### BRE
```
POST /bre/strategies   { bureau, profile } → Strategy[]
POST /bre/simulate     { strategy, params } → SimulationResult
```

### AI / Chatbot
```
WS   /chat             WebSocket connection
GET  /ai/insights      { userId } → ProactiveInsight[]
POST /ai/explain       { strategyId, userId } → Explanation
```

### Products (placeholder)
```
POST /products/personal-loan/eligibility  → EligibilityResult
POST /products/personal-loan/apply        → ApplicationResult
```

---

## Phased Delivery

### Phase 0 — Foundation ✅ (current)
- [x] Monorepo scaffold (Turborepo)
- [x] Documentation (this file + WHATS_DONE.md)
- [x] Docker compose
- [ ] GitHub Actions CI

### Phase 1 — Frontend Core 🔄
- [ ] Next.js app scaffold with design system
- [ ] Auth flow (PAN + OTP)
- [ ] Bureau screen (editable, with CIBIL score display)
- [ ] Financial Dashboard (the key new screen)
- [ ] Product selector

### Phase 2 — BRE Engine 📋
- [ ] Port all HTML logic to `packages/bre-engine` (TypeScript)
- [ ] NestJS BRE service with full API
- [ ] Strategy cards in React (conflict groups, mutual exclusion)
- [ ] Results + Wealth Plan screen

### Phase 3 — AI Layer 📋
- [ ] RAG knowledge base setup (pgvector)
- [ ] FinGPT integration
- [ ] Chatbot WebSocket gateway
- [ ] Contextual financial insights on dashboard
- [ ] "Explain my recommendation" feature

### Phase 4 — Product Journeys 📋
- [ ] PL journey integration (partner module)
- [ ] HL journey (placeholder → full later)
- [ ] BL journey (placeholder)

### Phase 5 — Embeddability 📋
- [ ] Web component wrapper (iframe embed)
- [ ] React Native WebView config
- [ ] SDK package for third-party integration
- [ ] Auth handshake for Finfinity's existing app

---

## No-CIBIL User Flow

When a user has no CIBIL score / no existing loans:
1. Show "Fresh Credit Profile" screen (not an error)
2. Ask: employment type, monthly income, years employed, existing EMIs (manual entry)
3. Show products they're eligible for basis income + employment
4. Show historical: "People similar to you got approved for ₹X at Y% from Z lenders"
5. Recommend starting with: credit card → small PL → build score path
6. AI recommendation: 6-month plan to build credit profile

---

## Modularity Principles

Every feature is a self-contained module:
```
Each module has:
  ├── A clean TypeScript interface (input/output contract)
  ├── Zero direct dependencies on other modules (event-driven)
  ├── Its own API route group
  ├── Its own frontend route segment
  └── Mock data for development / demo mode
```

This means: any module can be swapped, updated, or extracted into a microservice independently.

---

*This document is maintained by the engineering team. Update after every significant milestone.*
