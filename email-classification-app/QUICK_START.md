# Quick Start Guide

Schnelleinstieg in 15 Minuten - von Null zur laufenden App!

## 📋 Voraussetzungen

Installiert haben:
- Node.js 20+
- Docker & Docker Compose
- Git

API Zugänge:
- Microsoft Azure Account (für Azure AD)
- Mistral AI API Key
- Perplexity API Key
- Supabase Account

---

## 🚀 Schritt 1: Azure AD App erstellen (5 Min)

1. Gehe zu [Azure Portal](https://portal.azure.com)
2. **App registrations** → **New registration**
3. Name: `Email Classification App`
4. Supported account types: **Single tenant**
5. Redirect URI: `http://localhost:4000/api/auth/callback`
6. **Register** klicken

### API Permissions setzen:
7. **API permissions** → **Add a permission** → **Microsoft Graph**
8. **Delegated permissions** auswählen:
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `Mail.Send`
   - `Calendars.ReadWrite`
   - `User.Read`
9. **Add permissions** → **Grant admin consent**

### Client Secret erstellen:
10. **Certificates & secrets** → **New client secret**
11. Description: `App Secret`
12. Expires: **24 months**
13. **Add** → Secret-Wert KOPIEREN (nur einmal sichtbar!)

### Werte notieren:
- **Application (client) ID**
- **Directory (tenant) ID**
- **Client Secret** (gerade kopiert)

---

## 🗄️ Schritt 2: Supabase Setup (3 Min)

1. Gehe zu [Supabase](https://supabase.com)
2. **New Project** erstellen
3. Name: `email-classification`
4. Database Password: Sicher generieren & speichern
5. Region: Europe (Frankfurt)
6. Warte bis Projekt erstellt ist (~2 Min)

### Connection String holen:
7. **Project Settings** → **Database**
8. **Connection string** → **URI** kopieren
9. Passwort im String ersetzen: `postgresql://postgres:[YOUR-PASSWORD]@...`

---

## 🔑 Schritt 3: API Keys besorgen (2 Min)

### Mistral AI:
1. [Mistral AI Console](https://console.mistral.ai)
2. **API Keys** → **Create new key**
3. Key kopieren

### Perplexity:
1. [Perplexity Settings](https://www.perplexity.ai/settings/api)
2. **Generate API Key**
3. Key kopieren

---

## ⚙️ Schritt 4: Project Setup (3 Min)

```bash
# Repository klonen
git clone <your-repo-url>
cd email-classification-app

# Backend Environment Setup
cd backend
cp .env.example .env
nano .env  # oder mit VS Code: code .env
```

### Backend `.env` ausfüllen:
```env
NODE_ENV=development
PORT=4000

# Supabase Connection String (Schritt 2)
DATABASE_URL="postgresql://postgres:password@db.supabase.co:5432/postgres"

# Redis (läuft lokal)
REDIS_URL="redis://localhost:6379"

# JWT Secret generieren mit:
# openssl rand -base64 32
JWT_SECRET="generierter-secret-key"

# Azure AD (Schritt 1)
MICROSOFT_CLIENT_ID="deine-client-id"
MICROSOFT_CLIENT_SECRET="dein-client-secret"
MICROSOFT_TENANT_ID="deine-tenant-id"
MICROSOFT_REDIRECT_URI="http://localhost:4000/api/auth/callback"

# AI APIs (Schritt 3)
MISTRAL_API_KEY="dein-mistral-key"
PERPLEXITY_API_KEY="dein-perplexity-key"
```

### Frontend Environment Setup:
```bash
cd ../frontend
cp .env.example .env
nano .env
```

Frontend `.env`:
```env
VITE_API_URL=http://localhost:4000
VITE_MICROSOFT_CLIENT_ID=deine-client-id
```

---

## 🐳 Schritt 5: Services starten (2 Min)

### Redis starten:
```bash
cd ..  # zurück zum root
docker-compose up -d redis
```

### Backend starten:
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Backend läuft auf: **http://localhost:4000**

### Frontend starten (neues Terminal):
```bash
cd frontend
npm install
npm run dev
```

Frontend läuft auf: **http://localhost:3000**

---

## ✅ Schritt 6: Testen!

1. Browser öffnen: **http://localhost:3000**
2. **Login** Button klicken
3. Mit Microsoft Account anmelden
4. Dashboard sollte sichtbar sein!

### Test-Email senden:
- Sende eine Test-Email an deinen verbundenen Outlook Account
- Warte 1-5 Minuten (Polling läuft)
- Prüfe Dashboard für neue Statistiken
- Prüfe "Drafts" für generierte Antworten

---

## 🔧 Troubleshooting

### Backend startet nicht
```bash
# Logs prüfen
cd backend
npm run dev

# Häufige Fehler:
# - DATABASE_URL falsch → Supabase Connection String prüfen
# - Redis nicht erreichbar → docker ps | grep redis
# - Port 4000 belegt → anderen Port in .env setzen
```

### Frontend verbindet nicht
```bash
# Backend erreichbar?
curl http://localhost:4000/health

# CORS Fehler? → CORS_ORIGINS in backend/.env prüfen
```

### Prisma Migrations fehlschlagen
```bash
# Prisma zurücksetzen
npm run prisma:migrate reset

# Neu migrieren
npm run prisma:migrate
```

### "Access denied" bei Outlook API
- Azure AD App Permissions nochmal prüfen
- Admin Consent gegeben?
- Client ID/Secret korrekt in .env?

---

## 📚 Nächste Schritte

1. **Outlook Ordner IDs holen:**
   - API Call: `GET /api/outlook/folders`
   - IDs in Settings eintragen

2. **Email Polling Intervall anpassen:**
   - Backend: `backend/.env` → `EMAIL_POLLING_INTERVAL`
   - Oder über Settings-Page in der App

3. **Deployment vorbereiten:**
   - Siehe [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) Phase 7

---

## 🆘 Hilfe benötigt?

- **Dokumentation:** [README.md](./README.md)
- **Implementierungs-Details:** [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
- **Issues:** GitHub Issues erstellen

---

**Happy Coding!** 🎉
