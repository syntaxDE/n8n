# Email Classification Web-App

Eine KI-gestützte Web-Anwendung zur automatischen Klassifikation und Bearbeitung von E-Mails für Steuerkanzleien.

## 🎯 Funktionen

- **Automatische E-Mail-Klassifikation** in 3 Kategorien:
  - Hohe Priorität (mit Fristen/Deadlines)
  - Rechnungen & Finanzen
  - Mandantenanfragen

- **KI-generierte Antwort-Entwürfe**
  - Professionelle Antworten basierend auf E-Mail-Inhalt
  - Kontext-bewusstes Antworten durch Memory
  - Perplexity-Integration für aktuelle Steuergesetze

- **Automatische Fristen-Erkennung**
  - Extraktion von Deadlines aus E-Mails
  - Automatische Kalendereintrag-Erstellung

- **Dashboard & Statistiken**
  - Echtzeit-Übersicht über verarbeitete E-Mails
  - Kategorisierungs-Statistiken
  - Deadline-Tracking

## 🏗️ Architektur

### Tech-Stack

**Frontend:**
- **Framework:** React 18 mit TypeScript
- **UI Library:** Shadcn/ui + Tailwind CSS
- **State Management:** Zustand
- **Charts:** Recharts
- **HTTP Client:** Axios
- **Auth:** Microsoft Identity Platform

**Backend:**
- **Runtime:** Node.js 20+ mit TypeScript
- **Framework:** Express.js
- **ORM:** Prisma (mit Supabase PostgreSQL)
- **Job Queue:** BullMQ + Redis
- **LLM Integration:** Mistral AI SDK
- **Email:** Microsoft Graph API

**Infrastruktur:**
- **Database:** Supabase (PostgreSQL)
- **Cache/Queue:** Redis
- **Deployment:** Docker + Docker Compose
- **CI/CD:** GitHub Actions

## 📁 Projektstruktur

```
email-classification-app/
├── frontend/                # React Frontend
│   ├── src/
│   │   ├── components/     # UI Komponenten
│   │   │   ├── dashboard/  # Dashboard-Widgets
│   │   │   ├── emails/     # E-Mail-Listen & Details
│   │   │   └── ui/         # Shadcn UI Komponenten
│   │   ├── pages/          # Seiten/Routes
│   │   ├── hooks/          # Custom React Hooks
│   │   ├── services/       # API Services
│   │   ├── stores/         # Zustand Stores
│   │   ├── types/          # TypeScript Typen
│   │   └── utils/          # Hilfsfunktionen
│   ├── public/
│   └── package.json
│
├── backend/                 # Node.js Backend
│   ├── src/
│   │   ├── controllers/    # Route Controller
│   │   ├── services/       # Business Logic
│   │   │   ├── email/      # E-Mail-Verarbeitung
│   │   │   ├── ai/         # KI-Integration
│   │   │   └── outlook/    # Outlook-Integration
│   │   ├── jobs/           # Background Jobs
│   │   ├── middleware/     # Express Middleware
│   │   ├── routes/         # API Routes
│   │   ├── types/          # TypeScript Typen
│   │   └── utils/          # Hilfsfunktionen
│   ├── prisma/
│   │   └── schema.prisma   # Datenbank Schema
│   └── package.json
│
├── shared/                  # Gemeinsamer Code
│   └── types/              # Shared TypeScript Types
│
├── docker-compose.yml       # Docker Setup
└── README.md
```

## 🔐 Authentifizierung

- Microsoft Entra ID (Azure AD) OAuth 2.0
- JWT-basierte Session-Verwaltung
- Rollenbasierte Zugriffsrechte (Admin, User)

## 🗄️ Datenbank-Schema

### Tabellen

**users**
- id, email, name, role, microsoft_id, created_at, updated_at

**emails**
- id, email_id, from, subject, body, category, status, received_at, processed_at

**drafts**
- id, email_id, subject, body, recipient, created_at

**events**
- id, email_id, event_id, title, description, start_date, end_date, created_at

**statistics**
- id, date, total_emails, hohe_prioritaet, mandantenanfragen, rechnungen_finanzen, drafts_created, events_created

## 🔄 E-Mail-Verarbeitungs-Flow

1. **Polling Job** (alle 1-5 Min)
   - Abrufen ungelesener E-Mails via Microsoft Graph API
   - E-Mails in Queue einreihen

2. **Klassifikation**
   - LLM-basierte Kategorisierung (Mistral AI)
   - E-Mail in entsprechenden Outlook-Ordner verschieben

3. **Verarbeitung nach Kategorie**
   - **Hohe Priorität:** Antwort-Entwurf + Frist-Extraktion + Event
   - **Mandantenanfragen:** Antwort-Entwurf (inkl. Perplexity bei Bedarf)
   - **Rechnungen & Finanzen:** Nur verschieben

4. **Persistierung**
   - Speicherung in Datenbank
   - Update der Statistiken

## 🚀 Quick Start

```bash
# Clone Repository
git clone <repo-url>
cd email-classification-app

# Setup mit Docker Compose
docker-compose up -d

# Frontend: http://localhost:3000
# Backend API: http://localhost:4000
```

## ⚙️ Konfiguration

Siehe `.env.example` Dateien in `frontend/` und `backend/` Verzeichnissen.

### Erforderliche API Keys

- Microsoft Azure App Registration (Client ID, Secret, Tenant ID)
- Mistral AI API Key
- Perplexity API Key
- Supabase URL + Anon Key

## 📊 API Endpoints

### Auth
- `POST /api/auth/login` - Microsoft Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current User

### Emails
- `GET /api/emails` - Liste aller E-Mails (gefiltert, paginiert)
- `GET /api/emails/:id` - E-Mail Details
- `POST /api/emails/process` - Manuelles Processing

### Drafts
- `GET /api/drafts` - Liste aller Entwürfe
- `GET /api/drafts/:id` - Entwurf Details
- `PUT /api/drafts/:id` - Entwurf bearbeiten
- `POST /api/drafts/:id/send` - Entwurf senden

### Statistics
- `GET /api/stats/dashboard` - Dashboard-Statistiken
- `GET /api/stats/timeline` - Zeitverlauf

### Settings
- `GET /api/settings` - Einstellungen abrufen
- `PUT /api/settings` - Einstellungen aktualisieren

## 🧪 Development

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## 🐳 Docker Deployment

```bash
docker-compose up --build
```

## 📝 Lizenz

Private / Proprietary
