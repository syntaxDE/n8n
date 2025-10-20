import { Client } from '@microsoft/microsoft-graph-client';
import { logger } from '../../utils/logger';

export interface OutlookEmail {
  id: string;
  from: {
    emailAddress: {
      address: string;
      name?: string;
    };
  };
  subject: string;
  bodyPreview: string;
  body: {
    content: string;
    contentType: 'text' | 'html';
  };
  receivedDateTime: string;
  hasAttachments: boolean;
  isRead: boolean;
}

export interface OutlookFolder {
  id: string;
  displayName: string;
}

export class OutlookService {
  private client: Client;

  constructor(accessToken: string) {
    this.client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });
  }

  /**
   * Fetches unread emails from inbox
   */
  async getUnreadEmails(limit: number = 10): Promise<OutlookEmail[]> {
    try {
      const response = await this.client
        .api('/me/messages')
        .filter('isRead eq false')
        .select('id,from,subject,bodyPreview,body,receivedDateTime,hasAttachments,isRead')
        .orderby('receivedDateTime DESC')
        .top(limit)
        .get();

      logger.info('Fetched unread emails', { count: response.value?.length || 0 });

      return response.value || [];

    } catch (error) {
      logger.error('Failed to fetch unread emails', { error });
      throw error;
    }
  }

  /**
   * Moves an email to a specific folder
   */
  async moveEmail(emailId: string, folderId: string): Promise<void> {
    try {
      await this.client
        .api(`/me/messages/${emailId}/move`)
        .post({
          destinationId: folderId
        });

      logger.info('Email moved', { emailId, folderId });

    } catch (error) {
      logger.error('Failed to move email', { error, emailId, folderId });
      throw error;
    }
  }

  /**
   * Creates a draft email
   */
  async createDraft(params: {
    subject: string;
    body: string;
    toRecipients: string[];
    bodyType?: 'text' | 'html';
  }): Promise<string> {
    try {
      const response = await this.client
        .api('/me/messages')
        .post({
          subject: params.subject,
          body: {
            contentType: params.bodyType || 'html',
            content: params.body
          },
          toRecipients: params.toRecipients.map(email => ({
            emailAddress: { address: email }
          }))
        });

      logger.info('Draft created', { draftId: response.id, subject: params.subject });

      return response.id;

    } catch (error) {
      logger.error('Failed to create draft', { error, subject: params.subject });
      throw error;
    }
  }

  /**
   * Sends a draft email
   */
  async sendDraft(draftId: string): Promise<void> {
    try {
      await this.client
        .api(`/me/messages/${draftId}/send`)
        .post({});

      logger.info('Draft sent', { draftId });

    } catch (error) {
      logger.error('Failed to send draft', { error, draftId });
      throw error;
    }
  }

  /**
   * Creates a calendar event
   */
  async createEvent(params: {
    subject: string;
    body?: string;
    startDateTime: string;
    endDateTime: string;
    timeZone?: string;
  }): Promise<string> {
    try {
      const response = await this.client
        .api('/me/events')
        .post({
          subject: params.subject,
          body: {
            contentType: 'text',
            content: params.body || ''
          },
          start: {
            dateTime: params.startDateTime,
            timeZone: params.timeZone || 'Europe/Berlin'
          },
          end: {
            dateTime: params.endDateTime,
            timeZone: params.timeZone || 'Europe/Berlin'
          }
        });

      logger.info('Calendar event created', { eventId: response.id, subject: params.subject });

      return response.id;

    } catch (error) {
      logger.error('Failed to create calendar event', { error, subject: params.subject });
      throw error;
    }
  }

  /**
   * Lists mail folders
   */
  async getFolders(): Promise<OutlookFolder[]> {
    try {
      const response = await this.client
        .api('/me/mailFolders')
        .select('id,displayName')
        .get();

      return response.value || [];

    } catch (error) {
      logger.error('Failed to fetch folders', { error });
      throw error;
    }
  }

  /**
   * Marks an email as read
   */
  async markAsRead(emailId: string): Promise<void> {
    try {
      await this.client
        .api(`/me/messages/${emailId}`)
        .patch({
          isRead: true
        });

      logger.info('Email marked as read', { emailId });

    } catch (error) {
      logger.error('Failed to mark email as read', { error, emailId });
      throw error;
    }
  }
}
