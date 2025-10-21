import { Response } from 'express';
import { PrismaClient, DraftStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';
import { logger } from '../utils/logger';
import { OutlookService } from '../services/outlook/OutlookService';

const prisma = new PrismaClient();

/**
 * GET /api/drafts
 * Liste aller Entwürfe mit Filterung und Pagination
 */
export async function getDrafts(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as DraftStatus | undefined;

    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [drafts, total] = await Promise.all([
      prisma.draft.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          email: {
            select: {
              id: true,
              from: true,
              fromName: true,
              subject: true,
              category: true,
              receivedAt: true
            }
          }
        }
      }),
      prisma.draft.count({ where })
    ]);

    res.json({
      drafts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Get drafts failed', { error });
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
}

/**
 * GET /api/drafts/:id
 * Entwurf Details
 */
export async function getDraftById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const draft = await prisma.draft.findFirst({
      where: { id, userId },
      include: {
        email: true
      }
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json(draft);

  } catch (error) {
    logger.error('Get draft by ID failed', { error, draftId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
}

/**
 * PUT /api/drafts/:id
 * Entwurf bearbeiten
 */
export async function updateDraft(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { subject, body, bodyHtml } = req.body;

    // Draft existiert?
    const draft = await prisma.draft.findFirst({
      where: { id, userId }
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    // Kann nicht mehr bearbeitet werden wenn bereits gesendet
    if (draft.status === DraftStatus.SENT) {
      return res.status(400).json({ error: 'Cannot edit sent draft' });
    }

    // Update
    const updated = await prisma.draft.update({
      where: { id },
      data: {
        subject: subject || draft.subject,
        body: body || draft.body,
        bodyHtml: bodyHtml || draft.bodyHtml,
        status: DraftStatus.EDITED,
        updatedAt: new Date()
      }
    });

    // Optional: Update in Outlook
    if (draft.draftId && updated.bodyHtml) {
      try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.accessToken) {
          const outlookService = new OutlookService(user.accessToken);
          // TODO: Outlook API hat keinen direkten "update draft" endpoint
          // Man muss den alten löschen und neuen erstellen
        }
      } catch (outlookError) {
        logger.warn('Failed to update draft in Outlook', { draftId: id, outlookError });
      }
    }

    res.json(updated);

  } catch (error) {
    logger.error('Update draft failed', { error, draftId: req.params.id });
    res.status(500).json({ error: 'Failed to update draft' });
  }
}

/**
 * POST /api/drafts/:id/approve
 * Entwurf freigeben
 */
export async function approveDraft(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const draft = await prisma.draft.findFirst({
      where: { id, userId }
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    if (draft.status === DraftStatus.SENT) {
      return res.status(400).json({ error: 'Draft already sent' });
    }

    await prisma.draft.update({
      where: { id },
      data: { status: DraftStatus.APPROVED }
    });

    res.json({ message: 'Draft approved' });

  } catch (error) {
    logger.error('Approve draft failed', { error, draftId: req.params.id });
    res.status(500).json({ error: 'Failed to approve draft' });
  }
}

/**
 * POST /api/drafts/:id/reject
 * Entwurf ablehnen
 */
export async function rejectDraft(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const draft = await prisma.draft.findFirst({
      where: { id, userId }
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    await prisma.draft.update({
      where: { id },
      data: { status: DraftStatus.REJECTED }
    });

    res.json({ message: 'Draft rejected' });

  } catch (error) {
    logger.error('Reject draft failed', { error, draftId: req.params.id });
    res.status(500).json({ error: 'Failed to reject draft' });
  }
}

/**
 * POST /api/drafts/:id/send
 * Entwurf senden
 */
export async function sendDraft(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const draft = await prisma.draft.findFirst({
      where: { id, userId }
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    if (draft.status === DraftStatus.SENT) {
      return res.status(400).json({ error: 'Draft already sent' });
    }

    if (!draft.draftId) {
      return res.status(400).json({ error: 'No Outlook draft ID available' });
    }

    // User Token holen
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user?.accessToken) {
      return res.status(401).json({ error: 'No access token available' });
    }

    // In Outlook senden
    const outlookService = new OutlookService(user.accessToken);
    await outlookService.sendDraft(draft.draftId);

    // Status aktualisieren
    await prisma.draft.update({
      where: { id },
      data: {
        status: DraftStatus.SENT,
        sentAt: new Date()
      }
    });

    logger.info('Draft sent', { draftId: id, outlookDraftId: draft.draftId });

    res.json({ message: 'Draft sent successfully' });

  } catch (error) {
    logger.error('Send draft failed', { error, draftId: req.params.id });
    res.status(500).json({ error: 'Failed to send draft' });
  }
}
