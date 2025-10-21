import { Router } from 'express';
import * as statsController from '../controllers/statsController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Alle Routes benötigen Authentication
router.use(authenticateToken);

/**
 * @route   GET /api/stats/dashboard
 * @desc    Dashboard-Statistiken
 * @access  Private
 */
router.get('/dashboard', statsController.getDashboardStats);

/**
 * @route   GET /api/stats/timeline
 * @desc    Zeitverlauf-Statistiken
 * @access  Private
 */
router.get('/timeline', statsController.getTimelineStats);

/**
 * @route   GET /api/stats/summary
 * @desc    Gesamtübersicht
 * @access  Private
 */
router.get('/summary', statsController.getSummaryStats);

export default router;
