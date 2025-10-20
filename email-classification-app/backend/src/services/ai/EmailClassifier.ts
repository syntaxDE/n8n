import { Mistral } from '@mistralai/mistralai';
import { EmailCategory } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface EmailData {
  from: string;
  fromName?: string;
  subject: string;
  body: string;
  bodyPreview?: string;
}

export interface ClassificationResult {
  category: EmailCategory;
  confidence: number;
  reasoning?: string;
}

export class EmailClassifier {
  private mistral: Mistral;
  private readonly CLASSIFICATION_PROMPT = `# ROLLE
Du bist ein spezialisiertes KI-System zur E-Mail-Klassifikation für Steuerkanzleien.

Deine Aufgabe: Ordne jede eingehende E-Mail eindeutig genau einem von drei fest definierten Ordnern zu — basierend auf Inhalt, Kontext und dem funktionalen Zweck der Nachricht.

# ⛔ Wichtig
Analysiere die Nachricht ganzheitlich: Fristen, Sprache, Absender, Betreff, Tonfall.

Die Entscheidungslogik-Reihenfolge ist zwingend einzuhalten.

Beachte:
- Bezug zu Zeiträumen, Monate oder Jahre (z.B. „August 2025") ist KEINE Frist, solange keine explizite Handlungsaufforderung oder Deadline genannt wird.
- Rückfragen/Nachfragen/Bitten um Info (z.B. „Könnten Sie …?") sind KEINE Fristen.
- Fristen sind NUR explizite Handlungsaufforderungen mit Termin/Zeitdruck wie „Bis spätestens…", „Frist endet…", „Deadline: …", „Noch heute…".

# 📂 Ordner-Kategorien (bitte exakt so verwenden)

**Hohe Priorität**
Enthält ausdrücklich:
- Fristen/Deadlines („bis spätestens…", „noch heute…", „Deadline", explizite Aufforderung mit Zeitdruck)
- Beschwerden/Eskalationen, technische Probleme
- Zahlungs-/Buchhaltungsthemen mit Frist/Eskalation

**Rechnungen & Finanzen**
- Rechnungen, Zahlungen, Mahnungen, Buchhaltungsthemen OHNE Frist und OHNE Eskalation.

**Mandantenanfragen**
- Normale Anliegen, allgemeine Nachfragen/Bitten/Kommentare DURCH Mandanten
- Auch bei Bezug auf Zeiträume, Monate oder Jahre, solange keine Frist/Eskalation/Handlungsdruck im Text erkennbar ist.

# 🧠 Entscheidungslogik (strikt in dieser Reihenfolge)

**Schritt 1: Frist-Check**
Gibt es eine explizite Frist/Deadline (siehe oben)?
- JA → Hohe Priorität
- NEIN → Schritt 2

**Schritt 2: Absender-/Kontext-Check**
- Mandant mit Frust/Problem/Eskalation → Hohe Priorität
- Mandant OHNE Frist, nur Rechnung/Zahlung → Rechnungen & Finanzen
- Andernfalls → Schritt 3

**Schritt 3: Inhalts-Check**
- Technisches Problem/Streit/Eskalation → Hohe Priorität
- Sonst (inkl. Rückfragen/Kommentare/Infobitten) → Mandantenanfragen

# AUSGABE-FORMAT

Antworte NUR mit einem gültigen JSON-Objekt in folgendem Format:

{
  "category": "Hohe Priorität" | "Rechnungen & Finanzen" | "Mandantenanfragen",
  "confidence": 0.0-1.0,
  "reasoning": "Kurze Begründung der Entscheidung"
}`;

  constructor(apiKey: string) {
    this.mistral = new Mistral({ apiKey });
  }

  async classify(email: EmailData): Promise<ClassificationResult> {
    try {
      const emailContent = this.formatEmailForClassification(email);

      const response = await this.mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: this.CLASSIFICATION_PROMPT },
          { role: 'user', content: emailContent }
        ],
        temperature: 0.2,
        responseFormat: { type: 'json_object' }
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No response from Mistral API');
      }

      const result = JSON.parse(content);

      // Map category string to enum
      const category = this.mapCategoryToEnum(result.category);

      logger.info('Email classified', {
        from: email.from,
        subject: email.subject,
        category,
        confidence: result.confidence
      });

      return {
        category,
        confidence: result.confidence || 0.8,
        reasoning: result.reasoning
      };

    } catch (error) {
      logger.error('Email classification failed', { error, email: email.subject });

      // Fallback: Mandantenanfragen als default
      return {
        category: EmailCategory.MANDANTENANFRAGEN,
        confidence: 0.5,
        reasoning: 'Classification failed, using default category'
      };
    }
  }

  private formatEmailForClassification(email: EmailData): string {
    return `# 📧 ZU KLASSIFIZIERENDE E-MAIL

Von: ${email.from}${email.fromName ? ` (${email.fromName})` : ''}
Betreff: ${email.subject}
Inhalt: ${email.body || email.bodyPreview || ''}

---

Klassifiziere diese E-Mail jetzt nach den obigen Regeln.`;
  }

  private mapCategoryToEnum(category: string): EmailCategory {
    const normalized = category.toLowerCase().trim();

    if (normalized.includes('hohe priorität') || normalized.includes('high priority')) {
      return EmailCategory.HOHE_PRIORITAET;
    }

    if (normalized.includes('rechnungen') || normalized.includes('finanzen') || normalized.includes('invoice')) {
      return EmailCategory.RECHNUNGEN_FINANZEN;
    }

    // Default
    return EmailCategory.MANDANTENANFRAGEN;
  }
}
