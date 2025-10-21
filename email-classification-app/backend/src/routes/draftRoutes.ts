import { Router } from 'express';
import * as draftController from '../controllers/draftController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Alle Routes benötigen Authentication
router.use(authenticateToken);

/**
 * @route   GET /api/drafts
 * @desc    Liste aller Entwürfe
 * @access  Private
 */
router.get('/', draftController.getDrafts);

/**
 * @route   GET /api/drafts/:id
 * @desc    Entwurf Details
 * @access  Private
 */
router.get('/:id', draftController.getDraftById);

/**
 * @route   PUT /api/drafts/:id
 * @desc    Entwurf bearbeiten
 * @access  Private
 */
router.put('/:id', draftController.updateDraft);

/**
 * @route   POST /api/drafts/:id/approve
 * @desc    Entwurf freigeben
 * @access  Private
 */
router.post('/:id/approve', draftController.approveDraft);

/**
 * @route   POST /api/drafts/:id/reject
 * @desc    Entwurf ablehnen
 * @access  Private
 */
router.post('/:id/reject', draftController.rejectDraft);

/**
 * @route   POST /api/drafts/:id/send
 * @desc    Entwurf senden
 * @access  Private
 */
router.post('/:id/send', draftController.sendDraft);

export default router;
