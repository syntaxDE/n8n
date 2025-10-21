import { Router } from 'express';
import * as settingsController from '../controllers/settingsController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Alle Routes benötigen Authentication
router.use(authenticateToken);

/**
 * @route   GET /api/settings
 * @desc    Einstellungen abrufen
 * @access  Private
 */
router.get('/', settingsController.getSettings);

/**
 * @route   PUT /api/settings
 * @desc    Einstellungen aktualisieren
 * @access  Private
 */
router.put('/', settingsController.updateSettings);

/**
 * @route   GET /api/settings/folders
 * @desc    Outlook-Ordner auflisten
 * @access  Private
 */
router.get('/folders', settingsController.getOutlookFolders);

export default router;
