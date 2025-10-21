import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * GET /api/settings
 * Einstellungen abrufen
 */
export async function getSettings(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    let settings = await prisma.settings.findUnique({
      where: { userId }
    });

    // Wenn keine Settings existieren, Default erstellen
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          userId,
          pollingInterval: 5,
          autoProcessEmails: true,
          aiModel: 'mistral-large-latest',
          aiTemperature: 0.2,
          usePerplexity: true,
          notifyHighPriority: true,
          notifyDeadlines: true
        }
      });
    }

    res.json(settings);

  } catch (error) {
    logger.error('Get settings failed', { error });
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

/**
 * PUT /api/settings
 * Einstellungen aktualisieren
 */
export async function updateSettings(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const {
      pollingInterval,
      autoProcessEmails,
      aiModel,
      aiTemperature,
      usePerplexity,
      notifyHighPriority,
      notifyDeadlines,
      folderHighPriority,
      folderInvoices,
      folderClientRequests
    } = req.body;

    // Validierung
    if (pollingInterval && (pollingInterval < 1 || pollingInterval > 60)) {
      return res.status(400).json({
        error: 'Polling interval must be between 1 and 60 minutes'
      });
    }

    if (aiTemperature && (aiTemperature < 0 || aiTemperature > 2)) {
      return res.status(400).json({
        error: 'AI temperature must be between 0 and 2'
      });
    }

    // Update oder Create
    const settings = await prisma.settings.upsert({
      where: { userId },
      create: {
        userId,
        pollingInterval: pollingInterval || 5,
        autoProcessEmails: autoProcessEmails !== undefined ? autoProcessEmails : true,
        aiModel: aiModel || 'mistral-large-latest',
        aiTemperature: aiTemperature || 0.2,
        usePerplexity: usePerplexity !== undefined ? usePerplexity : true,
        notifyHighPriority: notifyHighPriority !== undefined ? notifyHighPriority : true,
        notifyDeadlines: notifyDeadlines !== undefined ? notifyDeadlines : true,
        folderHighPriority,
        folderInvoices,
        folderClientRequests
      },
      update: {
        ...(pollingInterval && { pollingInterval }),
        ...(autoProcessEmails !== undefined && { autoProcessEmails }),
        ...(aiModel && { aiModel }),
        ...(aiTemperature !== undefined && { aiTemperature }),
        ...(usePerplexity !== undefined && { usePerplexity }),
        ...(notifyHighPriority !== undefined && { notifyHighPriority }),
        ...(notifyDeadlines !== undefined && { notifyDeadlines }),
        ...(folderHighPriority && { folderHighPriority }),
        ...(folderInvoices && { folderInvoices }),
        ...(folderClientRequests && { folderClientRequests })
      }
    });

    logger.info('Settings updated', { userId });

    res.json(settings);

  } catch (error) {
    logger.error('Update settings failed', { error });
    res.status(500).json({ error: 'Failed to update settings' });
  }
}

/**
 * GET /api/settings/folders
 * Outlook-Ordner auflisten (für Folder-Auswahl in Settings)
 */
export async function getOutlookFolders(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    // User Token holen
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user?.accessToken) {
      return res.status(401).json({ error: 'No access token available' });
    }

    // Outlook Service nutzen
    const { OutlookService } = await import('../services/outlook/OutlookService');
    const outlookService = new OutlookService(user.accessToken);

    const folders = await outlookService.getFolders();

    res.json({ folders });

  } catch (error) {
    logger.error('Get Outlook folders failed', { error });
    res.status(500).json({ error: 'Failed to fetch Outlook folders' });
  }
}
