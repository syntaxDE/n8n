import { Response } from 'express';
import { PrismaClient, EmailCategory, EmailStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';
import { logger } from '../utils/logger';
import { EmailProcessingService } from '../services/email/EmailProcessingService';
import { OutlookService } from '../services/outlook/OutlookService';

const prisma = new PrismaClient();

/**
 * GET /api/emails
 * Liste aller E-Mails mit Filterung und Pagination
 */
export async function getEmails(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    // Query params
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as EmailCategory | undefined;
    const status = req.query.status as EmailStatus | undefined;
    const search = req.query.search as string | undefined;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { userId };

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { from: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Fetch emails
    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        skip,
        take: limit,
        orderBy: { receivedAt: 'desc' },
        include: {
          drafts: {
            select: {
              id: true,
              status: true,
              createdAt: true
            }
          },
          events: {
            select: {
              id: true,
              title: true,
              startDateTime: true
            }
          }
        }
      }),
      prisma.email.count({ where })
    ]);

    res.json({
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Get emails failed', { error });
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
}

/**
 * GET /api/emails/:id
 * E-Mail Details
 */
export async function getEmailById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const email = await prisma.email.findFirst({
      where: { id, userId },
      include: {
        drafts: true,
        events: true
      }
    });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json(email);

  } catch (error) {
    logger.error('Get email by ID failed', { error, emailId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch email' });
  }
}

/**
 * POST /api/emails/:id/process
 * Manuell eine E-Mail neu verarbeiten
 */
export async function reprocessEmail(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Email aus DB holen
    const email = await prisma.email.findFirst({
      where: { id, userId }
    });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // User-Token holen
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user?.accessToken) {
      return res.status(401).json({ error: 'No access token available' });
    }

    // Outlook Email rekonstruieren
    const outlookEmail = {
      id: email.emailId,
      from: {
        emailAddress: {
          address: email.from,
          name: email.fromName
        }
      },
      subject: email.subject,
      body: {
        content: email.body
      },
      bodyPreview: email.bodyPreview,
      receivedDateTime: email.receivedAt.toISOString(),
      hasAttachments: email.hasAttachments
    };

    // Neu verarbeiten
    const processingService = new EmailProcessingService();
    const result = await processingService.processEmail(
      outlookEmail,
      userId,
      user.accessToken
    );

    res.json({
      message: 'Email reprocessed successfully',
      result
    });

  } catch (error) {
    logger.error('Reprocess email failed', { error, emailId: req.params.id });
    res.status(500).json({ error: 'Failed to reprocess email' });
  }
}

/**
 * GET /api/emails/stats/summary
 * E-Mail Statistik-Zusammenfassung
 */
export async function getEmailStats(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const stats = await prisma.email.groupBy({
      by: ['category', 'status'],
      where: { userId },
      _count: true
    });

    const summary = {
      total: await prisma.email.count({ where: { userId } }),
      byCategory: {} as Record<string, number>,
      byStatus: {} as Record<string, number>
    };

    stats.forEach(stat => {
      summary.byCategory[stat.category] = (summary.byCategory[stat.category] || 0) + stat._count;
      summary.byStatus[stat.status] = (summary.byStatus[stat.status] || 0) + stat._count;
    });

    res.json(summary);

  } catch (error) {
    logger.error('Get email stats failed', { error });
    res.status(500).json({ error: 'Failed to fetch email stats' });
  }
}
