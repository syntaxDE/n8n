# Implementierungsplan: Email Classification Web-App

## Übersicht

Dieser Plan beschreibt die schrittweise Implementierung einer vollständigen Web-App zur automatischen E-Mail-Klassifikation mit KI-gestützten Antwort-Entwürfen für Steuerkanzleien.

**Geschätzte Gesamtdauer:** 4-6 Wochen (bei einem Entwickler)

---

## Phase 1: Setup & Infrastruktur (3-5 Tage)

### 1.1 Projekt-Setup

- [x] Repository erstellen
- [x] Projektstruktur anlegen
- [ ] Git Hooks einrichten (Husky + Lint-Staged)
- [ ] CI/CD Pipeline (GitHub Actions)

### 1.2 Backend Setup

```bash
cd backend
npm install
```

**Aufgaben:**
- [ ] TypeScript Konfiguration (`tsconfig.json`)
- [ ] ESLint & Prettier Setup
- [ ] Logger Setup (Winston)
- [ ] Error Handler Middleware
- [ ] Environment Variables Validation (Zod)
- [ ] Prisma Client generieren
- [ ] Datenbank Migrations erstellen

**Dateien zu erstellen:**
- `backend/src/index.ts` - Main entry point
- `backend/src/config/index.ts` - Konfiguration
- `backend/src/middleware/errorHandler.ts`
- `backend/src/middleware/authMiddleware.ts`
- `backend/src/utils/logger.ts`
- `backend/tsconfig.json`

### 1.3 Frontend Setup

```bash
cd frontend
npm install
```

**Aufgaben:**
- [ ] Vite Konfiguration
- [ ] Tailwind CSS Setup
- [ ] Shadcn/ui Installation
- [ ] React Router Setup
- [ ] React Query Setup
- [ ] Zustand Store Setup
- [ ] MSAL (Microsoft Auth) Konfiguration

**Dateien zu erstellen:**
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/routes/index.tsx`
- `frontend/tailwind.config.js`
- `frontend/vite.config.ts`
- `frontend/tsconfig.json`

### 1.4 Docker & Supabase

- [ ] Supabase Projekt erstellen
- [ ] Datenbank Schema in Supabase deployen
- [ ] Redis lokal mit Docker starten
- [ ] Docker Compose testen

```bash
docker-compose up -d redis
```

---

## Phase 2: Authentifizierung (2-3 Tage)

### 2.1 Azure AD Setup

**Aufgaben:**
- [ ] Azure App Registration erstellen
- [ ] Redirect URIs konfigurieren
- [ ] API Permissions setzen (Microsoft Graph):
  - `Mail.Read`
  - `Mail.ReadWrite`
  - `Mail.Send`
  - `Calendars.ReadWrite`
  - `User.Read`
- [ ] Client Secret generieren

### 2.2 Backend Auth

**Dateien:**
- `backend/src/services/auth/MicrosoftAuthService.ts`
- `backend/src/controllers/authController.ts`
- `backend/src/routes/authRoutes.ts`

**API Endpoints:**
- `GET /api/auth/login` - Initiiert Microsoft Login
- `GET /api/auth/callback` - OAuth Callback
- `POST /api/auth/refresh` - Token Refresh
- `GET /api/auth/me` - Current User Info
- `POST /api/auth/logout` - Logout

### 2.3 Frontend Auth

**Dateien:**
- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/components/auth/LoginButton.tsx`
- `frontend/src/components/auth/ProtectedRoute.tsx`
- `frontend/src/pages/Login.tsx`

**Features:**
- [ ] MSAL Integration
- [ ] Protected Routes
- [ ] Token Management
- [ ] Auto-Refresh Logic

---

## Phase 3: Core Backend Services (5-7 Tage)

### 3.1 Email Processing Service

**Dateien:**
- `backend/src/services/email/EmailProcessingService.ts`
- `backend/src/jobs/emailPollingJob.ts`
- `backend/src/jobs/emailClassificationJob.ts`

**Funktionen:**
1. Email Polling (BullMQ Job)
   - Alle X Minuten ungelesene E-Mails abrufen
   - In Queue einreihen

2. Email Classification
   - `EmailClassifier.classify()` aufrufen
   - E-Mail in Outlook-Ordner verschieben
   - In Datenbank speichern

3. Response Generation (für Hohe Priorität & Mandantenanfragen)
   - `ResponseGenerator.generateResponse()` aufrufen
   - Draft in Outlook erstellen
   - Draft in DB speichern

4. Deadline Extraction
   - Frist aus Response extrahieren
   - Calendar Event erstellen
   - Event in DB speichern

### 3.2 Statistics Service

**Dateien:**
- `backend/src/services/stats/StatisticsService.ts`

**Funktionen:**
- [ ] Statistiken aggregieren
- [ ] Tages-, Wochen-, Monatsstatistiken
- [ ] Real-time Updates

### 3.3 BullMQ Jobs

**Dateien:**
- `backend/src/jobs/index.ts`
- `backend/src/jobs/workers/emailWorker.ts`

**Jobs:**
1. `email-polling` - Alle 5 Min ungelesene E-Mails abrufen
2. `email-classification` - E-Mail klassifizieren
3. `email-response` - Antwort generieren
4. `stats-update` - Statistiken aktualisieren

---

## Phase 4: API Endpoints (3-4 Tage)

### 4.1 Email Endpoints

**Dateien:**
- `backend/src/controllers/emailController.ts`
- `backend/src/routes/emailRoutes.ts`

**Endpoints:**
- `GET /api/emails` - Liste aller E-Mails (gefiltert, paginiert)
- `GET /api/emails/:id` - E-Mail Details
- `POST /api/emails/:id/process` - Manuelles Processing
- `GET /api/emails/stats` - E-Mail Statistiken

### 4.2 Draft Endpoints

**Dateien:**
- `backend/src/controllers/draftController.ts`
- `backend/src/routes/draftRoutes.ts`

**Endpoints:**
- `GET /api/drafts` - Liste aller Entwürfe
- `GET /api/drafts/:id` - Entwurf Details
- `PUT /api/drafts/:id` - Entwurf bearbeiten
- `POST /api/drafts/:id/approve` - Entwurf freigeben
- `POST /api/drafts/:id/reject` - Entwurf ablehnen
- `POST /api/drafts/:id/send` - Entwurf senden

### 4.3 Statistics Endpoints

**Dateien:**
- `backend/src/controllers/statsController.ts`
- `backend/src/routes/statsRoutes.ts`

**Endpoints:**
- `GET /api/stats/dashboard` - Dashboard-Statistiken
- `GET /api/stats/timeline?days=7` - Zeitverlauf

### 4.4 Settings Endpoints

**Dateien:**
- `backend/src/controllers/settingsController.ts`
- `backend/src/routes/settingsRoutes.ts`

**Endpoints:**
- `GET /api/settings` - Einstellungen abrufen
- `PUT /api/settings` - Einstellungen aktualisieren

---

## Phase 5: Frontend Development (7-10 Tage)

### 5.1 Layout & Navigation

**Dateien:**
- `frontend/src/components/layout/AppLayout.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/layout/Header.tsx`

**Features:**
- [ ] Responsive Sidebar
- [ ] Header mit User-Menu
- [ ] Navigation Items
- [ ] Mobile Menu

### 5.2 Dashboard Page

**Datei:** `frontend/src/pages/Dashboard.tsx` (bereits erstellt)

**Features:**
- [x] Statistik-Cards
- [x] Timeline Chart (Recharts)
- [x] Kategorien-Verteilung (Pie Chart)
- [ ] Real-time Updates (React Query Polling)

### 5.3 Emails Page

**Dateien:**
- `frontend/src/pages/Emails.tsx`
- `frontend/src/components/emails/EmailList.tsx`
- `frontend/src/components/emails/EmailDetail.tsx`
- `frontend/src/components/emails/EmailFilters.tsx`

**Features:**
- [ ] E-Mail-Liste (TanStack Table)
- [ ] Filterung nach Kategorie, Status, Datum
- [ ] Suche
- [ ] Detail-Ansicht mit E-Mail-Inhalt
- [ ] Pagination

### 5.4 Drafts Page

**Dateien:**
- `frontend/src/pages/Drafts.tsx`
- `frontend/src/components/drafts/DraftList.tsx`
- `frontend/src/components/drafts/DraftEditor.tsx`
- `frontend/src/components/drafts/DraftPreview.tsx`

**Features:**
- [ ] Entwurf-Liste
- [ ] Entwurf bearbeiten (Rich Text Editor)
- [ ] Vorschau
- [ ] Freigeben/Ablehnen/Senden Actions

### 5.5 Calendar/Events Page

**Dateien:**
- `frontend/src/pages/Events.tsx`
- `frontend/src/components/events/EventList.tsx`

**Features:**
- [ ] Liste aller erkannten Fristen
- [ ] Kalenderansicht
- [ ] Event Details

### 5.6 Settings Page

**Dateien:**
- `frontend/src/pages/Settings.tsx`
- `frontend/src/components/settings/SettingsForm.tsx`

**Features:**
- [ ] Polling-Intervall
- [ ] AI-Model Auswahl
- [ ] Outlook-Ordner Konfiguration
- [ ] Benachrichtigungen

### 5.7 UI Components (Shadcn)

**Zu installieren:**
```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add table
npx shadcn@latest add dialog
npx shadcn@latest add select
npx shadcn@latest add tabs
npx shadcn@latest add toast
npx shadcn@latest add dropdown-menu
npx shadcn@latest add tooltip
```

---

## Phase 6: Testing & Optimization (3-5 Tage)

### 6.1 Backend Testing

**Aufgaben:**
- [ ] Unit Tests für Services
- [ ] Integration Tests für API Endpoints
- [ ] Job Queue Tests

**Tools:**
- Jest
- Supertest

### 6.2 Frontend Testing

**Aufgaben:**
- [ ] Component Tests (Vitest + Testing Library)
- [ ] E2E Tests (Playwright)

### 6.3 Performance Optimization

**Backend:**
- [ ] Database Queries optimieren (Indexes)
- [ ] Caching implementieren (Redis)
- [ ] Rate Limiting
- [ ] Request Validation (Zod)

**Frontend:**
- [ ] Code Splitting
- [ ] Lazy Loading
- [ ] Image Optimization
- [ ] Bundle Size Analyse

---

## Phase 7: Deployment & Monitoring (2-3 Tage)

### 7.1 Production Setup

**Aufgaben:**
- [ ] Production Environment Variables
- [ ] Docker Images bauen
- [ ] Docker Compose Production Config
- [ ] SSL/TLS Setup
- [ ] Reverse Proxy (Nginx)

### 7.2 Deployment

**Optionen:**

**Option 1: VPS (Hetzner, DigitalOcean)**
```bash
# Auf Server
git clone <repo>
cd email-classification-app
docker-compose up -d
```

**Option 2: Cloud (AWS, Azure, GCP)**
- Frontend: Vercel/Netlify
- Backend: AWS ECS/Azure Container Apps
- Database: Supabase (bereits gehostet)
- Redis: AWS ElastiCache/Azure Redis

### 7.3 Monitoring

**Tools:**
- [ ] Application Logs (Winston → CloudWatch/Datadog)
- [ ] Error Tracking (Sentry)
- [ ] Uptime Monitoring (UptimeRobot)
- [ ] Performance Monitoring (New Relic/Datadog)

**Dashboards:**
- [ ] BullMQ Dashboard (Bull Board)
- [ ] Prisma Studio (nur Dev)

---

## Phase 8: Dokumentation & Training (2-3 Tage)

### 8.1 Technische Dokumentation

**Aufgaben:**
- [ ] API Dokumentation (Swagger/OpenAPI)
- [ ] Deployment Guide
- [ ] Troubleshooting Guide
- [ ] Architecture Diagrams

### 8.2 User Documentation

**Aufgaben:**
- [ ] User Manual (PDF/Web)
- [ ] Video Tutorials
- [ ] FAQ

### 8.3 Training

**Aufgaben:**
- [ ] Admin Training (Settings, Monitoring)
- [ ] User Training (Dashboard, Drafts)

---

## Checkliste vor Go-Live

### Sicherheit
- [ ] Alle Secrets in Environment Variables
- [ ] HTTPS aktiviert
- [ ] CORS richtig konfiguriert
- [ ] Rate Limiting aktiv
- [ ] Input Validation überall
- [ ] SQL Injection Prevention (Prisma)
- [ ] XSS Prevention

### Performance
- [ ] Database Indexes gesetzt
- [ ] Caching aktiviert
- [ ] CDN für Frontend (optional)
- [ ] Gzip Compression
- [ ] Image Optimization

### Monitoring
- [ ] Logs werden geschrieben
- [ ] Error Tracking aktiv
- [ ] Uptime Monitoring läuft
- [ ] Alerts konfiguriert

### Backup
- [ ] Database Backup Strategy (Supabase hat automatische Backups)
- [ ] Code Repository Backup

### Legal/Compliance
- [ ] DSGVO Compliance prüfen
- [ ] Datenschutzerklärung
- [ ] Impressum
- [ ] AGB (falls nötig)

---

## Nächste Schritte zum Start

1. **Azure AD App Registration** erstellen
2. **Supabase Projekt** aufsetzen
3. **API Keys** besorgen:
   - Mistral AI
   - Perplexity
4. **Environment Variables** konfigurieren
5. **Backend starten:**
   ```bash
   cd backend
   npm install
   npm run prisma:generate
   npm run prisma:migrate
   npm run dev
   ```
6. **Frontend starten:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## Hilfreiche Commands

### Backend
```bash
# Development
npm run dev

# Build
npm run build

# Prisma
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio

# Tests
npm test
```

### Frontend
```bash
# Development
npm run dev

# Build
npm run build

# Preview Production Build
npm run preview
```

### Docker
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f backend

# Rebuild
docker-compose up -d --build
```

---

## Troubleshooting Guide

### Problem: Jobs werden nicht verarbeitet
**Lösung:** Redis Connection prüfen, BullMQ Worker läuft?

### Problem: Outlook API 401 Error
**Lösung:** Access Token abgelaufen? Refresh Token verwenden

### Problem: Frontend kann Backend nicht erreichen
**Lösung:** CORS Konfiguration prüfen, API URL in `.env` korrekt?

### Problem: Prisma Migrations fehlschlagen
**Lösung:** DATABASE_URL korrekt? Supabase erreichbar?

---

## Support & Maintenance

Nach dem Launch:
- **Wöchentlich:** Logs prüfen, Fehler analysieren
- **Monatlich:** Statistiken auswerten, Performance optimieren
- **Quarterly:** Dependencies updaten, Security Audit

---

**Viel Erfolg bei der Implementierung!** 🚀
