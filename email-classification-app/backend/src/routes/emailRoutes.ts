import { Router } from 'express';
import * as emailController from '../controllers/emailController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Alle Routes benötigen Authentication
router.use(authenticateToken);

/**
 * @route   GET /api/emails
 * @desc    Liste aller E-Mails mit Filterung und Pagination
 * @access  Private
 */
router.get('/', emailController.getEmails);

/**
 * @route   GET /api/emails/stats/summary
 * @desc    E-Mail Statistik-Zusammenfassung
 * @access  Private
 */
router.get('/stats/summary', emailController.getEmailStats);

/**
 * @route   GET /api/emails/:id
 * @desc    E-Mail Details
 * @access  Private
 */
router.get('/:id', emailController.getEmailById);

/**
 * @route   POST /api/emails/:id/process
 * @desc    E-Mail manuell neu verarbeiten
 * @access  Private
 */
router.post('/:id/process', emailController.reprocessEmail);

export default router;
