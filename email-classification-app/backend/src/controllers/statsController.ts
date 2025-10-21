import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';
import { logger } from '../utils/logger';
import { subDays, startOfDay, format } from 'date-fns';

const prisma = new PrismaClient();

/**
 * GET /api/stats/dashboard
 * Dashboard-Statistiken
 */
export async function getDashboardStats(req: AuthRequest, res: Response) {
  try {
    const today = startOfDay(new Date());
    const weekAgo = subDays(today, 7);

    // Heutige Stats
    const todayStats = await prisma.statistic.findUnique({
      where: { date: today }
    });

    // Wöchentliche Stats (letzten 7 Tage)
    const weekStats = await prisma.statistic.findMany({
      where: {
        date: {
          gte: weekAgo,
          lte: today
        }
      },
      orderBy: { date: 'asc' }
    });

    // Aggregiere Wochendaten
    const weekTotal = weekStats.reduce((acc, stat) => ({
      totalEmails: acc.totalEmails + stat.totalEmails,
      hohePrioritaet: acc.hohePrioritaet + stat.hohePrioritaet,
      mandantenanfragen: acc.mandantenanfragen + stat.mandantenanfragen,
      rechnungenFinanzen: acc.rechnungenFinanzen + stat.rechnungenFinanzen,
      draftsCreated: acc.draftsCreated + stat.draftsCreated,
      eventsCreated: acc.eventsCreated + stat.eventsCreated
    }), {
      totalEmails: 0,
      hohePrioritaet: 0,
      mandantenanfragen: 0,
      rechnungenFinanzen: 0,
      draftsCreated: 0,
      eventsCreated: 0
    });

    const avgPerDay = weekStats.length > 0
      ? weekTotal.totalEmails / weekStats.length
      : 0;

    // Timeline für Chart
    const timeline = weekStats.map(stat => ({
      date: format(stat.date, 'dd.MM'),
      hohePrioritaet: stat.hohePrioritaet,
      mandantenanfragen: stat.mandantenanfragen,
      rechnungenFinanzen: stat.rechnungenFinanzen
    }));

    res.json({
      today: {
        totalEmails: todayStats?.totalEmails || 0,
        hohePrioritaet: todayStats?.hohePrioritaet || 0,
        mandantenanfragen: todayStats?.mandantenanfragen || 0,
        rechnungenFinanzen: todayStats?.rechnungenFinanzen || 0,
        draftsCreated: todayStats?.draftsCreated || 0,
        eventsCreated: todayStats?.eventsCreated || 0
      },
      week: {
        totalEmails: weekTotal.totalEmails,
        avgPerDay: Math.round(avgPerDay * 10) / 10
      },
      timeline
    });

  } catch (error) {
    logger.error('Get dashboard stats failed', { error });
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
}

/**
 * GET /api/stats/timeline
 * Zeitverlauf-Statistiken
 */
export async function getTimelineStats(req: AuthRequest, res: Response) {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = subDays(startOfDay(new Date()), days);

    const stats = await prisma.statistic.findMany({
      where: {
        date: { gte: startDate }
      },
      orderBy: { date: 'asc' }
    });

    const timeline = stats.map(stat => ({
      date: format(stat.date, 'yyyy-MM-dd'),
      totalEmails: stat.totalEmails,
      hohePrioritaet: stat.hohePrioritaet,
      mandantenanfragen: stat.mandantenanfragen,
      rechnungenFinanzen: stat.rechnungenFinanzen,
      draftsCreated: stat.draftsCreated,
      eventsCreated: stat.eventsCreated,
      deadlinesCount: stat.deadlinesCount
    }));

    res.json({ timeline });

  } catch (error) {
    logger.error('Get timeline stats failed', { error });
    res.status(500).json({ error: 'Failed to fetch timeline stats' });
  }
}

/**
 * GET /api/stats/summary
 * Gesamtübersicht
 */
export async function getSummaryStats(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    // Gesamtzähler aus Email-Tabelle
    const [
      totalEmails,
      totalDrafts,
      totalEvents,
      categoryCounts
    ] = await Promise.all([
      prisma.email.count({ where: { userId } }),
      prisma.draft.count({ where: { userId } }),
      prisma.event.count(),
      prisma.email.groupBy({
        by: ['category'],
        where: { userId },
        _count: true
      })
    ]);

    const byCategory = categoryCounts.reduce((acc, item) => {
      acc[item.category] = item._count;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      totalEmails,
      totalDrafts,
      totalEvents,
      byCategory
    });

  } catch (error) {
    logger.error('Get summary stats failed', { error });
    res.status(500).json({ error: 'Failed to fetch summary stats' });
  }
}
