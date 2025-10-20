import { PrismaClient, EmailCategory, EmailStatus, DraftStatus } from '@prisma/client';
import { OutlookService } from '../outlook/OutlookService';
import { EmailClassifier } from '../ai/EmailClassifier';
import { ResponseGenerator } from '../ai/ResponseGenerator';
import { logger } from '../../utils/logger';
import { addHours, parseISO } from 'date-fns';

const prisma = new PrismaClient();

interface ProcessedEmail {
  emailId: string;
  category: EmailCategory;
  draftCreated: boolean;
  eventCreated: boolean;
  deadline?: string;
}

export class EmailProcessingService {
  private classifier: EmailClassifier;
  private responseGenerator: ResponseGenerator;

  constructor() {
    const mistralKey = process.env.MISTRAL_API_KEY!;
    const perplexityKey = process.env.PERPLEXITY_API_KEY;

    this.classifier = new EmailClassifier(mistralKey);
    this.responseGenerator = new ResponseGenerator(mistralKey, perplexityKey);
  }

  /**
   * Hauptfunktion: Verarbeitet eine einzelne E-Mail komplett
   */
  async processEmail(
    outlookEmail: any,
    userId: string,
    accessToken: string
  ): Promise<ProcessedEmail> {
    const startTime = Date.now();

    try {
      logger.info('Processing email started', {
        emailId: outlookEmail.id,
        subject: outlookEmail.subject
      });

      // 1. E-Mail klassifizieren
      const classification = await this.classifier.classify({
        from: outlookEmail.from.emailAddress.address,
        fromName: outlookEmail.from.emailAddress.name,
        subject: outlookEmail.subject,
        body: outlookEmail.body?.content || outlookEmail.bodyPreview
      });

      logger.info('Email classified', {
        emailId: outlookEmail.id,
        category: classification.category,
        confidence: classification.confidence
      });

      // 2. E-Mail in Datenbank speichern
      const email = await prisma.email.create({
        data: {
          emailId: outlookEmail.id,
          from: outlookEmail.from.emailAddress.address,
          fromName: outlookEmail.from.emailAddress.name,
          subject: outlookEmail.subject,
          body: outlookEmail.body?.content || '',
          bodyPreview: outlookEmail.bodyPreview,
          category: classification.category,
          status: EmailStatus.UNREAD,
          hasAttachments: outlookEmail.hasAttachments || false,
          attachmentCount: 0, // TODO: Anhänge zählen
          receivedAt: new Date(outlookEmail.receivedDateTime),
          userId
        }
      });

      // 3. Outlook Service initialisieren
      const outlookService = new OutlookService(accessToken);

      // 4. E-Mail in entsprechenden Ordner verschieben
      const folderId = await this.getFolderIdForCategory(classification.category, userId);
      if (folderId) {
        await outlookService.moveEmail(outlookEmail.id, folderId);
        logger.info('Email moved to folder', { emailId: outlookEmail.id, folderId });
      }

      let draftCreated = false;
      let eventCreated = false;
      let deadline: string | undefined;

      // 5. Antwort generieren (nur für Hohe Priorität & Mandantenanfragen)
      if (
        classification.category === EmailCategory.HOHE_PRIORITAET ||
        classification.category === EmailCategory.MANDANTENANFRAGEN
      ) {
        const response = await this.generateAndCreateDraft(
          email.id,
          outlookEmail,
          classification.category,
          outlookService,
          userId
        );

        draftCreated = response.draftCreated;

        // 6. Frist-Check und Kalendereintrag (nur bei Hoher Priorität)
        if (classification.category === EmailCategory.HOHE_PRIORITAET && response.deadline) {
          const event = await this.createCalendarEvent(
            email.id,
            outlookEmail.subject,
            response.deadline,
            response.eventDescription,
            outlookService
          );

          if (event) {
            eventCreated = true;
            deadline = response.deadline;
          }
        }
      }

      // 7. E-Mail als "verarbeitet" markieren
      await prisma.email.update({
        where: { id: email.id },
        data: {
          status: EmailStatus.PROCESSED,
          processedAt: new Date()
        }
      });

      // 8. Statistiken aktualisieren
      await this.updateStatistics(classification.category, draftCreated, eventCreated);

      const duration = Date.now() - startTime;
      logger.info('Email processing completed', {
        emailId: outlookEmail.id,
        duration,
        draftCreated,
        eventCreated
      });

      return {
        emailId: email.id,
        category: classification.category,
        draftCreated,
        eventCreated,
        deadline
      };

    } catch (error) {
      logger.error('Email processing failed', {
        emailId: outlookEmail.id,
        error
      });
      throw error;
    }
  }

  /**
   * Generiert Antwort und erstellt Draft in Outlook
   */
  private async generateAndCreateDraft(
    emailId: string,
    outlookEmail: any,
    category: EmailCategory,
    outlookService: OutlookService,
    userId: string
  ): Promise<{
    draftCreated: boolean;
    deadline?: string;
    eventDescription?: string;
  }> {
    try {
      // Conversation History aus DB holen (für Context)
      const conversationHistory = await this.getConversationHistory(
        outlookEmail.from.emailAddress.address
      );

      // Antwort generieren
      const response = await this.responseGenerator.generateResponse(
        {
          from: outlookEmail.from.emailAddress.address,
          fromName: outlookEmail.from.emailAddress.name,
          subject: outlookEmail.subject,
          body: outlookEmail.body?.content || outlookEmail.bodyPreview
        },
        category,
        conversationHistory
      );

      // Draft in Outlook erstellen
      const draftId = await outlookService.createDraft({
        subject: response.subject,
        body: response.bodyContent,
        toRecipients: [response.recipient],
        bodyType: 'html'
      });

      // Draft in DB speichern
      await prisma.draft.create({
        data: {
          draftId,
          recipient: response.recipient,
          subject: response.subject,
          body: response.bodyContent,
          bodyHtml: response.bodyContent,
          status: DraftStatus.PENDING,
          emailId,
          userId
        }
      });

      // Conversation History speichern
      await this.saveConversationHistory(
        outlookEmail.from.emailAddress.address,
        'user',
        outlookEmail.body?.content || outlookEmail.bodyPreview
      );

      await this.saveConversationHistory(
        outlookEmail.from.emailAddress.address,
        'assistant',
        response.bodyContent
      );

      logger.info('Draft created', {
        emailId,
        draftId,
        hasDeadline: !!response.deadline
      });

      return {
        draftCreated: true,
        deadline: response.deadline,
        eventDescription: response.eventDescription
      };

    } catch (error) {
      logger.error('Draft creation failed', { emailId, error });
      return { draftCreated: false };
    }
  }

  /**
   * Erstellt Kalendereintrag aus erkannter Frist
   */
  private async createCalendarEvent(
    emailId: string,
    emailSubject: string,
    deadline: string,
    description: string | undefined,
    outlookService: OutlookService
  ): Promise<boolean> {
    try {
      const startDateTime = parseISO(deadline);
      const endDateTime = addHours(startDateTime, 1); // 1 Stunde Event

      const eventId = await outlookService.createEvent({
        subject: `Frist: ${emailSubject}`,
        body: description || `Frist für: ${emailSubject}`,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        timeZone: 'Europe/Berlin'
      });

      // Event in DB speichern
      await prisma.event.create({
        data: {
          eventId,
          title: `Frist: ${emailSubject}`,
          description,
          startDateTime,
          endDateTime,
          emailId
        }
      });

      logger.info('Calendar event created', {
        emailId,
        eventId,
        deadline
      });

      return true;

    } catch (error) {
      logger.error('Calendar event creation failed', { emailId, error });
      return false;
    }
  }

  /**
   * Holt Folder ID für Kategorie aus Settings
   */
  private async getFolderIdForCategory(
    category: EmailCategory,
    userId: string
  ): Promise<string | null> {
    const settings = await prisma.settings.findUnique({
      where: { userId }
    });

    if (!settings) return null;

    switch (category) {
      case EmailCategory.HOHE_PRIORITAET:
        return settings.folderHighPriority;
      case EmailCategory.RECHNUNGEN_FINANZEN:
        return settings.folderInvoices;
      case EmailCategory.MANDANTENANFRAGEN:
        return settings.folderClientRequests;
      default:
        return null;
    }
  }

  /**
   * Holt Conversation History für Kontext-bewusste Antworten
   */
  private async getConversationHistory(senderEmail: string) {
    const messages = await prisma.conversationMemory.findMany({
      where: { sessionKey: senderEmail },
      orderBy: { createdAt: 'desc' },
      take: 10 // Letzte 10 Nachrichten
    });

    return messages.reverse().map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }));
  }

  /**
   * Speichert Nachricht in Conversation History
   */
  private async saveConversationHistory(
    senderEmail: string,
    role: string,
    content: string
  ) {
    await prisma.conversationMemory.create({
      data: {
        sessionKey: senderEmail,
        role,
        content
      }
    });
  }

  /**
   * Aktualisiert tägliche Statistiken
   */
  private async updateStatistics(
    category: EmailCategory,
    draftCreated: boolean,
    eventCreated: boolean
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await prisma.statistic.upsert({
      where: { date: today },
      create: {
        date: today,
        totalEmails: 1,
        hohePrioritaet: category === EmailCategory.HOHE_PRIORITAET ? 1 : 0,
        mandantenanfragen: category === EmailCategory.MANDANTENANFRAGEN ? 1 : 0,
        rechnungenFinanzen: category === EmailCategory.RECHNUNGEN_FINANZEN ? 1 : 0,
        draftsCreated: draftCreated ? 1 : 0,
        eventsCreated: eventCreated ? 1 : 0,
        deadlinesCount: eventCreated ? 1 : 0
      },
      update: {
        totalEmails: { increment: 1 },
        hohePrioritaet: {
          increment: category === EmailCategory.HOHE_PRIORITAET ? 1 : 0
        },
        mandantenanfragen: {
          increment: category === EmailCategory.MANDANTENANFRAGEN ? 1 : 0
        },
        rechnungenFinanzen: {
          increment: category === EmailCategory.RECHNUNGEN_FINANZEN ? 1 : 0
        },
        draftsCreated: { increment: draftCreated ? 1 : 0 },
        eventsCreated: { increment: eventCreated ? 1 : 0 },
        deadlinesCount: { increment: eventCreated ? 1 : 0 }
      }
    });

    logger.info('Statistics updated', {
      date: today,
      totalEmails: stats.totalEmails
    });
  }
}
