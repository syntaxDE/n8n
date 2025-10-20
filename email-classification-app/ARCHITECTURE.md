# System-Architektur: Email Classification App

## Überblick

Die Email Classification App ist eine moderne, skalierbare Web-Anwendung zur automatischen Klassifikation und Bearbeitung von E-Mails mit KI-Unterstützung.

## Architektur-Diagramm

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │           React Frontend (Vite + TypeScript)           │    │
│  │                                                          │    │
│  │  • React Router (Routing)                              │    │
│  │  • React Query (Data Fetching)                         │    │
│  │  • Zustand (State Management)                          │    │
│  │  • Shadcn/ui + Tailwind CSS (UI)                      │    │
│  │  • MSAL (Microsoft Auth)                               │    │
│  │  • Recharts (Visualisierung)                           │    │
│  └────────────────┬───────────────────────────────────────┘    │
│                   │ HTTP/REST API                               │
└───────────────────┼─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Node.js Backend (Express)                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    API Layer                              │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │  │
│  │  │  Auth    │ │  Email   │ │  Drafts  │ │  Stats   │   │  │
│  │  │  Routes  │ │  Routes  │ │  Routes  │ │  Routes  │   │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   │  │
│  └───────┼────────────┼────────────┼────────────┼──────────┘  │
│          │            │            │            │              │
│  ┌───────┴────────────┴────────────┴────────────┴──────────┐  │
│  │                 Service Layer                            │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │  │
│  │  │   Outlook   │  │  Email       │  │  Statistics    │ │  │
│  │  │   Service   │  │  Processing  │  │  Service       │ │  │
│  │  └──────┬──────┘  └──────┬───────┘  └────────────────┘ │  │
│  │         │                │                               │  │
│  │  ┌──────┴────────────────┴─────┐                        │  │
│  │  │      AI Services Layer       │                        │  │
│  │  │                               │                        │  │
│  │  │  • EmailClassifier           │                        │  │
│  │  │  • ResponseGenerator         │                        │  │
│  │  │  • PerplexityService         │                        │  │
│  │  └───────────────────────────────┘                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Background Jobs (BullMQ)                     │  │
│  │                                                            │  │
│  │  ┌────────────┐  ┌──────────────┐  ┌────────────────┐   │  │
│  │  │   Email    │  │    Email     │  │     Stats      │   │  │
│  │  │  Polling   │  │ Classification│  │    Update      │   │  │
│  │  │    Job     │  │      Job     │  │      Job       │   │  │
│  │  └────────────┘  └──────────────┘  └────────────────┘   │  │
│  └───────────────────────┬──────────────────────────────────┘  │
└──────────────────────────┼─────────────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
            ▼                             ▼
┌────────────────────────┐    ┌────────────────────────┐
│   Redis (Job Queue)    │    │  Prisma ORM            │
│                        │    │                        │
│  • Job Queues          │    │  Database Abstraction  │
│  • Caching             │    └──────────┬─────────────┘
│  • Session Store       │               │
└────────────────────────┘               ▼
                              ┌────────────────────────┐
                              │  Supabase PostgreSQL   │
                              │                        │
                              │  • users               │
                              │  • emails              │
                              │  • drafts              │
                              │  • events              │
                              │  • statistics          │
                              │  • settings            │
                              └────────────────────────┘

External APIs:
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  Microsoft Graph    │  │    Mistral AI       │  │    Perplexity       │
│      API            │  │      API            │  │      API            │
│                     │  │                     │  │                     │
│  • Outlook Mail     │  │  • Classification   │  │  • Tax Law Search   │
│  • Calendar         │  │  • Response Gen.    │  │  • Legal Research   │
│  • User Profile     │  │                     │  │                     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

---

## Datenfluss: E-Mail-Verarbeitung

```
┌─────────────────────────────────────────────────────────────────┐
│                      1. Email Polling                            │
│                                                                  │
│  Outlook Inbox → Microsoft Graph API → Backend Polling Job      │
│                                              ↓                   │
│                                    Store in Redis Queue          │
└──────────────────────────────────────────────────────────────────┘
                                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                  2. Email Classification                          │
│                                                                   │
│  Redis Queue → Classification Job → EmailClassifier (Mistral AI) │
│                                              ↓                    │
│                              Category Decision:                   │
│                 ┌────────────────┬────────────────┬──────────┐   │
│                 ▼                ▼                ▼          │   │
│          Hohe Priorität   Rechnungen &    Mandantenanfragen  │   │
│                 │            Finanzen            │           │   │
│                 ↓                │               ↓           │   │
│           Generate Response      │         Generate Response │   │
│           + Deadline Check       │         (Simple)          │   │
│                 │                │               │           │   │
└─────────────────┼────────────────┴───────────────┼───────────────┘
                  ↓                                ↓
┌──────────────────────────────────────────────────────────────────┐
│                    3. Response Generation                         │
│                                                                   │
│  ResponseGenerator (Mistral AI) → Generate Professional Reply    │
│                          ↓                                        │
│                   Create Draft in:                                │
│                   • Outlook (via Graph API)                       │
│                   • Database (for review)                         │
│                                                                   │
│  IF Deadline detected:                                            │
│       → Create Calendar Event in Outlook                          │
│       → Store Event in Database                                   │
└───────────────────────────────────────────────────────────────────┘
                          ↓
┌───────────────────────────────────────────────────────────────────┐
│                    4. Move Email to Folder                         │
│                                                                    │
│  Outlook API → Move to appropriate folder:                        │
│    • "Hohe Priorität"                                             │
│    • "Rechnungen & Finanzen"                                      │
│    • "Mandantenanfragen"                                          │
└────────────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────────┐
│                    5. Update Statistics                             │
│                                                                     │
│  Statistics Service → Aggregate & Update:                          │
│    • Total emails processed                                        │
│    • Category distribution                                         │
│    • Drafts created                                                │
│    • Events created                                                │
│                          ↓                                         │
│                  Store in Database                                 │
│                          ↓                                         │
│               Frontend Dashboard Updates (React Query)             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Komponenten-Details

### Frontend (React)

**Technologien:**
- **React 18** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool & Dev Server
- **React Router** - Client-Side Routing
- **TanStack Query** - Server State Management
- **Zustand** - Client State Management
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI Components
- **Recharts** - Data Visualization
- **MSAL** - Microsoft Authentication

**Seiten:**
1. `/` - Dashboard (Statistiken)
2. `/emails` - E-Mail-Liste
3. `/drafts` - Entwürfe zur Review
4. `/events` - Erkannte Fristen/Termine
5. `/settings` - Einstellungen

---

### Backend (Node.js/Express)

**Technologien:**
- **Node.js 20+** - Runtime
- **Express.js** - Web Framework
- **TypeScript** - Type Safety
- **Prisma** - ORM
- **BullMQ** - Job Queue
- **Winston** - Logging
- **Zod** - Validation

**API Struktur:**
```
/api
  /auth
    POST   /login
    POST   /logout
    GET    /me
    POST   /refresh
  /emails
    GET    /
    GET    /:id
    POST   /:id/process
  /drafts
    GET    /
    GET    /:id
    PUT    /:id
    POST   /:id/send
    POST   /:id/approve
    POST   /:id/reject
  /events
    GET    /
    GET    /:id
  /stats
    GET    /dashboard
    GET    /timeline
  /settings
    GET    /
    PUT    /
```

---

### AI Services

#### 1. EmailClassifier
**Aufgabe:** Kategorisiert E-Mails in 3 Kategorien

**Input:**
```typescript
{
  from: string;
  subject: string;
  body: string;
}
```

**Output:**
```typescript
{
  category: "Hohe Priorität" | "Rechnungen & Finanzen" | "Mandantenanfragen";
  confidence: number; // 0-1
  reasoning: string;
}
```

**Model:** Mistral Large

---

#### 2. ResponseGenerator
**Aufgabe:** Generiert professionelle Antworten

**Input:**
```typescript
{
  email: EmailData;
  category: EmailCategory;
  conversationHistory?: Message[];
}
```

**Output:**
```typescript
{
  subject: string;
  recipient: string;
  bodyContent: string;
  deadline?: string; // ISO 8601
  eventDescription?: string;
}
```

**Model:** Pixtral Large (für Hohe Priorität), Mistral Large (für Mandantenanfragen)

---

#### 3. PerplexityService
**Aufgabe:** Recherchiert aktuelle Steuergesetze

**Input:**
```typescript
{
  query: string;
}
```

**Output:**
```typescript
{
  answer: string;
  sources?: string[];
}
```

**Model:** Sonar

---

### Background Jobs (BullMQ)

#### 1. Email Polling Job
- **Intervall:** Alle 5 Minuten (konfigurierbar)
- **Aufgabe:** Ungelesene E-Mails aus Outlook abrufen
- **Queue:** `email-polling`

#### 2. Email Classification Job
- **Trigger:** Neue E-Mail in Queue
- **Aufgabe:** E-Mail klassifizieren und verarbeiten
- **Queue:** `email-classification`

#### 3. Statistics Update Job
- **Intervall:** Alle 15 Minuten
- **Aufgabe:** Statistiken aggregieren
- **Queue:** `stats-update`

---

### Datenbank (PostgreSQL via Supabase)

**Schema-Übersicht:**

```sql
users
  - id (PK)
  - email
  - name
  - role (ADMIN | USER)
  - microsoft_id
  - access_token (encrypted)
  - refresh_token (encrypted)
  - token_expiry

emails
  - id (PK)
  - email_id (Outlook ID)
  - from
  - subject
  - body
  - category (enum)
  - status (enum)
  - received_at
  - processed_at
  - user_id (FK → users)

drafts
  - id (PK)
  - draft_id (Outlook Draft ID)
  - recipient
  - subject
  - body
  - body_html
  - status (PENDING | APPROVED | SENT | REJECTED)
  - email_id (FK → emails)
  - user_id (FK → users)
  - created_at
  - sent_at

events
  - id (PK)
  - event_id (Outlook Event ID)
  - title
  - description
  - start_date_time
  - end_date_time
  - email_id (FK → emails)

statistics
  - id (PK)
  - date
  - total_emails
  - hohe_prioritaet
  - mandantenanfragen
  - rechnungen_finanzen
  - drafts_created
  - events_created

settings
  - id (PK)
  - user_id (FK → users)
  - polling_interval
  - ai_model
  - folder_high_priority
  - folder_invoices
  - folder_client_requests
```

---

## Sicherheit

### Authentifizierung
- **Microsoft Entra ID (Azure AD)** OAuth 2.0
- **JWT Tokens** für API Authentication
- **Access + Refresh Token** Pattern

### Autorisierung
- **Role-Based Access Control (RBAC)**
  - `ADMIN` - Vollzugriff, Settings
  - `USER` - Nur eigene E-Mails

### Datenschutz
- **Token Encryption** in Datenbank
- **HTTPS Only** in Production
- **CORS** Restriktion
- **Rate Limiting** auf API

### Secrets Management
- Environment Variables (`.env`)
- NIEMALS in Git commiten
- Production: Azure Key Vault oder ähnlich

---

## Skalierung

### Horizontal Scaling
- **Frontend:** CDN (Vercel/Netlify)
- **Backend:** Mehrere Instanzen hinter Load Balancer
- **Redis:** Redis Cluster für High Availability
- **Database:** Supabase managed (Auto-Scaling)

### Performance Optimierungen
- **Caching:** Redis für häufige Queries
- **Database Indexes:** Auf oft gefilterter Spalten
- **Job Queue:** BullMQ für asynchrone Verarbeitung
- **Connection Pooling:** Prisma Connection Pool

---

## Monitoring & Logging

### Logging
- **Winston** für strukturierte Logs
- **Log Levels:** debug, info, warn, error
- **Log Rotation:** Tägliche Rotation, 30 Tage Retention

### Monitoring
- **Application Metrics:** Job Queue Status, API Latency
- **Error Tracking:** Sentry (empfohlen)
- **Uptime Monitoring:** UptimeRobot
- **Database Monitoring:** Supabase Dashboard

### Alerts
- Job Queue Failures
- API 5xx Errors
- Database Connection Issues
- High Memory/CPU Usage

---

## Deployment-Strategien

### Development
```bash
docker-compose up
```

### Production (VPS)
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Production (Cloud)
- **Frontend:** Vercel/Netlify
- **Backend:** AWS ECS / Azure Container Apps
- **Database:** Supabase (managed)
- **Redis:** AWS ElastiCache / Azure Redis

---

## Weitere Informationen

- **Setup:** Siehe [QUICK_START.md](./QUICK_START.md)
- **Implementierung:** Siehe [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
- **API Docs:** Swagger UI auf `/api/docs` (nach Implementierung)
