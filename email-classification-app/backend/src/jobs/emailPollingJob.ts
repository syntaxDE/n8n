import { Queue, Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { OutlookService } from '../services/outlook/OutlookService';
import { EmailProcessingService } from '../services/email/EmailProcessingService';
import { logger } from '../utils/logger';
import IORedis from 'ioredis';

const prisma = new PrismaClient();
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

// Queue für Email Polling
export const emailPollingQueue = new Queue('email-polling', { connection });

// Queue für Email Processing
export const emailProcessingQueue = new Queue('email-processing', { connection });

/**
 * Job-Daten für Email Polling
 */
interface EmailPollingJobData {
  userId: string;
}

/**
 * Job-Daten für Email Processing
 */
interface EmailProcessingJobData {
  userId: string;
  outlookEmail: any;
  accessToken: string;
}

/**
 * Startet den Email Polling Job (wird alle X Minuten ausgeführt)
 */
export function startEmailPolling() {
  const intervalMinutes = parseInt(process.env.EMAIL_POLLING_INTERVAL || '5');

  // Für jeden User einen repeatable job erstellen
  setupPollingForAllUsers();

  logger.info('Email polling started', { intervalMinutes });
}

/**
 * Setup Polling für alle aktiven User
 */
async function setupPollingForAllUsers() {
  try {
    // Alle User mit gültigem Access Token
    const users = await prisma.user.findMany({
      where: {
        accessToken: { not: null },
        tokenExpiry: { gt: new Date() }
      }
    });

    const intervalMinutes = parseInt(process.env.EMAIL_POLLING_INTERVAL || '5');

    for (const user of users) {
      // Repeatable Job für jeden User
      await emailPollingQueue.add(
        `poll-${user.id}`,
        { userId: user.id },
        {
          repeat: {
            every: intervalMinutes * 60 * 1000 // Minuten → Millisekunden
          },
          removeOnComplete: 100,
          removeOnFail: 100
        }
      );

      logger.info('Polling job scheduled', { userId: user.id, intervalMinutes });
    }

  } catch (error) {
    logger.error('Failed to setup polling for users', { error });
  }
}

/**
 * Worker: Ruft ungelesene E-Mails ab und erstellt Processing Jobs
 */
export const emailPollingWorker = new Worker<EmailPollingJobData>(
  'email-polling',
  async (job: Job<EmailPollingJobData>) => {
    const { userId } = job.data;

    try {
      logger.info('Email polling job started', { userId });

      // User aus DB holen
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || !user.accessToken) {
        logger.warn('User has no access token', { userId });
        return { status: 'skipped', reason: 'no_token' };
      }

      // Token abgelaufen? Refresh versuchen
      if (user.tokenExpiry && user.tokenExpiry < new Date()) {
        logger.info('Access token expired, refreshing...', { userId });
        // TODO: Token refresh implementieren
        return { status: 'skipped', reason: 'token_expired' };
      }

      // Outlook Service initialisieren
      const outlookService = new OutlookService(user.accessToken);

      // Ungelesene E-Mails abrufen
      const maxEmails = parseInt(process.env.MAX_EMAILS_PER_BATCH || '10');
      const unreadEmails = await outlookService.getUnreadEmails(maxEmails);

      logger.info('Unread emails fetched', {
        userId,
        count: unreadEmails.length
      });

      // Für jede E-Mail einen Processing Job erstellen
      for (const email of unreadEmails) {
        await emailProcessingQueue.add(
          'process-email',
          {
            userId: user.id,
            outlookEmail: email,
            accessToken: user.accessToken
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000
            }
          }
        );
      }

      return {
        status: 'success',
        emailsFound: unreadEmails.length,
        jobsCreated: unreadEmails.length
      };

    } catch (error) {
      logger.error('Email polling job failed', { userId, error });
      throw error;
    }
  },
  { connection }
);

/**
 * Worker: Verarbeitet einzelne E-Mail
 */
export const emailProcessingWorker = new Worker<EmailProcessingJobData>(
  'email-processing',
  async (job: Job<EmailProcessingJobData>) => {
    const { userId, outlookEmail, accessToken } = job.data;

    try {
      logger.info('Email processing job started', {
        userId,
        emailId: outlookEmail.id,
        subject: outlookEmail.subject
      });

      const processingService = new EmailProcessingService();

      const result = await processingService.processEmail(
        outlookEmail,
        userId,
        accessToken
      );

      logger.info('Email processing job completed', {
        userId,
        emailId: result.emailId,
        category: result.category,
        draftCreated: result.draftCreated,
        eventCreated: result.eventCreated
      });

      return result;

    } catch (error) {
      logger.error('Email processing job failed', {
        userId,
        emailId: outlookEmail.id,
        error
      });
      throw error;
    }
  },
  {
    connection,
    concurrency: 5 // Max 5 E-Mails gleichzeitig verarbeiten
  }
);

/**
 * Event Listeners für Monitoring
 */
emailPollingWorker.on('completed', (job) => {
  logger.debug('Polling job completed', {
    jobId: job.id,
    result: job.returnvalue
  });
});

emailPollingWorker.on('failed', (job, error) => {
  logger.error('Polling job failed', {
    jobId: job?.id,
    error
  });
});

emailProcessingWorker.on('completed', (job) => {
  logger.debug('Processing job completed', {
    jobId: job.id,
    emailId: job.data.outlookEmail.id
  });
});

emailProcessingWorker.on('failed', (job, error) => {
  logger.error('Processing job failed', {
    jobId: job?.id,
    emailId: job?.data.outlookEmail.id,
    error
  });
});
