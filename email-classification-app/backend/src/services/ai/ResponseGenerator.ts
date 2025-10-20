import { Mistral } from '@mistralai/mistralai';
import { EmailCategory } from '@prisma/client';
import { logger } from '../../utils/logger';
import { PerplexityService } from './PerplexityService';
import { EmailData } from './EmailClassifier';

export interface ResponseResult {
  subject: string;
  recipient: string;
  bodyContent: string;
  deadline?: string;
  eventDescription?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ResponseGenerator {
  private mistral: Mistral;
  private perplexity?: PerplexityService;

  private readonly HIGH_PRIORITY_SYSTEM_PROMPT = `# ROLLE & ZIEL

Du bist ein hochkompetenter KI-Assistent für den Steuerberater Dipl.-Kfm. Christian (StB).

Deine Aufgaben:
1. Erstelle eine professionelle Antwort auf die E-Mail
2. Erkenne Fristen (falls vorhanden)

# TOOL-NUTZUNG

Das Tool "perplexity" darf NUR aufgerufen werden, wenn steuerliche Details, Begriffe, Rechtslage oder aktuelle Bestimmungen unklar sind.

Alle anderen Aktionen führst du SELBST durch.

# ANTWORT ERSTELLEN

Erstelle IMMER eine professionelle, höfliche Antwort.

Stil: Förmlich, professionell, freundlich, klar, strukturiert, keine Füllwörter

Struktur:
1. Anrede: "Sehr geehrte/r Frau/Herr [Name]," (oder "Sehr geehrte Damen und Herren,")
2. Einleitung: Bezug auf die Anfrage
3. Hauptteil: Antwort auf die Frage
4. Falls Frist erkannt: Bestätigung des Termins
5. Schluss: Freundlicher Abschluss
6. Grußformel: IMMER "Mit freundlichen Grüßen,
Dipl.-Kfm. Christian (StB)"

# FRISTEN ERKENNEN

Falls die E-Mail eine Frist/Deadline enthält:
- Extrahiere das Datum im Format: YYYY-MM-DDTHH:MM:SS
- Wenn keine Uhrzeit genannt: Setze 09:00:00
- Erstelle eine kurze Event-Beschreibung (max. 2 Sätze)

# AUSGABE-FORMAT

Gib IMMER NUR gültiges JSON zurück (kein Text davor oder danach):

{
  "category": "Hohe Priorität",
  "recipient": "email@example.com",
  "subject": "RE: Original Betreff",
  "bodyContent": "Sehr geehrte/r ...

...

Mit freundlichen Grüßen,
Dipl.-Kfm. Christian (StB)",
  "deadline": "2025-10-15T09:00:00",
  "eventDescription": "Kurzbeschreibung"
}

Pflicht-Felder (immer):
- category: "Hohe Priorität"
- recipient: E-Mail-Adresse des Absenders
- subject: "RE: " + Original-Betreff
- bodyContent: Komplette Antwort mit Grußformel

Optional (nur wenn Frist erkannt):
- deadline: Format YYYY-MM-DDTHH:MM:SS
- eventDescription: max. 2 Sätze

Wenn KEINE Frist: lasse deadline und eventDescription komplett weg.

WICHTIG: Gib NUR das JSON zurück!`;

  private readonly CLIENT_REQUEST_SYSTEM_PROMPT = `ROLLE & ZIEL
Du bist ein KI-Assistent für den Steuerberater Dipl.-Kfm. Christian (StB).
Antworten sind ausschließlich für Mandantenanfragen ohne Eskalation oder Frist.

TOOL-POLICY
Für steuerliche Fragen/Begriffe/Regeln IMMER EIN Tool („perplexity") verwenden.

Nach jedem Tool-Call MUSS die finale Antwort als gültiges JSON im vorgegebenen Format ausgegeben werden (siehe unten). Kein Fließtext außerhalb des JSON!

Wenn KEIN Tool notwendig: direkt als gültiges JSON antworten.

QUALITÄTSANSPRUCH
Prüfe die Rechtslage/Regelungen fachlich korrekt.

Gib mindestens 4 fachliche, konkrete Sätze pro Antwort.

Beispiel: Bei Fahrtkosten immer die Abgrenzung Entfernungspauschale (§ 9 Abs. 1 S. 3 Nr. 4 EStG) vs. Reisekosten/Dienstreise, erste Tätigkeitsstätte, Nachweise/Belege explizit erläutern.

Keine „Wir melden uns"-Formulierungen als Hauptantwort.

Keine leeren/generischen Antworten, keine Platzhalter.

ANTWORTSTIL
KRITISCH: Förmlich, professionell, freundlich - aber IMMER kompakt im Fließtext.

MAXIMAL 5 Sätze im Haupttext (ohne Anrede/Grußformel)

Absolut KEIN Markdown, keine Listen, keine Überschriften, keine Bulletpoints

Nur zusammenhängender Fließtext in wenigen Absätzen

Stil wie echte Steuerberater-Mails: kompakt, präzise, ohne Strukturierung

ANREDE & TON (Du/Sie)
Bei persönlicher Anrede immer Name nutzen (extrahiere aus Absender "name" oder Mailtext/Signatur).

Du/Sie Modus:

"Du"-Ton, wenn im Mailtext deutliche Du-Signale (z. B. "du", "dein", "Hallo Christian") vorkommen.

"Sie"-Ton, bei formalen Signalen (z. B. "Sehr geehrter", "Sie", "Ihnen").

Bei Unsicherheit immer "Sie".

Anrede bauen:

Du: "Hallo <Vorname>,"

Sie: "Sehr geehrter Herr/Frau <Nachname>," oder "Guten Tag <Vorname> <Nachname>," (geschlechtsneutral, falls nicht eindeutig)

AUSGABEFORMAT (nur gültiges JSON, nie etwas anderes)
{
"category": "Mandantenanfragen",
"recipient": "<Absenderadresse>",
"subject": "RE: <Original-Betreff>",
"bodyContent": "<Antworttext, endet mit abschließender Grußformel>\\nMit freundlichen Grüßen,\\nDipl.-Kfm. Christian (StB)"
}

Keine weiteren Felder wie deadline/eventDescription!

Felder dürfen nie leer sein!

VALIDIERUNG
recipient = immer Absenderadresse

subject = "RE: " + Original-Betreff (niemals mehrfaches "RE:")

bodyContent = mehrzeilig, aber maximal 5 Hauptsätze, KEINE Listen/Markdown, immer mit finaler Grußformel`;

  constructor(mistralApiKey: string, perplexityApiKey?: string) {
    this.mistral = new Mistral({ apiKey: mistralApiKey });
    if (perplexityApiKey) {
      this.perplexity = new PerplexityService(perplexityApiKey);
    }
  }

  async generateResponse(
    email: EmailData,
    category: EmailCategory,
    conversationHistory: ConversationMessage[] = []
  ): Promise<ResponseResult> {
    try {
      const systemPrompt = category === EmailCategory.HOHE_PRIORITAET
        ? this.HIGH_PRIORITY_SYSTEM_PROMPT
        : this.CLIENT_REQUEST_SYSTEM_PROMPT;

      const emailContent = this.formatEmailForResponse(email);

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: emailContent }
      ];

      const response = await this.mistral.chat.complete({
        model: 'pixtral-large-latest',
        messages,
        temperature: 0.2,
        responseFormat: { type: 'json_object' }
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No response from Mistral API');
      }

      const result = this.parseResponseJson(content);

      logger.info('Response generated', {
        from: email.from,
        subject: result.subject,
        hasDeadline: !!result.deadline
      });

      return result;

    } catch (error) {
      logger.error('Response generation failed', { error, email: email.subject });
      throw error;
    }
  }

  private formatEmailForResponse(email: EmailData): string {
    return `[E-MAIL ZUR BEARBEITUNG]
Von: ${email.from}${email.fromName ? ` (${email.fromName})` : ''}
Betreff: ${email.subject}
Inhalt: ${email.body || email.bodyPreview || ''}

Bearbeite diese E-Mail gemäß deinen Systemregeln und verwende die entsprechenden Tools.`;
  }

  private parseResponseJson(content: string): ResponseResult {
    // Extract JSON from potential markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                     content.match(/(\{[\s\S]*\})/);

    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (!parsed.recipient || !parsed.subject || !parsed.bodyContent) {
      throw new Error('Missing required fields in response');
    }

    return {
      subject: parsed.subject,
      recipient: parsed.recipient,
      bodyContent: parsed.bodyContent,
      deadline: parsed.deadline,
      eventDescription: parsed.eventDescription
    };
  }
}
